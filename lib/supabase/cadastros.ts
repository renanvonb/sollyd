// =====================================================
// SOLLYD - Types e Queries para Módulo de Cadastros
// =====================================================

import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES
// =====================================================

export interface Wallet {
    id: string;
    user_id: string;
    name: string;
    logo_url?: string;
    color?: string;
    icon?: string;
    is_principal: boolean;
    created_at: string;
    updated_at: string;
    transactions?: { count: number }[];
}

export interface Category {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    type: 'Receita' | 'Despesa';
    color: string;
    icon: string;
    is_default?: boolean;
    created_at: string;
    updated_at: string;
    transactions?: { count: number }[];
    subcategories?: { count: number }[];
}

export interface Subcategory {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    category_id: string;
    is_default?: boolean;
    created_at: string;
    updated_at: string;
    categories?: Category; // Joined data
}

export interface Classification {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    color: string;
    icon: string;
    is_default?: boolean;
    created_at: string;
    updated_at: string;
    transactions_count?: number;
    transactions?: { count: number }[];

}

// Pagadores (para Receitas) - com ícone
export interface Payer {
    id: string;
    user_id: string;
    name: string;
    color: string;
    icon: string;
    type?: 'payer' | 'favored' | 'both';
    created_at: string;
    updated_at: string;
    transactions?: { count: number }[];
}

// Favorecidos (para Despesas) - com ícone
export interface Payee {
    id: string;
    user_id: string;
    name: string;
    color: string;
    icon: string;
    type?: 'payer' | 'favored' | 'both';
    created_at: string;
    updated_at: string;
    transactions?: { count: number }[];
}

// =====================================================
// CRUD OPERATIONS - WALLETS
// =====================================================

export async function getWallets(): Promise<Wallet[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('wallets')
        .select('*, transactions(count)')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createWallet(wallet: Omit<Wallet, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Wallet> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('wallets')
        .insert({ ...wallet, user_id: user.id })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateWallet(id: string, wallet: Partial<Wallet>): Promise<Wallet> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('wallets')
        .update(wallet)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteWallet(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;
}

export async function setWalletAsPrincipal(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Desmarcar todas as outras
    await supabase
        .from('wallets')
        .update({ is_principal: false })
        .eq('user_id', user.id)
        .neq('id', id);

    // Marcar a selecionada
    await supabase
        .from('wallets')
        .update({ is_principal: true })
        .eq('id', id)
        .eq('user_id', user.id);
}

// =====================================================
// CRUD OPERATIONS - CATEGORIES (Unified)
// =====================================================

export async function getCategories(): Promise<Category[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('categories')
        .select('*, transactions(count), subcategories(count)')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createCategory(category: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, user_id: user.id })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('categories')
        .update(category)
        .eq('id', id)
        .eq('user_id', user.id) // Ensure RLS safety
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCategory(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;
}

// =====================================================
// CRUD OPERATIONS - SUBCATEGORIES
// =====================================================

export async function getSubcategories(): Promise<Subcategory[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('subcategories')
        .select(`
            *,
            categories (
                id,
                name
            )
        `)
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createSubcategory(subcategory: Omit<Subcategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Subcategory> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('subcategories')
        .insert({ ...subcategory, user_id: user.id })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateSubcategory(id: string, subcategory: Partial<Subcategory>): Promise<Subcategory> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('subcategories')
        .update(subcategory)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getSubcategoriesByCategoryId(categoryId: string): Promise<Subcategory[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('subcategories')
        .select('*, transactions(count)')
        .eq('category_id', categoryId)
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function deleteSubcategory(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;
}

// =====================================================
// CRUD OPERATIONS - CLASSIFICATIONS
// =====================================================

export async function getClassifications(): Promise<Classification[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('classifications')
        .select('*, transactions(count)')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createClassification(classification: Omit<Classification, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Classification> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('classifications')
        .insert({ ...classification, user_id: user.id })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateClassification(id: string, classification: Partial<Classification>): Promise<Classification> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('classifications')
        .update(classification)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteClassification(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
        .from('classifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;
}

// =====================================================
// CRUD OPERATIONS - PAYEES (Favorecidos)
// =====================================================

export async function getPayees(typeFilter?: 'payer' | 'favored'): Promise<Payee[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    let query = supabase
        .from('payees')
        .select('*, transactions(count)')
        .eq('user_id', user.id) // Filtro explícito de segurança (além do RLS)
        .order('name', { ascending: true });

    if (typeFilter) {
        query = query.or(`type.eq.${typeFilter},type.eq.both`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Erro ao buscar favorecidos:', error);
        if (error.code === '42501' || error.code === '403') {
            throw new Error('Sem permissão para visualizar favorecidos.');
        }
        throw error;
    }
    return data || [];
}

export async function createPayee(payee: Omit<Payee, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Payee> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const payload = { ...payee, user_id: user.id };
    console.log('[createPayee] Payload:', payload);

    const { data, error } = await supabase
        .from('payees')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar favorecido:', error);
        if (error.code === '42501' || error.code === '403') {
            throw new Error('Sem permissão para criar favorecido.');
        }
        throw error;
    }
    return data;
}

export async function updatePayee(id: string, payee: Partial<Payee>): Promise<Payee> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('payees')
        .update(payee)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        console.error('Erro ao atualizar favorecido:', error);
        if (error.code === '42501' || error.code === '403') {
            throw new Error('Sem permissão para atualizar este favorecido.');
        }
        throw error;
    }
    return data;
}

export async function deletePayee(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
        .from('payees')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Erro ao excluir favorecido:', error);
        if (error.code === '42501' || error.code === '403') {
            throw new Error('Sem permissão para excluir este favorecido.');
        }
        throw error;
    }
}

// =====================================================
// CRUD OPERATIONS - PAYERS (Pagadores - para Receitas)
// =====================================================

export async function getPayers(): Promise<Payer[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('payees')
        .select('*, transactions(count)')
        .eq('user_id', user.id)
        .or('type.eq.payer,type.eq.both')
        .order('name', { ascending: true });

    if (error) {
        console.error('Erro ao buscar pagadores:', error);
        if (error.code === '42501' || error.code === '403') {
            throw new Error('Sem permissão para visualizar pagadores.');
        }
        throw error;
    }
    return data || [];
}

export async function createPayer(payer: Omit<Payer, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Payer> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('payees')
        .insert({ ...payer, user_id: user.id })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar pagador:', error);
        if (error.code === '42501' || error.code === '403') {
            throw new Error('Sem permissão para criar pagador.');
        }
        throw error;
    }
    return data;
}

export async function updatePayer(id: string, payer: Partial<Payer>): Promise<Payer> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
        .from('payees')
        .update(payer)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        console.error('Erro ao atualizar pagador:', error);
        if (error.code === '42501' || error.code === '403') {
            throw new Error('Sem permissão para atualizar este pagador.');
        }
        throw error;
    }
    return data;
}

export async function deletePayer(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
        .from('payees')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Erro ao excluir pagador:', error);
        if (error.code === '42501' || error.code === '403') {
            throw new Error('Sem permissão para excluir este pagador.');
        }
        throw error;
    }
}
