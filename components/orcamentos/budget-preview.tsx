"use client"

import * as React from "react"
import { getBudgetConsumptionForTransaction } from "@/app/actions/budgets"
import { getBudgetStatus, formatBRL, formatYearMonth } from "@/lib/budget-utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { BudgetConsumption } from "@/types/budget"
import { BudgetProgressBar } from "./budget-progress-bar"

interface BudgetPreviewProps {
    categoryId: string
    subcategoryId?: string | null
    yearMonth: string
    pendingAmount?: number
}

export function BudgetPreview({ categoryId, subcategoryId, yearMonth, pendingAmount = 0 }: BudgetPreviewProps) {
    const [loading, setLoading] = React.useState(false)
    const [consumption, setConsumption] = React.useState<BudgetConsumption | null>(null)

    React.useEffect(() => {
        if (!categoryId) {
            setConsumption(null)
            return
        }
        let active = true
        setLoading(true)
        getBudgetConsumptionForTransaction({
            category_id: categoryId,
            subcategory_id: subcategoryId ?? null,
            year_month: yearMonth,
        }).then((res) => {
            if (!active) return
            setConsumption(res.success ? res.data ?? null : null)
            setLoading(false)
        })
        return () => { active = false }
    }, [categoryId, subcategoryId, yearMonth])

    if (!categoryId) return null

    if (loading) {
        return <Skeleton className="h-[88px] w-full rounded-xl" />
    }

    if (!consumption) return null

    const projectedSpent = consumption.spent_amount + (pendingAmount || 0)
    const projectedPct = consumption.budget_amount > 0
        ? (projectedSpent / consumption.budget_amount) * 100
        : 0
    const showProjection = (pendingAmount || 0) > 0
    const barPct = showProjection ? projectedPct : consumption.percentage
    const barStatus = getBudgetStatus(barPct)

    return (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground font-inter">
                    Orçamento: {consumption.category_name}
                    {consumption.subcategory_name ? ` • ${consumption.subcategory_name}` : ""}
                </span>
                <span className="text-xs text-muted-foreground font-inter">{formatYearMonth(consumption.year_month)}</span>
            </div>

            <BudgetProgressBar percentage={barPct} status={barStatus} showLabel />

            <p className="text-xs text-muted-foreground font-inter">
                {formatBRL(consumption.spent_amount)} de {formatBRL(consumption.budget_amount)} usados
            </p>

            {showProjection && (
                <p className="text-xs font-medium font-inter" style={{
                    color: barStatus === "exceeded" ? "#EF4444" : barStatus === "warning" ? "#F59E0B" : undefined,
                }}>
                    Após este lançamento: {formatBRL(projectedSpent)} ({Math.round(projectedPct)}%)
                </p>
            )}
        </div>
    )
}
