"use client"

import * as React from "react"
import { useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DateRange } from "react-day-picker"
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search, ListFilter, CalendarDays, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdaptiveDatePicker } from "@/components/ui/adaptive-date-picker"
import { TopBar } from "@/components/ui/top-bar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimeRange } from "@/types/time-range"
import { useVisibility } from "@/hooks/use-visibility-state"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface DashboardHeaderProps {
    userName: string
}

const periodTabs = [
    { id: 'dia', label: 'Dia' },
    { id: 'mes', label: 'Mês' },
    { id: 'ano', label: 'Ano' },
]

export function DashboardHeader({ userName }: DashboardHeaderProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isVisible, toggleVisibility } = useVisibility()
    const [isPending, startTransition] = useTransition()
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
    const statusFilter = searchParams.get('status') || "Realizado"

    // Calculate currentYear for Ano range Logic (if needed) - Keeping it simple for UI update
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

    const handleStatusFilterChange = (value: string) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (value) params.set('status', value)
            router.push(`?${params.toString()}`, { scroll: false })
        })
    }

    return (
        <div className="flex-none bg-background z-10">
            <TopBar
                moduleName="Dashboard"
                tabs={periodTabs}
                activeTab={range}
                onTabChange={handleRangeChange as any}
                variant="simple"
                rightContent={
                    <div className="hidden md:flex items-center gap-3">
                        <div className="relative w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar" className="pl-9 h-10 font-inter" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
                        </div>
                        <div className="flex items-center h-10 rounded-md border border-input overflow-hidden">
                            {periodTabs.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleRangeChange(t.id as TimeRange)}
                                    className={cn(
                                        "h-10 px-4 text-sm font-inter transition-colors border-r border-input last:border-r-0",
                                        range === t.id
                                            ? "bg-accent text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <AdaptiveDatePicker mode={range} value={date} onChange={handleDateChange} className="w-[120px]" />
                        <Button variant="outline" size="icon" className="text-muted-foreground hover:text-foreground" onClick={toggleVisibility}>
                            {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                    </div>
                }
            />

            <div className="max-w-[1440px] mx-auto px-6 w-full pt-4 md:pt-6 pb-0">
                {/* Desktop: título + status segmentado */}
                <div className="hidden md:flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold text-foreground font-jakarta">Olá, {userName.split(' ')[0]}!</h2>
                        <span className="w-px h-5 bg-border" />
                        <p className="text-sm text-muted-foreground font-inter">Visão geral das suas finanças</p>
                    </div>
                    <div className="flex items-center h-10 rounded-md border border-input overflow-hidden">
                        {[
                            { id: "all", label: "Todas" },
                            { id: "Realizado", label: "Realizadas" },
                            { id: "Pendente", label: "Pendentes" },
                        ].map(s => (
                            <button
                                key={s.id}
                                onClick={() => handleStatusFilterChange(s.id)}
                                className={cn(
                                    "h-10 px-4 text-sm font-inter transition-colors border-r border-input last:border-r-0",
                                    statusFilter === s.id
                                        ? "bg-accent text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile: Select período + datepicker ícone */}
                <div className="flex md:hidden items-center justify-end gap-2">
                    <Select value={range} onValueChange={handleRangeChange as any}>
                        <SelectTrigger className="w-auto min-w-[max-content] gap-2 h-10 shrink-0 font-inter text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dia">Dia</SelectItem>
                            <SelectItem value="mes">Mês</SelectItem>
                            <SelectItem value="ano">Ano</SelectItem>
                        </SelectContent>
                    </Select>
                    <AdaptiveDatePicker
                        mode={range}
                        value={date}
                        onChange={handleDateChange}
                        className="w-10 px-0 justify-center h-10 shrink-0"
                    />
                </div>

                {/* Status: Tabs no Mobile (preenchendo tudo, abaixo do title e demais filtros) */}
                <Tabs value={statusFilter} onValueChange={handleStatusFilterChange} className="w-full flex md:hidden mt-4">
                    <TabsList className="w-full">
                        <TabsTrigger value="all" className="font-inter">Todas</TabsTrigger>
                        <TabsTrigger value="Realizado" className="font-inter">Realizadas</TabsTrigger>
                        <TabsTrigger value="Pendente" className="font-inter">Pendentes</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    )
}
