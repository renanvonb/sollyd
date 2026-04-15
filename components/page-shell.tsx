"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageShellProps {
    title: string
    description?: string
    actions?: React.ReactNode
    isEmpty?: boolean
    emptyConfig?: {
        icon: LucideIcon
        title: string
        description: string
        actionText?: string
        onAction?: () => void
    }
    children: React.ReactNode
}

export function PageShell({
    title,
    description,
    actions,
    isEmpty,
    emptyConfig,
    children,
}: PageShellProps) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Wrapper Principal Sagrado (Áreas C, D e E) */}
            <div className="max-w-[1440px] mx-auto px-5 md:px-8 w-full flex-1 flex flex-col pt-5 md:pt-8 pb-5 md:pb-8 gap-5 md:gap-6 overflow-hidden">

                {/* Header de Página (Área C) */}
                <div className="flex flex-row items-center justify-between flex-none font-sans gap-2">
                    {/* Título — sempre na mesma linha no mobile e desktop */}
                    <div className="min-w-0">
                        <h1 className="text-3xl font-semibold md:font-bold tracking-tight text-foreground font-jakarta truncate">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-muted-foreground mt-1 font-sans text-sm md:text-base">
                                {description}
                            </p>
                        )}
                    </div>

                    {/* Ações — abaixo do título em mobile, à direita em desktop */}
                    {actions && (
                        <div className="flex items-center gap-2 font-sans">
                            {actions}
                        </div>
                    )}
                </div>

                {/* Área de Conteúdo (Áreas D e E) */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {isEmpty && emptyConfig ? (
                        <div className="flex-1 flex items-center justify-center">
                            <EmptyState
                                variant="outlined"
                                icon={emptyConfig.icon}
                                title={emptyConfig.title}
                                description={emptyConfig.description}
                                action={
                                    emptyConfig.actionText && (
                                        <Button onClick={emptyConfig.onAction} className="bg-zinc-950 text-white hover:bg-zinc-800 font-sans">
                                            {emptyConfig.actionText}
                                        </Button>
                                    )
                                }
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
