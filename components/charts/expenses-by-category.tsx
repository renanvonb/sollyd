"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, Cell } from "recharts"
import { Maximize2, Inbox } from "lucide-react"

import {
    Card,
    CardContent,
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
import { useIsMobile } from "@/hooks/use-mobile"

export interface CategoryData {
    category: string
    amount: number
    fill: string
    [key: string]: any
}

interface ExpensesByCategoryChartProps {
    data: CategoryData[]
    periodLabel?: string
    onCategoryClick?: (category: string | null) => void
    selectedCategory?: string | null
}

const chartConfig = {
    amount: {
        label: "Valor",
    },
} satisfies ChartConfig

export function ExpensesByCategoryChart({ data, periodLabel, onCategoryClick, selectedCategory }: ExpensesByCategoryChartProps) {
    const totalAmount = data.reduce((acc, curr) => acc + curr.amount, 0)

    const { isVisible } = useVisibility()
    const isMobile = useIsMobile()

    const renderChart = (isExpanded = false) => {
        const displayData = isMobile && !isExpanded ? data.slice(0, 5) : data

        if (!displayData || displayData.length === 0) {
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

        const idSuffix = isExpanded ? "expanded" : "main"
        return (
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                <BarChart
                    accessibilityLayer
                    data={displayData}
                    margin={{
                        top: 20,
                        bottom: 20,
                        left: 0,
                        right: 0,
                    }}
                >
                    <defs>
                        <pattern id={`striped-pattern-${idSuffix}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="6" stroke="black" strokeWidth="2" strokeOpacity="0.2" />
                        </pattern>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        interval={0}
                        angle={0}
                        tick={{ fontSize: isExpanded ? 14 : 10, textAnchor: 'middle' }}
                        tickFormatter={(value) => value.length > 8 ? `${value.slice(0, 8)}...` : value}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={80}
                        tick={{ textAnchor: 'start', fontSize: isExpanded ? 14 : 11 }}
                        tickMargin={0}
                        dx={-75}
                        tickFormatter={(value) => {
                            if (!isVisible) return "R$ ••••";
                            const formatted = value.toLocaleString("pt-BR", {
                                notation: "compact",
                                maximumFractionDigits: 1
                            });
                            return `R$ ${formatted}`;
                        }}
                    />
                    <ChartTooltip
                        cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.25 }}
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
                                            <div className="flex flex-1 justify-between items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">
                                                        {item.payload.category || name}
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
                    <Bar
                        dataKey="amount"
                        radius={4}
                        onClick={(data: any) => onCategoryClick?.(data.category === selectedCategory ? null : data.category)}
                        cursor={onCategoryClick ? "pointer" : "default"}
                        shape={(props: any) => {
                            const { fill, x, y, width, height, payload } = props;
                            const isSelected = !selectedCategory || (payload as any).category === selectedCategory
                            const opacity = isSelected ? 1 : 0.3

                            return (
                                <g style={{ opacity, transition: 'opacity 0.3s' }}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        fill={fill}
                                        rx={4}
                                        ry={4}
                                    />
                                    <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        fill={`url(#striped-pattern-${idSuffix})`}
                                        rx={4}
                                        ry={4}
                                    />
                                </g>
                            );
                        }}
                    >
                        {displayData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList
                            dataKey="amount"
                            content={(props: any) => {
                                const { x, y, width, height, value, index } = props
                                const category = displayData[index]?.category
                                const isSelected = !selectedCategory || category === selectedCategory
                                const opacity = isSelected ? 1 : 0.3

                                let formatted: string;
                                if (!isVisible) {
                                    formatted = "R$ ••••";
                                } else {
                                    formatted = Number(value).toLocaleString('pt-BR', {
                                        style: "currency",
                                        currency: "BRL",
                                        minimumFractionDigits: 2
                                    })
                                }

                                // Estimativa conservadora para font 10px: ~6.5px por caractere + margem
                                // Font 12px: ~8px por caractere
                                // Font 14px: ~9px por caractere
                                const charWidth = isExpanded ? 9 : 6.5
                                const estimatedWidth = formatted.length * charWidth + 8

                                if (height < estimatedWidth) return null

                                return (
                                    <text
                                        x={x + width / 2}
                                        y={y + height / 2}
                                        fill="white"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize={isExpanded ? 14 : 11}
                                        fontWeight={500}
                                        transform={`rotate(-90, ${x + width / 2}, ${y + height / 2})`}
                                        style={{ pointerEvents: 'none', opacity, transition: 'opacity 0.3s' }}
                                    >
                                        {formatted}
                                    </text>
                                )
                            }}
                        />
                    </Bar>
                </BarChart>
            </ChartContainer>
        )
    }

    const hasData = data && data.length > 0

    return (
        <Dialog>
            <Card className="h-full flex flex-col hover:shadow-md transition-all">
                <CardHeader className="shrink-0 flex flex-row items-center justify-between px-4 md:px-6 py-4 space-y-0 group">
                    <div className="flex items-center gap-2">
                        {hasData ? (
                            <DialogTrigger asChild>
                                <CardTitle className="text-sm md:text-base font-semibold cursor-pointer">Categorias</CardTitle>
                            </DialogTrigger>
                        ) : (
                            <CardTitle className="text-sm md:text-base font-semibold">Categorias</CardTitle>
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
                <CardContent className="flex-1 p-3 pt-3 md:p-6 md:pt-6 min-h-0">
                    {renderChart()}
                </CardContent>
            </Card>
            <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col">
                <DialogHeader className="flex-none pb-4">
                    <DialogTitle>Categorias</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 w-full pt-4">
                    {renderChart(true)}
                </div>
            </DialogContent>
        </Dialog>
    )
}
