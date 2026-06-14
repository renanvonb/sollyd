"use client"

import { DataTable } from "@/app/(main)/(authenticated)/transacoes/components/data-table"
import { columns } from "@/app/(main)/(authenticated)/transacoes/components/columns"
import { Transaction } from "@/types/transaction"

interface TransactionTableProps {
    data: any[]
    searchQuery?: string
    onEdit?: (transaction: Transaction) => void
    onDelete?: (transaction: Transaction) => void
    onMarkAsPaid?: (transaction: Transaction) => void
    onMarkAsPending?: (transaction: Transaction) => void
    onFilteredRowsChange?: (rows: any[]) => void
}

export function TransactionTable({ data, searchQuery, onEdit, onDelete, onMarkAsPaid, onMarkAsPending, onFilteredRowsChange }: TransactionTableProps) {
    return (
        <DataTable
            columns={columns}
            data={data}
            searchQuery={searchQuery}
            onEdit={onEdit}
            onDelete={onDelete}
            onMarkAsPaid={onMarkAsPaid}
            onMarkAsPending={onMarkAsPending}
            onFilteredRowsChange={onFilteredRowsChange}
        />
    )
}
