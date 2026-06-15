"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { ResponsiveModal } from "@/components/shared/responsive-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MoneyInput } from "@/components/ui/money-input"
import { DatePicker } from "@/components/ui/date-picker"

import { createInvestmentAsset, updateInvestmentAsset } from "@/app/actions/investments"
import { INVESTMENT_CLASSES, type InvestmentClass } from "@/types/investment"
import type { InvestmentAsset } from "@/types/investment"
import type { Wallet } from "@/types/transaction"

const NO_WALLET = "__none__"

interface AssetFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    wallets: Wallet[]
    editing?: InvestmentAsset | null
    onSuccess: () => void
}

export function AssetForm({ open, onOpenChange, wallets, editing, onSuccess }: AssetFormProps) {
    const isEdit = !!editing
    const [busy, setBusy] = React.useState(false)

    const [name, setName] = React.useState("")
    const [ticker, setTicker] = React.useState("")
    const [assetClass, setAssetClass] = React.useState<InvestmentClass | "">("")
    const [assetType, setAssetType] = React.useState("")
    const [institution, setInstitution] = React.useState("")
    const [walletId, setWalletId] = React.useState(NO_WALLET)
    const [notes, setNotes] = React.useState("")
    const [initialAmount, setInitialAmount] = React.useState(0)
    const [initialDate, setInitialDate] = React.useState<Date | undefined>(new Date())

    React.useEffect(() => {
        if (open) {
            setName(editing?.name ?? "")
            setTicker(editing?.ticker ?? "")
            setAssetClass(editing?.asset_class ?? "")
            setAssetType(editing?.asset_type ?? "")
            setInstitution(editing?.institution ?? "")
            setWalletId(editing?.wallet_id ?? NO_WALLET)
            setNotes(editing?.notes ?? "")
            setInitialAmount(0)
            setInitialDate(new Date())
        }
    }, [open, editing])

    const typeOptions = assetClass ? INVESTMENT_CLASSES[assetClass].types : []

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) { toast.error("O nome é obrigatório"); return }
        if (!isEdit && !assetClass) { toast.error("Selecione a classe"); return }
        if (!isEdit && !assetType) { toast.error("Selecione o tipo"); return }

        setBusy(true)
        const res = isEdit
            ? await updateInvestmentAsset(editing!.id, {
                name: name.trim(),
                ticker: ticker.trim() || null,
                institution: institution.trim() || null,
                wallet_id: walletId === NO_WALLET ? null : walletId,
                notes: notes.trim() || null,
            })
            : await createInvestmentAsset({
                name: name.trim(),
                ticker: ticker.trim() || null,
                asset_class: assetClass,
                asset_type: assetType,
                institution: institution.trim() || null,
                wallet_id: walletId === NO_WALLET ? null : walletId,
                notes: notes.trim() || null,
                initial_amount: initialAmount > 0 ? initialAmount : null,
                initial_date: initialAmount > 0 && initialDate ? format(initialDate, "yyyy-MM-dd") : null,
            })
        setBusy(false)

        if (res.success) {
            toast.success(isEdit ? "Ativo atualizado!" : "Ativo adicionado à carteira!")
            onOpenChange(false)
            onSuccess()
        } else {
            toast.error(res.error || "Erro ao salvar ativo")
        }
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="max-w-md max-h-[90vh] overflow-y-auto"
            title={isEdit ? "Editar ativo" : "Novo ativo"}
            description={isEdit ? "Atualize os dados do ativo." : "Cadastre um ativo na sua carteira."}
        >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nome <span className="text-red-600">*</span></Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Ex: CDB Banco Inter 120% CDI" className="font-inter" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Ticker</Label>
                            <Input value={ticker} onChange={(e) => setTicker(e.target.value)} maxLength={20} placeholder="PETR4" className="font-inter" />
                        </div>
                        <div className="space-y-2">
                            <Label>Instituição</Label>
                            <Input value={institution} onChange={(e) => setInstitution(e.target.value)} maxLength={100} placeholder="XP, Nubank…" className="font-inter" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Classe <span className="text-red-600">*</span></Label>
                            {isEdit ? (
                                <Input value={INVESTMENT_CLASSES[editing!.asset_class].label} disabled className="font-inter" />
                            ) : (
                                <Select value={assetClass} onValueChange={(v) => { setAssetClass(v as InvestmentClass); setAssetType("") }}>
                                    <SelectTrigger className="font-inter"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(INVESTMENT_CLASSES) as InvestmentClass[]).map((c) => (
                                            <SelectItem key={c} value={c}>{INVESTMENT_CLASSES[c].label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo <span className="text-red-600">*</span></Label>
                            {isEdit ? (
                                <Input value={editing!.asset_type} disabled className="font-inter" />
                            ) : (
                                <Select value={assetType} onValueChange={setAssetType} disabled={!assetClass}>
                                    <SelectTrigger className="font-inter"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Carteira vinculada</Label>
                        <Select value={walletId} onValueChange={setWalletId}>
                            <SelectTrigger className="font-inter"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_WALLET}>Nenhuma</SelectItem>
                                {wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {!isEdit && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Valor inicial (aporte)</Label>
                                <MoneyInput value={initialAmount} onValueChange={setInitialAmount} className="font-inter" />
                            </div>
                            {initialAmount > 0 && (
                                <div className="space-y-2">
                                    <Label>Data do aporte</Label>
                                    <DatePicker value={initialDate} onChange={setInitialDate} placeholder="Hoje" />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} rows={2} placeholder="Opcional" className="font-inter resize-none" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
                        <Button type="submit" disabled={busy}>
                            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar"}
                        </Button>
                    </div>
                </form>
        </ResponsiveModal>
    )
}
