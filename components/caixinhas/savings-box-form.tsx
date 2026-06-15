"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MoneyInput } from "@/components/ui/money-input"
import { DatePicker } from "@/components/ui/date-picker"
import { ResponsiveModal } from "@/components/shared/responsive-modal"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

import { createSavingsBox, updateSavingsBox } from "@/app/actions/savings-boxes"
import type { SavingsBoxWithProgress } from "@/types/savings-box"
import { SAVINGS_COLORS, SAVINGS_ICON_KEYS, getSavingsIcon } from "./savings-box-meta"

interface SavingsBoxFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    box?: SavingsBoxWithProgress | null
    onSuccess: () => void
}

type FormValues = {
    name: string
    description: string
    target_amount: number
    color: string
    icon: string
    target_date: Date | undefined
}

export function SavingsBoxForm({ open, onOpenChange, box, onSuccess }: SavingsBoxFormProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const isEdit = !!box

    const { register, handleSubmit, watch, setValue, reset, formState } = useForm<FormValues>({
        defaultValues: {
            name: "",
            description: "",
            target_amount: 0,
            color: SAVINGS_COLORS[0],
            icon: "piggy-bank",
            target_date: undefined,
        },
    })

    React.useEffect(() => {
        if (open) {
            reset({
                name: box?.name ?? "",
                description: box?.description ?? "",
                target_amount: box?.target_amount ?? 0,
                color: box?.color ?? SAVINGS_COLORS[0],
                icon: box?.icon ?? "piggy-bank",
                target_date: box?.target_date ? new Date(box.target_date + "T00:00:00") : undefined,
            })
        }
    }, [open, box, reset])

    const color = watch("color")
    const icon = watch("icon")
    const targetAmount = watch("target_amount")
    const targetDate = watch("target_date")

    const onSubmit = async (values: FormValues) => {
        if (!values.name.trim()) {
            toast.error("O nome é obrigatório")
            return
        }
        if (values.target_amount <= 0) {
            toast.error("O valor alvo deve ser maior que zero")
            return
        }

        setIsSubmitting(true)
        const payload = {
            name: values.name.trim(),
            description: values.description?.trim() || null,
            target_amount: values.target_amount,
            color: values.color,
            icon: values.icon,
            target_date: values.target_date ? format(values.target_date, "yyyy-MM-dd") : null,
        }

        const res = isEdit
            ? await updateSavingsBox(box!.id, payload)
            : await createSavingsBox(payload)

        setIsSubmitting(false)

        if (res.success) {
            toast.success(isEdit ? "Caixinha atualizada!" : "Caixinha criada com sucesso!")
            onOpenChange(false)
            onSuccess()
        } else {
            toast.error(res.error || "Erro ao salvar caixinha")
        }
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="max-w-md max-h-[90vh] overflow-y-auto"
            title={isEdit ? "Editar caixinha" : "Nova caixinha"}
            description="Defina uma meta financeira e personalize sua caixinha."
        >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Nome */}
                    <div className="space-y-2">
                        <Label>Nome <span className="text-red-600">*</span></Label>
                        <Input
                            {...register("name")}
                            maxLength={50}
                            placeholder="Ex: Reserva de emergência"
                            className="font-inter"
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                            {...register("description")}
                            maxLength={200}
                            placeholder="Opcional"
                            className="font-inter resize-none"
                            rows={2}
                        />
                    </div>

                    {/* Valor alvo */}
                    <div className="space-y-2">
                        <Label>Valor alvo <span className="text-red-600">*</span></Label>
                        <MoneyInput
                            value={targetAmount}
                            onValueChange={(v) => setValue("target_amount", v)}
                            className="font-inter"
                        />
                    </div>

                    {/* Cor */}
                    <div className="space-y-2">
                        <Label>Cor <span className="text-red-600">*</span></Label>
                        <div className="flex flex-wrap gap-2">
                            {SAVINGS_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setValue("color", c)}
                                    className={cn(
                                        "h-8 w-8 rounded-full border-2 transition-transform",
                                        color === c ? "border-foreground scale-110" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c }}
                                    aria-label={`Cor ${c}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Ícone */}
                    <div className="space-y-2">
                        <Label>Ícone <span className="text-red-600">*</span></Label>
                        <div className="grid grid-cols-7 gap-2">
                            {SAVINGS_ICON_KEYS.map((key) => {
                                const Icon = getSavingsIcon(key)
                                const selected = icon === key
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setValue("icon", key)}
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                                            selected
                                                ? "border-primary bg-primary/15 text-foreground"
                                                : "border-border text-muted-foreground hover:bg-muted"
                                        )}
                                        aria-label={key}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Data alvo */}
                    <div className="space-y-2">
                        <Label>Data alvo</Label>
                        <DatePicker
                            value={targetDate}
                            onChange={(d) => setValue("target_date", d)}
                            placeholder="Opcional"
                            clearable
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                            ) : "Salvar"}
                        </Button>
                    </div>
                </form>
        </ResponsiveModal>
    )
}
