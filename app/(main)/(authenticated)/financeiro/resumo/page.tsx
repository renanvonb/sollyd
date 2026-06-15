import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import DashboardClient from "@/components/dashboard/dashboard-client"
import { getTransactions } from "@/app/actions/transactions-fetch"
import { TimeRange } from "@/types/time-range"
import { TableSkeleton } from "@/components/ui/skeletons"

interface DashboardPageProps {
    searchParams: {
        range?: string
        from?: string
        to?: string
        q?: string
    }
}

async function DashboardContent({ searchParams }: DashboardPageProps) {
    const range = (searchParams.range as TimeRange) || 'mes'
    const from = searchParams.from
    const to = searchParams.to

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'

    const initialData = await getTransactions({
        range,
        startDate: from,
        endDate: to,
    })

    return <DashboardClient initialData={initialData} userName={userName} />
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
    return (
        <Suspense fallback={<div className="p-8"><TableSkeleton /></div>}>
            <DashboardContent searchParams={searchParams} />
        </Suspense>
    )
}
