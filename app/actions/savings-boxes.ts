'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { enrichSavingsBox } from '@/lib/savings-box-utils'
import type { SavingsBox, SavingsBoxWithProgress } from '@/types/savings-box'

const emptyToNull = (val: any) => (val === '' || val === undefined ? null : val)

const todayISO = () => new Date().toISOString().split('T')[0]

const savingsBoxSchema = z.object({
    name: z.string().min(1, 'O nome é obrigatório').max(50, 'Máximo de 50 caracteres'),
    description: z.preprocess(emptyToNull, z.string().max(200, 'Máximo de 200 caracteres').nullable().optional()),
    target_amount: z.coerce.number().gt(0, 'O valor alvo deve ser maior que zero'),
    color: z.string().min(1, 'A cor é obrigatória'),
    icon: z.string().min(1, 'O ícone é obrigatório'),
    target_date: z.preprocess(emptyToNull, z.string().nullable().optional()).refine(
        (val) => !val || val >= todayISO(),
        { message: 'A data alvo deve ser uma data futura' }
    ),
})

const contributionSchema = z.object({
    savings_box_id: z.string().uuid('Caixinha inválida'),
    amount: z.coerce.number().gt(0, 'O valor deve ser maior que zero'),
    note: z.preprocess(emptyToNull, z.string().max(200, 'Máximo de 200 caracteres').nullable().optional()),
    contributed_at: z.preprocess(emptyToNull, z.string().nullable().optional()),
})

function zodMessage(error: z.ZodError) {
    return 'Dados inválidos: ' + error.issues.map((e) => e.message).join(', ')
}

// ============================================================
// 4.1 getSavingsBoxes
// ============================================================
export async function getSavingsBoxes(
    includeArchived = false
): Promise<{ success: boolean; data?: SavingsBoxWithProgress[]; error?: string }> {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Usuário não autenticado')

        let query = supabase
            .from('savings_boxes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (!includeArchived) query = query.eq('is_archived', false)

        const { data, error } = await query
        if (error) throw error

        return { success: true, data: (data as SavingsBox[]).map(enrichSavingsBox) }
    } catch (error: any) {
        console.error('[getSavingsBoxes]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 4.1b getSavingsBoxesSummaryForDashboard
// ============================================================
export async function getSavingsBoxesSummaryForDashboard(): Promise<{ success: boolean; data?: { total_current_amount: number }; error?: string }> {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Usuário não autenticado')

        const { data, error } = await supabase
            .from('savings_boxes')
            .select('current_amount')
            .eq('user_id', user.id)
            .eq('is_archived', false)
        if (error) throw error

        const total = (data || []).reduce((sum, box) => sum + Number(box.current_amount), 0)
        return { success: true, data: { total_current_amount: total } }
    } catch (error: any) {
        console.error('[getSavingsBoxesSummaryForDashboard]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 4.2 getSavingsBoxById
// ============================================================
export async function getSavingsBoxById(
    id: string
): Promise<{ success: boolean; data?: SavingsBoxWithProgress; error?: string }> {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Usuário não autenticado')

        const { data, error } = await supabase
            .from('savings_boxes')
            .select('*, contributions:savings_box_contributions(*)')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (error) throw error

        const box = data as SavingsBox
        box.contributions = (box.contributions || []).sort((a, b) =>
            b.contributed_at.localeCompare(a.contributed_at)
        )

        return { success: true, data: enrichSavingsBox(box) }
    } catch (error: any) {
        console.error('[getSavingsBoxById]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 4.3 createSavingsBox
// ============================================================
export async function createSavingsBox(input: any) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Usuário não autenticado')

        const validated = savingsBoxSchema.parse(input)

        const { data, error } = await supabase
            .from('savings_boxes')
            .insert([{
                user_id: user.id,
                name: validated.name,
                description: validated.description ?? null,
                target_amount: validated.target_amount,
                color: validated.color,
                icon: validated.icon,
                target_date: validated.target_date ?? null,
            }])
            .select()
            .single()

        if (error) throw error

        revalidatePath('/caixinhas')
        return { success: true, data }
    } catch (error: any) {
        console.error('[createSavingsBox]', error)
        return { success: false, error: error instanceof z.ZodError ? zodMessage(error) : error.message }
    }
}

// ============================================================
// 4.4 addContribution
// ============================================================
export async function addContribution(input: any) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Usuário não autenticado')

        const validated = contributionSchema.parse(input)
        const contributedAt = validated.contributed_at || todayISO()

        // Busca a caixinha (valida posse + pega nome)
        const { data: box, error: boxError } = await supabase
            .from('savings_boxes')
            .select('id, name, current_amount, target_amount')
            .eq('id', validated.savings_box_id)
            .eq('user_id', user.id)
            .single()
        if (boxError || !box) throw new Error('Caixinha não encontrada')

        // 1. Cria transação contábil (Despesa, sem carteira)
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .insert([{
                user_id: user.id,
                description: `Aporte: ${box.name}`,
                amount: validated.amount,
                type: 'Despesa',
                status: 'Realizado',
                date: contributedAt,
                wallet_id: null,
            }])
            .select('id')
            .single()
        if (txError) throw txError

        // 2. Insere o aporte vinculado à transação (trigger atualiza current_amount)
        const { error: contribError } = await supabase
            .from('savings_box_contributions')
            .insert([{
                user_id: user.id,
                savings_box_id: validated.savings_box_id,
                transaction_id: tx.id,
                amount: validated.amount,
                note: validated.note ?? null,
                contributed_at: contributedAt,
            }])
        if (contribError) {
            // rollback da transação órfã
            await supabase.from('transactions').delete().eq('id', tx.id)
            throw contribError
        }

        const isCompleted = Number(box.current_amount) + validated.amount >= Number(box.target_amount)

        revalidatePath('/caixinhas')
        revalidatePath('/transacoes')
        return { success: true, completed: isCompleted }
    } catch (error: any) {
        console.error('[addContribution]', error)
        return { success: false, error: error instanceof z.ZodError ? zodMessage(error) : error.message }
    }
}

// ============================================================
// 4.5 deleteContribution
// ============================================================
export async function deleteContribution(contribution_id: string) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Usuário não autenticado')

        const { data: contrib, error: fetchError } = await supabase
            .from('savings_box_contributions')
            .select('id, transaction_id')
            .eq('id', contribution_id)
            .eq('user_id', user.id)
            .single()
        if (fetchError || !contrib) throw new Error('Aporte não encontrado')

        const { error: delError } = await supabase
            .from('savings_box_contributions')
            .delete()
            .eq('id', contribution_id)
            .eq('user_id', user.id)
        if (delError) throw delError

        if (contrib.transaction_id) {
            await supabase
                .from('transactions')
                .delete()
                .eq('id', contrib.transaction_id)
                .eq('user_id', user.id)
        }

        revalidatePath('/caixinhas')
        revalidatePath('/transacoes')
        return { success: true }
    } catch (error: any) {
        console.error('[deleteContribution]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 4.6 updateSavingsBox
// ============================================================
export async function updateSavingsBox(id: string, input: any) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Usuário não autenticado')

        const validated = savingsBoxSchema.parse(input)

        const { error } = await supabase
            .from('savings_boxes')
            .update({
                name: validated.name,
                description: validated.description ?? null,
                target_amount: validated.target_amount,
                color: validated.color,
                icon: validated.icon,
                target_date: validated.target_date ?? null,
            })
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) throw error

        revalidatePath('/caixinhas')
        return { success: true }
    } catch (error: any) {
        console.error('[updateSavingsBox]', error)
        return { success: false, error: error instanceof z.ZodError ? zodMessage(error) : error.message }
    }
}

// ============================================================
// 4.7 deleteSavingsBox
// ============================================================
export async function deleteSavingsBox(id: string) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Usuário não autenticado')

        // Busca transações vinculadas antes do CASCADE
        const { data: contribs } = await supabase
            .from('savings_box_contributions')
            .select('transaction_id')
            .eq('savings_box_id', id)
            .eq('user_id', user.id)

        const txIds = (contribs || [])
            .map((c) => c.transaction_id)
            .filter((t): t is string => !!t)

        const { error } = await supabase
            .from('savings_boxes')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
        if (error) throw error

        if (txIds.length > 0) {
            await supabase
                .from('transactions')
                .delete()
                .in('id', txIds)
                .eq('user_id', user.id)
        }

        revalidatePath('/caixinhas')
        revalidatePath('/transacoes')
        return { success: true }
    } catch (error: any) {
        console.error('[deleteSavingsBox]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 4.8 archiveSavingsBox
// ============================================================
export async function archiveSavingsBox(id: string, archived = true) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Usuário não autenticado')

        const { error } = await supabase
            .from('savings_boxes')
            .update({ is_archived: archived })
            .eq('id', id)
            .eq('user_id', user.id)
        if (error) throw error

        revalidatePath('/caixinhas')
        return { success: true }
    } catch (error: any) {
        console.error('[archiveSavingsBox]', error)
        return { success: false, error: error.message }
    }
}
