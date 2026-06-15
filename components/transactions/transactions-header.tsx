"use client"

import { Search, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AdaptiveDatePicker } from "@/components/ui/adaptive-date-picker"
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
        <div className="flex-none bg-background z-10 w-full md:hidden">
            <div className="w-full pb-0">
                {/* Mobile: Range + DatePicker + Add */}
                <div className="flex md:hidden items-center gap-2">
                    <Select value={range} onValueChange={(v) => onRangeChange(v as TimeRange)}>
                        <SelectTrigger className="flex-1 min-w-0 gap-2 h-10 font-inter text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dia">Dia</SelectItem>
                            <SelectItem value="mes">Mês</SelectItem>
                            <SelectItem value="ano">Ano</SelectItem>
                        </SelectContent>
                    </Select>
                    <AdaptiveDatePicker
                        mode={range as TimeRange}
                        value={date}
                        onChange={onDateChange}
                        className="flex-1 min-w-0 h-10 justify-start"
                    />
                    <Button
                        className="h-10 w-10 shrink-0 p-0 font-inter font-medium"
                        aria-label="Adicionar transação"
                        onClick={() => onAddClick("expense")}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Mobile: Search */}
                <div className="relative flex md:hidden mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar transação..."
                        className="pl-9 h-10 font-inter w-full text-sm"
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Mobile: Status */}
                <Tabs value={statusFilter} onValueChange={onStatusFilterChange} className="w-full flex md:hidden mt-3">
                    <TabsList className="w-full">
                        <TabsTrigger value="all" className="font-inter">Todas</TabsTrigger>
                        <TabsTrigger value="Realizado" className="font-inter">Realizadas</TabsTrigger>
                        <TabsTrigger value="Pendente" className="font-inter">Pendentes</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    )
}
