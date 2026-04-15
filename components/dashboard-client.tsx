"use client"

import * as React from "react"
import { useTransition } from "react"
import { DateRange } from "react-day-picker"
import { useRouter, useSearchParams } from "next/navigation"
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, eachMonthOfInterval, startOfYear, endOfYear, differenceInMonths, getYear } from "date-fns"
import { ptBR } from "date-fns/locale"

import { TransactionSummaryCards } from "@/components/transaction-summary-cards"
import { TimeRange } from "@/types/time-range"
import { Eye, EyeOff, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdaptiveDatePicker } from "@/components/ui/adaptive-date-picker"
import { useVisibility } from "@/hooks/use-visibility-state"

import { TopBar } from "@/components/ui/top-bar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { getColorHex } from "@/components/cadastros/color-picker"

import { Transaction } from "@/types/transaction"
import { ExpensesByCategoryChart } from "@/components/charts/expenses-by-category"
import { ExpensesBySubcategoryChart } from "@/components/charts/expenses-by-subcategory"
import { ExpensesByClassificationChart } from "@/components/charts/expenses-by-classification"
import { TransactionsHistoryChart } from "@/components/charts/transactions-history"
import { ExpensesByPayeeChart } from "@/components/charts/expenses-by-payee"
import { RevenueByPayerChart } from "@/components/charts/revenue-by-payer"

interface DashboardClientProps {
    initialData: Transaction[]
    userName: string
    metrics?: any
}

const periodTabs = [
    { id: 'dia', label: 'Dia' },
    { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mês' },
    { id: 'ano', label: 'Ano' },
    { id: 'custom', label: 'Período' },
]

export default function DashboardClient({ initialData, userName, metrics }: DashboardClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const { isVisible, toggleVisibility } = useVisibility()

    const [searchValue, setSearchValue] = React.useState(searchParams.get('q') || "")

    React.useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (searchValue) params.set('q', searchValue)
            else params.delete('q')
            router.push(`?${params.toString()}`, { scroll: false })
        }, 300)
        return () => clearTimeout(timer)
    }, [searchValue, router, searchParams])

    const range = (searchParams.get('range') as TimeRange) || 'mes'
    const searchQuery = searchParams.get('q')?.toLowerCase() || ""
    const statusFilter = searchParams.get('status') || "Realizado"

    // Lista de anos disponíveis calculada a partir dos dados (apenas anos com transações)
    const availableYears = React.useMemo(() => {
        const yearsSet = new Set<string>()
        initialData.forEach(t => {
            if (t.date) {
                yearsSet.add(getYear(parseISO(t.date)).toString())
            }
        })
        const currentYear = new Date().getFullYear().toString()
        yearsSet.add(currentYear) // Garantir que o ano atual sempre esteja lá
        return Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a))
    }, [initialData])

    const currentYear = new Date().getFullYear()
    const selectedYear = parseInt(searchParams.get('year') || currentYear.toString())

    const date: DateRange | undefined = React.useMemo(() => {
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

    const handleRangeChange = (newRange: TimeRange) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('range', newRange)
            params.delete('from')
            params.delete('to')
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }

    const handleDateChange = (newDate: DateRange | undefined) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (newDate?.from) params.set('from', newDate.from.toISOString())
            else params.delete('from')
            if (newDate?.to) params.set('to', newDate.to.toISOString())
            else params.delete('to')
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }

    const handleYearChange = (year: string) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('year', year)
            params.delete('from')
            params.delete('to')
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }

    const handleStatusFilterChange = (value: string) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (value) params.set('status', value)
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }

    const periodLabel = React.useMemo(() => {
        if (!date?.from || !date?.to) return ""

        // Ensure we handle default dates if hook hasn't run or param is missing,
        // but 'date' is already memoized with defaults above, so safe to use.

        if (range === 'mes') {
            const month = format(date.from, "MMMM", { locale: ptBR })
            const year = format(date.from, "yyyy", { locale: ptBR })
            // Capitalize month
            return `${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`
        }

        if (range === 'ano') {
            return format(date.from, "yyyy", { locale: ptBR })
        }

        if (range === 'dia') {
            return format(date.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
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
        const dataInRange = date?.from && date?.to ? filteredData.filter(t => {
            if (!t.date) return false;
            const tDate = parseISO(t.date);
            return tDate >= date.from! && tDate <= date.to!;
        }) : filteredData;

        return dataInRange.reduce((acc, curr) => {
            const amount = parseFloat(curr.amount as any) || 0
            const type = curr.type as string
            if (type === 'revenue' || type === 'Receita') acc.income += amount
            else if (type === 'expense' || type === 'Despesa') acc.expense += amount
            else if (type === 'investment') acc.investment += amount
            acc.balance = acc.income - acc.expense - acc.investment
            return acc
        }, { income: 0, expense: 0, investment: 0, balance: 0 })
    }, [filteredData, date])

    const chartsData = React.useMemo(() => {
        const dataInRange = date?.from && date?.to ? filteredData.filter(t => {
            if (!t.date) return false;
            const tDate = parseISO(t.date);
            return tDate >= date.from! && tDate <= date.to!;
        }) : filteredData;

        const expenses = dataInRange.filter(t => t.type === 'expense' || t.type === 'Despesa');

        // 1. By Category
        const byCategoryMap = new Map<string, { amount: number, color: string }>();
        expenses.forEach(t => {
            const name = t.categories?.name || "Sem Categoria";
            const color = getColorHex(t.categories?.color || "zinc");
            const current = byCategoryMap.get(name) || { amount: 0, color };
            current.amount += parseFloat(t.amount as any);
            byCategoryMap.set(name, current);
        });
        const byCategory = Array.from(byCategoryMap.entries()).map(([name, val]) => ({
            category: name,
            amount: val.amount,
            fill: val.color
        })).sort((a, b) => b.amount - a.amount);

        // 2. By Subcategory
        const bySubMap = new Map<string, { amount: number, color: string }>();
        expenses.forEach(t => {
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
        const byClassMap = new Map<string, { amount: number, color: string }>();
        expenses.forEach(t => {
            if (t.classifications) {
                const name = t.classifications.name;
                const color = getColorHex(t.classifications.color || "zinc");
                const current = byClassMap.get(name) || { amount: 0, color };
                current.amount += parseFloat(t.amount as any);
                byClassMap.set(name, current);
            }
        });
        const byClassification = Array.from(byClassMap.entries()).map(([name, val]) => ({
            classification: name,
            amount: val.amount,
            fill: val.color
        })).sort((a, b) => b.amount - a.amount);

        // 4. History
        const isMonthlyRange = range === 'mes';
        let historyStart = startOfYear(new Date(selectedYear, 0, 1));
        let historyEnd = endOfYear(new Date(selectedYear, 0, 1));

        if (isMonthlyRange && date?.from && date?.to) {
            historyStart = date.from;
            historyEnd = date.to;
        }

        const historyMap = new Map<string, { income: number, expense: number }>();
        filteredData.forEach(t => {
            if (!t.date) return;
            const tDate = parseISO(t.date);
            if (tDate >= historyStart && tDate <= historyEnd) {
                const dateKey = isMonthlyRange ? format(tDate, 'yyyy-MM-dd') : format(tDate, 'yyyy-MM');
                const current = historyMap.get(dateKey) || { income: 0, expense: 0 };
                const amount = parseFloat(t.amount as any);
                const type = t.type as string; // Safe cast
                if (type === 'revenue' || type === 'Receita') current.income += amount;
                if (type === 'expense' || type === 'Despesa') current.expense += amount;
                historyMap.set(dateKey, current);
            }
        });

        const intervals = isMonthlyRange
            ? eachDayOfInterval({ start: historyStart, end: historyEnd })
            : eachMonthOfInterval({ start: historyStart, end: historyEnd });

        const history = intervals.map(interval => {
            const dateKey = isMonthlyRange ? format(interval, 'yyyy-MM-dd') : format(interval, 'yyyy-MM');
            const data = historyMap.get(dateKey) || { income: 0, expense: 0 };
            return { date: dateKey, ...data };
        });

        // 5. By Payee (Expenses)
        const byPayeeMap = new Map<string, { amount: number, color: string }>();
        expenses.forEach(t => {
            const name = t.payees?.name || "Sem Beneficiário";
            const color = getColorHex(t.payees?.color || "zinc");
            const current = byPayeeMap.get(name) || { amount: 0, color };
            current.amount += parseFloat(t.amount as any);
            byPayeeMap.set(name, current);
        });
        const byPayee = Array.from(byPayeeMap.entries()).map(([name, val]) => ({
            payee: name,
            amount: val.amount,
            fill: val.color
        })).sort((a, b) => b.amount - a.amount).slice(0, 5);

        // 6. By Payer (Revenue)
        const revenues = dataInRange.filter(t => t.type === 'revenue' || t.type === 'Receita');
        const byPayerMap = new Map<string, { amount: number, color: string }>();
        revenues.forEach(t => {
            const name = t.payees?.name || t.payers?.name || "Sem Pagador";
            const color = getColorHex(t.payees?.color || t.payers?.color || "zinc");
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
    }, [filteredData, date, range, selectedYear]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <TopBar
                moduleName="Dashboard"
                tabs={periodTabs}
                activeTab={range}
                onTabChange={handleRangeChange as any}
                variant="simple"
            />

            <div className="max-w-[1440px] mx-auto px-5 md:px-8 w-full flex-1 flex flex-col pt-5 md:pt-8 pb-5 md:pb-8 gap-5 md:gap-8 overflow-hidden">
                {/* Page Header */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between flex-none">
                    {/* Título — isolado no topo em mobile */}
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold md:font-bold tracking-tight text-foreground font-jakarta">
                            Olá, {userName.split(' ')[0]}!
                        </h1>
                    </div>

                    {/* Filtros — abaixo do título em mobile, à direita em desktop */}
                    <div id="standard-filters" className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 font-sans">
                        {/* Linha de filtros rápidos: DatePicker + Status */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <AdaptiveDatePicker
                                mode={range}
                                value={date}
                                onChange={handleDateChange}
                                className="h-10"
                            />

                            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                <SelectTrigger className="w-[130px] h-10 font-inter">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="Realizado">Realizadas</SelectItem>
                                    <SelectItem value="Pendente">Pendentes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Busca — largura total em mobile */}
                        <div className="relative w-full md:w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar"
                                className="pl-9 h-10 font-inter w-full"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Dashboard Content - Flexible Height */}
                <div className="flex flex-col flex-1 min-h-0 gap-4">
                    {/* Row 1: Summary Cards (Fixed Height) */}
                    <div className="shrink-0">
                        <TransactionSummaryCards totals={totals} isLoading={isPending} />
                    </div>

                    {/* Charts Area (Fills remaining space) */}
                    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pb-4 scrollbar-hide">
                        {/* Row 1 (Top Charts) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 min-h-[400px]">
                            <div className="md:col-span-3 h-full">
                                <TransactionsHistoryChart
                                    data={chartsData.history}
                                />
                            </div>
                            <div className="md:col-span-1 h-full">
                                <ExpensesByClassificationChart
                                    data={chartsData.byClassification}
                                    periodLabel={periodLabel}
                                />
                            </div>
                        </div>

                        {/* Row 2 (Middle Charts) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 min-h-[400px]">
                            <div className="h-full">
                                <ExpensesByCategoryChart
                                    data={chartsData.byCategory}
                                    periodLabel={periodLabel}
                                />
                            </div>
                            <div className="h-full">
                                <ExpensesBySubcategoryChart
                                    data={chartsData.bySubcategory}
                                    periodLabel={periodLabel}
                                />
                            </div>
                        </div>

                        {/* Row 3 (Bottom Charts - Contact analysis) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 min-h-[400px]">
                            <div className="h-full">
                                <ExpensesByPayeeChart
                                    data={chartsData.byPayee}
                                    periodLabel={periodLabel}
                                />
                            </div>
                            <div className="h-full">
                                <RevenueByPayerChart
                                    data={chartsData.byPayer}
                                    periodLabel={periodLabel}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
