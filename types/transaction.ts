export type TransactionType = 'revenue' | 'expense' | 'Receita' | 'Despesa';
export type TransactionClassification = 'essential' | 'necessary' | 'superfluous';

export interface Payer {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    created_at: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    created_at: string;
}

export interface Payee {
    id: string;
    name: string;
    type?: string;
    color?: string;
    icon?: string;
    created_at: string;
}

export interface Category {
    id: string;
    name: string;
    type?: 'Receita' | 'Despesa';
    color?: string;
    icon?: string;
    is_default?: boolean;
    created_at: string;
}

export interface Subcategory {
    id: string;
    name: string;
    category_id: string;
    color?: string;
    is_default?: boolean;
    created_at: string;
}

export interface Classification {
    id: string;
    name: string;
    description?: string;
    color: string;
    is_default?: boolean;
    created_at: string;
}

export interface Wallet {
    id: string;
    name: string;
    logo_url?: string;
    color?: string;
    icon?: string;
    is_principal: boolean;
    created_at: string;
}

export interface SavingsBoxRef {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export interface Transaction {
    id: string;
    user_id: string;
    description: string;
    amount: number;
    type: TransactionType;
    payer_id?: string;
    payee_id?: string;
    payment_method?: string;
    classification_id?: string;
    category_id?: string;
    subcategory_id?: string;

    date?: string;
    wallet_id?: string;
    competence?: string;
    observation?: string;
    status?: string;
    is_recurring?: boolean;
    recurring_frequency?: 'monthly' | 'yearly';
    recurring_occurrences?: number;
    recurring_group_id?: string;
    created_at: string;
    updated_at: string;
    // Joined relations
    payers?: Payer;
    payees?: Payee;

    classifications?: Classification;
    categories?: Category;
    subcategories?: Subcategory;
    wallets?: Wallet;
    savings_box_contributions?: { savings_box_id: string; savings_boxes?: SavingsBoxRef }[];
}

export interface CreateTransactionInput {
    description: string;
    amount: number;
    type: TransactionType;
    payer_id?: string;
    payee_id?: string;
    payment_method?: string;
    classification_id?: string;
    category_id?: string;
    subcategory_id?: string;

    date?: string;
    wallet_id?: string;
    competence?: string;
    observation?: string;
    status?: string;
    is_recurring?: boolean;
    recurring_frequency?: 'monthly' | 'yearly';
    recurring_occurrences?: number;
}
