"use client"

import Link from "next/link"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BudgetAlertSummary } from "@/types/budget"

interface BudgetAlertCardProps {
    summary: BudgetAlertSummary
}

export function BudgetAlertCard({ summary }: BudgetAlertCardProps) {
    if (summary.warning === 0 && summary.exceeded === 0) return null

    const hasExceeded = summary.exceeded > 0

    return (
        <Link
            href="/orcamentos"
            className={cn(
                "group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 border-l-4 transition-colors hover:bg-muted/40",
                hasExceeded ? "border-l-red-500" : "border-l-amber-500"
            )}
        >
            <div className="flex items-start gap-3 min-w-0">
                <AlertTriangle className={cn("h-5 w-5 shrink-0 mt-0.5", hasExceeded ? "text-red-500" : "text-amber-500")} />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground font-jakarta">Alertas de Orçamento</p>
                    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground font-inter">
                        {summary.warning > 0 && (
                            <p>{summary.warning} {summary.warning === 1 ? "orçamento próximo" : "orçamentos próximos"} do limite</p>
                        )}
                        {summary.exceeded > 0 && (
                            <p className="text-red-600">
                                {summary.exceeded} {summary.exceeded === 1 ? "orçamento ultrapassado" : "orçamentos ultrapassados"}
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-foreground font-sans">
                <span className="hidden sm:inline">Ver orçamentos</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
        </Link>
    )
}
