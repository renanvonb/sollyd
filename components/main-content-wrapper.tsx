'use client'

import { useSidebar } from '@/hooks/use-sidebar-state'
import { cn } from '@/lib/utils'

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
    const { isOpen } = useSidebar()

    return (
        <main
            className={cn(
                "flex-1 min-h-0 transition-[margin] duration-300 ease-in-out flex flex-col overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-bottom-4 duration-500",
                isOpen ? "ml-0 md:ml-56" : "ml-0 md:ml-[68px]"
            )}
        >
            {children}
        </main>
    )
}
