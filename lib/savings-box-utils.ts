import type { SavingsBox, SavingsBoxWithProgress } from "@/types/savings-box"

export function enrichSavingsBox(box: SavingsBox): SavingsBoxWithProgress {
    const progress_percentage = Math.min(
        Math.round((box.current_amount / box.target_amount) * 100),
        100
    )

    const remaining_amount = Math.max(box.target_amount - box.current_amount, 0)

    let days_remaining: number | null = null
    let monthly_needed: number | null = null

    if (box.target_date) {
        const today = new Date()
        const target = new Date(box.target_date)
        days_remaining = Math.max(
            Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
            0
        )

        const months_remaining = days_remaining / 30
        if (months_remaining > 0 && remaining_amount > 0) {
            monthly_needed = Math.ceil(remaining_amount / months_remaining)
        }
    }

    return {
        ...box,
        progress_percentage,
        remaining_amount,
        days_remaining,
        monthly_needed,
    }
}
