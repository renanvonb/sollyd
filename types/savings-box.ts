export type SavingsBox = {
    id: string
    user_id: string
    name: string
    description: string | null
    target_amount: number
    current_amount: number
    color: string
    icon: string
    target_date: string | null
    is_completed: boolean
    is_archived: boolean
    created_at: string
    updated_at: string
    // computed (join)
    contributions?: SavingsBoxContribution[]
}

export type SavingsBoxContribution = {
    id: string
    user_id: string
    savings_box_id: string
    transaction_id: string | null
    amount: number
    note: string | null
    contributed_at: string
    created_at: string
}

export type SavingsBoxWithProgress = SavingsBox & {
    progress_percentage: number       // 0–100
    remaining_amount: number          // target - current
    days_remaining: number | null     // null se sem data-alvo
    monthly_needed: number | null     // valor mensal para atingir meta no prazo
}
