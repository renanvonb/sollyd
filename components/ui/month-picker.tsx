"use client"

import * as React from "react"
import { format, setMonth, setYear } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface MonthPickerProps {
    value?: Date
    onChange?: (date: Date) => void
    className?: string
    minDate?: Date
    placeholder?: string
    disabled?: boolean
}

export function MonthPicker({ value, onChange, className, minDate, placeholder, disabled }: MonthPickerProps) {
    const [date, setDate] = React.useState<Date>(value || new Date())
    const [open, setOpen] = React.useState(false)

    const months = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ]

    const isMonthDisabled = (monthIndex: number) => {
        if (!minDate) return false
        const minYear = minDate.getFullYear()
        const minMonth = minDate.getMonth()
        const curYear = date.getFullYear()
        return curYear < minYear || (curYear === minYear && monthIndex < minMonth)
    }

    const handleMonthClick = (monthIndex: number) => {
        const newDate = setMonth(date, monthIndex)
        setDate(newDate)
        if (onChange) onChange(newDate)
        setOpen(false)
    }

    const handleYearChange = (offset: number) => {
        setDate(setYear(date, date.getFullYear() + offset))
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "w-[120px] justify-start text-left font-inter font-normal px-4 gap-2",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                        {value ? (
                            format(value, "MMM/yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())
                        ) : (
                            placeholder || "Selecione o mês"
                        )}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-popover border-border text-popover-foreground" align="start">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleYearChange(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold font-jakarta">{date.getFullYear()}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleYearChange(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {months.map((month, index) => {
                        const isSelected = value && value.getMonth() === index && value.getFullYear() === date.getFullYear()
                        const disabled = isMonthDisabled(index)
                        return (
                            <Button
                                key={month}
                                variant={isSelected ? "default" : "ghost"}
                                className="h-9 text-sm font-inter"
                                onClick={() => handleMonthClick(index)}
                                disabled={disabled}
                            >
                                {month}
                            </Button>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}
