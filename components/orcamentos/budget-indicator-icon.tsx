"use client"

import { AlertTriangle, AlertCircle } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatYearMonth } from "@/lib/budget-utils"
import type { BudgetConsumption } from "@/types/budget"

interface BudgetIndicatorIconProps {
    consumption?: BudgetConsumption
}

export function BudgetIndicatorIcon({ consumption }: BudgetIndicatorIconProps) {
    if (!consumption || consumption.status === "ok") return null

    const monthLabel = formatYearMonth(consumption.year_month)
    const pct = Math.round(consumption.percentage)

    const text =
        consumption.status === "exceeded"
            ? `Orçamento de ${consumption.category_name} ultrapassado em ${monthLabel} (${pct}%)`
            : `${pct}% do orçamento utilizado em ${monthLabel}`

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0">
                        {consumption.status === "exceeded" ? (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                    </span>
                </TooltipTrigger>
                <TooltipContent>{text}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
