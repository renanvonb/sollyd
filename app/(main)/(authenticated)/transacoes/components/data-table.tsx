"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchQuery?: string
    onEdit?: (row: TData) => void
    onDelete?: (row: TData) => void
    onMarkAsPaid?: (row: TData) => void
    onMarkAsPending?: (row: TData) => void
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchQuery,
    onEdit,
    onDelete,
    onMarkAsPaid,
    onMarkAsPending,
}: DataTableProps<TData, TValue>) {
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        state: {
            sorting,
            columnFilters,
        },
        meta: {
            searchQuery,
            onEdit,
            onDelete,
            onMarkAsPaid,
            onMarkAsPending,
        },
    })

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement
        setIsScrolled(target.scrollTop > 0)
    }

    return (
        <div
            className="relative w-full h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
            onScroll={handleScroll}
        >
            <Table className="table-fixed w-full">
                <TableHeader
                    className={cn(
                        "sticky top-0 bg-card z-10 border-b transition-shadow duration-200",
                        isScrolled ? "shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5),0_2px_4px_-2px_rgba(0,0,0,0.3)]" : "shadow-none"
                    )}
                >
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                const size = header.column.columnDef.size
                                return (
                                    <TableHead
                                        key={header.id}
                                        style={size ? { width: `${size}px` } : undefined}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                            >
                                {row.getVisibleCells().map((cell) => {
                                    const size = cell.column.columnDef.size
                                    const isActionsColumn = cell.column.id === 'actions'
                                    return (
                                        <TableCell
                                            key={cell.id}
                                            style={size ? { width: `${size}px` } : undefined}
                                            className={isActionsColumn ? "py-2 px-2" : undefined}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center text-xs md:text-sm"
                            >
                                Nenhum resultado encontrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
