import { getBudgets, getBudgetConsumptionForMonth } from "@/app/actions/budgets"
import { getCategories } from "@/app/actions/transaction-data"
import { currentYearMonth } from "@/lib/budget-utils"
import { OrcamentosClient } from "@/components/orcamentos/orcamentos-client"

export const dynamic = "force-dynamic"

const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/

export default async function OrcamentosPage({
    searchParams,
}: {
    searchParams: { month?: string }
}) {
    const month = searchParams.month && yearMonthRegex.test(searchParams.month)
        ? searchParams.month
        : currentYearMonth()

    const [budgetsRes, consumptionRes, categories] = await Promise.all([
        getBudgets(),
        getBudgetConsumptionForMonth(month),
        getCategories(),
    ])

    return (
        <OrcamentosClient
            budgets={budgetsRes.success && budgetsRes.data ? budgetsRes.data : []}
            consumptions={consumptionRes.success && consumptionRes.data ? consumptionRes.data : []}
            categories={categories}
            selectedMonth={month}
        />
    )
}
