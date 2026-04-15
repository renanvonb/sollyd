"use client"

import * as React from "react"
import { Column, Table } from "@tanstack/react-table"
import { Filter, Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
                            size="sm"
                            className={cn(
                                "-ml-3 h-7 px-2 text-xs md:h-8 md:px-3 md:text-sm data-[state=open]:bg-accent",
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
                                    className="h-8 pl-8 pr-8"
                                />
                                {filterValue && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-8 w-8 p-0"
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

    // Se há opções definidas, usar dropdown
    return (
        <div className={cn("flex items-center", className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "-ml-3 h-7 px-2 text-xs md:h-8 md:px-3 md:text-sm data-[state=open]:bg-accent",
                            filterValue && "text-primary"
                        )}
                    >
                        <span>{title}</span>
                        <Filter className={cn(
                            "ml-1.5 h-3.5 w-3.5 md:ml-2 md:h-4 md:w-4",
                            filterValue ? "opacity-100" : "opacity-50"
                        )} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[150px]">
                    <DropdownMenuItem
                        onClick={() => column.setFilterValue(undefined)}
                        className="justify-between"
                    >
                        Todos
                        {!filterValue && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {options.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => column.setFilterValue(option.value)}
                            className="justify-between"
                        >
                            {option.label}
                            {filterValue === option.value && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
