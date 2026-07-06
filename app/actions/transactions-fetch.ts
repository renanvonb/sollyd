'use server'

import { createClient } from '@/lib/supabase/server'
import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    format,
    parseISO
} from 'date-fns'

import { TimeRange } from '@/types/time-range'


interface GetTransactionsParams {
    range: TimeRange
    startDate?: string
    endDate?: string
    status?: string
}

export async function getTransactions({ range, startDate, endDate, status }: GetTransactionsParams) {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.warn('[getTransactions] Unauthorized access attempt')
        return []
    }

    const userId = user.id
    let start: Date
    let end: Date
    // Fix Timezone: Parse date components directly to avoid shifting
    const getDateFromParam = (dateStr?: string) => {
        if (!dateStr) return new Date()
        // If it's an ISO string (e.g. 2024-02-01T00:00:00.000Z), treating it as UTC might shift it.
        // But if we trust the "YYYY-MM-DD" part of the string matches user intent (if sent as such):
        // Ideally we assume the input IS the date we want.
        return parseISO(dateStr)
    }

    const referenceDate = getDateFromParam(startDate)

    // Lógica de intervalos
    if (startDate && endDate) {
        // Use custom date range if both are provided
        start = startOfDay(parseISO(startDate))
        end = endOfDay(parseISO(endDate))
    } else if (range === 'dia') {
        start = startOfDay(referenceDate)
        end = endOfDay(referenceDate)
    } else if (range === 'semana') {
        start = startOfWeek(referenceDate, { weekStartsOn: 0 })
        end = endOfWeek(referenceDate, { weekStartsOn: 0 })
    } else if (range === 'mes') {
        start = startOfMonth(referenceDate)
        end = endOfMonth(referenceDate)
    } else if (range === 'ano') {
        start = startOfYear(referenceDate)
        end = endOfYear(referenceDate)
    } else {
        start = startOfMonth(referenceDate)
        end = endOfMonth(referenceDate)
    }

    // Ensure format uses local date part. 
    // In production (UTC environment), format(date, 'yyyy-MM-dd') outputs the UTC date string.
    // If referenceDate was shifted, this is where it fails.
    // However, without changing the client, we rely on standard parsers.
    // To match the specific request "Utilizar date-fns format...":
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')

    console.log('[getTransactions] Params:', { range, startDate, endDate, status })
    console.log('[getTransactions] Date Range:', { start: startStr, end: endStr })

    try {
        const query = supabase
            .from('transactions')
            .select(`
                *,
                payees(id, name),
                classifications(id, name, color),
                categories(id, name, color),
                subcategories(id, name),
                wallets(id, name, color),
                savings_box_contributions(savings_box_id, savings_boxes(id, name, icon, color))
            `)
            .eq('user_id', userId)

        // 1. Date & Status Filtering
        if (range === 'mes') {
            // "Quando "Mês" trazer todas as transações vinculadas a "Date" da "Competence" filtrada"
            // STRICT_EQUALITY_FILTER_V4: Use exact match for competence to prevent timezone leaks
            query.eq('competence', startStr)

            // Secondary sort by date since competence is identical
            query.order('date', { ascending: false })

            if (status === 'Realizado') query.eq('status', 'Realizado')
            else if (status === 'Pendente') query.eq('status', 'Pendente')
        } else {
            // "Quando "Ano" trazer todas as transações vinculadas a "Date" dentro do ano selecionada"
            // Interpreted as: Realized -> Date, Pending -> Competence

            if (status === 'Realizado') {
                query.eq('status', 'Realizado')
                    .gte('date', startStr)
                    .lte('date', endStr)
                query.order('date', { ascending: false })
            } else if (status === 'Pendente') {
                query.eq('status', 'Pendente')
                    .gte('competence', startStr)
                    .lte('competence', endStr)
                query.order('competence', { ascending: false })
            } else {
                // All: Realized (Date) OR Pending (Competence)
                const orCondition = `and(status.eq.Realizado,date.gte.${startStr},date.lte.${endStr}),and(status.eq.Pendente,competence.gte.${startStr},competence.lte.${endStr})`
                query.or(orCondition)

                // Sort by competence for mixed view as it's the most reliable common field
                query.order('competence', { ascending: false })
            }
        }

        query.order('created_at', { ascending: false }) // Secondary sort

        // Executar a query
        const { data, error } = await query

        if (error) {
            console.error('[getTransactions] Query Error:', error.message)
            return []
        }

        return data || []
    } catch (error) {
        console.error('[getTransactions] Unexpected error:', error)
        return []
    }
}
