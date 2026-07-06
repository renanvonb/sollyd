'use client'

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DateRange } from "react-day-picker"
import { getTransactions } from "@/app/actions/transactions-fetch"
import { deleteTransaction, markAsPaid, markAsPending } from "@/app/actions/transactions"
import { getBudgetConsumptionForMonth } from "@/app/actions/budgets"
import { getSavingsBoxesSummaryForDashboard } from "@/app/actions/savings-boxes"
import { currentYearMonth } from "@/lib/budget-utils"
import type { BudgetConsumption } from "@/types/budget"
import { TimeRange } from "@/types/time-range"
import { normalizeSearch, cn } from "@/lib/utils"
import { TopBar } from "@/components/ui/top-bar"
import { TransactionsHeader } from "@/components/transactions/transactions-header"
import { TransactionsContent } from "@/components/transactions/transactions-content"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AdaptiveDatePicker } from "@/components/ui/adaptive-date-picker"
import { useVisibility } from "@/hooks/use-visibility-state"
import { Search, Plus, Eye, EyeOff } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
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
import { toast } from "sonner"
import type { Transaction } from "@/types/transaction"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

const periodTabs = [
    { id: 'dia', label: 'Dia' },
    { id: 'mes', label: 'Mês' },
    { id: 'ano', label: 'Ano' },
]

export default function TransactionsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isVisible, toggleVisibility } = useVisibility()

    // State
    const [data, setData] = React.useState<any[]>([])
    const [budgetMap, setBudgetMap] = React.useState<Map<string, BudgetConsumption>>(new Map())
    const [caixinhasTotal, setCaixinhasTotal] = React.useState(0)
    const [loading, setLoading] = React.useState(true)
    const [searchValue, setSearchValue] = React.useState(searchParams.get('q') || "")
    const [statusFilter, setStatusFilter] = React.useState(searchParams.get('status') || "all")
    const [typeFilter, setTypeFilter] = React.useState(searchParams.get('type') || "all")
    const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null)
    const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false)
    const [isNewSheetOpen, setIsNewSheetOpen] = React.useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [newTransactionType, setNewTransactionType] = React.useState<"revenue" | "expense" | "investment">("expense")

    // URL params
    const range = (searchParams.get('range') as TimeRange) || 'mes'
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const searchQuery = searchParams.get('q')?.toLowerCase() || ""

    // Fetch data
    const fetchData = React.useCallback(async () => {
        try {
            setLoading(true)
            const result = await getTransactions({
                range,
                startDate: from ? format(parseISO(from), 'yyyy-MM-01') : undefined,
                // STRICT_FILTER_V5: Ignore 'to' when range is 'mes' to use backend's strict competence logic
                endDate: (range === 'mes') ? undefined : (to || undefined),
            })
            setData(result)

            // Consumo de orçamentos do mês atual → Map para lookup O(1) na tabela (evita N+1)
            const budgetRes = await getBudgetConsumptionForMonth(currentYearMonth())
            if (budgetRes.success && budgetRes.data) {
                setBudgetMap(new Map(
                    budgetRes.data.map((c) => [`${c.category_id}:${c.subcategory_id ?? "null"}`, c])
                ))
            }

            // Total guardado em caixinhas (estoque, não soma de fluxo)
            const caixinhasRes = await getSavingsBoxesSummaryForDashboard()
            if (caixinhasRes.success && caixinhasRes.data) {
                setCaixinhasTotal(caixinhasRes.data.total_current_amount)
            }
        } catch (error) {
            console.error("Error fetching transactions:", error)
            toast.error("Erro de carregamento", {
                description: "Não foi possível carregar o histórico de transações."
            })
        } finally {
            setLoading(false)
        }
    }, [range, from, to])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    // Handlers
    const handleRangeChange = (newRange: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('range', newRange)
        params.delete('from')
        params.delete('to')
        router.push(`?${params.toString()}`, { scroll: false })
    }

    const handleDateChange = (newDate: DateRange | undefined) => {
        const params = new URLSearchParams(searchParams.toString())
        if (newDate?.from) params.set('from', newDate.from.toISOString())
        else params.delete('from')
        if (newDate?.to) params.set('to', newDate.to.toISOString())
        else params.delete('to')
        router.push(`?${params.toString()}`, { scroll: false })
    }

    // Search debounce
    React.useEffect(() => {
        const currentQ = searchParams.get('q') || ""
        if (searchValue === currentQ) return

        const timer = setTimeout(() => {
            const params = new URLSearchParams(window.location.search)
            if (searchValue) params.set('q', searchValue)
            else params.delete('q')
            router.push(`?${params.toString()}`, { scroll: false })
        }, 400)
        return () => clearTimeout(timer)
    }, [searchValue, router])

    const handleAddClick = (type: "revenue" | "expense" | "investment") => {
        setNewTransactionType(type)
        setIsNewSheetOpen(true)
    }

    const handleEdit = (transaction: Transaction) => {
        setSelectedTransaction(transaction)
        setIsEditSheetOpen(true)
    }

    const handleDelete = (transaction: Transaction) => {
        setSelectedTransaction(transaction)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!selectedTransaction?.id) return

        setIsDeleting(true)
        try {
            await deleteTransaction(selectedTransaction.id)
            toast.success("Transação excluída", {
                description: "A transação foi excluída com sucesso."
            })
            fetchData()
            setIsDeleteDialogOpen(false)
            setSelectedTransaction(null)
        } catch (error) {
            console.error("Error deleting transaction:", error)
            toast.error("Erro ao excluir", {
                description: "Não foi possível excluir a transação."
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleMarkAsPaid = async (transaction: Transaction) => {
        try {
            const result = await markAsPaid(transaction.id)
            if (result.success) {
                toast.success("Transação paga", {
                    description: "A transação foi marcada como realizada com sucesso."
                })
                fetchData()
            } else {
                toast.error("Erro ao atualizar", {
                    description: result.error || "Não foi possível marcar a transação como paga."
                })
            }
        } catch (error) {
            console.error("Error marking as paid:", error)
            toast.error("Erro inesperado", {
                description: "Ocorreu um erro ao processar sua solicitação."
            })
        }
    }

    const handleMarkAsPending = async (transaction: Transaction) => {
        try {
            const result = await markAsPending(transaction.id)
            if (result.success) {
                toast.success("Transação pendente", {
                    description: "A transação foi marcada como pendente com sucesso."
                })
                fetchData()
            } else {
                toast.error("Erro ao atualizar", {
                    description: result.error || "Não foi possível marcar a transação como pendente."
                })
            }
        } catch (error) {
            console.error("Error marking as pending:", error)
            toast.error("Erro inesperado", {
                description: "Ocorreu um erro ao processar sua solicitação."
            })
        }
    }

    const handleSuccess = () => {
        fetchData()
        setIsNewSheetOpen(false)
        setIsEditSheetOpen(false)
    }

    const filteredData = React.useMemo(() => {
        let filtered = data

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter)
        }

        // Filter by type
        if (typeFilter !== 'all') {
            const isAporte = (t: any) => (t.description || '').startsWith('Aporte:')
            if (typeFilter === 'Aporte') {
                filtered = filtered.filter(isAporte)
            } else {
                const typeAliases: Record<string, string[]> = {
                    Receita: ['Receita', 'revenue'],
                    Despesa: ['Despesa', 'expense'],
                }
                const accepted = typeAliases[typeFilter] || [typeFilter]
                filtered = filtered.filter(t => accepted.includes(t.type) && !isAporte(t))
            }
        }

        // Filter by search query (apenas descrição e valor)
        if (searchQuery) {
            const normalizedQuery = normalizeSearch(searchQuery)
            filtered = filtered.filter(t => {
                const desc = normalizeSearch(t.description || "")

                // Formatar valor em múltiplos formatos para busca
                const amount = t.amount || 0
                // Formato com ponto decimal: 1234.56
                const amountDot = amount.toFixed(2)
                // Formato brasileiro com vírgula: 1234,56
                const amountComma = amountDot.replace('.', ',')
                // Formato brasileiro completo: 1.234,56
                const amountBR = new Intl.NumberFormat("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(amount)

                const normalizedAmountDot = normalizeSearch(amountDot)
                const normalizedAmountComma = normalizeSearch(amountComma)
                const normalizedAmountBR = normalizeSearch(amountBR)

                return desc.includes(normalizedQuery) ||
                    normalizedAmountDot.includes(normalizedQuery) ||
                    normalizedAmountComma.includes(normalizedQuery) ||
                    normalizedAmountBR.includes(normalizedQuery)
            })
        }

        return filtered
    }, [data, searchQuery, statusFilter, typeFilter])

    const dateRange: DateRange | undefined = React.useMemo(() => {
        if (from && to) return { from: new Date(from), to: new Date(to) }
        return undefined
    }, [from, to])

    const referenceDate = React.useMemo(() => {
        if (from) return new Date(from);
        return new Date();
    }, [from]);

    const periodTitle = React.useMemo(() => {
        const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
        if (range === 'dia') {
            const weekday = cap(format(referenceDate, "EEEE", { locale: ptBR }).replace("-feira", ""))
            return `${weekday}, ${format(referenceDate, "dd 'de' MMM yyyy", { locale: ptBR })}`
        }
        if (range === 'ano') {
            return format(referenceDate, "yyyy", { locale: ptBR })
        }
        return cap(format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR }))
    }, [range, referenceDate])

    const periodNoun = range === 'dia' ? 'dia' : range === 'ano' ? 'ano' : 'mês'
    const isSingular = filteredData.length === 1
    const statusAdjective = statusFilter === 'Realizado'
        ? (isSingular ? 'realizada' : 'realizadas')
        : statusFilter === 'Pendente'
            ? (isSingular ? 'pendente' : 'pendentes')
            : (isSingular ? 'registrada' : 'registradas')
    const periodDescription = `${filteredData.length} ${isSingular ? 'transação' : 'transações'} ${statusAdjective} neste ${periodNoun}`

    return (
        <div className="h-dvh flex flex-col overflow-hidden bg-background">
            {/* Top Bar with Period Tabs */}
            <TopBar
                moduleName="Transações"
                tabs={periodTabs}
                activeTab={range}
                onTabChange={handleRangeChange}
                variant="simple"
                rightContent={
                    <div className="hidden md:flex items-center gap-3">
                        <div className="relative w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar" className="pl-9 h-10 font-inter" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
                        </div>
                        <div className="flex items-center h-10 rounded-md border border-input overflow-hidden">
                            {periodTabs.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleRangeChange(t.id)}
                                    className={cn(
                                        "h-10 px-4 text-sm font-inter transition-colors border-r border-input last:border-r-0",
                                        range === t.id
                                            ? "bg-accent text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <AdaptiveDatePicker mode={range as any} value={dateRange} onChange={handleDateChange} className="w-[120px]" />
                        <Button variant="outline" size="icon" className="text-muted-foreground hover:text-foreground" onClick={toggleVisibility}>
                            {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                    </div>
                }
            />

            {/* Main Content Wrapper — padding alinhado ao dashboard */}
            <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 min-h-0 flex flex-col pt-4 md:pt-6 pb-4 md:pb-8 gap-5 md:gap-6 overflow-hidden">

                <TransactionsHeader
                    title="Transações"
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    range={range}
                    onRangeChange={handleRangeChange}
                    date={dateRange}
                    onDateChange={handleDateChange}
                    onAddClick={handleAddClick}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                />

                {/* Desktop: título + controles */}
                <div className="hidden md:flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold text-foreground font-jakarta">{periodTitle}</h2>
                        <span className="w-px h-5 bg-border" />
                        <p className="text-sm text-muted-foreground font-inter">{periodDescription}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center h-10 rounded-md border border-input overflow-hidden">
                            {[
                                { id: "all", label: "Todas" },
                                { id: "Realizado", label: "Realizadas" },
                                { id: "Pendente", label: "Pendentes" },
                            ].map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setStatusFilter(s.id)}
                                    className={cn(
                                        "h-10 px-4 text-sm font-inter transition-colors border-r border-input last:border-r-0",
                                        statusFilter === s.id
                                            ? "bg-accent text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    )}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[140px] h-10 font-inter">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="Receita">Receitas</SelectItem>
                                <SelectItem value="Despesa">Despesas</SelectItem>
                                <SelectItem value="Aporte">Aportes</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={() => handleAddClick("expense")} className="font-inter">
                            <Plus className="h-4 w-4" />
                            Adicionar
                        </Button>
                    </div>
                </div>

                <TransactionsContent
                    data={filteredData}
                    isPending={loading}
                    searchQuery={searchQuery}
                    range={range}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onMarkAsPaid={handleMarkAsPaid}
                    onMarkAsPending={handleMarkAsPending}
                    onResetSearch={() => setSearchValue("")}
                    onAddClick={handleAddClick}
                    budgetMap={budgetMap}
                    caixinhasTotal={caixinhasTotal}
                />

                {/* Sheet Nova Transação */}
                <Sheet open={isNewSheetOpen} onOpenChange={setIsNewSheetOpen}>
                    <SheetContent
                        side="right"
                        className="w-full sm:max-w-[480px] p-0 flex flex-col"
                    >
                        <SheetTitle className="sr-only">Nova transação</SheetTitle>
                        <TransactionForm
                            open={isNewSheetOpen}
                            defaultType={newTransactionType}
                            initialDate={referenceDate}
                            onSuccess={handleSuccess}
                            onCancel={() => setIsNewSheetOpen(false)}
                        />
                    </SheetContent>
                </Sheet>

                {/* Sheet Editar Transação */}
                <Sheet open={isEditSheetOpen} onOpenChange={(open) => {
                    setIsEditSheetOpen(open)
                    if (!open) setSelectedTransaction(null)
                }}>
                    <SheetContent
                        side="right"
                        className="w-full sm:max-w-[480px] p-0 flex flex-col"
                    >
                        <SheetTitle className="sr-only">Editar transação</SheetTitle>
                        <TransactionForm
                            key={selectedTransaction?.id}
                            open={isEditSheetOpen}
                            transaction={selectedTransaction}
                            onSuccess={handleSuccess}
                            onCancel={() => setIsEditSheetOpen(false)}
                        />
                    </SheetContent>
                </Sheet>

                {/* Dialog Confirmação de Exclusão */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent className="sm:max-w-[400px] w-[calc(100%-2rem)]">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir</AlertDialogTitle>
                            <AlertDialogDescription>
                                Você está prestes a realizar uma exclusão permanente que não poderá ser desfeita. Tem certeza que deseja continuar?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmDelete}
                                variant="destructive"
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Excluindo..." : "Excluir"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}

