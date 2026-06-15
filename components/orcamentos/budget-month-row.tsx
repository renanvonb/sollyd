"use client"

import * as React from "react"
import { RotateCcw, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { cn } from "@/lib/utils"
import { formatYearMonth } from "@/lib/budget-utils"

interface BudgetMonthRowProps {
    yearMonth: string
    defaultAmount: number
    override?: number          // valor de sobrescrita, se houver
    isCurrent?: boolean
    onSave: (yearMonth: string, amount: number) => Promise<void>
    onRestore: (yearMonth: string) => Promise<void>
}

export function BudgetMonthRow({ yearMonth, defaultAmount, override, isCurrent, onSave, onRestore }: BudgetMonthRowProps) {
    const hasOverride = override != null
    const [value, setValue] = React.useState(override ?? defaultAmount)
    const [busy, setBusy] = React.useState(false)

    React.useEffect(() => {
        setValue(override ?? defaultAmount)
    }, [override, defaultAmount])

    const dirty = value !== (override ?? defaultAmount)

    const save = async () => {
        setBusy(true)
        await onSave(yearMonth, value)
        setBusy(false)
    }

    const restore = async () => {
        setBusy(true)
        await onRestore(yearMonth)
        setBusy(false)
    }

    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-24 shrink-0">
                <span className={cn("text-sm font-inter", isCurrent ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {formatYearMonth(yearMonth)}
                </span>
                {hasOverride && (
                    <span className="block text-[10px] text-amber-600 font-inter">sobrescrito</span>
                )}
            </div>

            <MoneyInput
                value={value}
                onValueChange={setValue}
                className={cn("h-9 font-inter", !hasOverride && !dirty && "text-muted-foreground")}
            />

            <div className="flex w-20 shrink-0 items-center justify-end gap-1">
                {dirty && (
                    <Button size="sm" className="h-8 px-2" onClick={save} disabled={busy}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                    </Button>
                )}
                {hasOverride && !dirty && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={restore}
                        disabled={busy}
                        title="Restaurar padrão"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    )
}
