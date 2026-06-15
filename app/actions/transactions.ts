'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { addMonths, addYears, startOfMonth, format, parseISO } from 'date-fns'
import { TRANSACTION_TYPES, TRANSACTION_STATUS, PAYMENT_METHOD_LIST, normalizeTransactionType } from '@/lib/constants'

const emptyToNull = (val: any) => (val === "" ? null : val);

const transactionSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    amount: z.coerce.number().gt(0, "Valor deve ser maior que zero"),
    // Normaliza valores legados (revenue/expense) → canônico; enum só aceita 'Receita'/'Despesa'.
    type: z.preprocess(normalizeTransactionType, z.enum([TRANSACTION_TYPES.RECEITA, TRANSACTION_TYPES.DESPESA])),
    payee_id: z.preprocess(emptyToNull, z.string().uuid().optional().nullable()),
    payment_method: z.preprocess(emptyToNull, z.enum(PAYMENT_METHOD_LIST).optional().nullable()),
    classification_id: z.preprocess(emptyToNull, z.string().uuid().optional().nullable()),
    category_id: z.preprocess(emptyToNull, z.string().uuid().optional().nullable()),
    subcategory_id: z.preprocess(emptyToNull, z.string().uuid().optional().nullable()),
    date: z.preprocess(emptyToNull, z.union([z.string(), z.date()]).optional().nullable()),
    realized_at: z.preprocess(emptyToNull, z.union([z.string(), z.date()]).optional().nullable()),
    competence: z.preprocess(emptyToNull, z.union([z.string(), z.date()]).optional().nullable()),
    status: z.enum([TRANSACTION_STATUS.REALIZADO, TRANSACTION_STATUS.PENDENTE]).optional().nullable(),
    wallet_id: z.preprocess(emptyToNull, z.string().uuid().optional().nullable()),
    is_recurring: z.boolean().optional().default(false),
    is_installment: z.boolean().optional().default(false),
    recurring_frequency: z.enum(['monthly', 'yearly']).optional().nullable(),
    recurring_occurrences: z.coerce.number().min(2).max(60).optional().nullable(),
}).superRefine((data, ctx) => {
    // Payee/Payer validation — exigido para ambos os tipos
    if (!data.payee_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: data.type === TRANSACTION_TYPES.RECEITA ? "Pagador é obrigatório" : "Favorecido é obrigatório",
            path: ["payee_id"],
        });
    }
});

export async function saveTransaction(formData: any) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            throw new Error('Sessão expirada ou usuário não autenticado. Por favor, faça login novamente.')
        }

        const userId = user.id

        // Validar dados via Zod
        const validated = transactionSchema.parse(formData)

        const transactionToInsert = {
            user_id: userId,
            description: validated.description,
            amount: validated.amount,
            type: validated.type,
            payee_id: validated.payee_id,
            payment_method: validated.payment_method,
            classification_id: validated.classification_id,
            category_id: validated.category_id,
            subcategory_id: validated.subcategory_id,
            is_installment: false,
            date: validated.date,
            realized_at: validated.realized_at,
            competence: validated.competence,
            status: validated.status,
            wallet_id: validated.wallet_id,
        }

        if ((validated.is_recurring || validated.is_installment) && validated.recurring_occurrences) {
            const groupId = crypto.randomUUID()
            const freq = validated.recurring_frequency || 'monthly'
            // parseISO trata "yyyy-MM-01" como horário local (new Date() interpretaria como UTC,
            // deslocando o mês em fusos negativos, ex.: 2026-07-01 → 30/06 local).
            const baseComp = validated.competence
                ? startOfMonth(typeof validated.competence === 'string' ? parseISO(validated.competence) : validated.competence)
                : startOfMonth(new Date())

            const count = validated.recurring_occurrences
            // Parcelamento: divide o valor total pelas parcelas (resto vai na última).
            const perInstallment = validated.is_installment
                ? Math.round((validated.amount / count) * 100) / 100
                : validated.amount
            const lastInstallment = validated.is_installment
                ? Math.round((validated.amount - perInstallment * (count - 1)) * 100) / 100
                : validated.amount

            const rows = Array.from({ length: count }, (_, i) => {
                const comp = freq === 'yearly'
                    ? addYears(baseComp, i)
                    : addMonths(baseComp, i)
                return {
                    ...transactionToInsert,
                    amount: validated.is_installment
                        ? (i === count - 1 ? lastInstallment : perInstallment)
                        : validated.amount,
                    description: validated.is_installment
                        ? `${validated.description} (${i + 1}/${count})`
                        : validated.description,
                    competence: format(comp, 'yyyy-MM-01'),
                    date: null,
                    realized_at: null,
                    status: 'Pendente',
                    is_recurring: !!validated.is_recurring,
                    is_installment: !!validated.is_installment,
                    recurring_frequency: freq,
                    recurring_occurrences: count,
                    recurring_group_id: groupId,
                }
            })

            const { error: insertError } = await supabase.from('transactions').insert(rows)
            if (insertError) {
                console.error('[saveTransaction] Recurring insert error:', insertError)
                throw new Error(`Erro ao salvar no banco: ${insertError.message}`)
            }
        } else {
            const { error: insertError } = await supabase
                .from('transactions')
                .insert([transactionToInsert])

            if (insertError) {
                console.error('[saveTransaction] Database Error:', insertError)
                throw new Error(`Erro ao salvar no banco: ${insertError.message}`)
            }
        }

        revalidatePath('/financeiro/transacoes')
        revalidatePath('/transactions')
        return { success: true }

    } catch (error: any) {
        console.error('[saveTransaction] Exception:', error)
        return {
            success: false,
            error: error instanceof z.ZodError
                ? "Dados inválidos: " + error.issues.map(e => e.message).join(", ")
                : error.message
        }
    }
}


export async function deleteTransaction(id: string) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            throw new Error('Sessão expirada ou usuário não autenticado.')
        }

        const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id) // Ensure user can only delete their own transactions

        if (deleteError) {
            console.error('[deleteTransaction] Database Error:', deleteError)
            throw new Error(`Erro ao excluir transação: ${deleteError.message}`)
        }

        revalidatePath('/financeiro/transacoes')
        return { success: true }

    } catch (error: any) {
        console.error('[deleteTransaction] Exception:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

export async function updateTransaction(id: string, formData: any) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            throw new Error('Sessão expirada ou usuário não autenticado.')
        }

        const userId = user.id

        // Validar dados via Zod
        const validated = transactionSchema.parse(formData)

        const transactionToUpdate = {
            description: validated.description,
            amount: validated.amount,
            type: validated.type,
            payee_id: validated.payee_id,
            payment_method: validated.payment_method,
            classification_id: validated.classification_id,
            category_id: validated.category_id,
            subcategory_id: validated.subcategory_id,
            is_installment: false,

            date: validated.date || null,
            realized_at: validated.realized_at || null,
            competence: validated.competence || null,
            status: validated.status || null,
            wallet_id: validated.wallet_id || null,
        }

        const { error: updateError } = await supabase
            .from('transactions')
            .update(transactionToUpdate)
            .eq('id', id)
            .eq('user_id', userId) // Ensure user can only update their own transactions

        if (updateError) {
            console.error('[updateTransaction] Database Error:', updateError)
            throw new Error(`Erro ao atualizar transação: ${updateError.message}`)
        }

        revalidatePath('/financeiro/transacoes')
        revalidatePath('/transactions')
        return { success: true }

    } catch (error: any) {
        console.error('[updateTransaction] Exception:', error)
        return {
            success: false,
            error: error instanceof z.ZodError
                ? "Dados inválidos: " + error.issues.map(e => e.message).join(", ")
                : error.message
        }
    }
}

export async function markAsPaid(id: string) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            throw new Error('Sessão expirada ou usuário não autenticado.')
        }

        // Data atual no formato YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0]

        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                status: 'Realizado',
                date: today
            })
            .eq('id', id)
            .eq('user_id', user.id) // Ensure user can only update their own transactions

        if (updateError) {
            console.error('[markAsPaid] Database Error:', updateError)
            throw new Error(`Erro ao marcar como pago: ${updateError.message}`)
        }

        revalidatePath('/financeiro/transacoes')
        revalidatePath('/transacoes')
        return { success: true }

    } catch (error: any) {
        console.error('[markAsPaid] Exception:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

export async function markAsPending(id: string) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            throw new Error('Sessão expirada ou usuário não autenticado.')
        }

        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                status: 'Pendente',
                date: null
            })
            .eq('id', id)
            .eq('user_id', user.id) // Ensure user can only update their own transactions

        if (updateError) {
            console.error('[markAsPending] Database Error:', updateError)
            throw new Error(`Erro ao marcar como pendente: ${updateError.message}`)
        }

        revalidatePath('/financeiro/transacoes')
        revalidatePath('/transacoes')
        return { success: true }

    } catch (error: any) {
        console.error('[markAsPending] Exception:', error)
        return {
            success: false,
            error: error.message
        }
    }
}
