"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { TopBar } from "@/components/ui/top-bar"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/hooks/use-sidebar-state"
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

import { getSavingsBoxes, deleteSavingsBox, archiveSavingsBox } from "@/app/actions/savings-boxes"
import type { SavingsBoxWithProgress } from "@/types/savings-box"

import { SavingsBoxGrid } from "./savings-box-grid"
import { SavingsBoxForm } from "./savings-box-form"
import { ContributionForm } from "./contribution-form"
import { EmptyCaixinhas } from "./empty-caixinhas"
import { Fab } from "@/components/shared/fab"

interface CaixinhasClientProps {
    initialBoxes: SavingsBoxWithProgress[]
}

export function CaixinhasClient({ initialBoxes }: CaixinhasClientProps) {
    const router = useRouter()
    const [boxes, setBoxes] = React.useState(initialBoxes)
    const [showArchived, setShowArchived] = React.useState(false)

    const [formOpen, setFormOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<SavingsBoxWithProgress | null>(null)

    const [contribOpen, setContribOpen] = React.useState(false)
    const [contribBox, setContribBox] = React.useState<SavingsBoxWithProgress | null>(null)

    const [deleting, setDeleting] = React.useState<SavingsBoxWithProgress | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const refresh = React.useCallback(async () => {
        const res = await getSavingsBoxes(true)
        if (res.success && res.data) setBoxes(res.data)
        router.refresh()
    }, [router])

    const active = boxes.filter((b) => !b.is_archived)
    const archived = boxes.filter((b) => b.is_archived)

    const handleNew = () => { setEditing(null); setFormOpen(true) }
    const handleEdit = (b: SavingsBoxWithProgress) => { setEditing(b); setFormOpen(true) }
    const handleContribute = (b: SavingsBoxWithProgress) => { setContribBox(b); setContribOpen(true) }

    const handleArchive = async (b: SavingsBoxWithProgress) => {
        const res = await archiveSavingsBox(b.id, !b.is_archived)
        if (res.success) {
            toast.success(b.is_archived ? "Caixinha desarquivada." : "Caixinha arquivada.")
            refresh()
        } else {
            toast.error(res.error || "Erro ao arquivar")
        }
    }

    const confirmDelete = async () => {
        if (!deleting) return
        setIsDeleting(true)
        const res = await deleteSavingsBox(deleting.id)
        setIsDeleting(false)
        setDeleting(null)
        if (res.success) {
            toast.success("Caixinha excluída.")
            refresh()
        } else {
            toast.error(res.error || "Erro ao excluir")
        }
    }

    const isEmpty = active.length === 0 && archived.length === 0

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <TopBar moduleName="Caixinhas" variant="simple" />

            <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 pb-24 md:pb-8 gap-5 md:gap-6 overflow-y-auto">
                {/* Header */}
                <div className="flex flex-row items-center justify-between flex-none gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <h1 className="text-2xl font-semibold text-foreground font-jakarta truncate">Caixinhas</h1>
                        <span className="w-px h-5 bg-border shrink-0 hidden sm:block" />
                        <p className="text-sm text-muted-foreground font-inter truncate hidden sm:block">
                            Suas metas financeiras
                        </p>
                    </div>
                    <Button onClick={handleNew} className="h-10 shrink-0 font-sans hidden md:inline-flex">
                        <Plus className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Nova caixinha</span>
                    </Button>
                </div>

                {isEmpty ? (
                    <EmptyCaixinhas onCreate={handleNew} />
                ) : (
                    <div className="flex flex-col gap-6">
                        <SavingsBoxGrid
                            boxes={active}
                            onContribute={handleContribute}
                            onEdit={handleEdit}
                            onArchive={handleArchive}
                            onDelete={setDeleting}
                        />

                        {archived.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowArchived((v) => !v)}
                                    className="self-start text-muted-foreground font-sans"
                                >
                                    {showArchived ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                    {showArchived ? "Ocultar arquivadas" : `Ver arquivadas (${archived.length})`}
                                </Button>
                                {showArchived && (
                                    <SavingsBoxGrid
                                        boxes={archived}
                                        onContribute={handleContribute}
                                        onEdit={handleEdit}
                                        onArchive={handleArchive}
                                        onDelete={setDeleting}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <SavingsBoxForm open={formOpen} onOpenChange={setFormOpen} box={editing} onSuccess={refresh} />
            <ContributionForm open={contribOpen} onOpenChange={setContribOpen} box={contribBox} onSuccess={refresh} />

            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir caixinha?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso vai excluir todos os aportes e as transações vinculadas. Deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); confirmDelete() }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Fab onClick={handleNew} label="Nova caixinha" />
        </div>
    )
}
