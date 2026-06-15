"use client"

import * as React from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { format, setMonth, setYear, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { TimeRange } from "@/types/time-range"

interface DateFilterPickerProps {
    range: TimeRange
    date: DateRange | undefined
    onDateChange: (date: DateRange | undefined) => void
    onRangeChange: (range: TimeRange) => void
}

const MONTHS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
]

export function DateFilterPicker({
    range,
    date,
    onDateChange,
    onRangeChange
}: DateFilterPickerProps) {
    const [viewDate, setViewDate] = React.useState<Date>(date?.from || new Date())
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

    // Sincroniza viewDate com o date vindo de fora
    React.useEffect(() => {
        if (date?.from) {
            setViewDate(date.from)
        }
    }, [date])

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = setMonth(viewDate, monthIndex)
        const from = startOfMonth(newDate)
        const to = endOfMonth(newDate)

        onDateChange({ from, to })
        onRangeChange('mes')
        setIsPopoverOpen(false)
    }

    const handleYearChange = (offset: number) => {
        setViewDate(prev => setYear(prev, prev.getFullYear() + offset))
    }

    const getButtonLabel = () => {
        if (!date?.from) return "Selecionar Período"

        if (range === 'mes') {
            return format(date.from, "MMMM, yyyy", { locale: ptBR })
        }

        if (range === 'dia') {
            return format(date.from, "dd 'de' MMMM", { locale: ptBR })
        }

        if (range === 'semana') {
            return `${format(date.from, "dd/MM")} - ${date.to ? format(date.to, "dd/MM") : ""}`
        }

        if (range === 'ano') {
            return format(date.from, "yyyy")
        }

        if (date.to) {
            return `${format(date.from, "dd/MM/yy")} - ${format(date.to, "dd/MM/yy")}`
        }

        return format(date.from, "dd/MM/yy")
    }

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "justify-start text-left font-sans font-medium bg-white",
                        !date && "text-zinc-500"
                    )}
                >
                    <CalendarIcon className="mr-3 h-4 w-4 text-zinc-400" />
                    {getButtonLabel()}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-4 bg-white" align="end">
                {range === 'mes' ? (
                    <div className="space-y-4">
                        {/* Seletor de Ano */}
                        <div className="flex items-center justify-between px-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleYearChange(-1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-bold text-zinc-900 tracking-tight">
                                {viewDate.getFullYear()}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleYearChange(1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Grade de Meses */}
                        <div className="grid grid-cols-3 gap-2">
                            {MONTHS.map((month, index) => {
                                const isSelected = date?.from &&
                                    date.from.getMonth() === index &&
                                    date.from.getFullYear() === viewDate.getFullYear();

                                return (
                                    <Button
                                        key={month}
                                        variant="ghost"
                                        className={cn(
                                            "font-medium transition-all",
                                            isSelected
                                                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                        )}
                                        onClick={() => handleMonthSelect(index)}
                                    >
                                        {month}
                                    </Button>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(d: DateRange | undefined) => {
                            onDateChange(d)
                            if (d?.from) onRangeChange('custom')
                        }}
                        numberOfMonths={1}
                        locale={ptBR}
                        className="rounded-xl border-none p-0"
                    />
                )}
            </PopoverContent>
        </Popover>
    )
}
