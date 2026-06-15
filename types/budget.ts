export type Budget = {
    id: string
    user_id: string
    category_id: string
    subcategory_id: string | null
    name: string | null
    default_amount: number
    is_active: boolean
    created_at: string
    updated_at: string
    // joins
    category?: {
        id: string
        name: string
        icon: string | null
        color: string | null
    } | null
    subcategory?: {
        id: string
        name: string
    } | null
    months?: BudgetMonth[]
}

export type BudgetMonth = {
    id: string
    user_id: string
    budget_id: string
    year_month: string   // 'YYYY-MM'
    amount: number
    created_at: string
    updated_at: string
}

export type BudgetStatus = 'ok' | 'warning' | 'exceeded'

export type BudgetConsumption = {
    budget_id: string
    category_id: string
    subcategory_id: string | null
    category_name: string
    category_icon: string | null
    category_color: string | null
    subcategory_name: string | null
    budget_name: string | null
    default_amount: number
    is_active: boolean
    year_month: string           // 'YYYY-MM'
    budget_amount: number        // limite do mês (sobrescrita ou default)
    spent_amount: number         // total gasto no mês
    remaining_amount: number     // budget_amount - spent_amount
    percentage: number           // 0–N (pode passar de 100)
    status: BudgetStatus
}

export type BudgetAlertSummary = {
    warning: number
    exceeded: number
    total: number
}
