"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVisibility } from "@/hooks/use-visibility-state"

interface SummaryTotals {
    income: number
    expense: number
    investment: number
    caixinhas?: number
    balance: number
}

interface TransactionSummaryCardsProps {
    totals: SummaryTotals
    isLoading?: boolean
    // Ganho/perda exibido no rodapé-direito do card "Investimentos" (dashboard)
    investmentGain?: { label: string; color: string }
}

export function TransactionSummaryCards({ totals, isLoading, investmentGain }: TransactionSummaryCardsProps) {
    const { isVisible } = useVisibility()

    const formatValue = (value: number) => {
        if (!isVisible) return "R$ ••••"

        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value)
    }

    const getPercentage = (value: number) => {
        if (totals.income === 0) return 0
        // Use absolute values to avoid negative percentages if logic changes
        return Math.round((Math.abs(value) / totals.income) * 100)
    }

    const cards = [
        {
            label: "Receitas",
            value: totals.income,
            icon: ArrowUpRight,
            accentColor: "bg-emerald-500",
            hasBadge: false,
        },
        {
            label: "Despesas",
            value: totals.expense,
            icon: ArrowDownRight,
            accentColor: "bg-rose-500",
            hasBadge: true,
        },
        {
            label: "Investimentos",
            value: totals.investment,
            icon: TrendingUp,
            accentColor: "bg-blue-500",
            hasBadge: true,
        },
        {
            label: "Caixinhas",
            value: totals.caixinhas ?? 0,
            icon: PiggyBank,
            accentColor: "bg-lime-500",
            hasBadge: false,
        },
        {
            label: "Saldo",
            value: totals.balance,
            icon: Wallet,
            accentColor: "bg-zinc-400 dark:bg-zinc-600",
            hasBadge: true,
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
            {cards.map((card, index) => {
                const percentage = getPercentage(card.value)
                const Icon = card.icon

                return (
                    <Card
                        key={index}
                        className="group relative overflow-hidden bg-card rounded-lg p-3 md:p-5 shadow-sm hover:shadow-md flex flex-col justify-between border border-border"
                    >
                        <div className="flex flex-col gap-1 relative z-10">
                            {/* Header: Label (Left) + Badge (Right) */}
                            <div className="flex items-start justify-between mb-2 md:mb-5 min-h-[20px] md:min-h-[24px]">
                                <span className="text-xs md:text-sm font-medium text-muted-foreground font-inter">
                                    {card.label}
                                </span>
                                {card.hasBadge && (
                                    isLoading ? (
                                        <Skeleton className="h-5 w-12 rounded-full bg-muted" />
                                    ) : (
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "rounded-full px-1.5 md:px-2 py-0 md:py-0.5 text-[10px] md:text-xs font-normal bg-muted/50 text-muted-foreground border border-border/50",
                                                !isVisible && "invisible"
                                            )}
                                        >
                                            <Icon className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1 md:mr-1" />
                                            {percentage}%
                                        </Badge>
                                    )
                                )}
                                {!card.hasBadge && (
                                    <Icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground/50" />
                                )}
                            </div>

                            {/* Value */}
                            <div className="flex items-end justify-between gap-2 min-h-[28px] md:min-h-[36px]">
                                <div className="text-xl md:text-3xl font-semibold tracking-tight font-inter text-foreground">
                                    {isLoading ? (
                                        <Skeleton className="h-9 w-32 bg-muted rounded-md" />
                                    ) : (
                                        formatValue(card.value)
                                    )}
                                </div>
                                {investmentGain && card.label === "Investimentos" && !isLoading && (
                                    <span className={cn("shrink-0 pb-0.5 text-xs font-medium font-inter text-right", isVisible ? investmentGain.color : "text-muted-foreground")}>
                                        {isVisible ? investmentGain.label : "••••"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Footer (Placeholder for future trend data) */}
                        {/* <p className="text-xs text-muted-foreground mt-2">
                            +20.1% from last month
                         </p> */}
                    </Card>
                )
            })}
        </div>
    )
}
