"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"

import { TopBar } from "@/components/ui/top-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useVisibility } from "@/hooks/use-visibility-state"

import { getAssetById } from "@/app/actions/investments"
import { formatBRL, formatGainLoss } from "@/lib/investment-utils"
import type { InvestmentAsset } from "@/types/investment"
import type { Wallet } from "@/types/transaction"

import { getClassIcon, getClassMeta } from "./investment-meta"
import { OperationForm } from "./operation-form"
import { OperationHistory } from "./operation-history"

export function InvestimentoDetailClient({ initialAsset, wallets }: { initialAsset: InvestmentAsset; wallets: Wallet[] }) {
    const router = useRouter()
    const { isVisible } = useVisibility()
    const fmt = (v: number) => (isVisible ? formatBRL(v) : "R$ ••••")

    const [asset, setAsset] = React.useState(initialAsset)
    const [opOpen, setOpOpen] = React.useState(false)

    const refresh = React.useCallback(async () => {
        const res = await getAssetById(asset.id)
        if (res.success && res.data) setAsset(res.data)
        router.refresh()
    }, [asset.id, router])

    const Icon = getClassIcon(asset.asset_class)
    const classMeta = getClassMeta(asset.asset_class)
    const gainLoss = asset.current_value - asset.total_invested
    const gainLossPct = asset.total_invested > 0 ? (gainLoss / asset.total_invested) * 100 : 0
    const gl = formatGainLoss(gainLoss, gainLossPct)
    const firstAporte = [...(asset.operations || [])]
        .filter((o) => o.operation_type === "aporte")
        .sort((a, b) => a.operation_date.localeCompare(b.operation_date))[0]

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <TopBar moduleName="Investimentos" variant="simple" />

            <div className="max-w-[900px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 pb-4 md:pb-8 gap-5 md:gap-6 overflow-y-auto">
                <Link href="/investimentos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-inter self-start">
                    <ArrowLeft className="h-4 w-4" /> Voltar para Investimentos
                </Link>

                {/* Header */}
                <div className="flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${classMeta.color}33` }}>
                            <Icon className="h-6 w-6" style={{ color: classMeta.color }} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-semibold text-foreground font-jakarta">
                                {asset.ticker ? `${asset.ticker} — ${asset.name}` : asset.name}
                            </h1>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium font-inter" style={{ backgroundColor: `${classMeta.color}22`, color: classMeta.color }}>
                                {classMeta.label}
                                {!asset.is_active && <span className="text-muted-foreground"> • Encerrado</span>}
                            </span>
                        </div>
                    </div>
                    <Button onClick={() => setOpOpen(true)} className="h-10 shrink-0 font-sans">
                        <Plus className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Registrar operação</span>
                    </Button>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <MetricCard label="Valor atual" value={fmt(asset.current_value)} />
                    <MetricCard label="Total investido" value={fmt(asset.total_invested)} />
                    <MetricCard label="Rendimentos" value={fmt(asset.total_income)} />
                    <MetricCard label="Ganho/Perda" value={isVisible ? gl.label : "R$ ••••"} valueClass={isVisible ? gl.color : undefined} />
                </div>

                {/* Informações */}
                <div className="rounded-2xl border border-border bg-card p-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <Info label="Instituição" value={asset.institution || "—"} />
                    <Info label="Carteira" value={asset.wallet?.name || "Nenhuma"} />
                    <Info label="Tipo" value={asset.asset_type} />
                    <Info label="Primeiro aporte" value={firstAporte ? firstAporte.operation_date.split("-").reverse().join("/") : "—"} />
                </div>

                {/* Histórico */}
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold text-foreground font-jakarta">Histórico de operações</h2>
                    <OperationHistory operations={asset.operations || []} onChange={refresh} />
                </div>
            </div>

            <OperationForm open={opOpen} onOpenChange={setOpOpen} asset={asset} wallets={wallets} onSuccess={refresh} />
        </div>
    )
}

function MetricCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground font-inter">{label}</p>
            <p className={cn("mt-1 text-base font-semibold font-inter text-foreground", valueClass)}>{value}</p>
        </div>
    )
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-inter">{label}</p>
            <p className="mt-0.5 truncate font-medium text-foreground font-inter">{value}</p>
        </div>
    )
}
