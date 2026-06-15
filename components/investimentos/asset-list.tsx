"use client"

import type { InvestmentAssetWithMetrics } from "@/types/investment"
import { AssetCard } from "./asset-card"

interface AssetListProps {
    assets: InvestmentAssetWithMetrics[]
    onOperate: (a: InvestmentAssetWithMetrics) => void
    onEdit: (a: InvestmentAssetWithMetrics) => void
    onArchive: (a: InvestmentAssetWithMetrics) => void
    onDelete: (a: InvestmentAssetWithMetrics) => void
}

export function AssetList({ assets, onOperate, onEdit, onArchive, onDelete }: AssetListProps) {
    if (assets.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground font-inter">
                Nenhum ativo nesta classe.
            </div>
        )
    }
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((a) => (
                <AssetCard key={a.id} asset={a} onOperate={onOperate} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} />
            ))}
        </div>
    )
}
