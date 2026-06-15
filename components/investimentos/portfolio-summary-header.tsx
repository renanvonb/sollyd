"use client"

import { Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVisibility } from "@/hooks/use-visibility-state"
import { formatBRL, formatGainLoss } from "@/lib/investment-utils"
import type { PortfolioSummary } from "@/types/investment"

export function PortfolioSummaryHeader({ summary }: { summary: PortfolioSummary }) {
    const { isVisible } = useVisibility()
    const fmt = (v: number) => (isVisible ? formatBRL(v) : "R$ ••••")

    const gl = formatGainLoss(summary.total_gain_loss, summary.total_gain_loss_pct)

    return (
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span className="text-sm font-medium font-inter">Patrimônio Total</span>
            </div>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground font-jakarta">
                {fmt(summary.total_current_value)}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Metric label="Total investido" value={fmt(summary.total_invested)} />
                <Metric label="Rendimentos" value={fmt(summary.total_income)} />
                <Metric
                    label="Ganho/Perda"
                    value={isVisible ? gl.label : "R$ ••••"}
                    valueClass={isVisible ? gl.color : undefined}
                />
            </div>
        </div>
    )
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground font-inter">{label}</p>
            <p className={cn("mt-1 text-base font-semibold font-inter text-foreground", valueClass)}>{value}</p>
        </div>
    )
}
