"use client"

import { Transaction } from "@/types/transaction"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
        if (!isVisible) return "••••"
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
        Realizado: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
        Agendado: "border-blue-500/30 text-blue-600 dark:text-blue-400",
        Atrasado: "border-rose-500/30 text-rose-600 dark:text-rose-400",
        Pendente: "border-amber-500/30 text-amber-600 dark:text-amber-400",
    }

    if (data.length === 0) return null

    return (
        <div className="flex flex-col gap-2.5">
            {data.map((tx) => {
                const isReceita = tx.type === "Receita" || tx.type === "revenue"
                const refinedStatus = getStatus(tx)
                const statusClass = statusConfig[refinedStatus] || "border-border text-muted-foreground"

                return (
                    <div
                        key={tx.id}
                        className="rounded-lg border border-border bg-card p-4 shadow-sm"
                    >
                        {/* Topo: descrição + valor */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm text-foreground leading-snug line-clamp-2 font-jakarta">
                                    {tx.description}
                                </p>
                                {tx.payees?.name && (
                                    <p className="mt-0.5 text-xs text-muted-foreground truncate font-inter">
                                        {tx.payees.name}
                                    </p>
                                )}
                            </div>
                            <span
                                className={cn(
                                    "shrink-0 text-sm font-semibold tabular-nums font-inter",
                                    isReceita ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                )}
                            >
                                {formatValue(Math.abs(parseFloat(tx.amount as any)))}
                            </span>
                        </div>

                        {/* Rodapé: categoria + status | data + menu */}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                {tx.categories?.name && (
                                    <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal shadow-none">
                                        {tx.categories.name}
                                    </Badge>
                                )}
                                <Badge variant="outline" className={cn("h-5 px-1.5 text-[11px] font-medium shadow-none", statusClass)}>
                                    {refinedStatus}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                                {tx.date && (
                                    <span className="text-[11px] text-muted-foreground tabular-nums font-inter">
                                        {formatDate(tx.date)}
                                    </span>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Ações</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit?.(tx)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Editar
                                        </DropdownMenuItem>
                                        {tx.status === "Pendente" && (
                                            <DropdownMenuItem onClick={() => onMarkAsPaid?.(tx)} className="text-emerald-600 focus:text-emerald-600">
                                                <CheckCircle className="mr-2 h-4 w-4" /> Marcar como pago
                                            </DropdownMenuItem>
                                        )}
                                        {tx.status === "Realizado" && (
                                            <DropdownMenuItem onClick={() => onMarkAsPending?.(tx)} className="text-amber-600 focus:text-amber-600">
                                                <Clock className="mr-2 h-4 w-4" /> Marcar como pendente
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => onDelete?.(tx)} className="text-red-600 focus:text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
