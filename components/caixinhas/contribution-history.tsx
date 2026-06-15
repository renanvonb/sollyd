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

import { deleteContribution } from "@/app/actions/savings-boxes"
import type { SavingsBoxContribution } from "@/types/savings-box"
import { formatBRL } from "./savings-box-meta"

interface ContributionHistoryProps {
    contributions: SavingsBoxContribution[]
    onChange: () => void
}

export function ContributionHistory({ contributions, onChange }: ContributionHistoryProps) {
    const [target, setTarget] = React.useState<SavingsBoxContribution | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const handleDelete = async () => {
        if (!target) return
        setIsDeleting(true)
        const res = await deleteContribution(target.id)
        setIsDeleting(false)
        setTarget(null)
        if (res.success) {
            toast.success("Aporte excluído.")
            onChange()
        } else {
            toast.error(res.error || "Erro ao excluir aporte")
        }
    }

    if (contributions.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground font-inter">
                Nenhum aporte registrado ainda.
            </div>
        )
    }

    return (
        <>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {contributions.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground font-inter">
                                {formatBRL(c.amount)}
                                <span className="ml-2 text-muted-foreground">
                                    • {format(new Date(c.contributed_at + "T00:00:00"), "dd/MM/yyyy")}
                                </span>
                            </p>
                            {c.note && (
                                <p className="mt-0.5 truncate text-xs text-muted-foreground font-inter">{c.note}</p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
                            onClick={() => setTarget(c)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir aporte?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso remove o aporte e a transação vinculada. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete() }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
