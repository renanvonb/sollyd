import { notFound } from "next/navigation"
import { getAssetById } from "@/app/actions/investments"
import { getWallets } from "@/app/actions/transaction-data"
import { InvestimentoDetailClient } from "@/components/investimentos/investimento-detail-client"

export const dynamic = "force-dynamic"

export default async function InvestimentoDetailPage({ params }: { params: { id: string } }) {
    const [res, wallets] = await Promise.all([getAssetById(params.id), getWallets()])
    if (!res.success || !res.data) notFound()

    return <InvestimentoDetailClient initialAsset={res.data} wallets={wallets} />
}
