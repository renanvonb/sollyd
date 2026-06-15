"use client"

import { cn } from "@/lib/utils"
import type { BudgetStatus } from "@/types/budget"

interface BudgetProgressBarProps {
    percentage: number
    status: BudgetStatus
    showLabel?: boolean
    className?: string
}

const FILL: Record<BudgetStatus, string> = {
    ok: "bg-green-500",
    warning: "bg-amber-500",
    exceeded: "bg-red-500",
}

export function BudgetProgressBar({ percentage, status, showLabel, className }: BudgetProgressBarProps) {
    const width = Math.min(Math.max(percentage, 0), 100)

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", FILL[status])}
                    style={{ width: `${width}%` }}
                />
            </div>
            {showLabel && (
                <span className="shrink-0 text-sm font-semibold text-foreground font-inter tabular-nums">
                    {Math.round(percentage)}%
                </span>
            )}
        </div>
    )
}
