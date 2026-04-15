"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useVisibility } from "@/hooks/use-visibility-state"
import { Transaction } from "@/types/transaction"
import { cn } from "@/lib/utils"
import { HighlightText } from "@/components/ui/highlight-text"
import { DataTableSortHeader } from "./data-table-sort-header"
import { DataTableFilterHeader } from "./data-table-filter-header"
import { TruncatedTextWithTooltip } from "./truncated-text-tooltip"
import { MoreHorizontal, Pencil, Trash2, CheckCircle, Clock } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Opções de filtro para cada coluna
const typeOptions = [
    { label: "Receita", value: "Receita" },
    { label: "Despesa", value: "Despesa" },
]

const paymentMethodOptions = [
    { label: "Boleto", value: "Boleto" },
    { label: "Crédito", value: "Crédito" },
    { label: "Débito", value: "Débito" },
    { label: "Pix", value: "Pix" },
    { label: "Dinheiro", value: "Dinheiro" },
]

const statusOptions = [
    { label: "Realizado", value: "Realizado" },
    { label: "Pendente", value: "Pendente" },
]

export const columns: ColumnDef<Transaction>[] = [
    {
        accessorKey: "description",
        header: () => <div className="text-xs md:text-sm">Descrição</div>,
        cell: ({ row, table }) => {
            const description = row.getValue("description") as string
            const searchQuery = (table.options.meta as any)?.searchQuery || ""
            return (
                <div className="flex items-center gap-2 overflow-hidden">
                    <TruncatedTextWithTooltip
                        text={description}
                        className="text-xs md:text-sm font-medium truncate block"
                    >
                        <HighlightText
                            text={description}
                            highlight={searchQuery}
                        />
                    </TruncatedTextWithTooltip>
                </div>
            )
        },
    },
    {
        accessorKey: "type",
        size: 100,
        header: ({ column }) => (
            <DataTableFilterHeader column={column} title="Tipo" options={typeOptions} />
        ),
        cell: ({ row }) => {
            const typeValue = row.getValue("type") as string
            const config = {
                revenue: {
                    label: "Receita",
                    className: "bg-green-50 text-green-700 hover:bg-green-50/80 dark:bg-green-900/30 dark:text-green-400"
                },
                Receita: {
                    label: "Receita",
                    className: "bg-green-50 text-green-700 hover:bg-green-50/80 dark:bg-green-900/30 dark:text-green-400"
                },
                expense: {
                    label: "Despesa",
                    className: "bg-red-50 text-red-700 hover:bg-red-50/80 dark:bg-red-900/30 dark:text-red-400"
                },
                Despesa: {
                    label: "Despesa",
                    className: "bg-red-50 text-red-700 hover:bg-red-50/80 dark:bg-red-900/30 dark:text-red-400"
                },
                investment: {
                    label: "Investimento",
                    className: "bg-blue-50 text-blue-700 hover:bg-blue-50/80 dark:bg-blue-900/30 dark:text-blue-400"
                }
            }[typeValue] || {
                label: typeValue,
                className: "bg-zinc-50 text-zinc-700 hover:bg-zinc-50/80 dark:bg-zinc-900/30 dark:text-zinc-400"
            }

            return (
                <Badge className={cn("font-medium border-none shadow-none text-[10px] leading-tight md:text-xs", config.className)}>
                    {config.label}
                </Badge>
            )
        },
        filterFn: (row, id, value) => {
            return value === row.getValue(id)
        },
    },
    {
        id: "payee",
        accessorFn: (row) => row.payees?.name,
        size: 130,
        header: ({ column }) => (
            <DataTableFilterHeader column={column} title="Favorecido" options={[]} />
        ),
        cell: ({ row }) => {
            const payee = row.original.payees?.name
            return payee ? (
                <Badge variant="secondary" className="text-[10px] font-normal whitespace-nowrap shadow-none md:text-xs">
                    {payee}
                </Badge>
            ) : (
                <span className="text-xs md:text-sm text-muted-foreground">-</span>
            )
        },
        filterFn: (row, id, value) => {
            const payeeName = row.original.payees?.name
            return payeeName?.toLowerCase().includes(value.toLowerCase()) ?? false
        },
    },
    {
        id: "category",
        accessorFn: (row) => row.categories?.name,
        size: 120,
        header: ({ column }) => (
            <DataTableFilterHeader column={column} title="Categoria" options={[]} />
        ),
        cell: ({ row }) => {
            const category = row.original.categories?.name
            return category ? (
                <Badge variant="secondary" className="text-[10px] font-normal whitespace-nowrap shadow-none md:text-xs">
                    {category}
                </Badge>
            ) : (
                <span className="text-xs md:text-sm text-muted-foreground">-</span>
            )
        },
        filterFn: (row, id, value) => {
            const categoryName = row.original.categories?.name
            return categoryName?.toLowerCase().includes(value.toLowerCase()) ?? false
        },
    },
    {
        id: "classification",
        accessorFn: (row) => row.classifications?.name,
        size: 130,
        header: ({ column }) => (
            <DataTableFilterHeader column={column} title="Classificação" options={[]} />
        ),
        cell: ({ row }) => {
            const classification = row.original.classifications?.name
            return classification ? (
                <Badge variant="secondary" className="text-[10px] font-normal whitespace-nowrap shadow-none md:text-xs">
                    {classification}
                </Badge>
            ) : (
                <span className="text-xs md:text-sm text-muted-foreground">-</span>
            )
        },
        filterFn: (row, id, value) => {
            const classificationName = row.original.classifications?.name
            return classificationName?.toLowerCase().includes(value.toLowerCase()) ?? false
        },
    },
    {
        id: "payment_method",
        accessorFn: (row) => row.payment_method,
        size: 90,
        header: ({ column }) => (
            <DataTableFilterHeader column={column} title="Método" options={paymentMethodOptions} />
        ),
        cell: ({ row }) => {
            const paymentMethod = row.original.payment_method
            return paymentMethod ? (
                <Badge variant="secondary" className="text-[10px] font-normal whitespace-nowrap shadow-none md:text-xs">
                    {paymentMethod}
                </Badge>
            ) : (
                <span className="text-xs md:text-sm text-muted-foreground">-</span>
            )
        },
        filterFn: (row, id, value) => {
            return value === row.getValue(id)
        },
    },
    {
        accessorKey: "competence",
        size: 100,
        header: () => <div className="text-xs md:text-sm">Competência</div>,
        cell: ({ row }) => {
            const comp = row.original.competence as string | null
            if (!comp) return <span className="text-xs md:text-sm text-muted-foreground">-</span>
            const [year, month] = comp.split("-")
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
            const monthIndex = parseInt(month) - 1
            const formatted = `${monthNames[monthIndex]}/${year}`
            return <div className="text-xs md:text-sm tabular-nums text-muted-foreground">
                {formatted}
            </div>
        },
    },
    {
        accessorKey: "date",
        size: 100,
        header: ({ column }) => (
            <DataTableSortHeader column={column} title="Data" />
        ),
        cell: ({ row }) => {
            const date = row.getValue("date") as string | null
            if (!date) return <span className="text-xs md:text-sm text-muted-foreground">-</span>
            const [year, month, day] = date.split("-")
            const formatted = `${day}/${month}/${year}`
            return <div className="text-xs md:text-sm tabular-nums text-muted-foreground">
                {formatted}
            </div>
        },
    },
    {
        accessorKey: "amount",
        size: 120,
        header: ({ column }) => (
            <DataTableSortHeader column={column} title="Valor" />
        ),
        cell: ({ row, table }) => {
            const { isVisible } = useVisibility()
            const amount = parseFloat(row.getValue("amount"))
            const type = row.original.type
            const searchQuery = (table.options.meta as any)?.searchQuery || ""

            const formatted = isVisible
                ? new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                }).format(amount)
                : "R$ ••••"

            const colorClass = (type === "revenue" || type === "Receita")
                ? "text-green-600"
                : (type === "expense" || type === "Despesa")
                    ? "text-red-600"
                    : "text-blue-600"

            return (
                <div className={`text-xs md:text-sm font-semibold text-left tabular-nums ${colorClass}`}>
                    <HighlightText text={formatted} highlight={searchQuery} />
                </div>
            )
        },
    },
    {
        id: "status",
        accessorFn: (row) => row.status || "Pendente",
        size: 80,
        header: ({ column }) => (
            <DataTableFilterHeader column={column} title="Status" options={statusOptions} />
        ),
        cell: ({ row }) => {
            const statusValue = row.original.status || "Pendente"
            const dateStr = row.original.date

            let refinedStatus: "Pendente" | "Realizado" | "Agendado" | "Atrasado" = statusValue as any

            if (statusValue === "Pendente" && dateStr) {
                const today = new Date().toISOString().split('T')[0]
                if (dateStr > today) {
                    refinedStatus = "Agendado"
                } else if (dateStr < today) {
                    refinedStatus = "Atrasado"
                }
            }

            const config = {
                Realizado: {
                    className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50/80 dark:bg-emerald-900/30 dark:text-emerald-400"
                },
                Agendado: {
                    className: "bg-blue-50 text-blue-700 hover:bg-blue-50/80 dark:bg-blue-900/30 dark:text-blue-400"
                },
                Atrasado: {
                    className: "bg-rose-50 text-rose-700 hover:bg-rose-50/80 dark:bg-rose-900/30 dark:text-rose-400"
                },
                Pendente: {
                    className: "bg-amber-50 text-amber-700 hover:bg-amber-50/80 dark:bg-amber-900/30 dark:text-amber-400"
                }
            }[refinedStatus] || {
                className: "bg-zinc-50 text-zinc-700 hover:bg-zinc-50/80 dark:bg-zinc-900/30 dark:text-zinc-400"
            }

            return (
                <Badge className={cn("font-medium border-none shadow-none text-[10px] leading-tight md:text-xs", config.className)}>
                    {refinedStatus}
                </Badge>
            )
        },
        filterFn: (row, id, value) => {
            return value === row.original.status
        },
    },
    {
        id: "actions",
        size: 40,
        header: () => <div className="sr-only">Ações</div>,
        cell: ({ row, table }) => {
            const transaction = row.original
            const meta = table.options.meta as any

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                        >
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => meta?.onEdit?.(transaction)}
                            className="cursor-pointer"
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </DropdownMenuItem>
                        {transaction.status === "Pendente" && (
                            <DropdownMenuItem
                                onClick={() => meta?.onMarkAsPaid?.(transaction)}
                                className="cursor-pointer text-emerald-600 focus:text-emerald-600"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como pago
                            </DropdownMenuItem>
                        )}
                        {transaction.status === "Realizado" && (
                            <DropdownMenuItem
                                onClick={() => meta?.onMarkAsPending?.(transaction)}
                                className="cursor-pointer text-amber-600 focus:text-amber-600"
                            >
                                <Clock className="mr-2 h-4 w-4" />
                                Marcar como pendente
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            onClick={() => meta?.onDelete?.(transaction)}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
