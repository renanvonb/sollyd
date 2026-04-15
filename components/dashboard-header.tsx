"use client"

import * as React from "react"
import { useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DateRange } from "react-day-picker"
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search, ListFilter, CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdaptiveDatePicker } from "@/components/ui/adaptive-date-picker"
import { TopBar } from "@/components/ui/top-bar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimeRange } from "@/types/time-range"
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
    { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mês' },
    { id: 'ano', label: 'Ano' },
]

export function DashboardHeader({ userName }: DashboardHeaderProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
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
            />

            <div className="max-w-[1440px] mx-auto px-5 md:px-8 w-full pt-5 md:pt-8 pb-0">
                <div className="flex flex-row items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-semibold md:font-bold tracking-tight text-foreground font-jakarta truncate">
                            Olá, {userName.split(' ')[0]}!
                        </h1>
                    </div>

                    <div id="standard-filters" className="flex flex-row items-center gap-2 md:gap-3 font-sans shrink-0">
                        {/* Linha de filtros rápidos: Select/Tabs + DatePicker (Ícone) */}
                        <div className="flex items-center gap-2">
                            {/* Visualização de Período: Select no Mobile */}
                            <Select value={range} onValueChange={handleRangeChange as any}>
                                <SelectTrigger className="w-auto min-w-[max-content] gap-2 h-10 shrink-0 md:hidden font-inter text-foreground">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dia">Dia</SelectItem>
                                    <SelectItem value="semana">Semana</SelectItem>
                                    <SelectItem value="mes">Mês</SelectItem>
                                    <SelectItem value="ano">Ano</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Status: Tabs no Desktop */}
                            <Tabs value={statusFilter} onValueChange={handleStatusFilterChange} className="h-10 hidden md:flex">
                                <TabsList className="h-10">
                                    <TabsTrigger value="all" className="h-8">Todas</TabsTrigger>
                                    <TabsTrigger value="Realizado" className="h-8">Realizadas</TabsTrigger>
                                    <TabsTrigger value="Pendente" className="h-8">Pendentes</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {/* Date Picker: Ícone apenas no mobile, movido para a direita */}
                            <AdaptiveDatePicker
                                mode={range}
                                value={date}
                                onChange={handleDateChange}
                                className="w-10 px-0 justify-center h-10 shrink-0 md:w-auto md:justify-start md:px-3 [&>span]:hidden md:[&>span]:inline md:[&>svg]:mr-2"
                            />
                        </div>

                        {/* Busca — visível Apenas no Desktop (hidden md:block) */}
                        <div className="hidden md:block relative w-[250px] shrink-0">
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

                {/* Status: Tabs no Mobile (preenchendo tudo, abaixo do title e demais filtros) */}
                <Tabs value={statusFilter} onValueChange={handleStatusFilterChange} className="w-full flex md:hidden mt-4">
                    <TabsList className="w-full h-10 flex bg-muted/50 p-1">
                        <TabsTrigger value="all" className="flex-1 h-8 font-inter">Todas</TabsTrigger>
                        <TabsTrigger value="Realizado" className="flex-1 h-8 font-inter">Realizadas</TabsTrigger>
                        <TabsTrigger value="Pendente" className="flex-1 h-8 font-inter">Pendentes</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    )
}
