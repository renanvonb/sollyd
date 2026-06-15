"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useVisibility } from "@/hooks/use-visibility-state"

import { deleteOperation } from "@/app/actions/investments"
import { formatBRL } from "@/lib/investment-utils"
import type { InvestmentOperation } from "@/types/investment"
import { OPERATION_META } from "./investment-meta"

export function OperationHistory({ operations, onChange }: { operations: InvestmentOperation[]; onChange: () => void }) {
    const { isVisible } = useVisibility()
    const fmt = (v: number) => (isVisible ? formatBRL(v) : "R$ ••••")

    const [target, setTarget] = React.useState<InvestmentOperation | null>(null)
    const [busy, setBusy] = React.useState(false)

    const handleDelete = async () => {
        if (!target) return
        setBusy(true)
        const res = await deleteOperation(target.id)
        setBusy(false)
        setTarget(null)
        if (res.success) { toast.success("Operação excluída."); onChange() }
        else toast.error(res.error || "Erro ao excluir operação")
    }

    if (operations.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground font-inter">
                Nenhuma operação registrada ainda.
            </div>
        )
    }

    return (
        <>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {operations.map((op) => {
                    const meta = OPERATION_META[op.operation_type]
                    const Icon = meta.icon
                    const isUpdate = op.operation_type === "atualizacao_valor"
                    return (
                        <div key={op.id} className="flex items-center justify-between gap-3 p-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                                    <Icon className={`h-4 w-4 ${meta.color}`} />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground font-inter">
                                        {meta.label}
                                        {isUpdate
                                            ? <span className="text-muted-foreground"> → {fmt(Number(op.new_value))}</span>
                                            : <span className="ml-2">{fmt(Number(op.amount))}</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-inter">
                                        {format(new Date(op.operation_date + "T00:00:00"), "dd/MM/yyyy")}
                                        {op.notes ? ` • ${op.notes}` : ""}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
                                onClick={() => setTarget(op)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )
                })}
            </div>

            <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir operação?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove a operação{target?.transaction_id ? " e a transação vinculada" : ""}. Os totais do ativo serão recalculados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete() }} disabled={busy} className="bg-red-600 hover:bg-red-700">
                            {busy ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
