export const INVESTMENT_CLASSES = {
    renda_fixa: {
        label: 'Renda Fixa',
        color: '#22C55E',
        icon: 'Landmark',
        types: ['CDB', 'LCI', 'LCA', 'Tesouro Direto', 'Poupança', 'LC', 'Debênture', 'CRI', 'CRA', 'Outro RF'],
    },
    renda_variavel: {
        label: 'Renda Variável',
        color: '#3B82F6',
        icon: 'TrendingUp',
        types: ['Ação', 'FII', 'ETF', 'BDR', 'Outro RV'],
    },
    fundos: {
        label: 'Fundos',
        color: '#8B5CF6',
        icon: 'PieChart',
        types: ['Fundo de Renda Fixa', 'Fundo Multimercado', 'Fundo de Ações', 'Fundo Cambial', 'Previdência Privada', 'Outro Fundo'],
    },
    cripto: {
        label: 'Criptomoedas',
        color: '#F59E0B',
        icon: 'Bitcoin',
        types: ['Bitcoin', 'Ethereum', 'Stablecoin', 'Altcoin', 'Outro Cripto'],
    },
} as const

export type InvestmentClass = keyof typeof INVESTMENT_CLASSES
export type OperationType = 'aporte' | 'resgate' | 'rendimento' | 'atualizacao_valor'

export type InvestmentAsset = {
    id: string
    user_id: string
    name: string
    ticker: string | null
    asset_class: InvestmentClass
    asset_type: string
    institution: string | null
    wallet_id: string | null
    current_value: number
    total_invested: number
    total_income: number
    notes: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    // joins opcionais
    wallet?: { id: string; name: string; color: string | null } | null
    operations?: InvestmentOperation[]
}

export type InvestmentOperation = {
    id: string
    user_id: string
    asset_id: string
    operation_type: OperationType
    amount: number | null
    new_value: number | null
    transaction_id: string | null
    operation_date: string
    notes: string | null
    created_at: string
}

export type InvestmentAssetWithMetrics = InvestmentAsset & {
    gain_loss: number
    gain_loss_pct: number
    portfolio_pct: number
}

export type PortfolioSummary = {
    total_current_value: number
    total_invested: number
    total_income: number
    total_gain_loss: number
    total_gain_loss_pct: number
    by_class: {
        class: InvestmentClass
        label: string
        color: string
        current_value: number
        pct: number
    }[]
}

export type InvestmentDashboardSummary = {
    total_current_value: number
    total_gain_loss: number
    total_gain_loss_pct: number
    has_assets: boolean
}
