'use client'

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DateRange } from "react-day-picker"
import { getTransactions } from "@/app/actions/transactions-fetch"
import { deleteTransaction, markAsPaid, markAsPending } from "@/app/actions/transactions"
import { TimeRange } from "@/types/time-range"
import { normalizeSearch } from "@/lib/utils"
import { TopBar } from "@/components/ui/top-bar"
import { TransactionsHeader } from "@/components/transactions/transactions-header"
import { TransactionsContent } from "@/components/transactions/transactions-content"
import { TransactionForm } from "@/components/transaction-form"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
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

const periodTabs = [
    { id: 'dia', label: 'Dia' },
    { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mês' },
    { id: 'ano', label: 'Ano' },
]

export default function TransactionsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // State
    const [data, setData] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [searchValue, setSearchValue] = React.useState(searchParams.get('q') || "")
    const [statusFilter, setStatusFilter] = React.useState(searchParams.get('status') || "all")
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
    }, [data, searchQuery, statusFilter])

    const dateRange: DateRange | undefined = React.useMemo(() => {
        if (from && to) return { from: new Date(from), to: new Date(to) }
        return undefined
    }, [from, to])

    const referenceDate = React.useMemo(() => {
        if (from) return new Date(from);
        return new Date();
    }, [from]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Top Bar with Period Tabs */}
            <TopBar
                moduleName="Transações"
                tabs={periodTabs}
                activeTab={range}
                onTabChange={handleRangeChange}
                variant="simple"
            />

            {/* Main Content Wrapper — padding alinhado ao dashboard */}
            <div className="max-w-[1440px] mx-auto px-5 md:px-8 w-full flex-1 flex flex-col pb-5 md:pb-8 gap-5 md:gap-8 overflow-hidden">

                <TransactionsHeader
                    title="Transações"
                    description="Gerencie e acompanhe suas movimentações financeiras."
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
                />

                {/* Dialog Nova Transação */}
                <Dialog open={isNewSheetOpen} onOpenChange={setIsNewSheetOpen}>
                    <DialogContent
                        className="sm:max-w-[480px]"
                        onInteractOutside={(e) => e.preventDefault()}
                        onEscapeKeyDown={(e) => e.preventDefault()}
                    >
                        <DialogHeader>
                            <DialogTitle className="font-jakarta">
                                Nova transação
                            </DialogTitle>
                            <DialogDescription>
                                Preencha os dados da nova transação
                            </DialogDescription>
                        </DialogHeader>
                        <TransactionForm
                            open={isNewSheetOpen}
                            defaultType={newTransactionType}
                            initialDate={referenceDate}
                            onSuccess={handleSuccess}
                            onCancel={() => setIsNewSheetOpen(false)}
                        />
                    </DialogContent>
                </Dialog>

                {/* Dialog Editar Transação */}
                <Dialog open={isEditSheetOpen} onOpenChange={(open) => {
                    setIsEditSheetOpen(open)
                    if (!open) setSelectedTransaction(null)
                }}>
                    <DialogContent
                        className="sm:max-w-[480px]"
                        onInteractOutside={(e) => e.preventDefault()}
                        onEscapeKeyDown={(e) => e.preventDefault()}
                    >
                        <DialogHeader>
                            <DialogTitle className="font-jakarta">Editar transação</DialogTitle>
                            <DialogDescription>
                                Atualize os dados da transação
                            </DialogDescription>
                        </DialogHeader>
                        <TransactionForm
                            key={selectedTransaction?.id}
                            open={isEditSheetOpen}
                            transaction={selectedTransaction}
                            onSuccess={handleSuccess}
                            onCancel={() => setIsEditSheetOpen(false)}
                        />
                    </DialogContent>
                </Dialog>

                {/* Dialog Confirmação de Exclusão */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent className="sm:max-w-[400px]">
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

