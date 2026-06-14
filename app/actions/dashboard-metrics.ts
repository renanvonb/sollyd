'use server'

import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfMonth, endOfMonth, format, parseISO } from 'date-fns'

interface DashboardMetricsParams {
    range?: 'dia' | 'semana' | 'mes' | 'ano' | 'custom'
    startDate?: string
    endDate?: string
    competence?: string // Legacy fallback
    status?: string
}

export async function getDashboardMetrics({ range, startDate, endDate, competence, status }: DashboardMetricsParams) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { summary: { income: 0, expense: 0, balance: 0, investment: 0 }, categoryData: [] }
    }

    let effectiveStartDate: string
    let effectiveEndDate: string
    const effectiveRange = range || 'mes'

    if (startDate && endDate) {
        effectiveStartDate = startDate
        effectiveEndDate = endDate
    } else {
        // Fallback or Range logic
        // Fallback or Range logic
        const referenceCompetence = competence || new Date().toISOString()
        const referenceDate = startDate ? parseISO(startDate) : parseISO(referenceCompetence)
        let start: Date
        let end: Date

        if (effectiveRange === 'dia') {
            start = startOfDay(referenceDate)
            end = endOfDay(referenceDate)
        } else if (effectiveRange === 'semana') {
            start = startOfWeek(referenceDate, { weekStartsOn: 0 })
            end = endOfWeek(referenceDate, { weekStartsOn: 0 })
        } else if (effectiveRange === 'ano') {
            start = startOfYear(referenceDate)
            end = endOfYear(referenceDate)
        } else {
            // Mes (default)
            start = startOfMonth(referenceDate)
            end = endOfMonth(referenceDate)
        }

        effectiveStartDate = format(start, 'yyyy-MM-dd')
        effectiveEndDate = format(end, 'yyyy-MM-dd')
    }

    // 4. Query Construction Helper
    // "Quando "Mês" trazer todas as transações vinculadas a "Date" da "Competence" filtrada" -> Competence
    // "Quando "Ano" trazer todas as transações vinculadas a "Date" dentro do ano selecionada" -> Date (Realized) / Competence (Pending)

    const applyFilters = (query: any) => {
        // Base: User ID
        let q = query.eq('user_id', user.id)

        if (effectiveRange === 'mes') {
            // Month View: Strictly Competence (Exact Match)
            // STRICT_EQUALITY_FILTER_V4: Use exact match to prevent timezone leaks
            q = q.eq('competence', effectiveStartDate)

            if (status === 'Realizado') q = q.eq('status', 'Realizado')
            else if (status === 'Pendente') q = q.eq('status', 'Pendente')
            else q = q.in('status', ['Realizado', 'Pendente'])
        } else {
            // Other Views (Year, Week, Day): Effective Date
            if (status === 'Realizado') {
                q = q.eq('status', 'Realizado')
                    .gte('date', effectiveStartDate)
                    .lte('date', effectiveEndDate)
            } else if (status === 'Pendente') {
                q = q.eq('status', 'Pendente')
                    .gte('competence', effectiveStartDate)
                    .lte('competence', effectiveEndDate)
            } else {
                // All: Realized (Date) OR Pending (Competence)
                // Note: .or() requires the full condition string
                const orCondition = `and(status.eq.Realizado,date.gte.${effectiveStartDate},date.lte.${effectiveEndDate}),and(status.eq.Pendente,competence.gte.${effectiveStartDate},competence.lte.${effectiveEndDate})`
                q = q.or(orCondition)
            }
        }
        return q
    }

    // 1. Fetch Summary Data
    let summaryQuery = supabase
        .from('transactions')
        .select('amount, type')

    summaryQuery = applyFilters(summaryQuery)

    const { data: transactions, error } = await summaryQuery

    if (error) {
        console.error('[getDashboardMetrics] Error fetching summary:', error)
        return { summary: { income: 0, expense: 0, balance: 0, investment: 0 }, categoryData: [] }
    }

    const summary = transactions.reduce((acc, curr) => {
        const amount = Number(curr.amount) || 0
        const type = curr.type?.toLowerCase() || ''

        if (type === 'revenue' || type === 'receita') acc.income += amount
        else if (type === 'expense' || type === 'despesa') acc.expense += amount
        else if (type === 'investment' || type === 'investimento') acc.investment += amount

        acc.balance = acc.income - acc.expense - acc.investment
        return acc
    }, { income: 0, expense: 0, balance: 0, investment: 0 })


    // 2. Fetch Category Data
    let catQuery = supabase
        .from('transactions')
        .select(`
            amount,
            category_id,
            categories (
                id,
                name,
                color
            )
        `)
        .eq('type', 'Despesa')

    catQuery = applyFilters(catQuery)

    const { data: categoryTransactions, error: catError } = await catQuery

    if (catError) {
        console.error('[getDashboardMetrics] Error fetching categories:', catError)
        return { summary, categoryData: [] }
    }

    // Aggregate by category_id
    const categoryMap: Record<string, { value: number; color: string; name: string }> = {}

    categoryTransactions.forEach((t: any) => {
        const categoryId = t.category_id || 'unknown'
        const categoryName = t.categories?.name || 'Outros'
        const categoryColor = t.categories?.color || '#71717a'
        const amount = Number(t.amount) || 0

        if (!categoryMap[categoryId]) {
            categoryMap[categoryId] = { value: 0, color: categoryColor, name: categoryName }
        } else {
            categoryMap[categoryId].value += amount
        }
    })

    const categoryData = Object.values(categoryMap)
        .map((data) => ({
            name: data.name,
            value: data.value,
            color: data.color
        }))
        .sort((a, b) => b.value - a.value)

    // 3. Fetch Classification Data
    let classQuery = supabase
        .from('transactions')
        .select(`
            amount,
            classification_id,
            classifications (
                id,
                name,
                color
            )
        `)
        .eq('type', 'Despesa')

    classQuery = applyFilters(classQuery)

    const { data: classificationTransactions, error: classError } = await classQuery

    if (classError) {
        console.error('[getDashboardMetrics] Error fetching classifications:', classError)
    }

    const classificationMap: Record<string, { value: number; color: string; name: string }> = {}

        // Safe handling if classificationTransactions is null/undefined
        ; (classificationTransactions || []).forEach((t: any) => {
            const classificationId = t.classification_id || 'unknown'
            const classificationName = t.classifications?.name || 'Outros'
            const classificationColor = t.classifications?.color || '#71717a'
            const amount = Number(t.amount) || 0

            if (!classificationMap[classificationId]) {
                classificationMap[classificationId] = { value: 0, color: classificationColor, name: classificationName }
            } else {
                classificationMap[classificationId].value += amount
            }
        })

    const classificationData = Object.values(classificationMap)
        .map((data) => ({
            classification: data.name,
            value: data.value,
            color: data.color
        }))
        .sort((a, b) => b.value - a.value)

    return {
        summary,
        categoryData,
        classificationData
    }
}
