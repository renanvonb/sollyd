"use client"

import * as React from "react"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { TransactionMobileList } from "@/components/transaction-mobile-list"
import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards"
import { EmptyState } from "@/components/ui/empty-state"
import { Inbox, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Transaction } from "@/types/transaction"

interface TransactionsContentProps {
    data: any[]
    isPending: boolean
    searchQuery: string
    range: string
    onEdit: (transaction: Transaction) => void
    onDelete: (transaction: Transaction) => void
    onMarkAsPaid: (transaction: Transaction) => void
    onMarkAsPending: (transaction: Transaction) => void
    onResetSearch: () => void
    onAddClick: (type: "revenue" | "expense" | "investment") => void
    budgetMap?: Map<string, any>
}

import { Skeleton } from "@/components/ui/skeleton"
import { TableContentSkeleton } from "@/components/ui/skeletons"

const emptyMessages: Record<string, string> = {
    dia: "Nenhuma transação registrada neste dia",
    semana: "Nenhuma transação registrada nesta semana",
    mes: "Nenhuma transação registrada neste mês",
    ano: "Nenhuma transação registrada neste ano",
    custom: "Nenhuma transação registrada neste período"
}

export function TransactionsContent({
    data,
    isPending,
    searchQuery,
    range,
    onEdit,
    onDelete,
    onMarkAsPaid,
    onMarkAsPending,
    onResetSearch,
    onAddClick,
    budgetMap,
}: TransactionsContentProps) {
    const [filteredRows, setFilteredRows] = React.useState<any[] | null>(null)

    // Nova carga de dados (ou lista vazia) invalida o snapshot filtrado da tabela.
    React.useEffect(() => {
        setFilteredRows(null)
    }, [data])

    // Linhas que alimentam os totais: respeitam filtros de coluna da tabela.
    // Fallback para `data` enquanto a tabela não reportou (ex.: loading/empty).
    const totalsSource = filteredRows ?? data

    const totals = React.useMemo(() => {
        return totalsSource.reduce((acc, curr) => {
            const amount = parseFloat(curr.amount as any) || 0



            if (curr.type === 'revenue' || curr.type === 'Receita' || curr.type === 'receita') acc.income += amount
            else if (curr.type === 'expense' || curr.type === 'Despesa' || curr.type === 'despesa') acc.expense += amount
            else if (curr.type === 'investment') acc.investment += amount

            acc.balance = acc.income - acc.expense - acc.investment
            return acc
        }, { income: 0, expense: 0, investment: 0, balance: 0 })
    }, [totalsSource])

    const emptyTitle = searchQuery
        ? "Nenhuma transação encontrada"
        : (emptyMessages[range] || "Nenhuma transação cadastrada")

    return (
        <div className="flex-1 min-h-0 flex flex-col gap-[25px] overflow-hidden">
            {/* Grid de Totalizadores (KPIs) - SEMPRE VISÍVEL */}
            <div className="flex-none font-sans">
                <TransactionSummaryCards totals={totals} isLoading={isPending} />
            </div>

            {/* Área de Conteúdo */}
            <div className="flex-1 min-h-0 flex flex-col pb-1">
                {isPending && data.length === 0 ? (
                    <TableContentSkeleton />
                ) : data.length === 0 ? (
                    <EmptyState
                        variant="outlined"
                        size="lg"
                        icon={Inbox}
                        title={emptyTitle}
                        description={
                            searchQuery
                                ? "Não encontramos transações com os termos buscados. Tente ajustar sua pesquisa."
                                : <span>Registre sua primeira transação clicando <br /> no botão "Adicionar".</span>
                        }
                        action={
                            searchQuery ? (
                                <Button
                                    variant="outline"
                                    onClick={onResetSearch}
                                    className="font-inter"
                                >
                                    Limpar busca
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => onAddClick('expense')}
                                    className="font-inter"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar
                                </Button>
                            )
                        }
                        className="flex-1"
                    />
                ) : (
                    <>
                        {/* DESKTOP: tabela */}
                        <div id="data-table-wrapper" className="hidden md:flex flex-1 min-h-0 bg-card rounded-lg border border-border shadow-sm flex-col relative overflow-hidden font-sans">
                            <TransactionTable
                                data={data}
                                searchQuery={searchQuery}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onMarkAsPaid={onMarkAsPaid}
                                onMarkAsPending={onMarkAsPending}
                                onFilteredRowsChange={setFilteredRows}
                                budgetMap={budgetMap}
                            />
                        </div>
                        {/* MOBILE: lista de cards */}
                        <div className="md:hidden flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-2">
                            <TransactionMobileList
                                data={data}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onMarkAsPaid={onMarkAsPaid}
                                onMarkAsPending={onMarkAsPending}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

