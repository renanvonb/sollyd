import type { InvestmentAsset, InvestmentAssetWithMetrics, PortfolioSummary, InvestmentClass } from '@/types/investment'
import { INVESTMENT_CLASSES } from '@/types/investment'

export function enrichAsset(
    asset: InvestmentAsset,
    portfolioTotal: number
): InvestmentAssetWithMetrics {
    const gain_loss = asset.current_value - asset.total_invested
    const gain_loss_pct = asset.total_invested > 0
        ? (gain_loss / asset.total_invested) * 100
        : 0
    const portfolio_pct = portfolioTotal > 0
        ? (asset.current_value / portfolioTotal) * 100
        : 0

    return { ...asset, gain_loss, gain_loss_pct, portfolio_pct }
}

export function buildPortfolioSummary(assets: InvestmentAsset[]): PortfolioSummary {
    const active = assets.filter((a) => a.is_active)

    const total_current_value = active.reduce((sum, a) => sum + a.current_value, 0)
    const total_invested = active.reduce((sum, a) => sum + a.total_invested, 0)
    const total_income = active.reduce((sum, a) => sum + a.total_income, 0)
    const total_gain_loss = total_current_value - total_invested
    const total_gain_loss_pct = total_invested > 0
        ? (total_gain_loss / total_invested) * 100
        : 0

    const classMap = new Map<InvestmentClass, number>()
    for (const asset of active) {
        const cls = asset.asset_class as InvestmentClass
        classMap.set(cls, (classMap.get(cls) ?? 0) + asset.current_value)
    }

    const by_class = (Object.keys(INVESTMENT_CLASSES) as InvestmentClass[])
        .filter((cls) => classMap.has(cls))
        .map((cls) => ({
            class: cls,
            label: INVESTMENT_CLASSES[cls].label,
            color: INVESTMENT_CLASSES[cls].color as string,
            current_value: classMap.get(cls) ?? 0,
            pct: total_current_value > 0
                ? ((classMap.get(cls) ?? 0) / total_current_value) * 100
                : 0,
        }))

    return { total_current_value, total_invested, total_income, total_gain_loss, total_gain_loss_pct, by_class }
}

const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

export function formatBRL(value: number): string {
    return brlFormatter.format(value || 0)
}

// Formata ganho/perda com sinal e cor
export function formatGainLoss(value: number, pct: number): { label: string; color: string; sign: '+' | '-' | '' } {
    if (value === 0) return { label: 'R$ 0,00 (0,00%)', color: 'text-muted-foreground', sign: '' }
    const sign = value > 0 ? '+' : '-'
    const color = value > 0 ? 'text-green-500' : 'text-red-500'
    const absValue = Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const absPct = Math.abs(pct).toFixed(2)
    return { label: `${sign}${absValue} (${sign}${absPct}%)`, color, sign }
}
