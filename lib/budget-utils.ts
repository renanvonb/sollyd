import type { BudgetStatus, BudgetConsumption } from '@/types/budget'

const brlFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
})

export function formatBRL(value: number): string {
    return brlFormatter.format(value || 0)
}

export const BUDGET_THRESHOLDS = {
    WARNING: 75,    // % a partir do qual exibe aviso amarelo
    EXCEEDED: 100,  // % a partir do qual exibe alerta vermelho
} as const

export function getBudgetStatus(percentage: number): BudgetStatus {
    if (percentage >= BUDGET_THRESHOLDS.EXCEEDED) return 'exceeded'
    if (percentage >= BUDGET_THRESHOLDS.WARNING) return 'warning'
    return 'ok'
}

export function getBudgetStatusColor(status: BudgetStatus): string {
    switch (status) {
        case 'exceeded': return '#EF4444'   // red-500
        case 'warning': return '#F59E0B'    // amber-500
        case 'ok': return '#22C55E'         // green-500
    }
}

export function getBudgetStatusLabel(status: BudgetStatus): string {
    switch (status) {
        case 'exceeded': return 'Limite ultrapassado'
        case 'warning': return 'Próximo do limite'
        case 'ok': return 'Dentro do limite'
    }
}

// Formata 'YYYY-MM' → 'Jan/2026'
export function formatYearMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split('-')
    const date = new Date(Number(year), Number(month) - 1)
    return date
        .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        .replace(' de ', '/')
        .replace('.', '')
        .replace(/^\w/, (c) => c.toUpperCase())
}

// Retorna 'YYYY-MM' do mês atual
export function currentYearMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Soma/subtrai meses a um 'YYYY-MM'
export function shiftYearMonth(yearMonth: string, delta: number): string {
    const [year, month] = yearMonth.split('-').map(Number)
    const date = new Date(year, month - 1 + delta)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Enriquece dados brutos com status + remaining calculados
export function enrichConsumption(
    raw: Omit<BudgetConsumption, 'remaining_amount' | 'status'>
): BudgetConsumption {
    return {
        ...raw,
        remaining_amount: Math.max(raw.budget_amount - raw.spent_amount, 0),
        status: getBudgetStatus(raw.percentage),
    }
}
