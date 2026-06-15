"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { TopBar } from "@/components/ui/top-bar"
import { Button } from "@/components/ui/button"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { getInvestmentAssets, getPortfolioSummary, archiveAsset, deleteAsset } from "@/app/actions/investments"
import { enrichAsset } from "@/lib/investment-utils"
import type { InvestmentAsset, InvestmentAssetWithMetrics, PortfolioSummary, InvestmentClass } from "@/types/investment"
import type { Wallet } from "@/types/transaction"

import { PortfolioSummaryHeader } from "./portfolio-summary-header"
import { PortfolioAllocationChart } from "./portfolio-allocation-chart"
import { ClassFilterTabs } from "./class-filter-tabs"
import { AssetList } from "./asset-list"
import { AssetForm } from "./asset-form"
import { OperationForm } from "./operation-form"
import { EmptyInvestimentos } from "./empty-investimentos"
import { Fab } from "@/components/shared/fab"

interface InvestimentosClientProps {
    initialAssets: InvestmentAsset[]
    initialSummary: PortfolioSummary
    wallets: Wallet[]
}

export function InvestimentosClient({ initialAssets, initialSummary, wallets }: InvestimentosClientProps) {
    const router = useRouter()
    const [assets, setAssets] = React.useState(initialAssets)
    const [summary, setSummary] = React.useState(initialSummary)
    const [filter, setFilter] = React.useState<InvestmentClass | "all">("all")

    const [formOpen, setFormOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<InvestmentAsset | null>(null)

    const [opOpen, setOpOpen] = React.useState(false)
    const [opAsset, setOpAsset] = React.useState<InvestmentAsset | null>(null)

    const [deleting, setDeleting] = React.useState<InvestmentAsset | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const refresh = React.useCallback(async () => {
        const [aRes, sRes] = await Promise.all([getInvestmentAssets(), getPortfolioSummary()])
        if (aRes.success && aRes.data) setAssets(aRes.data)
        if (sRes.success && sRes.data) setSummary(sRes.data)
        router.refresh()
    }, [router])

    const enriched: InvestmentAssetWithMetrics[] = React.useMemo(
        () => assets.map((a) => enrichAsset(a, summary.total_current_value)),
        [assets, summary.total_current_value]
    )

    const availableClasses = React.useMemo(() => {
        const set = new Set<InvestmentClass>()
        assets.forEach((a) => set.add(a.asset_class))
        return Array.from(set)
    }, [assets])

    const visible = filter === "all" ? enriched : enriched.filter((a) => a.asset_class === filter)

    const handleNew = () => { setEditing(null); setFormOpen(true) }
    const handleEdit = (a: InvestmentAsset) => { setEditing(a); setFormOpen(true) }
    const handleOperate = (a: InvestmentAsset) => { setOpAsset(a); setOpOpen(true) }

    const handleArchive = async (a: InvestmentAsset) => {
        const res = await archiveAsset(a.id, !a.is_active)
        if (res.success) { toast.success(a.is_active ? "Ativo encerrado." : "Ativo reativado."); refresh() }
        else toast.error(res.error || "Erro ao alterar status")
    }

    const confirmDelete = async () => {
        if (!deleting) return
        setIsDeleting(true)
        const res = await deleteAsset(deleting.id)
        setIsDeleting(false)
        setDeleting(null)
        if (res.success) { toast.success("Ativo removido da carteira."); refresh() }
        else toast.error(res.error || "Erro ao remover")
    }

    const isEmpty = assets.length === 0

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <TopBar moduleName="Investimentos" variant="simple" />

            <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 pb-24 md:pb-8 gap-5 md:gap-6 overflow-y-auto">
                {/* Header */}
                <div className="flex flex-row items-center justify-between flex-none gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <h1 className="text-2xl font-semibold text-foreground font-jakarta truncate">Investimentos</h1>
                        <span className="w-px h-5 bg-border shrink-0 hidden md:block" />
                        <p className="text-sm text-muted-foreground font-inter truncate hidden md:block">Sua carteira patrimonial</p>
                    </div>
                    <Button onClick={handleNew} className="h-10 shrink-0 font-sans hidden md:inline-flex">
                        <Plus className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Adicionar ativo</span>
                    </Button>
                </div>

                {isEmpty ? (
                    <EmptyInvestimentos onCreate={handleNew} />
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-2"><PortfolioSummaryHeader summary={summary} /></div>
                            <div><PortfolioAllocationChart summary={summary} /></div>
                        </div>

                        <ClassFilterTabs available={availableClasses} value={filter} onChange={setFilter} />

                        <AssetList
                            assets={visible}
                            onOperate={handleOperate}
                            onEdit={handleEdit}
                            onArchive={handleArchive}
                            onDelete={setDeleting}
                        />
                    </div>
                )}
            </div>

            <AssetForm open={formOpen} onOpenChange={setFormOpen} wallets={wallets} editing={editing} onSuccess={refresh} />
            <OperationForm open={opOpen} onOpenChange={setOpOpen} asset={opAsset} wallets={wallets} onSuccess={refresh} />

            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir ativo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso vai remover o ativo e todas as operações e transações vinculadas. Continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete() }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                            {isDeleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Fab onClick={handleNew} label="Adicionar ativo" />
        </div>
    )
}
