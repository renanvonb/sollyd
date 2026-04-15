import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { TransactionSummaryCards } from "@/components/transaction-summary-cards"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/**
 * AuthSkeleton: Mimics the 60/40 layout of Login/Signup screens
 */
export function AuthSkeleton({ mode = "login" }: { mode?: "login" | "signup" }) {
    const inputCount = mode === "signup" ? 4 : 2

    return (
        <div className="flex h-screen font-sans bg-background overflow-hidden">
            {/* Left Column: Form Area (60%) */}
            <div className="flex-1 md:w-[60%] md:flex-none flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-background relative">
                <div className="w-full flex flex-col items-center">
                    <div className="w-full max-w-[360px] flex flex-col items-center text-center">
                        <Skeleton className="h-12 w-12 rounded-xl mb-4 bg-muted" /> {/* Logo Box */}
                        <Skeleton className="h-8 w-32 mb-2 bg-muted" /> {/* Title */}
                        <Skeleton className="h-4 w-48 bg-muted" /> {/* Subtitle */}
                        <Separator className="mt-[24px] mb-[24px] w-full opacity-50" />
                    </div>

                    <div className="w-full max-w-[360px] space-y-6">
                        {Array.from({ length: inputCount }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-20 bg-muted" /> {/* Label */}
                                <Skeleton className="h-11 w-full rounded-lg bg-muted/50" /> {/* Input */}
                            </div>
                        ))}

                        {/* Login Extra Row (Remember me + Forgot Password) */}
                        {mode === "login" && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4 rounded bg-muted" />
                                    <Skeleton className="h-3 w-24 bg-muted" />
                                </div>
                                <Skeleton className="h-3 w-28 bg-muted" />
                            </div>
                        )}

                        <Skeleton className="h-11 w-full rounded-lg mt-2 bg-muted/80" /> {/* Button */}

                        <div className="flex justify-center mt-4">
                            <Skeleton className="h-4 w-40 bg-muted" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Brand Area (40%) */}
            <div className="hidden md:flex md:flex-col md:w-[40%] relative m-4 rounded-[16px] overflow-hidden bg-accent">
                {/* Brand Logo in top-left */}
                <div className="absolute top-8 left-8 z-20">
                    <Skeleton className="h-8 w-24 bg-muted" />
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col justify-end px-8 pb-8 z-10 relative">
                    <div className="mb-12 space-y-4">
                        <Skeleton className="h-10 w-3/4 bg-muted" />
                        <Skeleton className="h-10 w-2/3 bg-muted" />
                        <Skeleton className="h-10 w-1/2 bg-muted" />
                        <div className="pt-2">
                            <Skeleton className="h-5 w-full max-w-md bg-muted/50" />
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div>
                        <Skeleton className="h-4 w-64 bg-muted/50" />
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * TableSkeleton: Mimics the Transactions Data Table structure
 */
export function TransactionsTableSkeleton() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background selection:bg-neutral-800">
            {/* Wrapper Principal Sagrado */}
            <div className="max-w-[1440px] mx-auto px-5 md:px-8 w-full flex-1 flex flex-col pt-5 md:pt-8 pb-5 md:pb-8 gap-5 md:gap-6 overflow-hidden">

                {/* Header de Página (Área C) */}
                <div className="flex items-center justify-between flex-none px-1">
                    <div>
                        <h1 className="text-3xl font-semibold md:font-bold tracking-tight text-foreground font-jakarta">
                            Transações
                        </h1>
                        <p className="text-muted-foreground mt-1 font-sans text-sm font-inter">
                            Gerencie e acompanhe suas movimentações financeiras.
                        </p>
                    </div>

                    <div id="filter-group" className="flex items-center gap-3 font-sans justify-end flex-wrap">
                        {/* 1. Search Bar (200px) */}
                        <Skeleton className="h-10 w-[200px] bg-neutral-900 border border-neutral-800 rounded-md" />

                        {/* 2. Select Period (100px) */}
                        <Skeleton className="h-10 w-[100px] bg-neutral-900 border border-neutral-800 rounded-md" />

                        {/* 3. Adaptive Date Picker (150px) */}
                        <Skeleton className="h-10 w-[150px] bg-neutral-900 border border-neutral-800 rounded-md" />

                        {/* 4. Add Button */}
                        <Skeleton className="h-10 w-[120px] rounded-md bg-foreground/10" />
                    </div>
                </div>

                {/* Wrapper de Cards e Tabela com Gap de 32px (gap-8) */}
                <div className="flex-1 flex flex-col gap-8 overflow-hidden">
                    {/* Grid de Totalizadores (KPIs) - Área D */}
                    <div className="flex-none font-sans">
                        <TransactionSummaryCards
                            totals={{ income: 0, expense: 0, investment: 0, balance: 0 }}
                            isLoading={true}
                        />
                    </div>

                    {/* Container da Tabela (Área E) - Scroll Interno */}
                    <div className="flex-1 min-h-0 bg-neutral-900 rounded-[16px] border border-neutral-800 shadow-sm flex flex-col relative overflow-hidden font-sans">
                        {/* Fake Header */}
                        <div className="h-14 bg-card border-b border-border sticky top-0 z-10 flex items-center px-6 gap-4">
                            <Skeleton className="h-4 w-48 bg-muted" /> {/* Descrição */}
                            <Skeleton className="h-4 w-32 bg-muted" /> {/* Contato */}
                            <Skeleton className="h-4 w-32 bg-muted" /> {/* Categoria */}
                            <Skeleton className="h-4 w-24 bg-muted" /> {/* Competencia */}
                            <Skeleton className="h-4 w-24 bg-muted" /> {/* Data */}
                            <Skeleton className="h-4 w-32 bg-muted" /> {/* Valor */}
                            <Skeleton className="h-4 w-24 ml-auto bg-muted" /> {/* Status */}
                        </div>
                        {/* Fake Rows */}
                        <div className="flex-1 overflow-hidden divide-y divide-border">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="h-16 flex items-center px-6 gap-4">
                                    <Skeleton className="h-4 w-48 bg-muted/50" />
                                    <Skeleton className="h-6 w-32 rounded-full bg-muted/50" />
                                    <Skeleton className="h-6 w-32 rounded-full bg-muted/50" />
                                    <Skeleton className="h-4 w-24 bg-muted/50" />
                                    <Skeleton className="h-4 w-24 bg-muted/50" />
                                    <Skeleton className="h-4 w-32 bg-muted/50" />
                                    <Skeleton className="h-6 w-24 ml-auto rounded-full bg-muted/50" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * SidebarSkeleton: Mimics navigation menu and user footer
 */
export function SidebarSkeleton() {
    return (
        <div className="h-full w-full flex flex-col p-4 space-y-6 bg-card border-r border-border">
            <Skeleton className="h-8 w-24 mb-4 bg-muted" /> {/* Brand/Logo */}
            <div className="space-y-2 flex-1">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-2">
                        <Skeleton className="h-5 w-5 rounded-md bg-muted" />
                        <Skeleton className="h-4 w-24 bg-muted" />
                    </div>
                ))}
            </div>
            <div className="pt-4 border-t border-border flex items-center space-x-3">
                <Skeleton className="h-9 w-9 rounded-full bg-muted" />
                <div className="space-y-1">
                    <Skeleton className="h-3 w-20 bg-muted" />
                    <Skeleton className="h-3 w-16 bg-muted" />
                </div>
            </div>
        </div>
    )
}

/**
 * TopbarSkeleton: Mimics high-level navigation and breadcrumbs
 */
export const TableSkeleton = TransactionsTableSkeleton

/**
 * TableContentSkeleton: Only the table part without search/header/cards
 */
export function TableContentSkeleton() {
    return (
        <div className="flex-1 bg-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col relative animate-pulse">
            {/* Fake Header */}
            <div className="h-14 bg-card border-b border-border flex items-center px-6 gap-4">
                <Skeleton className="h-4 w-48 bg-muted" /> {/* Descrição */}
                <Skeleton className="h-4 w-32 bg-muted" /> {/* Contato */}
                <Skeleton className="h-4 w-32 bg-muted" /> {/* Categoria */}
                <Skeleton className="h-4 w-24 bg-muted" /> {/* Competencia */}
                <Skeleton className="h-4 w-24 bg-muted" /> {/* Data */}
                <Skeleton className="h-4 w-32 bg-muted" /> {/* Valor */}
                <Skeleton className="h-4 w-24 ml-auto bg-muted" /> {/* Status */}
            </div>
            {/* Fake Rows */}
            <div className="flex-1 overflow-hidden divide-y divide-border">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-16 flex items-center px-6 gap-4">
                        <Skeleton className="h-4 w-48 bg-muted/50" />
                        <Skeleton className="h-6 w-32 rounded-full bg-muted/50" />
                        <Skeleton className="h-6 w-32 rounded-full bg-muted/50" />
                        <Skeleton className="h-4 w-24 bg-muted/50" />
                        <Skeleton className="h-4 w-24 bg-muted/50" />
                        <Skeleton className="h-4 w-32 bg-muted/50" />
                        <Skeleton className="h-6 w-24 ml-auto rounded-full bg-muted/50" />
                    </div>
                ))}
            </div>
        </div>
    )
}


/**
 * ModuleCardsSkeleton: Grid of card skeletons for modules like Cadastros
 */
export function ModuleCardsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse p-1">
            {[...Array(28)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4 bg-muted" />
                            <Skeleton className="h-4 w-1/2 bg-muted/50" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function ChartSkeletonCard({ title }: { title: string }) {
    return (
        <Card className="h-full flex flex-col transition-all">
            <CardHeader className="border-b shrink-0 flex flex-row items-center justify-between px-6 py-4 space-y-0">
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-6 min-h-0">
                <div className="h-full w-full flex items-end gap-2">
                    {[30, 40, 20, 50, 35, 45, 25, 60, 40, 55, 30, 45].map((h, i) => (
                        <Skeleton key={i} className="w-full bg-muted/30 rounded-sm" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

/**
 * DashboardSkeleton: Mimics the Dashboard layout with cards and charts
 */
export function DashboardSkeleton() {
    return (
        <div className="flex flex-col h-full animate-pulse bg-background font-sans overflow-hidden">
            {/* Dashboard Content - Matches the spacing after the Header */}
            <div className="max-w-[1440px] mx-auto px-5 md:px-8 w-full flex-1 flex flex-col pt-5 md:pt-8 pb-5 md:pb-8 overflow-hidden">
                <div className="flex flex-col flex-1 min-h-0 gap-4 md:gap-8 overflow-hidden pb-4">
                    {/* Row 1: Summary Cards */}
                    <div className="shrink-0">
                        <TransactionSummaryCards
                            totals={{ income: 0, expense: 0, investment: 0, balance: 0 }}
                            isLoading={true}
                        />
                    </div>

                    {/* Charts Area */}
                    <div className="flex-none flex flex-col gap-4">
                        {/* Row 1 Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 min-h-[600px] md:min-h-[400px]">
                            <div className="md:col-span-3 h-full">
                                <ChartSkeletonCard title="Balanço financeiro" />
                            </div>
                            <div className="md:col-span-1 h-full">
                                <ChartSkeletonCard title="Classificações" />
                            </div>
                        </div>

                        {/* Row 2 Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 min-h-[600px] md:min-h-[400px]">
                            <div className="h-full">
                                <ChartSkeletonCard title="Categorias" />
                            </div>
                            <div className="h-full">
                                <ChartSkeletonCard title="Subcategorias" />
                            </div>
                        </div>

                        {/* Row 3 Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 min-h-[600px] md:min-h-[400px]">
                            <div className="h-full">
                                <ChartSkeletonCard title="Beneficiários" />
                            </div>
                            <div className="h-full">
                                <ChartSkeletonCard title="Pagadores" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function TopbarSkeleton() {
    return (
        <div className="h-[72px] w-full border-b border-border flex items-center px-6 justify-between bg-card">
            <Skeleton className="h-4 w-32 bg-muted" /> {/* Breadcrumb */}
            <div className="flex items-center space-x-8">
                <Skeleton className="h-4 w-16 bg-muted" />
                <Skeleton className="h-4 w-20 bg-muted" />
                <Skeleton className="h-4 w-24 bg-muted" />
            </div>
            <div className="w-32" /> {/* Spacer */}
        </div>
    )
}
