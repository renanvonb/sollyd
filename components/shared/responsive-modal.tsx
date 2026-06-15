"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface ResponsiveModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: React.ReactNode
    description?: React.ReactNode
    /** Classe aplicada ao DialogContent no desktop (ex.: max-w-md) */
    className?: string
    children: React.ReactNode
}

// Mobile: bottom sheet (arrasta de baixo). Desktop: Dialog centrado (comportamento atual).
export function ResponsiveModal({ open, onOpenChange, title, description, className, children }: ResponsiveModalProps) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto pb-safe">
                    {(title || description) && (
                        <SheetHeader className="text-left">
                            {title && <SheetTitle className="font-jakarta">{title}</SheetTitle>}
                            {description && <SheetDescription className="font-inter">{description}</SheetDescription>}
                        </SheetHeader>
                    )}
                    <div className="mt-4">{children}</div>
                </SheetContent>
            </Sheet>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("max-w-md", className)}>
                {(title || description) && (
                    <DialogHeader>
                        {title && <DialogTitle className="font-jakarta">{title}</DialogTitle>}
                        {description && <DialogDescription className="font-inter">{description}</DialogDescription>}
                    </DialogHeader>
                )}
                {children}
            </DialogContent>
        </Dialog>
    )
}
