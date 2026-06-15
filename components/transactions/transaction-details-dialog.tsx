"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Pencil, Trash2 } from "lucide-react"
import type { Transaction } from "@/types/transaction"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useVisibility } from "@/hooks/use-visibility-state"
import { deleteTransaction } from "@/app/actions/transactions"
import { toast } from "sonner"

interface TransactionDetailsDialogProps {
    transaction: Transaction | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit: (transaction: Transaction) => void
    onSuccess: () => void
}

const classificationMap: Record<string, string> = {
    essential: "Essencial",
    necessary: "Necessário",
    superfluous: "Supérfluo"
}

export function TransactionDetailsDialog({
    transaction,
    open,
    onOpenChange,
    onEdit,
    onSuccess,
}: TransactionDetailsDialogProps) {
    const [showDeleteAlert, setShowDeleteAlert] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const { isVisible } = useVisibility()

    if (!transaction) return null

    const isExpense = transaction.type === 'expense'

    const formatValue = (value: number) => {
        if (!isVisible) return "R$ ••••"
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "-"
        return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR })
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteTransaction(transaction.id)
            if (result.success) {
                toast.success("Excluída!", {
                    description: "A transação foi removida com sucesso."
                })
                setShowDeleteAlert(false)
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error("Ops, algo deu errado", {
                    description: result.error || "Não foi possível excluir a transação."
                })
            }
        } catch (error) {
            toast.error("Erro inesperado", {
                description: "Ocorreu uma falha ao tentar excluir o registro."
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleEdit = () => {
        onOpenChange(false)
        onEdit(transaction)
    }

    const DetailItem = ({ label, value }: { label: string, value?: string | null }) => (
        <div className="flex flex-col gap-1 items-start text-left">
            <span className="text-sm font-normal text-muted-foreground font-inter">{label}</span>
            <span className="text-base font-medium text-foreground font-inter">{value || "-"}</span>
        </div>
    )

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[440px] bg-background p-0 gap-0 rounded-[16px] overflow-hidden focus:outline-none border-border">
                    <div className="p-6 pb-4 flex flex-col items-center gap-1 text-center">
                        <h3 className="text-xl font-bold text-foreground font-inter leading-tight">{transaction.description}</h3>

                        <h2 className={cn(
                            "text-3xl font-bold font-inter tracking-tight mt-1",
                            isExpense ? "text-red-500" : "text-emerald-500"
                        )}>
                            {formatValue(transaction.amount)}
                        </h2>

                        <Badge variant="secondary" className="mt-2 font-inter text-sm font-medium">
                            {transaction.payees?.name || (isExpense ? "Sem favorecido" : "Sem pagador")}
                        </Badge>
                    </div>

                    <Separator />

                    <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
                        {isExpense ? (
                            <>
                                <DetailItem label="Classificação" value={transaction.classifications?.name || "-"} />
                                <DetailItem label="Competência" value={transaction.competence ? format(new Date(transaction.competence), "MMM/yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()) : "-"} />
                                <DetailItem label="Categoria" value={transaction.categories?.name} />
                                <DetailItem label="Subcategoria" value={transaction.subcategories?.name} />
                                <DetailItem label="Data" value={formatDate(transaction.date)} />
                            </>
                        ) : (
                            <>
                                <DetailItem label="Competência" value={transaction.competence ? format(new Date(transaction.competence), "MMM/yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()) : "-"} />
                                <DetailItem label="Categoria" value={transaction.categories?.name} />
                                <DetailItem label="Data" value={formatDate(transaction.date)} />
                            </>
                        )}

                    </div>

                    <Separator className="mb-6" />

                    <DialogFooter className="px-6 pb-6 pt-0 sm:justify-end gap-2 bg-background">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowDeleteAlert(true)}
                            className="text-red-600 hover:text-red-700 hover:bg-destructive/10 font-inter"
                        >
                            Excluir
                        </Button>
                        <Button
                            onClick={handleEdit}
                            variant="outline"
                            className="text-foreground font-inter border-border"
                        >
                            Editar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent className="sm:max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a realizar uma exclusão permanente que não poderá ser desfeita. Tem certeza que deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-inter"
                        >
                            {isDeleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
