"use client"

import * as React from "react"
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek, startOfWeek, setMonth, setYear } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface WeekPickerProps {
    value?: Date
    onChange?: (date: Date) => void // Returns any date within the selected week (usually start)
    className?: string
}

export function WeekPicker({ value, onChange, className }: WeekPickerProps) {
    const [viewDate, setViewDate] = React.useState<Date>(value || new Date())
    const [open, setOpen] = React.useState(false)

    // Update viewDate when value changes externally
    React.useEffect(() => {
        if (value) {
            setViewDate(value)
        }
    }, [value])

    const weeks = React.useMemo(() => {
        const start = startOfMonth(viewDate)
        const end = endOfMonth(viewDate)
        return eachWeekOfInterval({ start, end }, { weekStartsOn: 0 })
    }, [viewDate])

    const handleWeekClick = (weekStart: Date) => {
        if (onChange) onChange(weekStart)
        setOpen(false)
    }

    const handleMonthChange = (offset: number) => {
        setViewDate(prev => setMonth(prev, prev.getMonth() + offset))
    }

    const getWeekLabel = (index: number) => {
        return `Sem ${index + 1}`
    }

    const getWeekRangeLabel = (start: Date) => {
        const end = endOfWeek(start, { weekStartsOn: 0 })
        return `${format(start, "dd MMM", { locale: ptBR })} - ${format(end, "dd MMM", { locale: ptBR })}`
    }

    const isWeekSelected = (weekStart: Date) => {
        if (!value) return false
        const currentWeekStart = startOfWeek(value, { weekStartsOn: 0 })
        return currentWeekStart.getTime() === weekStart.getTime()
    }

    const displayDate = value || new Date()
    const displayWeekStart = startOfWeek(displayDate, { weekStartsOn: 0 })
    const displayWeekEnd = endOfWeek(displayDate, { weekStartsOn: 0 })

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-[240px] justify-start text-left font-inter font-normal px-4",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                        {value ? (
                            `${format(displayWeekStart, "dd MMM", { locale: ptBR })} - ${format(displayWeekEnd, "dd MMM", { locale: ptBR })}`
                        ) : (
                            "Selecione a semana"
                        )}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-popover border-border text-popover-foreground" align="start">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleMonthChange(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold font-jakarta capitalize">
                        {format(viewDate, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleMonthChange(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <TooltipProvider>
                        {weeks.map((weekStart, index) => {
                            const isSelected = isWeekSelected(weekStart)
                            return (
                                <Tooltip key={weekStart.toString()}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={isSelected ? "default" : "ghost"}
                                            className="h-9 text-sm font-inter w-full"
                                            onClick={() => handleWeekClick(weekStart)}
                                        >
                                            {getWeekLabel(index)}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{getWeekRangeLabel(weekStart)}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )
                        })}
                    </TooltipProvider>
                </div>
            </PopoverContent>
        </Popover>
    )
}
