"use client"

import type { Budget, BudgetConsumption } from "@/types/budget"
import { BudgetCard } from "./budget-card"

interface BudgetGridProps {
    budgets: Budget[]
    consumptionMap: Map<string, BudgetConsumption>
    onEditDefault: (b: Budget) => void
    onEditMonths: (b: Budget) => void
    onToggleActive: (b: Budget) => void
    onDelete: (b: Budget) => void
}

export function BudgetGrid({ budgets, consumptionMap, onEditDefault, onEditMonths, onToggleActive, onDelete }: BudgetGridProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {budgets.map((b) => (
                <BudgetCard
                    key={b.id}
                    budget={b}
                    consumption={consumptionMap.get(b.id)}
                    onEditDefault={onEditDefault}
                    onEditMonths={onEditMonths}
                    onToggleActive={onToggleActive}
                    onDelete={onDelete}
                />
            ))}
        </div>
    )
}
