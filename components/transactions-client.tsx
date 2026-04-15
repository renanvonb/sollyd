"use client"

import * as React from "react"
import { useTransition } from "react"
import { DateRange } from "react-day-picker"
import { useRouter, useSearchParams } from "next/navigation"

import { TransactionFilters } from "@/components/transaction-filters"
import { TransactionTable } from "@/components/transaction-table"
import { TransactionMobileList } from "@/components/transaction-mobile-list"
import { TransactionSummaryCards } from "@/components/transaction-summary-cards"
import { TransactionDetailsDialog } from "@/components/transaction-details-dialog"
import { TransactionDialog } from "@/components/transactions/transaction-dialog"
import { TransactionsTableSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { TimeRange } from "@/types/time-range"
import { Plus, Search, ChevronDown, Inbox, SlidersHorizontal } from "lucide-react"
import type { Transaction } from "@/types/transaction"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AdaptiveDatePicker } from "@/components/ui/adaptive-date-picker"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TransactionsClientProps {
    initialData: any[]
}

export default function TransactionsClient({ initialData }: TransactionsClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null)
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false)
    const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false)
    const [isNewSheetOpen, setIsNewSheetOpen] = React.useState(false)
    const [newTransactionType, setNewTransactionType] = React.useState<"revenue" | "expense" | "investment">("expense")

    const handleNewTransaction = (type: "revenue" | "expense" | "investment") => {
        setNewTransactionType(type)
        setIsNewSheetOpen(true)
    }

    // Search Debounce state
    const [searchValue, setSearchValue] = React.useState(searchParams.get('q') || "")

    React.useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (searchValue) params.set('q', searchValue)
            else params.delete('q')
            router.push(`?${params.toString()}`, { scroll: false })
        }, 300)
        return () => clearTimeout(timer)
    }, [searchValue, router, searchParams])

    // Enforce default params on mount if missing
    React.useEffect(() => {
        const hasRange = searchParams.has('range')
        const hasFrom = searchParams.has('from')
        const hasTo = searchParams.has('to')

        if (!hasRange || !hasFrom || !hasTo) {
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of month

            const params = new URLSearchParams(searchParams.toString())

            if (!hasRange) params.set('range', 'mes')
            if (!hasFrom) params.set('from', start.toISOString())
            if (!hasTo) params.set('to', end.toISOString())

            router.replace(`?${params.toString()}`, { scroll: false })
        }
    }, [searchParams, router])

    // Filtros sincronizados com a URL
    const range = (searchParams.get('range') as TimeRange) || 'mes'
    const searchQuery = searchParams.get('q')?.toLowerCase() || ""
    const statusFilter = searchParams.get('status') || "all"

    const handleStatusFilterChange = (value: string) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (value && value !== 'all') params.set('status', value)
            else params.delete('status') // Remove if 'all' to keep URL clean? Or force 'all'?
            // If we remove it, page default is 'all', so that works.
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }


    const date: DateRange | undefined = React.useMemo(() => {
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        if (from && to) {
            return { from: new Date(from), to: new Date(to) }
        }

        if (range === 'mes') {
            const now = new Date()
            return {
                from: new Date(now.getFullYear(), now.getMonth(), 1),
                to: new Date(now.getFullYear(), now.getMonth() + 1, 0)
            }
        }
        return undefined
    }, [searchParams, range])

    const handleRangeChange = (newRange: TimeRange) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('range', newRange)
            // Clear date params when changing range - AdaptiveDatePicker will set current period
            params.delete('from')
            params.delete('to')
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }

    const handleDateChange = (newDate: DateRange | undefined) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (newDate?.from) params.set('from', newDate.from.toISOString())
            else params.delete('from')

            if (newDate?.to) params.set('to', newDate.to.toISOString())
            else params.delete('to')

            router.push(`?${params.toString()}`, { scroll: false })
        })
    }



    // Filtragem Client-side reativa

    const filteredData = React.useMemo(() => {
        if (!searchQuery) return initialData
        return initialData.filter(t => {
            const desc = (t.description || "").toLowerCase()
            const payee = (t.payees?.name || "").toLowerCase()
            const cat = (t.categories?.name || "").toLowerCase()
            const comp = (t.competence || "").toLowerCase()
            return desc.includes(searchQuery) ||
                payee.includes(searchQuery) ||
                cat.includes(searchQuery) ||
                comp.includes(searchQuery)
        })
    }, [initialData, searchQuery])

    const handleSuccess = () => {
        router.refresh()
        setIsEditSheetOpen(false)
    }

    const handleRowClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction)
        setIsDetailsDialogOpen(true)
    }

    const handleEdit = (transaction: Transaction) => {
        setSelectedTransaction(transaction)
        setIsEditSheetOpen(true)
    }


    const totals = React.useMemo(() => {
        return filteredData.reduce((acc, curr) => {
            const amount = parseFloat(curr.amount as any) || 0
            const type = curr.type as string
            if (type === 'revenue' || type === 'Receita') acc.income += amount
            else if (type === 'expense' || type === 'Despesa') acc.expense += amount
            else if (type === 'investment') acc.investment += amount

            acc.balance = acc.income - acc.expense - acc.investment
            return acc
        }, { income: 0, expense: 0, investment: 0, balance: 0 })
    }, [filteredData])


    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background selection:bg-neutral-800">
            {/* Wrapper Principal Sagrado */}
            <div className="max-w-[1440px] mx-auto px-5 md:px-8 w-full flex-1 flex flex-col pt-5 md:pt-8 pb-5 md:pb-8 gap-5 md:gap-6 overflow-hidden">

                {/* Header de Página (Responsivo) */}
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between flex-none gap-y-3 gap-x-2 w-full">
                    {/* 1. Título */}
                    <div className="order-1 min-w-0 shrink">
                        <h1 className="text-3xl font-semibold md:font-bold tracking-tight text-foreground font-jakarta truncate">
                            Transações
                        </h1>
                        <p className="text-muted-foreground mt-1 font-sans text-sm font-inter hidden md:block">
                            Gerencie e acompanhe suas movimentações financeiras.
                        </p>
                    </div>

                    {/* 2. Filtros (Mesma linha do título em mobile) */}
                    <div className="order-2 flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide ml-auto shrink max-w-[55vw] md:max-w-none">
                        {/* Status Tabs */}
                        <Tabs value={statusFilter} onValueChange={handleStatusFilterChange} className="h-10 shrink-0">
                            <TabsList className="bg-neutral-900 border border-neutral-800 h-10">
                                <TabsTrigger value="all" className="h-8 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50 font-inter">Todas</TabsTrigger>
                                <TabsTrigger value="Realizado" className="h-8 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50 font-inter">Realizadas</TabsTrigger>
                                <TabsTrigger value="Pendente" className="h-8 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50 font-inter">Pendentes</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Select Period */}
                        <Select value={range} onValueChange={handleRangeChange}>
                            <SelectTrigger className="w-[100px] h-10 shrink-0 font-inter bg-neutral-900 border-neutral-800 text-neutral-50">
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent className='bg-neutral-900 border-neutral-800 text-neutral-50'>
                                <SelectItem value="dia">Hoje</SelectItem>
                                <SelectItem value="semana">Semana</SelectItem>
                                <SelectItem value="mes">Mês</SelectItem>
                                <SelectItem value="ano">Ano</SelectItem>
                                <SelectItem value="custom">Personalizar</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Adaptive Date Picker */}
                        <div className="shrink-0">
                            <AdaptiveDatePicker
                                mode={range}
                                value={date}
                                onChange={handleDateChange}
                                className="h-10 w-10 px-0 justify-center md:w-auto md:justify-start md:px-3 [&>span]:hidden md:[&>span]:inline md:[&>svg]:mr-2"
                            />
                        </div>

                        {/* Add Button -> Dropdown (Desktop apenas) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="font-inter font-medium h-10 shrink-0 hidden md:flex">
                                    Adicionar
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px] bg-neutral-900 border-neutral-800 text-neutral-50">
                                <DropdownMenuItem onClick={() => handleNewTransaction('revenue')} className="cursor-pointer focus:bg-neutral-800 focus:text-neutral-50">
                                    Receita
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleNewTransaction('expense')} className="cursor-pointer focus:bg-neutral-800 focus:text-neutral-50">
                                    Despesa
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* 3. Search Bar (Linha debaixo no mobile, direita no desktop) */}
                    <div className="order-3 relative w-full md:w-[200px] shrink-0 md:ml-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Buscar transação..."
                            className="pl-9 h-11 md:h-10 font-inter w-full bg-neutral-900 border-neutral-800 text-neutral-50 placeholder:text-neutral-500"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </div>
                </div>



                {/* Wrapper de Cards e Tabela com Gap de 32px (gap-8) */}
                <div className="flex-1 flex flex-col gap-8 overflow-hidden">
                    {/* Grid de Totalizadores (KPIs) - Área D */}
                    <div className="flex-none font-sans">
                        <TransactionSummaryCards totals={totals} />
                    </div>

                    {/* Container da Tabela (Área E) — Desktop only */}
                    {filteredData.length > 0 ? (
                        <>
                            {/* Desktop: tabela */}
                            <div id="data-table-wrapper" className="hidden md:flex flex-1 min-h-0 bg-neutral-900 rounded-[16px] border border-neutral-800 shadow-sm flex-col relative overflow-hidden font-sans">
                                <TransactionTable data={filteredData} onEdit={handleEdit} />
                            </div>

                            {/* Mobile: card list */}
                            <div className="block md:hidden pb-24">
                                <TransactionMobileList
                                    data={filteredData}
                                    onEdit={handleEdit}
                                    onDelete={async (tx) => {
                                        const { deleteTransaction } = await import('@/app/actions/transactions')
                                        await deleteTransaction(tx.id)
                                        router.refresh()
                                    }}
                                    onMarkAsPaid={async (tx) => {
                                        const { markAsPaid } = await import('@/app/actions/transactions')
                                        await markAsPaid(tx.id)
                                        router.refresh()
                                    }}
                                    onMarkAsPending={async (tx) => {
                                        const { markAsPending } = await import('@/app/actions/transactions')
                                        await markAsPending(tx.id)
                                        router.refresh()
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            variant="outlined"
                            size="lg"
                            icon={Inbox}
                            title={searchQuery ? "Nenhuma transação encontrada" : "Nenhuma transação cadastrada"}
                            description={
                                searchQuery
                                    ? "Não encontramos transações com os termos buscados. Tente ajustar sua pesquisa."
                                    : <span>Registre sua primeira transação clicando <br /> no botão "Adicionar".</span>
                            }
                            action={
                                searchQuery ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setSearchValue("")}
                                        className="font-inter border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-50"
                                    >
                                        Limpar busca
                                    </Button>
                                ) : (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="font-inter border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-50">
                                                <Plus className="h-4 w-4 mr-2" />
                                                Adicionar
                                                <ChevronDown className="h-4 w-4 ml-2" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center" className="w-[160px] bg-neutral-900 border-neutral-800 text-neutral-50">
                                            <DropdownMenuItem onClick={() => handleNewTransaction('revenue')} className="cursor-pointer focus:bg-neutral-800 focus:text-neutral-50">
                                                Receita
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleNewTransaction('expense')} className="cursor-pointer focus:bg-neutral-800 focus:text-neutral-50">
                                                Despesa
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )
                            }
                            className="flex-1 bg-neutral-900 border-neutral-800 border-dashed"
                        />
                    )}

                    {/* FAB mobile — Nova transação (visível apenas em mobile) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg w-14 h-14 md:hidden"
                                size="icon"
                                aria-label="Nova transação"
                            >
                                <Plus className="h-6 w-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top" className="w-[160px] bg-neutral-900 border-neutral-800 text-neutral-50 mb-2">
                            <DropdownMenuItem onClick={() => handleNewTransaction('revenue')} className="cursor-pointer focus:bg-neutral-800 focus:text-neutral-50">
                                Receita
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleNewTransaction('expense')} className="cursor-pointer focus:bg-neutral-800 focus:text-neutral-50">
                                Despesa
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* New Transaction Dialog */}
                    <TransactionDialog
                        open={isNewSheetOpen}
                        onOpenChange={setIsNewSheetOpen}
                        defaultType={newTransactionType}
                        onSuccess={handleSuccess}
                    />

                </div>

                {/* Details Dialog */}
                <TransactionDetailsDialog
                    transaction={selectedTransaction}
                    open={isDetailsDialogOpen}
                    onOpenChange={setIsDetailsDialogOpen}
                    onEdit={handleEdit}
                    onSuccess={handleSuccess}
                />

                {/* Edit Dialog */}
                <TransactionDialog
                    open={isEditSheetOpen}
                    onOpenChange={setIsEditSheetOpen}
                    transaction={selectedTransaction}
                    onSuccess={handleSuccess}
                />
            </div>
        </div>
    )
}
