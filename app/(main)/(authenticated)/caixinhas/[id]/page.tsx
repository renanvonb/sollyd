import { notFound } from "next/navigation"
import { getSavingsBoxById } from "@/app/actions/savings-boxes"
import { CaixinhaDetailClient } from "@/components/caixinhas/caixinha-detail-client"

export const dynamic = "force-dynamic"

export default async function CaixinhaDetailPage({ params }: { params: { id: string } }) {
    const res = await getSavingsBoxById(params.id)
    if (!res.success || !res.data) notFound()

    return <CaixinhaDetailClient initialBox={res.data} />
}
