"use client"

import * as React from "react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
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
import { MonthPicker } from "@/components/ui/month-picker"
import { YearPicker } from "@/components/ui/year-picker"
import { WeekPicker } from "@/components/ui/week-picker"

type PeriodMode = "dia" | "semana" | "mes" | "ano" | "custom"

interface AdaptiveDatePickerProps {
    mode: PeriodMode
    value?: DateRange | Date
    onChange?: (range: DateRange | undefined) => void
    className?: string
}

export function AdaptiveDatePicker({ mode, value, onChange, className }: AdaptiveDatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [date, setDate] = React.useState<Date | undefined>(
        value instanceof Date ? value : value?.from
    )

    // Automatically set current period when mode changes
    React.useEffect(() => {
        const now = new Date()

        if (mode === "dia") {
            setDate(now)
            onChange?.({ from: now, to: now })
        } else if (mode === "semana") {
            const weekStart = startOfWeek(now, { weekStartsOn: 0 })
            const weekEnd = endOfWeek(now, { weekStartsOn: 0 })
            setDate(now)
            onChange?.({ from: weekStart, to: weekEnd })
        } else if (mode === "mes") {
            const monthStart = startOfMonth(now)
            const monthEnd = endOfMonth(now)
            setDate(now)
            onChange?.({ from: monthStart, to: monthEnd })
        } else if (mode === "ano") {
            const yearStart = startOfYear(now)
            const yearEnd = endOfYear(now)
            setDate(now)
            onChange?.({ from: yearStart, to: yearEnd })
        } else if (mode === "custom") {
            // Não reseta data automaticamente para custom, mas pode iniciar vazio ou manter anterior
        }
    }, [mode]) // Only run when mode changes

    // Format display based on mode
    const getDisplayText = () => {
        if (!value && !date) return "Selecionar"

        if (mode === "custom") {
            const range = value as DateRange
            if (range?.from) {
                if (range.to) {
                    return `${format(range.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(range.to, "dd/MM/yyyy", { locale: ptBR })}`
                }
                return format(range.from, "dd/MM/yyyy", { locale: ptBR })
            }
            return "Selecione o período"
        }

        const displayDate = date || (value instanceof Date ? value : value?.from)
        if (!displayDate) return "Selecionar"

        if (mode === "dia") {
            return format(displayDate, "dd/MM/yy", { locale: ptBR })
        }
        if (mode === "semana") {
            const weekStart = startOfWeek(displayDate, { weekStartsOn: 0 })
            const weekEnd = endOfWeek(displayDate, { weekStartsOn: 0 })
            return `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM", { locale: ptBR })}`
        }
        if (mode === "mes") {
            return format(displayDate, "MMM/yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())
        }
        if (mode === "ano") {
            return format(displayDate, "yyyy", { locale: ptBR })
        }

        return format(displayDate, "dd/MM/yyyy", { locale: ptBR })
    }

    // Handle date selection based on mode
    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (!selectedDate) return

        setDate(selectedDate)

        if (mode === "dia") {
            // Single day
            onChange?.({ from: selectedDate, to: selectedDate })
            setOpen(false)
        } else if (mode === "semana") {
            // Week range
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
            const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })
            onChange?.({ from: weekStart, to: weekEnd })
            setOpen(false)
        } else if (mode === "ano") {
            // Year range
            const yearStart = startOfYear(selectedDate)
            const yearEnd = endOfYear(selectedDate)
            onChange?.({ from: yearStart, to: yearEnd })
            setOpen(false)
        }
    }

    // Handle range selection for custom mode
    const handleRangeSelect = (range: DateRange | undefined) => {
        onChange?.(range)
        // Não fecha automaticamente para permitir ajuste fino do range
    }

    // Handle month selection
    const handleMonthSelect = (selectedDate: Date) => {
        setDate(selectedDate)
        const monthStart = startOfMonth(selectedDate)
        const monthEnd = endOfMonth(selectedDate)
        onChange?.({ from: monthStart, to: monthEnd })
        setOpen(false)
    }

    // Render month picker for "mes" mode
    if (mode === "mes") {
        return (
            <MonthPicker
                value={date}
                onChange={handleMonthSelect}
                className={className}
            />
        )
    }

    if (mode === "semana") {
        return (
            <WeekPicker
                value={date}
                onChange={handleDateSelect}
                className={className}
            />
        )
    }

    if (mode === "ano") {
        return (
            <YearPicker
                value={date}
                onChange={handleDateSelect}
                className={className}
            />
        )
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-auto justify-start text-left font-inter font-normal px-4",
                        !value && !date && "text-muted-foreground",
                        mode === "custom" && "w-[240px]", // Largura maior para range
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4" />
                    <span>{getDisplayText()}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                    mode={mode === "custom" ? "range" : "single"}
                    selected={mode === "custom" ? (value as any) : date}
                    onSelect={mode === "custom" ? (handleRangeSelect as any) : (handleDateSelect as any)}
                    numberOfMonths={mode === "custom" ? 2 : 1}
                    locale={ptBR}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
