"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FabProps {
    onClick: () => void
    label: string
    icon?: React.ReactNode
    className?: string
}

// Botão flutuante — visível apenas no mobile (md:hidden). Polegar-alcançável (bottom-right).
export function Fab({ onClick, label, icon, className }: FabProps) {
    return (
        <Button
            onClick={onClick}
            aria-label={label}
            className={cn(
                "md:hidden fixed bottom-6 right-4 z-40 h-14 w-14 rounded-full shadow-lg p-0",
                "bg-[#E0FE56] hover:bg-[#d4f04d] text-black",
                "mb-[env(safe-area-inset-bottom,0px)]",
                className
            )}
        >
            {icon ?? <Plus className="h-6 w-6" />}
            <span className="sr-only">{label}</span>
        </Button>
    )
}
