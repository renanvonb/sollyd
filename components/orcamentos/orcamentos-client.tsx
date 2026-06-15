"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

import { TopBar } from "@/components/ui/top-bar"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { deleteBudget, toggleBudgetActive } from "@/app/actions/budgets"
import { formatYearMonth, shiftYearMonth } from "@/lib/budget-utils"
import type { Budget, BudgetConsumption } from "@/types/budget"
import type { Category } from "@/types/transaction"

import { BudgetGrid } from "./budget-grid"
import { BudgetForm } from "./budget-form"
import { BudgetMonthEditor } from "./budget-month-editor"
import { EmptyOrcamentos } from "./empty-orcamentos"
import { Fab } from "@/components/shared/fab"

interface OrcamentosClientProps {
    budgets: Budget[]
    consumptions: BudgetConsumption[]
    categories: Category[]
    selectedMonth: string
}

export function OrcamentosClient({ budgets, consumptions, categories, selectedMonth }: OrcamentosClientProps) {
    const router = useRouter()

    const consumptionMap = React.useMemo(
        () => new Map(consumptions.map((c) => [c.budget_id, c])),
        [consumptions]
    )

    const [formOpen, setFormOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<Budget | null>(null)

    const [monthEditorOpen, setMonthEditorOpen] = React.useState(false)
    const [monthBudget, setMonthBudget] = React.useState<Budget | null>(null)

    const [deleting, setDeleting] = React.useState<Budget | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const goToMonth = (ym: string) => router.push(`/orcamentos?month=${ym}`)
    const refresh = () => router.refresh()

    const handleNew = () => { setEditing(null); setFormOpen(true) }
    const handleEditDefault = (b: Budget) => { setEditing(b); setFormOpen(true) }
    const handleEditMonths = (b: Budget) => { setMonthBudget(b); setMonthEditorOpen(true) }

    const handleToggle = async (b: Budget) => {
        const res = await toggleBudgetActive({ id: b.id, is_active: !b.is_active })
        if (res.success) {
            toast.success(b.is_active ? "Orçamento pausado." : "Orçamento reativado.")
            refresh()
        } else {
            toast.error(res.error || "Erro ao alterar status")
        }
    }

    const confirmDelete = async () => {
        if (!deleting) return
        setIsDeleting(true)
        const res = await deleteBudget(deleting.id)
        setIsDeleting(false)
        setDeleting(null)
        if (res.success) {
            toast.success("Orçamento removido.")
            refresh()
        } else {
            toast.error(res.error || "Erro ao remover")
        }
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <TopBar moduleName="Orçamentos" variant="simple" />

            <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 pb-24 md:pb-8 gap-5 md:gap-6 overflow-y-auto">
                {/* Header */}
                <div className="flex flex-row items-center justify-between flex-none gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <h1 className="text-2xl font-semibold text-foreground font-jakarta truncate">Orçamentos</h1>
                        <span className="w-px h-5 bg-border shrink-0 hidden md:block" />
                        <p className="text-sm text-muted-foreground font-inter truncate hidden md:block">
                            Controle seus limites de gasto por categoria
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Seletor de mês */}
                        <div className="flex items-center rounded-md border border-border">
                            <Button
                                variant="ghost" size="icon"
                                className="h-9 w-9 text-muted-foreground"
                                onClick={() => goToMonth(shiftYearMonth(selectedMonth, -1))}
                                aria-label="Mês anterior"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-2 text-sm font-medium text-foreground font-inter tabular-nums min-w-[84px] text-center">
                                {formatYearMonth(selectedMonth)}
                            </span>
                            <Button
                                variant="ghost" size="icon"
                                className="h-9 w-9 text-muted-foreground"
                                onClick={() => goToMonth(shiftYearMonth(selectedMonth, 1))}
                                aria-label="Mês seguinte"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button onClick={handleNew} className="h-10 shrink-0 font-sans hidden md:inline-flex">
                            <Plus className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Novo orçamento</span>
                        </Button>
                    </div>
                </div>

                {budgets.length === 0 ? (
                    <EmptyOrcamentos onCreate={handleNew} />
                ) : (
                    <BudgetGrid
                        budgets={budgets}
                        consumptionMap={consumptionMap}
                        onEditDefault={handleEditDefault}
                        onEditMonths={handleEditMonths}
                        onToggleActive={handleToggle}
                        onDelete={setDeleting}
                    />
                )}
            </div>

            <BudgetForm
                open={formOpen}
                onOpenChange={setFormOpen}
                categories={categories}
                budgets={budgets}
                editing={editing}
                onSuccess={refresh}
            />

            <BudgetMonthEditor
                open={monthEditorOpen}
                onOpenChange={setMonthEditorOpen}
                budget={monthBudget}
                onChange={refresh}
            />

            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso vai remover o orçamento e todas as sobrescritas mensais. Os gastos registrados não serão afetados. Continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); confirmDelete() }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Fab onClick={handleNew} label="Novo orçamento" />
        </div>
    )
}
