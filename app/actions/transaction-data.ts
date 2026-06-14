'use server'

import { createClient } from '@/lib/supabase/server'
import { PaymentMethod, Category, Subcategory, Payee, Payer, Wallet } from '@/types/transaction'
import { Classification } from '@/types/entities' // Assuming entities has Classification, need to check. Actually lib/supabase/cadastros defines it.
import { unstable_noStore as noStore } from 'next/cache'

export async function getWallets() {
    noStore()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

    if (error) {
        console.error('[getWallets] Error:', error)
        return []
    }

    return (data || []) as Wallet[]
}

export async function getPaymentMethods() {
    noStore()
    const supabase = createClient()
    const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name')

    if (error) {
        console.error('[getPaymentMethods] Error:', error)
        return []
    }

    return (data || []) as PaymentMethod[]
}

export async function getPayers() {
    return getPayees('payer');
}

export async function getPayees(typeFilter?: 'payer' | 'favored') {
    noStore()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    let query = supabase
        .from('payees')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

    if (typeFilter) {
        query = query.or(`type.eq.${typeFilter},type.eq.both`)
    }

    const { data, error } = await query

    if (error) {
        console.error('[getPayees] Error:', error)
        return []
    }

    return (data || []) as Payee[]
}

export async function getCategories() {
    noStore()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

    if (error) {
        console.error('[getCategories] Error:', error)
        return []
    }

    return (data || []) as Category[]
}

export async function getSubcategories(categoryId: string) {
    noStore()
    if (!categoryId) return []

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .eq('user_id', user.id)
        .order('name')

    if (error) {
        console.error('[getSubcategories] Error:', error)
        return []
    }

    return (data || []) as Subcategory[]
}

export async function getAllSubcategories() {
    noStore()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

    if (error) {
        console.error('[getAllSubcategories] Error:', error)
        return []
    }

    return (data || []) as Subcategory[]
}

export async function getClassifications() {
    noStore()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('classifications')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

    if (error) {
        console.error('[getClassifications] Error:', error)
        return []
    }

    return (data || []) as Classification[]
}
