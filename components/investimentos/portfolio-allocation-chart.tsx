"use client"

import * as React from "react"
import { Pie, PieChart, Cell, Label } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { useVisibility } from "@/hooks/use-visibility-state"
import { formatBRL } from "@/lib/investment-utils"
import type { PortfolioSummary } from "@/types/investment"

export function PortfolioAllocationChart({ summary }: { summary: PortfolioSummary }) {
    const { isVisible } = useVisibility()
    const fmt = (v: number) => (isVisible ? formatBRL(v) : "R$ ••••")

    const chartData = React.useMemo(
        () => summary.by_class.map((c) => ({ name: c.label, value: c.current_value, fill: c.color })),
        [summary.by_class]
    )

    const chartConfig = React.useMemo(() => {
        const config: ChartConfig = {}
        summary.by_class.forEach((c) => { config[c.label] = { label: c.label, color: c.color } })
        return config
    }, [summary.by_class])

    return (
        <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
                <CardTitle className="text-muted-foreground font-semibold font-sans tracking-tight text-sm">
                    Alocação por classe
                </CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[240px] text-muted-foreground font-inter text-sm">
                        Nenhum ativo na carteira
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[240px] w-full">
                            <PieChart>
                                <ChartTooltip cursor={false} content={(props) => <ChartTooltipContent {...props} hideLabel />} />
                                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={88} paddingAngle={2}>
                                    {chartData.map((entry, i) => (
                                        <Cell key={`cell-${i}`} fill={entry.fill} strokeWidth={0} />
                                    ))}
                                    <Label
                                        content={({ viewBox }) => {
                                            if (!viewBox || !("cx" in viewBox)) return null
                                            return (
                                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 6} className="fill-foreground text-base font-semibold">
                                                        {fmt(summary.total_current_value)}
                                                    </tspan>
                                                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 14} className="fill-muted-foreground text-xs">
                                                        Total
                                                    </tspan>
                                                </text>
                                            )
                                        }}
                                    />
                                </Pie>
                            </PieChart>
                        </ChartContainer>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {summary.by_class.map((c) => (
                                <div key={c.class} className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                        <span className="text-muted-foreground font-inter text-xs truncate">{c.label}</span>
                                    </div>
                                    <span className="ml-5 text-foreground font-semibold font-inter text-xs">{fmt(c.current_value)}</span>
                                    <span className="ml-5 text-muted-foreground font-inter text-xs">{c.pct.toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
