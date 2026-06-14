"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"
import { Maximize2, Inbox } from "lucide-react"

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { EmptyState } from "@/components/ui/empty-state"
import { useVisibility } from "@/hooks/use-visibility-state"
import { cn } from "@/lib/utils"

export interface ClassificationData {
    classification: string
    amount: number
    fill: string
    [key: string]: any
}

interface ExpensesByClassificationChartProps {
    data: ClassificationData[]
    periodLabel?: string
    onClassificationClick?: (classification: string | null) => void
    selectedClassification?: string | null
}

const chartConfig = {
    amount: {
        label: "Valor",
    },
} satisfies ChartConfig

export function ExpensesByClassificationChart({ data, periodLabel, onClassificationClick, selectedClassification }: ExpensesByClassificationChartProps) {
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined)
    const { isVisible } = useVisibility()

    const totalAmount = React.useMemo(() => {
        return data.reduce((acc, curr) => acc + curr.amount, 0)
    }, [data])

    const renderChart = (isExpanded = false) => {
        if (!data || data.length === 0) {
            return (
                <div className="h-full w-full flex items-center justify-center">
                    <EmptyState
                        variant="default"
                        size="sm"
                        icon={Inbox}
                        title={<span className="font-inter text-base font-normal text-muted-foreground block text-center">Nenhuma informação a ser exibida<br />no período selecionado.</span>}
                        className="p-0 min-h-0 bg-transparent"
                    />
                </div>
            )
        }
        return (
            <ChartContainer
                config={chartConfig}
                className="mx-auto h-full w-full aspect-auto [&_.recharts-pie-label-text]:fill-foreground"
            >
                <PieChart margin={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                    <ChartTooltip
                        cursor={false}
                        content={(props) => (
                            <ChartTooltipContent
                                {...props}
                                className="w-auto min-w-[200px]"
                                formatter={(value, name, item) => {
                                    const percent = totalAmount > 0 ? (Number(value) / totalAmount) * 100 : 0
                                    return (
                                        <>
                                            <div
                                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                                style={{
                                                    backgroundColor: item.color || (item.payload as any).fill,
                                                }}
                                            />
                                            <div className="flex flex-1 justify-between items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">
                                                        {name}
                                                    </span>
                                                    <span className="text-muted-foreground/50 tabular-nums text-[10px]">
                                                        {isVisible ? `${percent.toFixed(1)}%` : "•••%"}
                                                    </span>
                                                </div>
                                                <span className="font-mono font-medium tabular-nums text-foreground">
                                                    {isVisible ? `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ ••••"}
                                                </span>
                                            </div>
                                        </>
                                    )
                                }}
                                labelFormatter={() => periodLabel ? <span className="font-medium text-foreground">{periodLabel}</span> : null}
                            />
                        )}
                    />
                    <Pie
                        data={data}
                        dataKey="amount"
                        nameKey="classification"
                        innerRadius={isExpanded ? 120 : 60}
                        outerRadius={isExpanded ? 180 : 85}
                        paddingAngle={2}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(undefined)}
                        onClick={(data) => onClassificationClick?.(data.classification === selectedClassification ? null : data.classification)}
                        labelLine={false}
                        label={({ percent, x, y, cx, cy, midAngle, innerRadius, outerRadius, payload }) => {
                            if (!percent || percent < 0.05 || midAngle === undefined) return null;

                            const RADIAN = Math.PI / 180;
                            const radius = (Number(outerRadius) || 0) + 12;
                            const labelX = cx + radius * Math.cos(-midAngle * RADIAN);
                            const labelY = cy + radius * Math.sin(-midAngle * RADIAN);

                            return (
                                <text
                                    x={labelX}
                                    y={labelY}
                                    fill="hsl(var(--muted-foreground))"
                                    textAnchor={labelX > cx ? 'start' : 'end'}
                                    dominantBaseline="central"
                                    fontSize={isExpanded ? 14 : 11}
                                    fontWeight={600}
                                    style={{ opacity: 1, transition: 'opacity 0.2s' }}
                                >
                                    {isVisible ? `${(percent * 100).toFixed(0)}%` : "•••%"}
                                </text>
                            );
                        }}
                    >
                        {data.map((entry, index) => {
                            const isSelected = !selectedClassification || entry.classification === selectedClassification
                            const isHovered = activeIndex === index

                            let opacity = 1
                            if (selectedClassification) {
                                opacity = isSelected ? 1 : 0.3
                            } else if (activeIndex !== undefined) {
                                opacity = isHovered ? 1 : 0.6
                            }

                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                    stroke="transparent"
                                    style={{
                                        opacity,
                                        transition: "opacity 0.2s ease-in-out",
                                        cursor: onClassificationClick ? "pointer" : "default"
                                    }}
                                />
                            )
                        })}
                    </Pie>
                </PieChart>
            </ChartContainer>
        )
    }

    const renderLegend = (isExpanded = false) => (
        <div className="flex w-full flex-wrap items-center justify-center gap-4">
            {data.map((item) => {
                const isSelected = !selectedClassification || item.classification === selectedClassification
                return (
                    <div
                        key={item.classification}
                        className={cn(
                            "flex items-center gap-1.5 cursor-pointer transition-opacity select-none",
                            !isSelected && "opacity-40"
                        )}
                        onClick={() => onClassificationClick?.(item.classification === selectedClassification ? null : item.classification)}
                    >
                        <div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: item.fill }}
                        />
                        <span className={cn(
                            "font-medium text-muted-foreground whitespace-nowrap",
                            isExpanded ? "text-base" : "text-xs"
                        )}>
                            {item.classification}
                        </span>
                    </div>
                )
            })}
        </div>
    )

    const hasData = data && data.length > 0

    return (
        <Dialog>
            <Card className="flex flex-col h-full hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between shrink-0 px-4 md:px-6 py-4 space-y-0 group">
                    <div className="flex items-center gap-2">
                        {hasData ? (
                            <DialogTrigger asChild>
                                <CardTitle className="text-sm md:text-base font-semibold cursor-pointer">Classificações</CardTitle>
                            </DialogTrigger>
                        ) : (
                            <CardTitle className="text-sm md:text-base font-semibold">Classificações</CardTitle>
                        )}
                        {hasData && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Maximize2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </DialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Detalhes</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-3 pt-3 pb-0 md:p-6 md:pt-6 md:pb-0 min-h-0">
                    {renderChart()}
                </CardContent>
                {hasData && (
                    <CardFooter className="flex-col gap-2 p-6 pt-0">
                        {renderLegend()}
                    </CardFooter>
                )}
            </Card>
            <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col">
                <DialogHeader className="flex-none pb-4">
                    <DialogTitle>Classificações</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 w-full pt-4">
                    {renderChart(true)}
                </div>
                <div className="flex-none pt-4">
                    {renderLegend(true)}
                </div>
            </DialogContent>
        </Dialog>
    )
}
