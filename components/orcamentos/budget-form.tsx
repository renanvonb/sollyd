"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { ResponsiveModal } from "@/components/shared/responsive-modal"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"

import { getSubcategories } from "@/app/actions/transaction-data"
import { createBudget, updateBudget } from "@/app/actions/budgets"
import type { Category, Subcategory } from "@/types/transaction"
import type { Budget } from "@/types/budget"

const NO_SUBCATEGORY = "__all__"

interface BudgetFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    categories: Category[]
    budgets: Budget[]
    editing?: Budget | null   // quando presente → modo edição de padrão (categoria/sub fixas)
    onSuccess: () => void
}

export function BudgetForm({ open, onOpenChange, categories, budgets, editing, onSuccess }: BudgetFormProps) {
    const isEdit = !!editing
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const [categoryId, setCategoryId] = React.useState("")
    const [subcategoryId, setSubcategoryId] = React.useState(NO_SUBCATEGORY)
    const [name, setName] = React.useState("")
    const [amount, setAmount] = React.useState(0)
    const [subcategories, setSubcategories] = React.useState<Subcategory[]>([])

    const expenseCategories = React.useMemo(
        () => categories.filter((c) => c.type === "Despesa"),
        [categories]
    )

    React.useEffect(() => {
        if (open) {
            setCategoryId(editing?.category_id ?? "")
            setSubcategoryId(editing?.subcategory_id ?? NO_SUBCATEGORY)
            setName(editing?.name ?? "")
            setAmount(editing?.default_amount ?? 0)
            setSubcategories([])
        }
    }, [open, editing])

    // Carrega subcategorias ao escolher categoria (somente modo criação)
    React.useEffect(() => {
        if (!categoryId || isEdit) return
        let active = true
        getSubcategories(categoryId).then((subs) => {
            if (active) setSubcategories(subs)
        })
        return () => { active = false }
    }, [categoryId, isEdit])

    // Aviso: categoria já tem orçamento geral
    const hasGeneralBudget = React.useMemo(() => {
        if (isEdit || !categoryId) return false
        return budgets.some((b) => b.category_id === categoryId && !b.subcategory_id)
    }, [budgets, categoryId, isEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isEdit && !categoryId) {
            toast.error("Selecione uma categoria")
            return
        }
        if (amount <= 0) {
            toast.error("O valor padrão deve ser maior que zero")
            return
        }

        setIsSubmitting(true)
        const res = isEdit
            ? await updateBudget({ id: editing!.id, name: name.trim() || null, default_amount: amount })
            : await createBudget({
                category_id: categoryId,
                subcategory_id: subcategoryId === NO_SUBCATEGORY ? null : subcategoryId,
                name: name.trim() || null,
                default_amount: amount,
            })
        setIsSubmitting(false)

        if (res.success) {
            toast.success(isEdit ? "Orçamento atualizado!" : "Orçamento criado com sucesso!")
            onOpenChange(false)
            onSuccess()
        } else {
            toast.error(res.error || "Erro ao salvar orçamento")
        }
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="max-w-md"
            title={isEdit ? "Editar orçamento" : "Novo orçamento"}
            description={isEdit ? "Ajuste o nome e o limite padrão mensal." : "Defina um limite de gasto para uma categoria."}
        >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Categoria */}
                    <div className="space-y-2">
                        <Label>Categoria <span className="text-red-600">*</span></Label>
                        {isEdit ? (
                            <Input value={editing?.category?.name || ""} disabled className="font-inter" />
                        ) : (
                            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategoryId(NO_SUBCATEGORY) }}>
                                <SelectTrigger className="font-inter">
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {expenseCategories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Subcategoria */}
                    {!isEdit && (
                        <div className="space-y-2">
                            <Label>Subcategoria</Label>
                            <Select
                                value={subcategoryId}
                                onValueChange={setSubcategoryId}
                                disabled={!categoryId}
                            >
                                <SelectTrigger className="font-inter">
                                    <SelectValue placeholder="Toda a categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_SUBCATEGORY}>Toda a categoria</SelectItem>
                                    {subcategories.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {hasGeneralBudget && subcategoryId === NO_SUBCATEGORY && (
                                <p className="text-xs text-amber-600 font-inter">
                                    Esta categoria já possui um orçamento geral. Você pode criar um orçamento específico para uma subcategoria.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Nome */}
                    <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={60}
                            placeholder="Opcional"
                            className="font-inter"
                        />
                    </div>

                    {/* Valor padrão */}
                    <div className="space-y-2">
                        <Label>Limite padrão (todos os meses) <span className="text-red-600">*</span></Label>
                        <MoneyInput value={amount} onValueChange={setAmount} className="font-inter" />
                    </div>

                    {!isEdit && (
                        <p className="text-xs text-muted-foreground font-inter">
                            O valor padrão se repete em todos os meses. Você pode sobrescrever meses específicos após criar o orçamento.
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                            ) : "Salvar"}
                        </Button>
                    </div>
                </form>
        </ResponsiveModal>
    )
}
