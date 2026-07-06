"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, CheckCircle2, AlertTriangle } from "lucide-react"

import { TopBar } from "@/components/ui/top-bar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { getSavingsBoxById } from "@/app/actions/savings-boxes"
import type { SavingsBoxWithProgress } from "@/types/savings-box"

import { getSavingsIcon, formatBRL } from "./savings-box-meta"
import { ContributionForm } from "./contribution-form"
import { ContributionHistory } from "./contribution-history"

interface CaixinhaDetailClientProps {
    initialBox: SavingsBoxWithProgress
}

export function CaixinhaDetailClient({ initialBox }: CaixinhaDetailClientProps) {
    const router = useRouter()
    const [box, setBox] = React.useState(initialBox)
    const [contribOpen, setContribOpen] = React.useState(false)

    const refresh = React.useCallback(async () => {
        const res = await getSavingsBoxById(box.id)
        if (res.success && res.data) setBox(res.data)
        router.refresh()
    }, [box.id, router])

    const Icon = getSavingsIcon(box.icon)
    const nearDeadline = box.days_remaining != null && box.days_remaining <= 30 && !box.is_completed

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <TopBar moduleName="Caixinhas" variant="simple" />

            <div className="max-w-[900px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 pb-4 md:pb-8 gap-5 md:gap-6 overflow-y-auto">
                <Link
                    href="/caixinhas"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-inter self-start"
                >
                    <ArrowLeft className="h-4 w-4" /> Voltar para Caixinhas
                </Link>

                {/* Header */}
                <div className="flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${box.color}33` }}
                        >
                            <Icon className="h-6 w-6" style={{ color: box.color }} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-semibold text-foreground font-jakarta">{box.name}</h1>
                            {box.is_completed ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600 font-inter">
                                    <CheckCircle2 className="h-3 w-3" /> Meta atingida
                                </span>
                            ) : nearDeadline ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-600 font-inter">
                                    <AlertTriangle className="h-3 w-3" /> Prazo próximo
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-inter" style={{ backgroundColor: `${box.color}22`, color: box.color }}>
                                    Em andamento
                                </span>
                            )}
                        </div>
                    </div>
                    <Button onClick={() => setContribOpen(true)} className="h-10 shrink-0 font-sans">
                        <Plus className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Aportar</span>
                    </Button>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <MetricCard label="Valor atual" value={formatBRL(box.current_amount)} />
                    <MetricCard label="Meta" value={formatBRL(box.target_amount)} />
                    <MetricCard label="Restante" value={formatBRL(box.remaining_amount)} />
                    <MetricCard label="Progresso" value={`${box.progress_percentage}%`} valueStyle={{ color: box.color }} />
                </div>

                {/* Progresso */}
                <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${box.progress_percentage}%`, backgroundColor: box.color }}
                        />
                    </div>
                </div>

                {/* Informações */}
                <div className="rounded-2xl border border-border bg-card p-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <Info label="Descrição" value={box.description || "—"} />
                    <Info label="Data alvo" value={box.target_date ? box.target_date.split("-").reverse().join("/") : "—"} />
                    <Info label="Dias restantes" value={box.days_remaining != null && !box.is_completed ? `${box.days_remaining} dias` : "—"} />
                    <Info label="Sugestão mensal" value={box.monthly_needed != null && !box.is_completed ? `${formatBRL(box.monthly_needed)}/mês` : "—"} />
                </div>

                {/* Histórico */}
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold text-foreground font-jakarta">Histórico de aportes</h2>
                    <ContributionHistory contributions={box.contributions ?? []} onChange={refresh} />
                </div>
            </div>

            <ContributionForm open={contribOpen} onOpenChange={setContribOpen} box={box} onSuccess={refresh} />
        </div>
    )
}

function MetricCard({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground font-inter">{label}</p>
            <p className={cn("mt-1 text-base font-semibold font-inter text-foreground")} style={valueStyle}>{value}</p>
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
