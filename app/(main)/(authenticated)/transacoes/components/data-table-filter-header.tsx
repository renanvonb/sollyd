"use client"

import * as React from "react"
import { Column, Table } from "@tanstack/react-table"
import { Filter, Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DataTableFilterHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>
    title: string
    options?: { label: string; value: string }[]
}

export function DataTableFilterHeader<TData, TValue>({
    column,
    title,
    options = [],
    className,
}: DataTableFilterHeaderProps<TData, TValue>) {
    const filterValue = column.getFilterValue() as string | undefined
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")

    // Se não há opções definidas, usar filtro por texto
    if (options.length === 0) {
        return (
            <div className={cn("flex items-center", className)}>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                "-ml-3 h-7 px-2 text-xs md:h-10 md:px-4 md:text-sm data-[state=open]:bg-accent",
                                filterValue && "text-primary"
                            )}
                        >
                            <span>{title}</span>
                            <Filter className={cn(
                                "ml-1.5 h-3.5 w-3.5 md:ml-2 md:h-4 md:w-4",
                                filterValue ? "opacity-100" : "opacity-50"
                            )} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-2" align="start">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={`Filtrar ${title.toLowerCase()}...`}
                                    value={filterValue ?? ""}
                                    onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                                    className="h-10 pl-8 pr-8"
                                />
                                {filterValue && (
                                    <Button
                                        variant="ghost"
                                        className="absolute right-0 top-0 h-10 w-10 p-0"
                                        onClick={() => {
                                            column.setFilterValue(undefined)
                                            setOpen(false)
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        )
    }

    // Se há opções definidas, usar popover com busca
    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(searchValue.toLowerCase())
    )

    return (
        <div className={cn("flex items-center", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            "-ml-3 h-7 px-2 text-xs md:h-10 md:px-4 md:text-sm data-[state=open]:bg-accent",
                            filterValue && "text-primary"
                        )}
                    >
                        <span>{title}</span>
                        <Filter className={cn(
                            "ml-1.5 h-3.5 w-3.5 md:ml-2 md:h-4 md:w-4",
                            filterValue ? "opacity-100" : "opacity-50"
                        )} />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-1" align="start">
                    <div className="relative px-1 pb-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="h-9 pl-8 text-sm"
                        />
                    </div>
                    <div className="max-h-[260px] overflow-y-auto">
                        <button
                            onClick={() => { column.setFilterValue(undefined); setOpen(false) }}
                            className="relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                            <span className={cn(!filterValue && "font-medium")}>Todos</span>
                            {!filterValue && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                        {filtered.length === 0 ? (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                Nenhum resultado
                            </div>
                        ) : (
                            filtered.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => { column.setFilterValue(option.value); setOpen(false) }}
                                    className="relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                >
                                    <span className={cn("truncate", filterValue === option.value && "font-medium")}>{option.label}</span>
                                    {filterValue === option.value && <Check className="h-4 w-4 shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
