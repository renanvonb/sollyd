"use client"

import { cn } from "@/lib/utils"
import { INVESTMENT_CLASSES, type InvestmentClass } from "@/types/investment"

interface ClassFilterTabsProps {
    available: InvestmentClass[]
    value: InvestmentClass | "all"
    onChange: (value: InvestmentClass | "all") => void
}

export function ClassFilterTabs({ available, value, onChange }: ClassFilterTabsProps) {
    const tabs: { key: InvestmentClass | "all"; label: string }[] = [
        { key: "all", label: "Todos" },
        ...available.map((c) => ({ key: c, label: INVESTMENT_CLASSES[c].label })),
    ]

    if (available.length === 0) return null

    return (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((t) => (
                <button
                    key={t.key}
                    onClick={() => onChange(t.key)}
                    className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium font-inter transition-colors",
                        value === t.key
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-muted"
                    )}
                >
                    {t.label}
                </button>
            ))}
        </div>
    )
}
