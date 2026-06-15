"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { DatePicker } from "@/components/ui/date-picker"
import { ResponsiveModal } from "@/components/shared/responsive-modal"
import { Label } from "@/components/ui/label"

import { addContribution } from "@/app/actions/savings-boxes"
import type { SavingsBoxWithProgress } from "@/types/savings-box"
import { getSavingsIcon, formatBRL } from "./savings-box-meta"

interface ContributionFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    box: SavingsBoxWithProgress | null
    onSuccess: () => void
}

type FormValues = {
    amount: number
    note: string
    date: Date | undefined
}

export function ContributionForm({ open, onOpenChange, box, onSuccess }: ContributionFormProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const { register, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
        defaultValues: { amount: 0, note: "", date: new Date() },
    })

    React.useEffect(() => {
        if (open) {
            reset({
                amount: box?.monthly_needed ?? 0,
                note: "",
                date: new Date(),
            })
        }
    }, [open, box, reset])

    const amount = watch("amount")
    const date = watch("date")
    const note = watch("note")

    const Icon = box ? getSavingsIcon(box.icon) : null

    const newTotal = (box?.current_amount ?? 0) + (amount || 0)
    const newPct = box
        ? Math.min(Math.round((newTotal / box.target_amount) * 100), 100)
        : 0

    const onSubmit = async (values: FormValues) => {
        if (!box) return
        if (values.amount <= 0) {
            toast.error("O valor deve ser maior que zero")
            return
        }

        setIsSubmitting(true)
        const res = await addContribution({
            savings_box_id: box.id,
            amount: values.amount,
            note: values.note?.trim() || null,
            contributed_at: values.date ? format(values.date, "yyyy-MM-dd") : null,
        })
        setIsSubmitting(false)

        if (res.success) {
            if (res.completed) {
                toast.success("🎉 Parabéns! Você atingiu sua meta!")
            } else {
                toast.success("Aporte registrado!")
            }
            onOpenChange(false)
            onSuccess()
        } else {
            toast.error(res.error || "Erro ao registrar aporte")
        }
    }

    if (!box) return null

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="max-w-md"
            title={
                <span className="flex items-center gap-2">
                    {Icon && (
                        <span
                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${box.color}33` }}
                        >
                            <Icon className="h-4 w-4" style={{ color: box.color }} />
                        </span>
                    )}
                    Aportar — {box.name}
                </span>
            }
        >
                {/* Preview de progresso */}
                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm font-inter">
                        <span className="text-muted-foreground">Atual</span>
                        <span className="font-medium text-foreground">{formatBRL(box.current_amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-inter">
                        <span className="text-muted-foreground">Após aporte</span>
                        <span className="font-semibold" style={{ color: box.color }}>
                            {formatBRL(newTotal)} ({newPct}%)
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${newPct}%`, backgroundColor: box.color }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground font-inter">
                        Meta: {formatBRL(box.target_amount)}
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Valor <span className="text-red-600">*</span></Label>
                        <MoneyInput
                            value={amount}
                            onValueChange={(v) => setValue("amount", v)}
                            className="font-inter"
                        />
                        {box.monthly_needed != null && (
                            <p className="text-xs text-muted-foreground font-inter">
                                Sugestão mensal para a meta: {formatBRL(box.monthly_needed)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input
                            {...register("note")}
                            maxLength={200}
                            placeholder="Ex: Salário de março"
                            className="font-inter"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Data</Label>
                        <DatePicker
                            value={date}
                            onChange={(d) => setValue("date", d)}
                            placeholder="Hoje"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando...</>
                            ) : "Registrar aporte"}
                        </Button>
                    </div>
                </form>
        </ResponsiveModal>
    )
}
