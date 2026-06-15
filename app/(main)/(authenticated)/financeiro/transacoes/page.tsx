import { Suspense } from "react"
import TransactionsClient from "@/components/transactions/transactions-client"
import { getTransactions } from "@/app/actions/transactions-fetch"
import { TimeRange } from "@/types/time-range"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

interface TransactionsPageProps {
    searchParams: {
        range?: string
        from?: string
        to?: string
        status?: string
    }
}

async function TransactionsContent({ searchParams }: TransactionsPageProps) {
    const range = (searchParams.range as TimeRange) || 'mes'
    const from = searchParams.from
    const to = searchParams.to
    const status = searchParams.status // Default to undefined (all) if not present, or 'Realizado'?

    const initialData = await getTransactions({
        range,
        startDate: from,
        endDate: to,
        status: status || 'all' // Defaulting to 'all' for transactions list makes sense unless requested otherwise.
    })

    return <TransactionsClient initialData={initialData} />
}

import { TableSkeleton } from "@/components/ui/skeletons"

export default function TransactionsPage({ searchParams }: TransactionsPageProps) {
    return (
        <Suspense fallback={<TableSkeleton />}>
            <TransactionsContent searchParams={searchParams} />
        </Suspense>
    )
}
