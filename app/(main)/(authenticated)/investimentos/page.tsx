import { getInvestmentAssets, getPortfolioSummary } from "@/app/actions/investments"
import { getWallets } from "@/app/actions/transaction-data"
import { buildPortfolioSummary } from "@/lib/investment-utils"
import { InvestimentosClient } from "@/components/investimentos/investimentos-client"

export const dynamic = "force-dynamic"

export default async function InvestimentosPage() {
    const [assetsRes, summaryRes, wallets] = await Promise.all([
        getInvestmentAssets(),
        getPortfolioSummary(),
        getWallets(),
    ])

    const assets = assetsRes.success && assetsRes.data ? assetsRes.data : []
    const summary = summaryRes.success && summaryRes.data
        ? summaryRes.data
        : buildPortfolioSummary([])

    return <InvestimentosClient initialAssets={assets} initialSummary={summary} wallets={wallets} />
}
