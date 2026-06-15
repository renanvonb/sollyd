"use client"

import Link from "next/link"
import { MoreVertical, Pencil, Plus, Archive, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useVisibility } from "@/hooks/use-visibility-state"
import { formatBRL, formatGainLoss } from "@/lib/investment-utils"
import type { InvestmentAssetWithMetrics } from "@/types/investment"
import { getClassIcon, getClassMeta } from "./investment-meta"

interface AssetCardProps {
    asset: InvestmentAssetWithMetrics
    onOperate: (a: InvestmentAssetWithMetrics) => void
    onEdit: (a: InvestmentAssetWithMetrics) => void
    onArchive: (a: InvestmentAssetWithMetrics) => void
    onDelete: (a: InvestmentAssetWithMetrics) => void
}

export function AssetCard({ asset, onOperate, onEdit, onArchive, onDelete }: AssetCardProps) {
    const { isVisible } = useVisibility()
    const fmt = (v: number) => (isVisible ? formatBRL(v) : "R$ ••••")

    const Icon = getClassIcon(asset.asset_class)
    const classMeta = getClassMeta(asset.asset_class)
    const gl = formatGainLoss(asset.gain_loss, asset.gain_loss_pct)
    const paused = !asset.is_active

    return (
        <div className={cn(
            "flex flex-col rounded-2xl border border-border bg-card p-5 transition-opacity",
            paused && "opacity-60"
        )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <Link href={`/investimentos/${asset.id}`} className="flex items-center gap-3 min-w-0 group">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${classMeta.color}33` }}>
                        <Icon className="h-5 w-5" style={{ color: classMeta.color }} />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground font-jakarta group-hover:underline">
                            {asset.ticker ? `${asset.ticker} — ${asset.name}` : asset.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground font-inter">
                            {classMeta.label}{asset.institution ? ` • ${asset.institution}` : ""}
                        </p>
                    </div>
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(asset)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOperate(asset)}>
                            <Plus className="mr-2 h-4 w-4" /> Registrar operação
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(asset)}>
                            <Archive className="mr-2 h-4 w-4" /> {paused ? "Reativar" : "Encerrar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(asset)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {paused && (
                <span className="mt-3 self-start rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground font-inter">
                    Encerrado
                </span>
            )}

            {/* Valores */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                    <p className="text-xs text-muted-foreground font-inter">Valor atual</p>
                    <p className="text-base font-semibold text-foreground font-inter">{fmt(asset.current_value)}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-inter">Total investido</p>
                    <p className="text-base font-semibold text-foreground font-inter">{fmt(asset.total_invested)}</p>
                </div>
            </div>

            {/* Ganho/perda */}
            <p className={cn("mt-3 text-sm font-semibold font-inter", isVisible ? gl.color : "text-muted-foreground")}>
                {isVisible ? gl.label : "R$ ••••"}
            </p>
            {asset.total_income > 0 && (
                <p className="text-xs text-muted-foreground font-inter">Rendimentos recebidos: {fmt(asset.total_income)}</p>
            )}

            {/* Alocação */}
            <div className="mt-3">
                <p className="text-xs text-muted-foreground font-inter mb-1">{asset.portfolio_pct.toFixed(1)}% da carteira</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(asset.portfolio_pct, 100)}%`, backgroundColor: classMeta.color }} />
                </div>
            </div>

            <Button onClick={() => onOperate(asset)} variant="outline" className="mt-4 w-full font-sans">
                <Plus className="mr-1 h-4 w-4" /> Registrar operação
            </Button>
        </div>
    )
}
