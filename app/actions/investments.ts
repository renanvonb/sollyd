'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { buildPortfolioSummary } from '@/lib/investment-utils'
import { INVESTMENT_CLASSES } from '@/types/investment'
import type { InvestmentAsset, PortfolioSummary, InvestmentDashboardSummary, OperationType } from '@/types/investment'

const emptyToNull = (v: any) => (v === '' || v === undefined ? null : v)
const todayISO = () => new Date().toISOString().split('T')[0]

function zodMessage(error: z.ZodError) {
    return 'Dados inválidos: ' + error.issues.map((e) => e.message).join(', ')
}

async function getAuthedClient() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Usuário não autenticado')
    return { supabase, user }
}

const assetSchema = z.object({
    name: z.string().min(1, 'O nome é obrigatório').max(100, 'Máximo de 100 caracteres'),
    ticker: z.preprocess(emptyToNull, z.string().max(20).nullable().optional()),
    asset_class: z.enum(['renda_fixa', 'renda_variavel', 'fundos', 'cripto']),
    asset_type: z.string().min(1, 'O tipo é obrigatório'),
    institution: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
    wallet_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    notes: z.preprocess(emptyToNull, z.string().max(300).nullable().optional()),
    initial_amount: z.preprocess(emptyToNull, z.coerce.number().gt(0).nullable().optional()),
    initial_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
})

// ============================================================
// 7.1 getInvestmentAssets
// ============================================================
export async function getInvestmentAssets(): Promise<{ success: boolean; data?: InvestmentAsset[]; error?: string }> {
    try {
        const { supabase, user } = await getAuthedClient()
        const { data, error } = await supabase
            .from('investment_assets')
            .select('*, wallet:wallets(id, name, color)')
            .eq('user_id', user.id)
            .order('asset_class', { ascending: true })
            .order('name', { ascending: true })
        if (error) throw error
        return { success: true, data: data as InvestmentAsset[] }
    } catch (error: any) {
        console.error('[getInvestmentAssets]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 7.2 getAssetById
// ============================================================
export async function getAssetById(id: string): Promise<{ success: boolean; data?: InvestmentAsset; error?: string }> {
    try {
        const { supabase, user } = await getAuthedClient()
        const { data, error } = await supabase
            .from('investment_assets')
            .select('*, wallet:wallets(id, name, color), operations:investment_operations(*)')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()
        if (error) throw error

        const asset = data as InvestmentAsset
        asset.operations = (asset.operations || []).sort((a, b) => {
            const d = b.operation_date.localeCompare(a.operation_date)
            return d !== 0 ? d : b.created_at.localeCompare(a.created_at)
        })
        return { success: true, data: asset }
    } catch (error: any) {
        console.error('[getAssetById]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 7.3 getPortfolioSummary
// ============================================================
export async function getPortfolioSummary(): Promise<{ success: boolean; data?: PortfolioSummary; error?: string }> {
    try {
        const { supabase, user } = await getAuthedClient()
        const { data, error } = await supabase
            .from('investment_assets')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
        if (error) throw error
        return { success: true, data: buildPortfolioSummary((data || []) as InvestmentAsset[]) }
    } catch (error: any) {
        console.error('[getPortfolioSummary]', error)
        return { success: false, error: error.message }
    }
}

// Resumo enxuto para o card do dashboard
export async function getInvestmentSummaryForDashboard(): Promise<{ success: boolean; data?: InvestmentDashboardSummary; error?: string }> {
    try {
        const res = await getPortfolioSummary()
        if (!res.success || !res.data) throw new Error(res.error || 'Erro ao calcular patrimônio')
        const s = res.data
        return {
            success: true,
            data: {
                total_current_value: s.total_current_value,
                total_gain_loss: s.total_gain_loss,
                total_gain_loss_pct: s.total_gain_loss_pct,
                has_assets: s.total_current_value > 0 || s.total_invested > 0,
            },
        }
    } catch (error: any) {
        console.error('[getInvestmentSummaryForDashboard]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 7.6 registerOperation (definido antes de createInvestmentAsset por reuso)
// ============================================================
const operationSchema = z.object({
    asset_id: z.string().uuid('Ativo inválido'),
    operation_type: z.enum(['aporte', 'resgate', 'rendimento', 'atualizacao_valor']),
    amount: z.preprocess(emptyToNull, z.coerce.number().gt(0).nullable().optional()),
    new_value: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
    operation_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
    notes: z.preprocess(emptyToNull, z.string().max(300).nullable().optional()),
    wallet_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
})

export async function registerOperation(input: any) {
    try {
        const { supabase, user } = await getAuthedClient()
        const v = operationSchema.parse(input)
        const opDate = v.operation_date || todayISO()

        const { data: asset, error: assetErr } = await supabase
            .from('investment_assets')
            .select('*')
            .eq('id', v.asset_id)
            .eq('user_id', user.id)
            .single()
        if (assetErr || !asset) throw new Error('Ativo não encontrado')

        // Validação por tipo
        if (v.operation_type === 'atualizacao_valor') {
            if (v.new_value == null) throw new Error('Informe o novo valor atual')
        } else {
            if (v.amount == null || v.amount <= 0) throw new Error('Informe um valor maior que zero')
            if (v.operation_type === 'resgate' && v.amount > Number(asset.total_invested)) {
                throw new Error(`Valor de resgate não pode ser maior que o total investido (${Number(asset.total_invested).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`)
            }
        }

        const resolvedWallet = v.wallet_id ?? asset.wallet_id ?? null
        let transactionId: string | null = null
        let createsTransaction = false
        let txDescription = ''
        let txType: 'Despesa' | 'Receita' = 'Despesa'

        if (v.operation_type === 'aporte') {
            createsTransaction = true; txType = 'Despesa'; txDescription = `Aporte: ${asset.name}`
        } else if (v.operation_type === 'resgate') {
            createsTransaction = true; txType = 'Receita'; txDescription = `Resgate: ${asset.name}`
        } else if (v.operation_type === 'rendimento') {
            createsTransaction = true; txType = 'Receita'; txDescription = `Rendimento: ${asset.name}`
        }

        // 1. Cria transação (se aplicável)
        if (createsTransaction) {
            const { data: tx, error: txErr } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    description: txDescription,
                    amount: v.amount,
                    type: txType,
                    status: 'Realizado',
                    date: opDate,
                    wallet_id: resolvedWallet,
                }])
                .select('id')
                .single()
            if (txErr) throw txErr
            transactionId = tx.id
        }

        // 2. Insere a operação (triggers cuidam de total_invested/total_income e current_value p/ atualizacao_valor)
        const { error: opErr } = await supabase
            .from('investment_operations')
            .insert([{
                user_id: user.id,
                asset_id: v.asset_id,
                operation_type: v.operation_type,
                amount: v.operation_type === 'atualizacao_valor' ? null : v.amount,
                new_value: v.operation_type === 'atualizacao_valor' ? v.new_value : null,
                transaction_id: transactionId,
                operation_date: opDate,
                notes: v.notes ?? null,
            }])
        if (opErr) {
            if (transactionId) await supabase.from('transactions').delete().eq('id', transactionId)
            throw opErr
        }

        // 3. Ajusta current_value e is_active conforme o tipo (current_value não é mantido por trigger, exceto atualizacao_valor)
        let closed = false
        let reactivated = false
        if (v.operation_type !== 'atualizacao_valor') {
            const patch: Record<string, any> = { updated_at: new Date().toISOString() }
            const cur = Number(asset.current_value)
            if (v.operation_type === 'aporte') {
                patch.current_value = cur + (v.amount as number)
                if (!asset.is_active) { patch.is_active = true; reactivated = true }
            } else if (v.operation_type === 'rendimento') {
                patch.current_value = cur + (v.amount as number)
            } else if (v.operation_type === 'resgate') {
                const next = cur - (v.amount as number)
                patch.current_value = next
                if (next <= 0) { patch.is_active = false; closed = true }
            }
            await supabase.from('investment_assets').update(patch).eq('id', v.asset_id).eq('user_id', user.id)
        }

        revalidatePath('/investimentos')
        revalidatePath('/dashboard')
        if (createsTransaction) revalidatePath('/transacoes')
        return { success: true, closed, reactivated }
    } catch (error: any) {
        console.error('[registerOperation]', error)
        return { success: false, error: error instanceof z.ZodError ? zodMessage(error) : error.message }
    }
}

// ============================================================
// 7.4 createInvestmentAsset
// ============================================================
export async function createInvestmentAsset(input: any) {
    try {
        const { supabase, user } = await getAuthedClient()
        const v = assetSchema.parse(input)

        // current_value inicia em 0; o aporte inicial (se houver) define o valor via registerOperation
        const { data: asset, error } = await supabase
            .from('investment_assets')
            .insert([{
                user_id: user.id,
                name: v.name,
                ticker: v.ticker ?? null,
                asset_class: v.asset_class,
                asset_type: v.asset_type,
                institution: v.institution ?? null,
                wallet_id: v.wallet_id ?? null,
                notes: v.notes ?? null,
                current_value: 0,
            }])
            .select()
            .single()
        if (error) throw error

        if (v.initial_amount && v.initial_amount > 0) {
            const opRes = await registerOperation({
                asset_id: asset.id,
                operation_type: 'aporte',
                amount: v.initial_amount,
                operation_date: v.initial_date || todayISO(),
                notes: 'Aporte inicial',
            })
            if (!opRes.success) {
                // mantém o ativo criado, mas reporta o erro do aporte
                return { success: false, error: `Ativo criado, porém falha no aporte inicial: ${opRes.error}` }
            }
        }

        revalidatePath('/investimentos')
        revalidatePath('/dashboard')
        return { success: true, data: asset }
    } catch (error: any) {
        console.error('[createInvestmentAsset]', error)
        return { success: false, error: error instanceof z.ZodError ? zodMessage(error) : error.message }
    }
}

// ============================================================
// 7.5 updateInvestmentAsset
// ============================================================
export async function updateInvestmentAsset(id: string, input: any) {
    try {
        const { supabase, user } = await getAuthedClient()
        const patch: Record<string, any> = { updated_at: new Date().toISOString() }
        if (input.name !== undefined) {
            if (!String(input.name).trim()) throw new Error('O nome é obrigatório')
            patch.name = String(input.name).trim()
        }
        if (input.ticker !== undefined) patch.ticker = input.ticker || null
        if (input.institution !== undefined) patch.institution = input.institution || null
        if (input.wallet_id !== undefined) patch.wallet_id = input.wallet_id || null
        if (input.notes !== undefined) patch.notes = input.notes || null

        const { error } = await supabase
            .from('investment_assets')
            .update(patch)
            .eq('id', id)
            .eq('user_id', user.id)
        if (error) throw error

        revalidatePath('/investimentos')
        return { success: true }
    } catch (error: any) {
        console.error('[updateInvestmentAsset]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 7.7 deleteOperation
// ============================================================
export async function deleteOperation(operation_id: string) {
    try {
        const { supabase, user } = await getAuthedClient()

        const { data: op, error: opErr } = await supabase
            .from('investment_operations')
            .select('*')
            .eq('id', operation_id)
            .eq('user_id', user.id)
            .single()
        if (opErr || !op) throw new Error('Operação não encontrada')

        const { data: asset } = await supabase
            .from('investment_assets')
            .select('*')
            .eq('id', op.asset_id)
            .eq('user_id', user.id)
            .single()

        // Deleta transação vinculada (operações que não são atualizacao_valor)
        if (op.operation_type !== 'atualizacao_valor' && op.transaction_id) {
            await supabase.from('transactions').delete().eq('id', op.transaction_id).eq('user_id', user.id)
        }

        // Deleta a operação (trigger ressincroniza total_invested/total_income)
        const { error: delErr } = await supabase
            .from('investment_operations')
            .delete()
            .eq('id', operation_id)
            .eq('user_id', user.id)
        if (delErr) throw delErr

        // Ajusta current_value
        if (asset) {
            const patch: Record<string, any> = { updated_at: new Date().toISOString() }
            const cur = Number(asset.current_value)
            if (op.operation_type === 'aporte') patch.current_value = cur - Number(op.amount)
            else if (op.operation_type === 'rendimento') patch.current_value = cur - Number(op.amount)
            else if (op.operation_type === 'resgate') patch.current_value = cur + Number(op.amount)
            else if (op.operation_type === 'atualizacao_valor') {
                // Recupera a última atualizacao_valor anterior; senão usa total_invested
                const { data: prev } = await supabase
                    .from('investment_operations')
                    .select('new_value, operation_date, created_at')
                    .eq('asset_id', op.asset_id)
                    .eq('operation_type', 'atualizacao_valor')
                    .order('operation_date', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(1)
                if (prev && prev.length > 0 && prev[0].new_value != null) {
                    patch.current_value = Number(prev[0].new_value)
                } else {
                    patch.current_value = Number(asset.total_invested)
                }
            }
            await supabase.from('investment_assets').update(patch).eq('id', op.asset_id).eq('user_id', user.id)
        }

        revalidatePath('/investimentos')
        revalidatePath('/dashboard')
        if (op.transaction_id) revalidatePath('/transacoes')
        return { success: true }
    } catch (error: any) {
        console.error('[deleteOperation]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 7.8 archiveAsset
// ============================================================
export async function archiveAsset(id: string, active = false) {
    try {
        const { supabase, user } = await getAuthedClient()
        const { error } = await supabase
            .from('investment_assets')
            .update({ is_active: active, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id)
        if (error) throw error
        revalidatePath('/investimentos')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('[archiveAsset]', error)
        return { success: false, error: error.message }
    }
}

// ============================================================
// 7.9 deleteAsset
// ============================================================
export async function deleteAsset(id: string) {
    try {
        const { supabase, user } = await getAuthedClient()

        const { data: ops } = await supabase
            .from('investment_operations')
            .select('transaction_id')
            .eq('asset_id', id)
            .eq('user_id', user.id)
        const txIds = (ops || []).map((o) => o.transaction_id).filter((t): t is string => !!t)

        const { error } = await supabase
            .from('investment_assets')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
        if (error) throw error

        if (txIds.length > 0) {
            await supabase.from('transactions').delete().in('id', txIds).eq('user_id', user.id)
        }

        revalidatePath('/investimentos')
        revalidatePath('/dashboard')
        revalidatePath('/transacoes')
        return { success: true }
    } catch (error: any) {
        console.error('[deleteAsset]', error)
        return { success: false, error: error.message }
    }
}
