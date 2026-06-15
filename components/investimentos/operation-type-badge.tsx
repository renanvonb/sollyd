"use client"

import { cn } from "@/lib/utils"
import { OPERATION_META } from "./investment-meta"
import type { OperationType } from "@/types/investment"

export function OperationTypeBadge({ type, className }: { type: OperationType; className?: string }) {
    const meta = OPERATION_META[type]
    const Icon = meta.icon
    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium font-inter",
            meta.bg, meta.color, className
        )}>
            <Icon className="h-3 w-3" /> {meta.label}
        </span>
    )
}
