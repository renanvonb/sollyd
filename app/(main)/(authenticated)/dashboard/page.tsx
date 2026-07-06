import * as React from "react"
import { Suspense } from "react"
import { format, parseISO } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { getTransactions } from "@/app/actions/transactions-fetch"
import { TimeRange } from "@/types/time-range"
import { getDashboardMetrics } from "@/app/actions/dashboard-metrics"
import { getBudgetsAlertSummary } from "@/app/actions/budgets"
import { getInvestmentSummaryForDashboard } from "@/app/actions/investments"
import { getSavingsBoxesSummaryForDashboard } from "@/app/actions/savings-boxes"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardGraphs } from "@/components/dashboard/dashboard-graphs"

interface DashboardPageProps {
    searchParams: {
        range?: string
        from?: string
        to?: string
        q?: string
        year?: string
        status?: string
    }
}

async function DashboardContent({ searchParams }: DashboardPageProps) {
    const range = (searchParams.range as TimeRange) || 'mes'
    const from = searchParams.from
    const to = searchParams.to
    const status = searchParams.status // Default to undefined (server fetches all), Client handles view default.
    const competenceDate = from ? format(parseISO(from), 'yyyy-MM-01') : format(new Date(), 'yyyy-MM-01')

    // Data fetching (Server Side)
    // STRICT_FILTER_V5: Ignore 'endDate' in Monthly view to prevent timezone leaks
    const fetchStartDate = range === 'mes' ? competenceDate : from
    const fetchEndDate = range === 'mes' ? undefined : to

    const [metrics, initialData, budgetAlertRes, investmentRes, caixinhasRes] = await Promise.all([
        getDashboardMetrics({
            range,
            startDate: fetchStartDate,
            endDate: fetchEndDate,
            competence: competenceDate,
            status
        }),
        getTransactions({
            range,
            startDate: fetchStartDate, // Use formatted YYYY-MM-01 for month view
            endDate: fetchEndDate, // Undefined for month view
            status
        }),
        getBudgetsAlertSummary(competenceDate.slice(0, 7)), // 'yyyy-MM'
        getInvestmentSummaryForDashboard(),
        getSavingsBoxesSummaryForDashboard()
    ])

    return (
        <DashboardGraphs
            initialData={initialData}
            metrics={metrics}
            budgetAlert={budgetAlertRes.success ? budgetAlertRes.data : undefined}
            investmentSummary={investmentRes.success ? investmentRes.data : undefined}
            caixinhasSummary={caixinhasRes.success ? caixinhasRes.data : undefined}
        />
    )
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'

    return (
        <div className="h-dvh flex flex-col overflow-hidden">
            <DashboardHeader userName={userName} />
            <Suspense key={JSON.stringify(searchParams)} fallback={<DashboardSkeleton />}>
                <DashboardContent searchParams={searchParams} />
            </Suspense>
        </div>
    )
}
