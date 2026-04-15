"use client"

import { Search, Plus, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AdaptiveDatePicker } from "@/components/ui/adaptive-date-picker"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DateRange } from "react-day-picker"
import { TimeRange } from "@/types/time-range"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface TransactionsHeaderProps {
    title: string
    description: string
    searchValue: string
    onSearchChange: (value: string) => void
    range: TimeRange
    onRangeChange: (range: TimeRange) => void
    date: DateRange | undefined
    onDateChange: (date: DateRange | undefined) => void
    onAddClick: (type: "revenue" | "expense" | "investment") => void
    statusFilter?: string
    onStatusFilterChange?: (value: string) => void
}

export function TransactionsHeader({
    title,
    description,
    searchValue,
    onSearchChange,
    range,
    onRangeChange,
    date,
    onDateChange,
    onAddClick,
    statusFilter = "all",
    onStatusFilterChange,
}: TransactionsHeaderProps) {
    return (
        <div className="flex-none bg-background z-10 w-full">
            {/* Padding horizontal vem do wrapper da página (evita margem duplicada) */}
            <div className="w-full pt-5 md:pt-8 pb-0">
                <div className="flex flex-row items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-semibold md:font-bold tracking-tight text-foreground font-jakarta truncate">
                            {title}
                        </h1>
                        {description ? (
                            <p className="text-muted-foreground mt-1 font-sans text-sm md:text-base hidden md:block">
                                {description}
                            </p>
                        ) : null}
                    </div>

                    <div
                        id="standard-filters"
                        className="flex flex-row items-center gap-2 md:gap-3 font-sans shrink-0"
                    >
                        <div className="flex items-center gap-2">
                            <Select
                                value={range}
                                onValueChange={(v) => onRangeChange(v as TimeRange)}
                            >
                                <SelectTrigger className="w-auto min-w-[max-content] gap-2 h-10 shrink-0 md:hidden font-inter text-foreground">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dia">Dia</SelectItem>
                                    <SelectItem value="semana">Semana</SelectItem>
                                    <SelectItem value="mes">Mês</SelectItem>
                                    <SelectItem value="ano">Ano</SelectItem>
                                </SelectContent>
                            </Select>

                            <Tabs
                                value={statusFilter}
                                onValueChange={onStatusFilterChange}
                                className="h-10 hidden md:flex"
                            >
                                <TabsList className="h-10">
                                    <TabsTrigger value="all" className="h-8">
                                        Todas
                                    </TabsTrigger>
                                    <TabsTrigger value="Realizado" className="h-8">
                                        Realizadas
                                    </TabsTrigger>
                                    <TabsTrigger value="Pendente" className="h-8">
                                        Pendentes
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <AdaptiveDatePicker
                                mode={range as TimeRange}
                                value={date}
                                onChange={onDateChange}
                                className="w-10 px-0 justify-center h-10 shrink-0 md:w-auto md:justify-start md:px-3 [&>span]:hidden md:[&>span]:inline md:[&>svg]:mr-2"
                            />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        className="h-10 w-10 shrink-0 p-0 font-inter font-medium md:w-auto md:px-3 md:gap-0"
                                        aria-label="Adicionar transação"
                                    >
                                        <Plus className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">Adicionar</span>
                                        <ChevronDown className="h-4 w-4 ml-1 hidden md:inline" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px]">
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => onAddClick("revenue")}
                                    >
                                        Receita
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => onAddClick("expense")}
                                    >
                                        Despesa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => onAddClick("investment")}
                                    >
                                        Investimento
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="hidden md:block relative w-[250px] shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar"
                                className="pl-9 h-10 font-inter w-full"
                                value={searchValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <Tabs
                    value={statusFilter}
                    onValueChange={onStatusFilterChange}
                    className="w-full flex md:hidden mt-4"
                >
                    <TabsList className="w-full h-10 flex bg-muted/50 p-1">
                        <TabsTrigger value="all" className="flex-1 h-8 font-inter">
                            Todas
                        </TabsTrigger>
                        <TabsTrigger value="Realizado" className="flex-1 h-8 font-inter">
                            Realizadas
                        </TabsTrigger>
                        <TabsTrigger value="Pendente" className="flex-1 h-8 font-inter">
                            Pendentes
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    )
}
