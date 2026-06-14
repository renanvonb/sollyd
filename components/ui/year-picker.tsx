"use client"

import * as React from "react"
import { format, setYear } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface YearPickerProps {
    value?: Date
    onChange?: (date: Date) => void
    className?: string
}

export function YearPicker({ value, onChange, className }: YearPickerProps) {
    const [date, setDate] = React.useState<Date>(value || new Date())
    const [open, setOpen] = React.useState(false)
    const [pageYear, setPageYear] = React.useState<number>(date.getFullYear())

    const handleYearClick = (year: number) => {
        const newDate = setYear(date, year)
        setDate(newDate)
        if (onChange) onChange(newDate)
        setOpen(false)
    }

    const handlePageChange = (offset: number) => {
        setPageYear(pageYear + (offset * 12))
    }

    // Generate years grid (12 years)
    // Center around pageYear if possible, or start somewhat before
    const startYear = pageYear - 6
    const years = Array.from({ length: 12 }, (_, i) => startYear + i)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-[120px] justify-start text-left font-inter font-normal px-4",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                        {value ? (
                            format(value, "yyyy")
                        ) : (
                            "Selecione"
                        )}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-popover border-border text-popover-foreground" align="start">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handlePageChange(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold font-jakarta">
                        {years[0]} - {years[years.length - 1]}
                    </span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handlePageChange(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {years.map((year) => {
                        const isSelected = value && value.getFullYear() === year
                        const isCurrentYear = new Date().getFullYear() === year
                        return (
                            <Button
                                key={year}
                                variant={isSelected ? "default" : (isCurrentYear ? "outline" : "ghost")}
                                className={cn(
                                    "h-9 text-sm font-inter",
                                    isCurrentYear && !isSelected && "border-primary text-primary"
                                )}
                                onClick={() => handleYearClick(year)}
                            >
                                {year}
                            </Button>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}
