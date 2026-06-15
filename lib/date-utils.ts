// lib/date-utils.ts
import { format, parseISO, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COMPETENCE_DATE_FORMAT, DISPLAY_DATE_FORMAT, DISPLAY_MONTH_FORMAT, YEAR_MONTH_FORMAT } from './constants'

// Garante o formato correto de competência: 'YYYY-MM-01'
export function toCompetenceDate(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(startOfMonth(d), COMPETENCE_DATE_FORMAT)
}

// Extrai 'YYYY-MM' de uma data
export function toYearMonth(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, YEAR_MONTH_FORMAT)
}

// Formata data para exibição: '15/06/2026'
export function formatDisplayDate(date: Date | string | null | undefined): string {
    if (!date) return '—'
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, DISPLAY_DATE_FORMAT)
}

// Formata competência para exibição: 'Jun/2026'
export function formatCompetenceDisplay(competence: string | null | undefined): string {
    if (!competence) return '—'
    const d = parseISO(competence)
    return format(d, DISPLAY_MONTH_FORMAT, { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())
}

// Competência do mês atual no formato correto
export function currentCompetence(): string {
    return toCompetenceDate(new Date())
}

// Converte input de date picker (Date ou string ISO) para string de banco 'yyyy-MM-dd'
export function toDbDateString(date: Date | string | null | undefined): string | null {
    if (!date) return null
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'yyyy-MM-dd')
}
