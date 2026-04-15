"use client"

import { Transaction } from "@/types/transaction"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useVisibility } from "@/hooks/use-visibility-state"
import { cn } from "@/lib/utils"
import { MoreHorizontal, Pencil, Trash2, CheckCircle, Clock } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TransactionMobileListProps {
    data: Transaction[]
    onEdit?: (transaction: Transaction) => void
    onDelete?: (transaction: Transaction) => void
    onMarkAsPaid?: (transaction: Transaction) => void
    onMarkAsPending?: (transaction: Transaction) => void
}

export function TransactionMobileList({
    data,
    onEdit,
    onDelete,
    onMarkAsPaid,
    onMarkAsPending,
}: TransactionMobileListProps) {
    const { isVisible } = useVisibility()

    const formatValue = (amount: number) => {
        if (!isVisible) return "R$ ••••"
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount)
    }

    const formatDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return null
        const [year, month, day] = dateStr.split("-")
        return `${day}/${month}/${year}`
    }

    const getStatus = (transaction: Transaction) => {
        const status = transaction.status || "Pendente"
        const dateStr = transaction.date
        if (status === "Pendente" && dateStr) {
            const today = new Date().toISOString().split("T")[0]
            if (dateStr > today) return "Agendado"
            if (dateStr < today) return "Atrasado"
        }
        return status
    }

    const statusConfig: Record<string, string> = {
        Realizado: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        Agendado: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        Atrasado: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        Pendente: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    }

    const typeConfig: Record<string, { label: string; valueClass: string; badgeClass: string }> = {
        revenue: { label: "Receita", valueClass: "text-green-600", badgeClass: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
        Receita: { label: "Receita", valueClass: "text-green-600", badgeClass: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
        expense: { label: "Despesa", valueClass: "text-red-600", badgeClass: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
        Despesa: { label: "Despesa", valueClass: "text-red-600", badgeClass: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    }

    if (data.length === 0) return null

    return (
        <div className="flex flex-col bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            {data.map((tx, idx) => {
                const type = typeConfig[tx.type] || { label: tx.type, valueClass: "text-foreground", badgeClass: "" }
                const refinedStatus = getStatus(tx)
                const statusClass = statusConfig[refinedStatus] || ""

                return (
                    <div key={tx.id}>
                        {idx > 0 && <Separator className="bg-neutral-800" />}
                        <div className="flex items-start justify-between gap-3 px-4 py-3">
                            {/* Left content */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                                {/* Row 1: Description + Value */}
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-neutral-100 truncate leading-snug">
                                        {tx.description}
                                    </p>
                                    <span className={cn("text-xs font-semibold tabular-nums shrink-0", type.valueClass)}>
                                        {formatValue(parseFloat(tx.amount as any))}
                                    </span>
                                </div>

                                {/* Row 2: Badges */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge className={cn("text-[10px] font-medium border-none shadow-none leading-tight md:text-xs", type.badgeClass)}>
                                        {type.label}
                                    </Badge>
                                    <Badge className={cn("text-[10px] font-medium border-none shadow-none leading-tight md:text-xs", statusClass)}>
                                        {refinedStatus}
                                    </Badge>
                                    {tx.date && (
                                        <span className="text-[10px] text-neutral-500 tabular-nums md:text-xs">
                                            {formatDate(tx.date)}
                                        </span>
                                    )}
                                </div>

                                {/* Row 3: Favorecido + Categoria */}
                                {(tx.payees?.name || tx.categories?.name) && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {tx.payees?.name && (
                                            <Badge variant="secondary" className="text-[10px] font-normal shadow-none md:text-xs">
                                                {tx.payees.name}
                                            </Badge>
                                        )}
                                        {tx.categories?.name && (
                                            <Badge variant="secondary" className="text-[10px] font-normal shadow-none md:text-xs">
                                                {tx.categories.name}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-neutral-400">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Ações</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-neutral-300">
                                    <DropdownMenuItem
                                        onClick={() => onEdit?.(tx)}
                                        className="cursor-pointer focus:bg-neutral-800 focus:text-white"
                                    >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                    </DropdownMenuItem>
                                    {tx.status === "Pendente" && (
                                        <DropdownMenuItem
                                            onClick={() => onMarkAsPaid?.(tx)}
                                            className="cursor-pointer text-emerald-500 focus:text-emerald-500 focus:bg-neutral-800"
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Marcar como pago
                                        </DropdownMenuItem>
                                    )}
                                    {tx.status === "Realizado" && (
                                        <DropdownMenuItem
                                            onClick={() => onMarkAsPending?.(tx)}
                                            className="cursor-pointer text-amber-500 focus:text-amber-500 focus:bg-neutral-800"
                                        >
                                            <Clock className="mr-2 h-4 w-4" />
                                            Marcar como pendente
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        onClick={() => onDelete?.(tx)}
                                        className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-neutral-800"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
