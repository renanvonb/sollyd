'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { enrichConsumption, currentYearMonth } from '@/lib/budget-utils'
import type { Budget, BudgetConsumption, BudgetAlertSummary } from '@/types/budget'

const emptyToNull = (v: any) => (v === '' || v === undefined ? null : v)

const budgetSchema = z.object({
    category_id: z.string().uuid('Categoria inválida'),
    subcategory_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    name: z.preprocess(emptyToNull, z.string().max(60, 'Máximo de 60 caracteres').nullable().optional()),
    default_amount: z.coerce.number().gt(0, 'O valor padrão deve ser maior que zero'),
})

const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/

function zodMessage(error: z.ZodError) {
    return 'Dados inválidos: ' + error.issues.map((e) => e.message).join(', ')
}

async function getAuthedClient() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Usuário não autenticado')
    return { supabase, user }
}

// Mapeia uma linha bruta da RPC para BudgetConsumption enriquecido
function mapConsumptionRow(row: any): BudgetConsumption {
    return enrichConsumption({
        budget_id: row.budget_id,
        category_id: row.category_id,
        subcategory_id: row.subcategory_id,
        category_name: row.category_name,
        category_icon: row.category_icon,
        category_color: row.category_color,
        subcategory_name: row.subcategory_name,
        budget_name: row.budget_name,
        default_amount: Number(row.default_amount),
        is_active: row.is_active,
        year_month: row.year_month,
        budget_amount: Number(row.budget_amount),
        spent_amount: Number(row.spent_amount),
        percentage: Number(row.percentage),
    })
}

// ============================================================
// 6.1 getBudgets
// ============================================================
export async function getBudgets(): Promise<{ success: boolean; data?: Budget[]; error?: string }> {
    try {
        const { supabase, user } = await getAuthedClient()
        const ym = currentYearMonth()

        const { data, error } = await supabase
            .from('budgets')
            .select(`
                *,
                category:categories(id, name, icon, color),
                subcategory:subcategories(id, name),
                months:budget_months(*)
            `)
            .eq('user_id', user.id)
            .eq('is_active', true)
        if (error) throw error

        const budgets = (data as Budget[]).map((b) => ({
            ...b,
            months: (b.months || []).filter((m) => m.year_month === ym),
        }))

        budgets.sort((a, b) => {
            const cat = (a.category?.name || '').localeCompare(b.category?.name || '')
            if (cat !== 0) return cat
            // subcategoria NULL primeiro (orçamento geral antes dos específicos)
            if (!a.subcategory_id && b.subcategory_id) return -1
            if (a.subcategory_id && !b.subcategory_id) return 1
            return (a.subcategory?.name || '').localeCompare(b.subcategory?.name || '')
        })

        return { success: true, data: budgets }
    } catch (error: any) {
        console.error('[getBudgets]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 6.2 getBudgetConsumptionForMonth
// ============================================================
export async function getBudgetConsumptionForMonth(
    year_month: string
): Promise<{ success: boolean; data?: BudgetConsumption[]; error?: string }> {
    try {
        const { supabase } = await getAuthedClient()
        const ym = yearMonthRegex.test(year_month) ? year_month : currentYearMonth()

        const { data, error } = await supabase.rpc('get_budget_consumption', { p_year_month: ym })
        if (error) throw error

        return { success: true, data: (data || []).map(mapConsumptionRow) }
    } catch (error: any) {
        console.error('[getBudgetConsumptionForMonth]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 6.3 getBudgetConsumptionForTransaction
// ============================================================
export async function getBudgetConsumptionForTransaction(input: {
    category_id: string
    subcategory_id?: string | null
    year_month: string
}): Promise<{ success: boolean; data?: BudgetConsumption | null; error?: string }> {
    try {
        const { supabase } = await getAuthedClient()
        const ym = yearMonthRegex.test(input.year_month) ? input.year_month : currentYearMonth()

        const { data, error } = await supabase.rpc('get_budget_consumption', { p_year_month: ym })
        if (error) throw error

        const rows = (data || []).map(mapConsumptionRow)
        // Prefere orçamento da subcategoria específica; cai para o geral da categoria
        const sub = input.subcategory_id ?? null
        const match =
            rows.find((r: BudgetConsumption) => r.category_id === input.category_id && r.subcategory_id === sub) ??
            rows.find((r: BudgetConsumption) => r.category_id === input.category_id && r.subcategory_id === null) ??
            null

        return { success: true, data: match }
    } catch (error: any) {
        console.error('[getBudgetConsumptionForTransaction]', error)
        return { success: false, error: error.message }
    }
}

// Lista todas as sobrescritas mensais de um orçamento (para o editor de meses)
export async function getBudgetMonths(
    budget_id: string
): Promise<{ success: boolean; data?: { year_month: string; amount: number }[]; error?: string }> {
    try {
        const { supabase, user } = await getAuthedClient()
        const { data, error } = await supabase
            .from('budget_months')
            .select('year_month, amount')
            .eq('budget_id', budget_id)
            .eq('user_id', user.id)
        if (error) throw error
        return { success: true, data: (data || []).map((m) => ({ year_month: m.year_month, amount: Number(m.amount) })) }
    } catch (error: any) {
        console.error('[getBudgetMonths]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 6.4 createBudget
// ============================================================
export async function createBudget(input: any) {
    try {
        const { supabase, user } = await getAuthedClient()
        const validated = budgetSchema.parse(input)

        // Verifica duplicidade (mesma categoria + subcategoria)
        let dupQuery = supabase
            .from('budgets')
            .select('id')
            .eq('user_id', user.id)
            .eq('category_id', validated.category_id)
        dupQuery = validated.subcategory_id
            ? dupQuery.eq('subcategory_id', validated.subcategory_id)
            : dupQuery.is('subcategory_id', null)

        const { data: existing } = await dupQuery.maybeSingle()
        if (existing) {
            return {
                success: false,
                error: validated.subcategory_id
                    ? 'Já existe um orçamento para esta subcategoria'
                    : 'Já existe um orçamento para esta categoria',
            }
        }

        const { data, error } = await supabase
            .from('budgets')
            .insert([{
                user_id: user.id,
                category_id: validated.category_id,
                subcategory_id: validated.subcategory_id ?? null,
                name: validated.name ?? null,
                default_amount: validated.default_amount,
            }])
            .select()
            .single()
        if (error) throw error

        revalidatePath('/orcamentos')
        return { success: true, data }
    } catch (error: any) {
        console.error('[createBudget]', error)
        return { success: false, error: error instanceof z.ZodError ? zodMessage(error) : error.message }
    }
}

// ============================================================
// 6.5 updateBudget
// ============================================================
export async function updateBudget(input: { id: string; name?: string | null; default_amount?: number }) {
    try {
        const { supabase, user } = await getAuthedClient()

        const patch: Record<string, any> = { updated_at: new Date().toISOString() }
        if (input.name !== undefined) patch.name = input.name || null
        if (input.default_amount !== undefined) {
            if (input.default_amount <= 0) throw new Error('O valor padrão deve ser maior que zero')
            patch.default_amount = input.default_amount
        }

        const { error } = await supabase
            .from('budgets')
            .update(patch)
            .eq('id', input.id)
            .eq('user_id', user.id)
        if (error) throw error

        revalidatePath('/orcamentos')
        return { success: true }
    } catch (error: any) {
        console.error('[updateBudget]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 6.6 upsertBudgetMonth
// ============================================================
export async function upsertBudgetMonth(input: { budget_id: string; year_month: string; amount: number }) {
    try {
        const { supabase, user } = await getAuthedClient()

        if (!yearMonthRegex.test(input.year_month)) throw new Error('Mês inválido (use YYYY-MM)')
        if (input.amount <= 0) throw new Error('O valor deve ser maior que zero')

        // Confirma posse do orçamento e pega o default
        const { data: budget, error: bErr } = await supabase
            .from('budgets')
            .select('id, default_amount')
            .eq('id', input.budget_id)
            .eq('user_id', user.id)
            .single()
        if (bErr || !budget) throw new Error('Orçamento não encontrado')

        // Se igual ao default → remove a sobrescrita (volta ao padrão)
        if (Number(input.amount) === Number(budget.default_amount)) {
            await supabase
                .from('budget_months')
                .delete()
                .eq('budget_id', input.budget_id)
                .eq('year_month', input.year_month)
                .eq('user_id', user.id)
            revalidatePath('/orcamentos')
            return { success: true, reset: true }
        }

        const { error } = await supabase
            .from('budget_months')
            .upsert(
                {
                    user_id: user.id,
                    budget_id: input.budget_id,
                    year_month: input.year_month,
                    amount: input.amount,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'budget_id,year_month' }
            )
        if (error) throw error

        revalidatePath('/orcamentos')
        return { success: true }
    } catch (error: any) {
        console.error('[upsertBudgetMonth]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 6.7 deleteBudgetMonth
// ============================================================
export async function deleteBudgetMonth(input: { budget_id: string; year_month: string }) {
    try {
        const { supabase, user } = await getAuthedClient()

        const { error } = await supabase
            .from('budget_months')
            .delete()
            .eq('budget_id', input.budget_id)
            .eq('year_month', input.year_month)
            .eq('user_id', user.id)
        if (error) throw error

        revalidatePath('/orcamentos')
        return { success: true }
    } catch (error: any) {
        console.error('[deleteBudgetMonth]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 6.8 deleteBudget
// ============================================================
export async function deleteBudget(id: string) {
    try {
        const { supabase, user } = await getAuthedClient()

        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
        if (error) throw error

        revalidatePath('/orcamentos')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('[deleteBudget]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 6.9 toggleBudgetActive
// ============================================================
export async function toggleBudgetActive(input: { id: string; is_active: boolean }) {
    try {
        const { supabase, user } = await getAuthedClient()

        const { error } = await supabase
            .from('budgets')
            .update({ is_active: input.is_active, updated_at: new Date().toISOString() })
            .eq('id', input.id)
            .eq('user_id', user.id)
        if (error) throw error

        revalidatePath('/orcamentos')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('[toggleBudgetActive]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 6.10 getBudgetsAlertSummary
// ============================================================
export async function getBudgetsAlertSummary(
    year_month?: string
): Promise<{ success: boolean; data?: BudgetAlertSummary; error?: string }> {
    try {
        const { supabase } = await getAuthedClient()
        const ym = year_month && yearMonthRegex.test(year_month) ? year_month : currentYearMonth()

        const { data, error } = await supabase.rpc('get_budget_consumption', { p_year_month: ym })
        if (error) throw error

        const rows = (data || []).map(mapConsumptionRow)
        const summary: BudgetAlertSummary = {
            warning: rows.filter((r: BudgetConsumption) => r.status === 'warning').length,
            exceeded: rows.filter((r: BudgetConsumption) => r.status === 'exceeded').length,
            total: rows.length,
        }

        return { success: true, data: summary }
    } catch (error: any) {
        console.error('[getBudgetsAlertSummary]', error)
        return { success: false, error: error.message }
    }
}
