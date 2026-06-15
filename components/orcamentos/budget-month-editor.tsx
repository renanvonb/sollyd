"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"

import { getBudgetMonths, upsertBudgetMonth, deleteBudgetMonth } from "@/app/actions/budgets"
import { currentYearMonth, shiftYearMonth, formatBRL } from "@/lib/budget-utils"
import type { Budget } from "@/types/budget"
import { BudgetMonthRow } from "./budget-month-row"

interface BudgetMonthEditorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    budget: Budget | null
    onChange: () => void
}

// 6 meses anteriores + atual + 5 seguintes = 12, centrado no mês atual
function buildMonths(): string[] {
    const base = currentYearMonth()
    const months: string[] = []
    for (let i = -6; i <= 5; i++) months.push(shiftYearMonth(base, i))
    return months
}

export function BudgetMonthEditor({ open, onOpenChange, budget, onChange }: BudgetMonthEditorProps) {
    const [loading, setLoading] = React.useState(false)
    const [overrides, setOverrides] = React.useState<Record<string, number>>({})
    const months = React.useMemo(buildMonths, [])
    const ym = currentYearMonth()

    const load = React.useCallback(async () => {
        if (!budget) return
        setLoading(true)
        const res = await getBudgetMonths(budget.id)
        setLoading(false)
        if (res.success && res.data) {
            const map: Record<string, number> = {}
            res.data.forEach((m) => { map[m.year_month] = m.amount })
            setOverrides(map)
        }
    }, [budget])

    React.useEffect(() => {
        if (open && budget) load()
    }, [open, budget, load])

    const handleSave = async (yearMonth: string, amount: number) => {
        if (!budget) return
        const res = await upsertBudgetMonth({ budget_id: budget.id, year_month: yearMonth, amount })
        if (res.success) {
            toast.success(res.reset ? "Mês restaurado ao padrão" : "Mês atualizado")
            await load()
            onChange()
        } else {
            toast.error(res.error || "Erro ao salvar mês")
        }
    }

    const handleRestore = async (yearMonth: string) => {
        if (!budget) return
        const res = await deleteBudgetMonth({ budget_id: budget.id, year_month: yearMonth })
        if (res.success) {
            toast.success("Mês restaurado ao padrão")
            await load()
            onChange()
        } else {
            toast.error(res.error || "Erro ao restaurar mês")
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="font-jakarta">Editar meses</SheetTitle>
                    <SheetDescription className="font-inter">
                        {budget?.category?.name}
                        {budget?.subcategory?.name ? ` • ${budget.subcategory.name}` : ""}
                        {" — "}padrão {budget ? formatBRL(budget.default_amount) : ""}/mês
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : (
                    <div className="mt-4 divide-y divide-border">
                        {budget && months.map((m) => (
                            <BudgetMonthRow
                                key={m}
                                yearMonth={m}
                                defaultAmount={budget.default_amount}
                                override={overrides[m]}
                                isCurrent={m === ym}
                                onSave={handleSave}
                                onRestore={handleRestore}
                            />
                        ))}
                    </div>
                )}

                <p className="mt-4 text-xs text-muted-foreground font-inter">
                    Edite um valor e clique em Salvar. Valor igual ao padrão restaura o mês automaticamente.
                </p>
            </SheetContent>
        </Sheet>
    )
}
