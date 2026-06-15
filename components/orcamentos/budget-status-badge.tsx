"use client"

import { AlertTriangle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BudgetStatus } from "@/types/budget"

interface BudgetStatusBadgeProps {
    status: BudgetStatus
    percentage?: number
    className?: string
}

export function BudgetStatusBadge({ status, percentage, className }: BudgetStatusBadgeProps) {
    if (status === "ok") return null

    const pct = percentage != null ? `${Math.round(percentage)}% — ` : ""

    if (status === "warning") {
        return (
            <span className={cn(
                "inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 font-inter",
                className
            )}>
                <AlertTriangle className="h-3 w-3" /> {pct}Próximo do limite
            </span>
        )
    }

    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-600 font-inter",
            className
        )}>
            <AlertCircle className="h-3 w-3" /> {pct}Limite ultrapassado
        </span>
    )
}
