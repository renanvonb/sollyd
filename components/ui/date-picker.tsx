"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
    value?: Date
    onChange?: (date?: Date) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    clearable?: boolean
}

export function DatePicker({ value, onChange, placeholder = "Selecione", className, disabled, clearable }: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal px-4 gap-2",
                        (disabled || !value) && "text-muted-foreground",
                        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">
                        {disabled || !value ? placeholder : (() => {
                            const wd = format(value, "EEE", { locale: ptBR }).replace(".", "")
                            return `${format(value, "dd/MM/yy")}, ${wd.charAt(0).toUpperCase() + wd.slice(1)}`
                        })()}
                    </span>
                    {clearable && value && !disabled && (
                        <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onChange?.(undefined) }}
                            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={onChange}
                    initialFocus
                    locale={ptBR}
                />
            </PopoverContent>
        </Popover>
    )
}
