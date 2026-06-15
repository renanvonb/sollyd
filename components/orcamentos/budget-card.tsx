"use client"

import { MoreVertical, Pencil, CalendarRange, Pause, Play, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getIconByName } from "@/components/cadastros/icon-picker"
import { formatBRL } from "@/lib/budget-utils"

import type { Budget, BudgetConsumption } from "@/types/budget"
import { BudgetProgressBar } from "./budget-progress-bar"
import { BudgetStatusBadge } from "./budget-status-badge"

interface BudgetCardProps {
    budget: Budget
    consumption?: BudgetConsumption
    onEditDefault: (b: Budget) => void
    onEditMonths: (b: Budget) => void
    onToggleActive: (b: Budget) => void
    onDelete: (b: Budget) => void
}

export function BudgetCard({ budget, consumption, onEditDefault, onEditMonths, onToggleActive, onDelete }: BudgetCardProps) {
    const Icon = getIconByName(budget.category?.icon || "tag")
    const spent = consumption?.spent_amount ?? 0
    const limit = consumption?.budget_amount ?? budget.default_amount
    const pct = consumption?.percentage ?? 0
    const status = consumption?.status ?? "ok"
    const remaining = consumption?.remaining_amount ?? Math.max(limit - spent, 0)
    const paused = !budget.is_active

    return (
        <div
            className={cn(
                "flex flex-col rounded-2xl border bg-card p-5 transition-opacity",
                paused && "opacity-60",
                status === "exceeded" ? "border-red-500/50" : "border-border"
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Icon className="h-5 w-5 text-foreground" />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground font-jakarta">
                            {budget.category?.name || "Categoria"}
                        </p>
                        {budget.subcategory?.name && (
                            <p className="truncate text-xs text-muted-foreground font-inter">
                                {budget.subcategory.name}
                            </p>
                        )}
                        {budget.name && (
                            <p className="truncate text-xs text-muted-foreground/70 font-inter">{budget.name}</p>
                        )}
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditDefault(budget)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar padrão
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditMonths(budget)}>
                            <CalendarRange className="mr-2 h-4 w-4" /> Editar meses
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleActive(budget)}>
                            {paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                            {paused ? "Reativar" : "Pausar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(budget)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {paused && (
                <span className="mt-3 self-start rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground font-inter">
                    Pausado
                </span>
            )}

            {/* Progress */}
            <div className="mt-4">
                <BudgetProgressBar percentage={pct} status={status} showLabel />
                <p className="mt-2 text-sm font-medium text-foreground font-inter">
                    {formatBRL(spent)} <span className="text-muted-foreground">gastos de {formatBRL(limit)}</span>
                </p>
                {!paused && (
                    <div className="mt-1">
                        {status === "ok" ? (
                            <p className="text-xs text-muted-foreground font-inter">Faltam {formatBRL(remaining)}</p>
                        ) : (
                            <BudgetStatusBadge status={status} percentage={pct} />
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground font-inter">
                    Padrão: {formatBRL(budget.default_amount)}/mês
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-foreground font-sans"
                    onClick={() => onEditMonths(budget)}
                >
                    Editar meses →
                </Button>
            </div>
        </div>
    )
}
