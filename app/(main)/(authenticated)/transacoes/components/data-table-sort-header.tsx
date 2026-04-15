"use client"

import { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DataTableSortHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>
    title: string
}

export function DataTableSortHeader<TData, TValue>({
    column,
    title,
    className,
}: DataTableSortHeaderProps<TData, TValue>) {
    if (!column.getCanSort()) {
        return <div className={cn("text-xs md:text-sm", className)}>{title}</div>
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            className={cn("-ml-3 h-7 px-2 text-xs md:h-8 md:px-3 md:text-sm data-[state=open]:bg-accent", className)}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-1.5 h-3.5 w-3.5 md:ml-2 md:h-4 md:w-4" />
            ) : column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-1.5 h-3.5 w-3.5 md:ml-2 md:h-4 md:w-4" />
            ) : (
                <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 opacity-50 md:ml-2 md:h-4 md:w-4" />
            )}
        </Button>
    )
}
