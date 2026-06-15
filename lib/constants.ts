// lib/constants.ts
// Fonte única de verdade para as strings do domínio financeiro.

// ============================================================
// TIPOS DE TRANSAÇÃO (padronizado — enum só aceita 'Receita'/'Despesa' após migração 017)
// ============================================================
export const TRANSACTION_TYPES = {
    RECEITA: 'Receita',
    DESPESA: 'Despesa',
} as const

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES]

// Normaliza valores legados em inglês para o canônico em português.
// Mantém resiliência para callers antigos (ex.: transaction-dialog) sem deixar
// valor inválido chegar ao banco.
export function normalizeTransactionType(v: unknown): unknown {
    if (v === 'revenue') return TRANSACTION_TYPES.RECEITA
    if (v === 'expense' || v === 'investment') return TRANSACTION_TYPES.DESPESA
    return v
}

// ============================================================
// STATUS DE TRANSAÇÃO
// ============================================================
export const TRANSACTION_STATUS = {
    REALIZADO: 'Realizado',
    PENDENTE: 'Pendente',
} as const

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS]

// ============================================================
// MÉTODOS DE PAGAMENTO
// ============================================================
export const PAYMENT_METHODS = {
    BOLETO: 'Boleto',
    CREDITO: 'Crédito',
    DEBITO: 'Débito',
    PIX: 'Pix',
    DINHEIRO: 'Dinheiro',
} as const

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]
export const PAYMENT_METHOD_LIST = Object.values(PAYMENT_METHODS) as [PaymentMethod, ...PaymentMethod[]]

// ============================================================
// FORMATOS DE DATA (protocolo GLOBAL_TYPE_RECONCILIATION_V10)
// ============================================================
export const COMPETENCE_DATE_FORMAT = 'yyyy-MM-01'
export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy'
export const DISPLAY_MONTH_FORMAT = 'MMM/yyyy'
export const YEAR_MONTH_FORMAT = 'yyyy-MM'

// ============================================================
// PALETA SEMÂNTICA (definida no README)
// ============================================================
export const SEMANTIC_COLORS = {
    RECEITA: 'emerald',
    DESPESA: 'rose',
    INVESTIMENTO: 'blue',
    BRAND: '#E0FE56',
} as const
