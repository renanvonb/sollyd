"use client"

import Link from "next/link"
import { MoreVertical, Pencil, Archive, Trash2, Plus, CheckCircle2, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import type { SavingsBoxWithProgress } from "@/types/savings-box"
import { getSavingsIcon, formatBRL } from "./savings-box-meta"

interface SavingsBoxCardProps {
    box: SavingsBoxWithProgress
    onContribute: (box: SavingsBoxWithProgress) => void
    onEdit: (box: SavingsBoxWithProgress) => void
    onArchive: (box: SavingsBoxWithProgress) => void
    onDelete: (box: SavingsBoxWithProgress) => void
}

export function SavingsBoxCard({ box, onContribute, onEdit, onArchive, onDelete }: SavingsBoxCardProps) {
    const Icon = getSavingsIcon(box.icon)
    const nearDeadline = box.days_remaining != null && box.days_remaining <= 30 && !box.is_completed

    return (
        <div
            className={cn(
                "flex flex-col rounded-2xl border bg-card p-5 transition-colors",
                box.is_completed ? "border-green-500" : "border-border"
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <Link href={`/caixinhas/${box.id}`} className="flex items-center gap-3 min-w-0 group">
                    <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${box.color}33` }}
                    >
                        <Icon className="h-5 w-5" style={{ color: box.color }} />
                    </span>
                    <span className="truncate font-semibold text-foreground font-jakarta group-hover:underline">
                        {box.name}
                    </span>
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(box)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(box)}>
                            <Archive className="mr-2 h-4 w-4" /> {box.is_archived ? "Desarquivar" : "Arquivar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(box)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Badges */}
            {(box.is_completed || nearDeadline) && (
                <div className="mt-3">
                    {box.is_completed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600 font-inter">
                            <CheckCircle2 className="h-3 w-3" /> Meta atingida!
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-600 font-inter">
                            <AlertTriangle className="h-3 w-3" /> Prazo próximo
                        </span>
                    )}
                </div>
            )}

            {/* Progress */}
            <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${box.progress_percentage}%`, backgroundColor: box.color }}
                    />
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground font-inter">
                        {formatBRL(box.current_amount)}{" "}
                        <span className="text-muted-foreground">/ {formatBRL(box.target_amount)}</span>
                    </span>
                    <span className="text-sm font-semibold text-foreground font-inter">
                        {box.progress_percentage}%
                    </span>
                </div>
                {box.remaining_amount > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground font-inter">
                        Faltam {formatBRL(box.remaining_amount)}
                    </p>
                )}
            </div>

            {/* Meta info */}
            {box.target_date && (
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground font-inter">
                    <span>
                        📅 Até {format(new Date(box.target_date + "T00:00:00"), "MMM/yyyy", { locale: ptBR })}
                    </span>
                    {box.days_remaining != null && !box.is_completed && (
                        <span>• {box.days_remaining} dias restantes</span>
                    )}
                </div>
            )}

            {/* Action */}
            <Button onClick={() => onContribute(box)} variant="outline" className="mt-4 w-full font-sans">
                <Plus className="mr-1 h-4 w-4" /> Aportar
            </Button>
        </div>
    )
}
