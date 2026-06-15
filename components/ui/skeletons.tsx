import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

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
        <div className="flex-1 flex flex-col overflow-hidden bg-background selection:bg-neutral-800 animate-pulse">
            {/* Wrapper Principal Sagrado — espelha transactions-client.tsx */}
            <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 pb-4 md:pb-8 gap-5 md:gap-6 overflow-hidden">

                {/* Header de Página */}
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between flex-none gap-y-3 gap-x-2 w-full">
                    {/* 1. Título (h1 text-3xl + descrição text-sm) */}
                    <div className="order-1 min-w-0 shrink space-y-2">
                        <Skeleton className="h-8 w-48 bg-muted" /> {/* h1 Transações */}
                        <Skeleton className="h-4 w-72 bg-muted/50 hidden md:block" /> {/* descrição */}
                    </div>

                    {/* 2. Filtros (h-10) */}
                    <div className="order-2 flex items-center gap-2 ml-auto shrink">
                        <Skeleton className="h-10 w-[220px] rounded-md bg-neutral-900 border border-neutral-800" /> {/* Status Tabs */}
                        <Skeleton className="h-10 w-[100px] rounded-md bg-neutral-900 border border-neutral-800" /> {/* Select Período */}
                        <Skeleton className="h-10 w-10 md:w-[140px] rounded-md bg-neutral-900 border border-neutral-800" /> {/* Date Picker */}
                        <Skeleton className="h-10 w-[120px] rounded-md bg-foreground/10 hidden md:block" /> {/* Add */}
                    </div>

                    {/* 3. Search Bar (w-[200px] h-10 desktop) */}
                    <div className="order-3 relative w-full md:w-[200px] shrink-0 md:ml-3">
                        <Skeleton className="h-11 md:h-10 w-full rounded-md bg-neutral-900 border border-neutral-800" />
                    </div>
                </div>

                {/* Wrapper de Cards e Tabela (gap-8) */}
                <div className="flex-1 flex flex-col gap-8 overflow-hidden">
                    {/* Grid de Totalizadores (KPIs) */}
                    <div className="flex-none font-sans">
                        <TransactionSummaryCards
                            totals={{ income: 0, expense: 0, investment: 0, balance: 0 }}
                            isLoading={true}
                        />
                    </div>

                    {/* Container da Tabela — espelha #data-table-wrapper desktop */}
                    <div className="hidden md:flex flex-1 min-h-0 bg-neutral-900 rounded-[16px] border border-neutral-800 shadow-sm flex-col relative overflow-hidden font-sans">
                        <div className="relative w-full h-full overflow-y-auto overflow-x-auto scrollbar-hide">
                            <Table className="table-fixed w-full min-w-[700px]">
                                <TableHeader className="sticky top-0 bg-card z-10 border-b">
                                    <TableRow>
                                        <TableHead><Skeleton className="h-4 w-20 bg-muted" /></TableHead> {/* Descrição */}
                                        <TableHead style={{ width: 100 }}><Skeleton className="h-4 w-12 bg-muted" /></TableHead> {/* Tipo */}
                                        <TableHead style={{ width: 130 }}><Skeleton className="h-4 w-16 bg-muted" /></TableHead>
                                        <TableHead style={{ width: 120 }}><Skeleton className="h-4 w-16 bg-muted" /></TableHead>
                                        <TableHead style={{ width: 130 }}><Skeleton className="h-4 w-16 bg-muted" /></TableHead>
                                        <TableHead style={{ width: 90 }}><Skeleton className="h-4 w-12 bg-muted" /></TableHead>
                                        <TableHead style={{ width: 100 }}><Skeleton className="h-4 w-12 bg-muted" /></TableHead> {/* Data */}
                                        <TableHead style={{ width: 120 }}><Skeleton className="h-4 w-14 bg-muted" /></TableHead> {/* Valor */}
                                        <TableHead style={{ width: 80 }}><Skeleton className="h-4 w-12 bg-muted" /></TableHead> {/* Status */}
                                        <TableHead style={{ width: 44 }} /> {/* Ações */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-40 bg-muted/50" /></TableCell>
                                            <TableCell style={{ width: 100 }}><Skeleton className="h-5 w-16 rounded-full bg-muted/50" /></TableCell>
                                            <TableCell style={{ width: 130 }}><Skeleton className="h-5 w-20 rounded-full bg-muted/50" /></TableCell>
                                            <TableCell style={{ width: 120 }}><Skeleton className="h-5 w-20 rounded-full bg-muted/50" /></TableCell>
                                            <TableCell style={{ width: 130 }}><Skeleton className="h-4 w-24 bg-muted/50" /></TableCell>
                                            <TableCell style={{ width: 90 }}><Skeleton className="h-4 w-12 bg-muted/50" /></TableCell>
                                            <TableCell style={{ width: 100 }}><Skeleton className="h-4 w-16 bg-muted/50" /></TableCell>
                                            <TableCell style={{ width: 120 }}><Skeleton className="h-4 w-20 bg-muted/50" /></TableCell>
                                            <TableCell style={{ width: 80 }}><Skeleton className="h-5 w-14 rounded-full bg-muted/50" /></TableCell>
                                            <TableCell style={{ width: 44 }} className="py-2 px-2"><Skeleton className="h-8 w-8 rounded-md bg-muted/50" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
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
        <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-[#262626] bg-[#0a0a0a] flex-col font-sans hidden md:flex animate-pulse">
            {/* Logo (h-[72px], pl-5 pr-3) */}
            <div className="flex items-center h-[72px] pl-5 pr-3 justify-between">
                <div className="flex items-center">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-md bg-neutral-800" /> {/* Símbolo */}
                    <Skeleton className="h-7 w-24 ml-3 bg-neutral-800" /> {/* Wordmark "Sollyd" */}
                </div>
                <Skeleton className="h-8 w-8 rounded-md bg-neutral-800" /> {/* Toggle */}
            </div>

            {/* Nav (px-3 pt-2 pb-6 space-y-1) */}
            <nav className="flex-1 px-3 pt-2 pb-6 space-y-1">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3">
                        <Skeleton className="h-5 w-5 min-w-[20px] rounded-md bg-neutral-800" /> {/* Ícone */}
                        <Skeleton className="h-4 w-24 bg-neutral-800" /> {/* Label */}
                    </div>
                ))}
            </nav>

            {/* User dropdown (p-3, button px-2 py-2 gap-3, avatar h-9 w-9) */}
            <div className="p-3">
                <div className="flex items-center gap-3 px-2 py-2">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-neutral-800" />
                    <Skeleton className="h-4 w-24 bg-neutral-800" /> {/* userName text-sm */}
                </div>
            </div>
        </aside>
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
    // Espelha o DataTable real (table-fixed, min-w-[700px]) com as colunas visíveis:
    // Descrição (auto) | Tipo 100 | Contato 130 | Categoria 120 | 130 | 90 | Data 100 | Valor 120 | Status 80 | Ações 44
    return (
        <div className="flex-1 min-h-0 bg-card rounded-lg border border-border shadow-sm flex flex-col relative overflow-hidden font-sans animate-pulse">
            <div className="relative w-full h-full overflow-y-auto overflow-x-auto scrollbar-hide">
                <Table className="table-fixed w-full min-w-[700px]">
                    <TableHeader className="sticky top-0 bg-card z-10 border-b">
                        <TableRow>
                            <TableHead><Skeleton className="h-4 w-20 bg-muted" /></TableHead> {/* Descrição */}
                            <TableHead style={{ width: 100 }}><Skeleton className="h-4 w-12 bg-muted" /></TableHead> {/* Tipo */}
                            <TableHead style={{ width: 130 }}><Skeleton className="h-4 w-16 bg-muted" /></TableHead>
                            <TableHead style={{ width: 120 }}><Skeleton className="h-4 w-16 bg-muted" /></TableHead>
                            <TableHead style={{ width: 130 }}><Skeleton className="h-4 w-16 bg-muted" /></TableHead>
                            <TableHead style={{ width: 90 }}><Skeleton className="h-4 w-12 bg-muted" /></TableHead>
                            <TableHead style={{ width: 100 }}><Skeleton className="h-4 w-12 bg-muted" /></TableHead> {/* Data */}
                            <TableHead style={{ width: 120 }}><Skeleton className="h-4 w-14 bg-muted" /></TableHead> {/* Valor */}
                            <TableHead style={{ width: 80 }}><Skeleton className="h-4 w-12 bg-muted" /></TableHead> {/* Status */}
                            <TableHead style={{ width: 44 }} /> {/* Ações */}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-40 bg-muted/50" /></TableCell>
                                <TableCell style={{ width: 100 }}><Skeleton className="h-5 w-16 rounded-full bg-muted/50" /></TableCell>
                                <TableCell style={{ width: 130 }}><Skeleton className="h-5 w-20 rounded-full bg-muted/50" /></TableCell>
                                <TableCell style={{ width: 120 }}><Skeleton className="h-5 w-20 rounded-full bg-muted/50" /></TableCell>
                                <TableCell style={{ width: 130 }}><Skeleton className="h-4 w-24 bg-muted/50" /></TableCell>
                                <TableCell style={{ width: 90 }}><Skeleton className="h-4 w-12 bg-muted/50" /></TableCell>
                                <TableCell style={{ width: 100 }}><Skeleton className="h-4 w-16 bg-muted/50" /></TableCell>
                                <TableCell style={{ width: 120 }}><Skeleton className="h-4 w-20 bg-muted/50" /></TableCell>
                                <TableCell style={{ width: 80 }}><Skeleton className="h-5 w-14 rounded-full bg-muted/50" /></TableCell>
                                <TableCell style={{ width: 44 }} className="py-2 px-2"><Skeleton className="h-8 w-8 rounded-md bg-muted/50" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}


/**
 * ModuleCardsSkeleton: Grid of card skeletons for modules like Cadastros
 */
export function ModuleCardsSkeleton() {
    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
                <Card key={i} className="border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0 bg-muted" />
                            <div className="flex-1 min-w-0 space-y-2">
                                <Skeleton className="h-5 w-3/4 bg-muted" /> {/* Título font-jakarta semibold */}
                                <Skeleton className="h-4 w-1/2 bg-muted/50" /> {/* Subtítulo text-sm */}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function ChartSkeletonCard({ title }: { title: string }) {
    return (
        <Card className="h-full flex flex-col hover:shadow-md transition-all">
            <CardHeader className="border-b shrink-0 flex flex-row items-center justify-between px-4 md:px-6 py-4 space-y-0">
                <CardTitle className="text-sm md:text-base font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-3 pt-3 md:p-6 md:pt-6 min-h-0">
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
            <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 pb-4 md:pb-8 overflow-hidden">
                <div className="flex flex-col flex-1 min-h-0 gap-5 md:gap-6 overflow-y-auto pb-4 scrollbar-hide">
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 min-h-[280px] md:min-h-[400px]">
                            <div className="md:col-span-3 h-full">
                                <ChartSkeletonCard title="Histórico" />
                            </div>
                            <div className="md:col-span-1 h-full">
                                <ChartSkeletonCard title="Classificações" />
                            </div>
                        </div>

                        {/* Row 2 Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 min-h-[280px] md:min-h-[400px]">
                            <div className="h-full">
                                <ChartSkeletonCard title="Categorias" />
                            </div>
                            <div className="h-full">
                                <ChartSkeletonCard title="Subcategorias" />
                            </div>
                        </div>

                        {/* Row 3 Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 min-h-[280px] md:min-h-[400px]">
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
        <header className="sticky top-0 z-30 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md h-14 md:h-[72px] flex-none font-sans animate-pulse">
            <div className="hidden md:flex max-w-[1440px] mx-auto px-8 h-full items-center justify-between w-full">
                {/* Left: Sidebar Toggle (icon button size-icon ~h-9 w-9) + Breadcrumb */}
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9 rounded-md bg-muted" /> {/* Toggle button */}
                    <Skeleton className="h-4 w-24 bg-muted" /> {/* Breadcrumb (text-sm) */}
                </div>

                {/* Center: Navigation Links (gap-6) */}
                <div className="flex items-center justify-center">
                    <div className="flex items-center gap-6">
                        <Skeleton className="h-4 w-16 bg-muted" />
                        <Skeleton className="h-4 w-20 bg-muted" />
                        <Skeleton className="h-4 w-16 bg-muted" />
                    </div>
                </div>

                {/* Right: Actions (3 icon buttons, gap-3) */}
                <div className="flex items-center gap-3 justify-end">
                    <Skeleton className="h-9 w-9 rounded-full bg-muted" />
                    <Skeleton className="h-9 w-9 rounded-full bg-muted" />
                    <Skeleton className="h-9 w-9 rounded-full bg-muted" />
                </div>
            </div>
        </header>
    )
}
