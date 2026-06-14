// =====================================================
// SOLLYD - TIPOS DE ENTIDADES DE CADASTROS
// =====================================================

export interface Wallet {
    id: string;
    user_id: string;
    name: string;
    color: string;
    logo?: string;
    balance?: number;
    is_active: boolean;
    is_principal: boolean;
    created_at: string;
    updated_at: string;
    transactions?: { count: number }[];
}

export interface Payer {
    id: string;
    user_id: string;
    name: string;
    type?: 'Receita' | 'Despesa';
    color?: string;
    created_at: string;
    updated_at: string;
    transactions?: { count: number }[];
}

export interface Beneficiary {
    id: string;
    user_id: string;
    name: string;
    classification_id?: string;
    icon: string;
    color: string;
    created_at: string;
    updated_at: string;
    transactions?: { count: number }[];
}

export interface Category {
    id: string;
    user_id: string;
    name: string;
    type: 'Receita' | 'Despesa';
    icon: string;
    color: string;
    is_default?: boolean;
    created_at: string;
    updated_at: string;
    // Propriedades computadas
    subcategories_count?: number;
    classifications?: Classification;
    transactions?: { count: number }[];
    subcategories?: { count: number }[];
}

export interface Subcategory {
    id: string;
    user_id: string;
    category_id: string;
    name: string;
    description?: string;
    is_default?: boolean;
    created_at: string;
    updated_at: string;
    transactions?: { count: number }[];
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
    categories?: { count: number }[];
}
