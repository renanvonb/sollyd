"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, eachMonthOfInterval, startOfYear, endOfYear, getYear } from "date-fns"
import { ptBR } from "date-fns/locale"

import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards"
import { BudgetAlertCard } from "@/components/orcamentos/budget-alert-card"
import { formatGainLoss } from "@/lib/investment-utils"
import { TimeRange } from "@/types/time-range"
import type { BudgetAlertSummary } from "@/types/budget"
import type { InvestmentDashboardSummary } from "@/types/investment"

import { getColorHex } from "@/components/cadastros/color-picker"
import { Transaction } from "@/types/transaction"
import { ExpensesByCategoryChart } from "@/components/charts/expenses-by-category"
import { ExpensesBySubcategoryChart } from "@/components/charts/expenses-by-subcategory"
import { ExpensesByClassificationChart } from "@/components/charts/expenses-by-classification"
import { TransactionsHistoryChart } from "@/components/charts/transactions-history"
import { ExpensesByPayeeChart } from "@/components/charts/expenses-by-payee"
import { RevenueByPayerChart } from "@/components/charts/revenue-by-payer"

interface DashboardGraphsProps {
    initialData: Transaction[]
    metrics?: any
    budgetAlert?: BudgetAlertSummary
    investmentSummary?: InvestmentDashboardSummary
    caixinhasSummary?: { total_current_amount: number }
}

export function DashboardGraphs({ initialData, metrics, budgetAlert, investmentSummary, caixinhasSummary }: DashboardGraphsProps) {
    const searchParams = useSearchParams()

    const range = (searchParams.get('range') as TimeRange) || 'mes'
    const searchQuery = searchParams.get('q')?.toLowerCase() || ""
    const statusFilter = searchParams.get('status') || "Realizado"
    const currentYear = new Date().getFullYear()
    const selectedYear = parseInt(searchParams.get('year') || currentYear.toString())

    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
    const [selectedSubcategory, setSelectedSubcategory] = React.useState<string | null>(null)
    const [selectedClassification, setSelectedClassification] = React.useState<string | null>(null)
    const [selectedPayee, setSelectedPayee] = React.useState<string | null>(null)
    const [selectedPayer, setSelectedPayer] = React.useState<string | null>(null)

    const date: { from: Date; to: Date } | undefined = React.useMemo(() => {
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        if (from && to) {
            return { from: new Date(from), to: new Date(to) }
        }
        if (range === 'mes') {
            const now = new Date()
            return {
                from: startOfMonth(now),
                to: endOfMonth(now)
            }
        }
        if (range === 'ano') {
            const yearDate = new Date(selectedYear, 0, 1)
            return {
                from: startOfYear(yearDate),
                to: endOfYear(yearDate)
            }
        }
        return undefined
    }, [searchParams, range, selectedYear])

    const periodLabel = React.useMemo(() => {
        if (!date?.from || !date?.to) return ""

        if (range === 'mes') {
            const month = format(date.from, "MMMM", { locale: ptBR })
            const year = format(date.from, "yyyy", { locale: ptBR })
            return `${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`
        }

        if (range === 'ano') {
            return format(date.from, "yyyy", { locale: ptBR })
        }

        if (range === 'dia') {
            const formatted = format(date.from, "EEE, dd 'de' MMM. yyyy", { locale: ptBR })
            return formatted.charAt(0).toUpperCase() + formatted.slice(1)
        }

        return `${format(date.from, "dd MMM", { locale: ptBR })} - ${format(date.to, "dd MMM", { locale: ptBR })}`
    }, [date, range])

    const filteredData = React.useMemo(() => {
        let data = initialData

        // 1. Filter by Search
        if (searchQuery) {
            data = data.filter(t => {
                const desc = (t.description || "").toLowerCase()
                const payee = (t.payees?.name || "").toLowerCase()
                const cat = (t.categories?.name || "").toLowerCase()
                return desc.includes(searchQuery) || payee.includes(searchQuery) || cat.includes(searchQuery)
            })
        }

        // 2. Filter by Status
        if (statusFilter && statusFilter !== 'all') {
            data = data.filter(t => t.status === statusFilter)
        }

        return data
    }, [initialData, searchQuery, statusFilter])

    const totals = React.useMemo(() => {
        // DASHBOARD_SYNC_STRICT_V6: Use server metrics if available
        if (metrics?.summary && !searchQuery && !statusFilter && !selectedCategory && !selectedSubcategory && !selectedClassification && !selectedPayee && !selectedPayer && range === 'mes') {
            return metrics.summary;
        }

        // Strict Sync: If range is 'mes', skip date filter
        const skipDateFilter = range === 'mes';

        const dataInRange = date?.from && date?.to && !skipDateFilter ? filteredData.filter(t => {
            const refDate = (range as string) === 'mes'
                ? (t.competence || t.date)
                : (t.date || t.competence || t.created_at);

            if (!refDate) return false;
            const tDate = parseISO(refDate);
            return tDate >= date.from! && tDate <= date.to!;
        }) : filteredData;

        // Apply all filters for totals calculation to reflect current view
        const fullyFiltered = dataInRange.filter(t => {
            if (selectedCategory && (t.categories?.name || "Sem Categoria") !== selectedCategory) return false;
            if (selectedSubcategory && (t.subcategories?.name || "Sem Subcategoria") !== selectedSubcategory) return false;
            if (selectedClassification && (t.classifications?.name || "Sem Classificação") !== selectedClassification) return false;
            if (selectedPayee && (t.payees?.name || "Sem Beneficiário") !== selectedPayee) return false;
            if (selectedPayer && (t.payees?.name || t.payers?.name || "Sem Pagador") !== selectedPayer) return false;
            return true;
        });

        return fullyFiltered.reduce((acc, curr) => {
            const amount = parseFloat(curr.amount as any) || 0
            const type = curr.type?.toLowerCase()
            if (type === 'revenue' || type === 'receita') acc.income += amount
            else if (type === 'expense' || type === 'despesa') acc.expense += amount
            else if (type === 'investment' || type === 'investimento') acc.investment += amount
            acc.balance = acc.income - acc.expense - acc.investment
            return acc
        }, { income: 0, expense: 0, investment: 0, balance: 0 })
    }, [filteredData, date, selectedCategory, selectedSubcategory, selectedClassification, selectedPayee, selectedPayer, metrics, range, searchQuery, statusFilter])

    const chartsData = React.useMemo(() => {
        // Strict Sync: If range is 'mes', we trust the server's strict filtering.
        // We do NOT filter by date locally to avoid timezone mismatches (e.g. 01/04 vs 31/03).
        const skipDateFilter = (range as string) === 'mes';

        const baseData = (date?.from && date?.to && !skipDateFilter) ? filteredData.filter(t => {
            const refDate = (range as string) === 'mes'
                ? (t.competence || t.date)
                : (t.date || t.competence || t.created_at);

            if (!refDate) return false;
            // Use string comparison (YYYY-MM-DD) to avoid timezone issues
            const refDateStr = refDate.substring(0, 10);
            const fromStr = format(date.from!, 'yyyy-MM-dd');
            const toStr = format(date.to!, 'yyyy-MM-dd');
            return refDateStr >= fromStr && refDateStr <= toStr;
        }) : filteredData;

        // Helper to apply filters EXCEPT specific keys
        const getFilteredData = (exclude?: 'category' | 'subcategory' | 'classification' | 'payee' | 'payer') => {
            return baseData.filter(t => {
                if (exclude !== 'category' && selectedCategory && (t.categories?.name || "Sem Categoria") !== selectedCategory) return false;
                if (exclude !== 'subcategory' && selectedSubcategory && (t.subcategories?.name || "Sem Subcategoria") !== selectedSubcategory) return false;
                if (exclude !== 'classification' && selectedClassification && (t.classifications?.name || "Sem Classificação") !== selectedClassification) return false;
                if (exclude !== 'payee' && selectedPayee && (t.payees?.name || "Sem Beneficiário") !== selectedPayee) return false;
                if (exclude !== 'payer' && selectedPayer && (t.payees?.name || t.payers?.name || "Sem Pagador") !== selectedPayer) return false;
                return true;
            });
        };

        const dataForCategory = getFilteredData('category').filter(t => ['expense', 'despesa'].includes(t.type?.toLowerCase() || ''));
        const dataForSubcategory = getFilteredData('subcategory').filter(t => ['expense', 'despesa'].includes(t.type?.toLowerCase() || ''));
        const dataForClassification = getFilteredData('classification').filter(t => ['expense', 'despesa'].includes(t.type?.toLowerCase() || ''));
        const dataForPayee = getFilteredData('payee').filter(t => ['expense', 'despesa'].includes(t.type?.toLowerCase() || ''));
        const dataForPayer = getFilteredData('payer').filter(t => ['revenue', 'receita'].includes(t.type?.toLowerCase() || ''));

        // History uses ALL filters
        const dataForHistory = getFilteredData();

        // 1. By Category
        // DASHBOARD_SYNC_STRICT_V6: Use server metrics if available and no local filters used
        let byCategory;
        if (metrics?.categoryData && !searchQuery && !statusFilter && !selectedCategory && !selectedSubcategory && !selectedClassification && !selectedPayee && !selectedPayer && range === 'mes') {
            byCategory = metrics.categoryData.map((d: any) => ({
                category: d.name,
                amount: d.value,
                fill: d.color
            })).sort((a: any, b: any) => b.amount - a.amount);
        } else {
            const byCategoryMap = new Map<string, { amount: number, color: string }>();
            dataForCategory.forEach(t => {
                const name = t.categories?.name || "Sem Categoria";
                const color = getColorHex(t.categories?.color || "zinc");
                const current = byCategoryMap.get(name) || { amount: 0, color };
                current.amount += parseFloat(t.amount as any);
                byCategoryMap.set(name, current);
            });
            byCategory = Array.from(byCategoryMap.entries()).map(([name, val]) => ({
                category: name,
                amount: val.amount,
                fill: val.color
            })).sort((a, b) => b.amount - a.amount);
        }

        // 2. By Subcategory (Input: dataForSubcategory)
        const bySubMap = new Map<string, { amount: number, color: string }>();
        dataForSubcategory.forEach(t => {
            if (t.subcategories?.name) {
                const name = t.subcategories.name;
                const rawColor = t.subcategories.color || t.categories?.color || "zinc";
                const color = getColorHex(rawColor);
                const current = bySubMap.get(name) || { amount: 0, color };
                current.amount += parseFloat(t.amount as any);
                bySubMap.set(name, current);
            }
        });
        const bySubcategory = Array.from(bySubMap.entries()).map(([name, val]) => ({
            subcategory: name,
            amount: val.amount,
            fill: val.color
        })).sort((a, b) => b.amount - a.amount).slice(0, 10);

        // 3. By Classification
        // DASHBOARD_SYNC_STRICT_V6: Use server metrics if available
        let byClassification;
        if (metrics?.classificationData && !searchQuery && !statusFilter && !selectedCategory && !selectedSubcategory && !selectedClassification && !selectedPayee && !selectedPayer && range === 'mes') {
            byClassification = metrics.classificationData.map((d: any) => ({
                classification: d.classification,
                amount: d.value,
                fill: d.color
            })).sort((a: any, b: any) => b.amount - a.amount);
        } else {
            const byClassMap = new Map<string, { amount: number, color: string }>();
            dataForClassification.forEach(t => {
                if (t.classifications) {
                    const name = t.classifications.name;
                    const color = getColorHex(t.classifications.color || "zinc");
                    const current = byClassMap.get(name) || { amount: 0, color };
                    current.amount += parseFloat(t.amount as any);
                    byClassMap.set(name, current);
                }
            });
            byClassification = Array.from(byClassMap.entries()).map(([name, val]) => ({
                classification: name,
                amount: val.amount,
                fill: val.color
            })).sort((a, b) => b.amount - a.amount);
        }

        // ... (Keep history, payee, payer logic as is, but trusting formatted baseData)


        // 4. History (Input: dataForHistory)
        const isMonthlyRange = range === 'mes';
        let historyStart = startOfYear(new Date(selectedYear, 0, 1));
        let historyEnd = endOfYear(new Date(selectedYear, 0, 1));
        let intervals: Date[] = [];

        if (date?.from && date?.to) {
            historyStart = date.from;
            historyEnd = date.to;
        }

        if (range === 'dia') {
            // Just showing that single day
            intervals = [historyStart];
        } else if (range === 'semana') {
            intervals = eachDayOfInterval({ start: historyStart, end: historyEnd });
        } else if (range === 'mes') {
            intervals = eachDayOfInterval({ start: historyStart, end: historyEnd });
        } else if (range === 'ano') {
            intervals = eachMonthOfInterval({ start: historyStart, end: historyEnd });
        } else {
            // Fallback
            intervals = eachMonthOfInterval({ start: historyStart, end: historyEnd });
        }

        const historyMap = new Map<string, { income: number, expense: number }>();
        const historyFromStr = format(historyStart, 'yyyy-MM-dd');
        const historyEndStr = format(historyEnd, 'yyyy-MM-dd');

        dataForHistory.forEach(t => {
            // Prioritize actual date for day-level granularity
            const refDate = t.date || t.competence || t.created_at;
            if (!refDate) return;
            // Use string key directly
            const refDateStr = refDate.substring(0, 10);

            // Allow if within range (string comparison)
            if (refDateStr >= historyFromStr && refDateStr <= historyEndStr) {
                // Determine grouping key
                let dateKey: string;
                if (range === 'ano') {
                    dateKey = refDateStr.substring(0, 7); // YYYY-MM
                } else {
                    // Day, Week, Month -> Group by Day
                    dateKey = refDateStr; // YYYY-MM-DD
                }

                const current = historyMap.get(dateKey) || { income: 0, expense: 0 };
                const amount = parseFloat(t.amount as any);
                const type = t.type?.toLowerCase();
                if (type === 'revenue' || type === 'receita') current.income += amount;
                if (type === 'expense' || type === 'despesa') current.expense += amount;
                historyMap.set(dateKey, current);
            }
        });

        const history = intervals.map(interval => {
            const dateKey = (range === 'ano') ? format(interval, 'yyyy-MM') : format(interval, 'yyyy-MM-dd');
            const data = historyMap.get(dateKey) || { income: 0, expense: 0 };
            return { date: dateKey, ...data };
        });

        // 5. By Payee (Input: dataForPayee)
        const byPayeeMap = new Map<string, { amount: number, color: string }>();
        dataForPayee.forEach(t => {
            const name = t.payees?.name || "Sem Beneficiário";
            const color = getColorHex('red');
            const current = byPayeeMap.get(name) || { amount: 0, color };
            current.amount += parseFloat(t.amount as any);
            byPayeeMap.set(name, current);
        });
        const byPayee = Array.from(byPayeeMap.entries()).map(([name, val]) => ({
            payee: name,
            amount: val.amount,
            fill: val.color
        })).sort((a, b) => b.amount - a.amount).slice(0, 5);

        // 6. By Payer (Input: dataForPayer)
        const byPayerMap = new Map<string, { amount: number, color: string }>();
        // Note: dataForPayer is already filtered by type='revenue' above
        dataForPayer.forEach(t => {
            const name = t.payees?.name || t.payers?.name || "Sem Pagador";
            const color = getColorHex('green');
            const current = byPayerMap.get(name) || { amount: 0, color };
            current.amount += parseFloat(t.amount as any);
            byPayerMap.set(name, current);
        });
        const byPayer = Array.from(byPayerMap.entries()).map(([name, val]) => ({
            payer: name,
            amount: val.amount,
            fill: val.color
        })).sort((a, b) => b.amount - a.amount).slice(0, 5);

        return { byCategory, bySubcategory, byClassification, history, byPayee, byPayer };
    }, [filteredData, date, range, selectedYear, selectedCategory, selectedSubcategory, selectedClassification, selectedPayee, selectedPayer]);

    // Card "Investimentos" reflete o patrimônio investido (estoque), não soma de fluxo.
    // Card "Caixinhas" reflete o total guardado (estoque), mesma lógica.
    // Saldo passa a ser income - expense (aportes já entram como Despesa).
    const displayTotals = React.useMemo(() => ({
        ...totals,
        investment: investmentSummary?.total_current_value ?? totals.investment ?? 0,
        caixinhas: caixinhasSummary?.total_current_amount ?? 0,
        balance: (totals.income ?? 0) - (totals.expense ?? 0),
    }), [totals, investmentSummary, caixinhasSummary]);

    return (
        <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 min-h-0 flex flex-col pt-4 md:pt-6 overflow-hidden">
            {/* Cards — fixos, fora do scroll */}
            <div className="shrink-0 pb-5 md:pb-6">
                <TransactionSummaryCards
                    totals={displayTotals}
                    investmentGain={investmentSummary?.has_assets
                        ? formatGainLoss(investmentSummary.total_gain_loss, investmentSummary.total_gain_loss_pct)
                        : undefined}
                />
            </div>

            {/* Gráficos — único scroll desta área */}
            <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pb-4 scrollbar-hide">
                {/* Alertas de orçamento (só renderiza se houver warning/exceeded) */}
                {budgetAlert && <BudgetAlertCard summary={budgetAlert} />}

                {/* Row 1 (Top Charts) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 min-h-[280px] md:min-h-[400px]">
                    <div className="md:col-span-3 h-full">
                        <TransactionsHistoryChart
                            data={chartsData.history}
                        />
                    </div>
                    <div className="md:col-span-1 h-full">
                        <ExpensesByClassificationChart
                            data={chartsData.byClassification}
                            periodLabel={periodLabel}
                            onClassificationClick={setSelectedClassification}
                            selectedClassification={selectedClassification}
                        />
                    </div>
                </div>

                {/* Row 2 (Middle Charts) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 min-h-[280px] md:min-h-[400px]">
                    <div className="h-full">
                        <ExpensesByCategoryChart
                            data={chartsData.byCategory}
                            periodLabel={periodLabel}
                            onCategoryClick={setSelectedCategory}
                            selectedCategory={selectedCategory}
                        />
                    </div>
                    <div className="h-full">
                        <ExpensesBySubcategoryChart
                            data={chartsData.bySubcategory}
                            periodLabel={periodLabel}
                            onSubcategoryClick={setSelectedSubcategory}
                            selectedSubcategory={selectedSubcategory}
                        />
                    </div>
                </div>

                {/* Row 3 (Bottom Charts) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 min-h-[280px] md:min-h-[400px]">
                    <div className="h-full">
                        <ExpensesByPayeeChart
                            data={chartsData.byPayee}
                            periodLabel={periodLabel}
                            onPayeeClick={setSelectedPayee}
                            selectedPayee={selectedPayee}
                        />
                    </div>
                    <div className="h-full">
                        <ExpensesByPayerChartNameHack
                            data={chartsData.byPayer}
                            periodLabel={periodLabel}
                            onPayerClick={setSelectedPayer}
                            selectedPayer={selectedPayer}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}


function ExpensesByPayerChartNameHack(props: any) {
    return <RevenueByPayerChart {...props} />
}
