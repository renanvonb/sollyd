import { getSavingsBoxes } from "@/app/actions/savings-boxes"
import { CaixinhasClient } from "@/components/caixinhas/caixinhas-client"

export const dynamic = "force-dynamic"

export default async function CaixinhasPage() {
    const res = await getSavingsBoxes(true)
    const boxes = res.success && res.data ? res.data : []

    return <CaixinhasClient initialBoxes={boxes} />
}
