"use client"

import * as React from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { ResponsiveModal } from "@/components/shared/responsive-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"

import { registerOperation } from "@/app/actions/investments"
import { formatBRL } from "@/lib/investment-utils"
import { getClassMeta, OPERATION_META } from "./investment-meta"
import type { InvestmentAsset, OperationType } from "@/types/investment"
import type { Wallet } from "@/types/transaction"

const NO_WALLET = "__none__"
const TYPES: OperationType[] = ["aporte", "resgate", "rendimento", "atualizacao_valor"]

interface OperationFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    asset: InvestmentAsset | null
    wallets: Wallet[]
    onSuccess: () => void
}

export function OperationForm({ open, onOpenChange, asset, wallets, onSuccess }: OperationFormProps) {
    const [busy, setBusy] = React.useState(false)
    const [opType, setOpType] = React.useState<OperationType>("aporte")
    const [amount, setAmount] = React.useState(0)
    const [newValue, setNewValue] = React.useState(0)
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    const [walletId, setWalletId] = React.useState(NO_WALLET)
    const [notes, setNotes] = React.useState("")

    React.useEffect(() => {
        if (open && asset) {
            setOpType("aporte")
            setAmount(0)
            setNewValue(asset.current_value)
            setDate(new Date())
            setWalletId(asset.wallet_id ?? NO_WALLET)
            setNotes("")
        }
    }, [open, asset])

    if (!asset) return null

    const classMeta = getClassMeta(asset.asset_class)
    const isUpdate = opType === "atualizacao_valor"
    const showWallet = opType === "aporte" || opType === "resgate" || opType === "rendimento"
    const resgateExceeds = opType === "resgate" && amount > asset.total_invested

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isUpdate) {
            if (newValue < 0) { toast.error("Valor inválido"); return }
        } else if (amount <= 0) {
            toast.error("Informe um valor maior que zero"); return
        }
        if (resgateExceeds) { toast.error("Resgate maior que o total investido"); return }

        setBusy(true)
        const res = await registerOperation({
            asset_id: asset.id,
            operation_type: opType,
            amount: isUpdate ? null : amount,
            new_value: isUpdate ? newValue : null,
            operation_date: date ? format(date, "yyyy-MM-dd") : null,
            notes: notes.trim() || null,
            wallet_id: showWallet ? (walletId === NO_WALLET ? null : walletId) : null,
        })
        setBusy(false)

        if (res.success) {
            const msg = opType === "aporte" ? "Aporte registrado!"
                : opType === "resgate" ? (res.closed ? "Resgate total — ativo encerrado." : "Resgate registrado!")
                : opType === "rendimento" ? "Rendimento registrado!"
                : "Valor atualizado."
            toast.success(msg)
            onOpenChange(false)
            onSuccess()
        } else {
            toast.error(res.error || "Erro ao registrar operação")
        }
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="max-w-md"
            title="Registrar operação"
        >
                {/* Info do ativo */}
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-sm font-medium text-foreground font-inter">{asset.name}</p>
                    <p className="text-xs text-muted-foreground font-inter">
                        {classMeta.label} • Valor atual: {formatBRL(asset.current_value)}
                    </p>
                </div>

                {/* Seletor de tipo */}
                <div className="grid grid-cols-2 gap-2">
                    {TYPES.map((t) => {
                        const meta = OPERATION_META[t]
                        const Icon = meta.icon
                        return (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setOpType(t)}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-inter transition-colors",
                                    opType === t ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Icon className={cn("h-4 w-4", opType === t && meta.color)} /> {meta.label}
                            </button>
                        )
                    })}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isUpdate ? (
                        <div className="space-y-2">
                            <Label>Novo valor atual <span className="text-red-600">*</span></Label>
                            <MoneyInput value={newValue} onValueChange={setNewValue} className="font-inter" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Valor <span className="text-red-600">*</span></Label>
                            <MoneyInput value={amount} onValueChange={setAmount} className="font-inter" />
                            {opType === "resgate" && (
                                <p className="text-xs text-muted-foreground font-inter">Total investido: {formatBRL(asset.total_invested)}</p>
                            )}
                            {resgateExceeds && (
                                <p className="flex items-center gap-1 text-xs text-red-600 font-inter">
                                    <AlertTriangle className="h-3 w-3" /> Valor maior que o total investido
                                </p>
                            )}
                            {opType === "resgate" && !resgateExceeds && amount > 0 && amount >= asset.total_invested && (
                                <p className="text-xs text-amber-600 font-inter">Resgate total — este ativo será marcado como encerrado.</p>
                            )}
                        </div>
                    )}

                    <div className={cn("grid gap-3", showWallet ? "grid-cols-2" : "grid-cols-1")}>
                        <div className="space-y-2">
                            <Label>Data</Label>
                            <DatePicker value={date} onChange={setDate} placeholder="Hoje" />
                        </div>
                        {showWallet && (
                            <div className="space-y-2">
                                <Label>Carteira</Label>
                                <Select value={walletId} onValueChange={setWalletId}>
                                    <SelectTrigger className="font-inter"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NO_WALLET}>Nenhuma</SelectItem>
                                        {wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Opcional" className="font-inter" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
                        <Button type="submit" disabled={busy || resgateExceeds}>
                            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando...</> : "Registrar"}
                        </Button>
                    </div>
                </form>
        </ResponsiveModal>
    )
}
