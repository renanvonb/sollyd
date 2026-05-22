"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
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
}

export function DatePicker({ value, onChange, placeholder = "Selecione", className, disabled }: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal px-3 gap-2",
                        (disabled || !value) && "text-muted-foreground",
                        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4" />
                    {disabled || !value ? (
                        <span>{placeholder}</span>
                    ) : (
                        format(value, "dd/MM/yyyy", { locale: ptBR })
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
