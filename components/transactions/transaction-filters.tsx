"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { DateFilterPicker } from "@/components/shared/date-filter-picker"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Sheet,
    SheetTrigger,
} from "@/components/ui/sheet"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { TimeRange } from "@/types/time-range"

interface TransactionFiltersProps {
    range: TimeRange
    onRangeChange: (range: TimeRange) => void
    date: DateRange | undefined
    onDateChange: (date: DateRange | undefined) => void
    onTransactionSuccess?: () => void
}

export function TransactionFilters({
    range,
    onRangeChange,
    date,
    onDateChange,
    onTransactionSuccess
}: TransactionFiltersProps) {
    const [isSheetOpen, setIsSheetOpen] = React.useState(false)

    const handleSuccess = () => {
        setIsSheetOpen(false)
        if (onTransactionSuccess) onTransactionSuccess()
    }

    return (
        <div className="flex items-center gap-3">
            {/* 1. Tabs de períodos */}
            <Tabs
                value={range}
                onValueChange={(v) => onRangeChange(v as TimeRange)}
            >
                <TabsList>
                    <TabsTrigger value="dia">Dia</TabsTrigger>
                    <TabsTrigger value="mes">Mês</TabsTrigger>
                    <TabsTrigger value="ano">Ano</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* 2. DatePicker dinâmico */}
            <DateFilterPicker
                range={range}
                date={date}
                onDateChange={onDateChange}
                onRangeChange={onRangeChange}
            />

            {/* 3. Botão Nova Transação */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button>
                        Nova
                    </Button>
                </SheetTrigger>
                <TransactionForm
                    open={isSheetOpen}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsSheetOpen(false)}
                />
            </Sheet>
        </div>
    )
}

