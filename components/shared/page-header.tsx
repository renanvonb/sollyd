'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PanelLeftClose, PanelLeftOpen, Bell, Sun, Eye, EyeOff, Moon, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/hooks/use-sidebar-state'
import { useVisibility } from '@/hooks/use-visibility-state'
import { useTheme } from 'next-themes'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { TopbarSkeleton } from '@/components/ui/skeletons'

interface NavLink {
    label: string
    href: string
}

interface PageHeaderProps {
    links: NavLink[]
    isLoading?: boolean
}

export function PageHeader({ links, isLoading }: PageHeaderProps) {
    if (isLoading) {
        return <TopbarSkeleton />
    }

    const pathname = usePathname()
    const { isOpen, toggle } = useSidebar()
    const { isVisible, toggleVisibility } = useVisibility()
    const { setTheme, theme } = useTheme()

    const moduleName = "Transações"

    return (
        <header id="global-header" className="sticky top-0 z-30 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md h-14 md:h-[72px] flex-none font-sans">
            {/* Mobile: logotipo à esquerda, menu à direita (sem troca de tema) */}
            <div className="flex h-full md:hidden items-center justify-between px-4">
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <div className="relative h-7 w-7 shrink-0">
                        <Image
                            src="/brand/symbol.png"
                            alt=""
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="font-jakarta font-bold text-lg text-zinc-950 tracking-tight truncate">
                        Sollyd
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggle}
                    className="shrink-0 text-zinc-400 hover:text-zinc-950"
                    aria-label="Abrir menu"
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            <div className="hidden md:flex max-w-[1440px] mx-auto px-8 h-full items-center justify-between w-full">

                {/* Left: Sidebar Toggle + Static Breadcrumb */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggle}
                        className="text-zinc-400 hover:text-zinc-950 transition-all flex-none"
                        title={isOpen ? "Recolher Sidebar" : "Expandir Sidebar"}
                    >
                        {isOpen ? (
                            <PanelLeftClose className="h-5 w-5" />
                        ) : (
                            <PanelLeftOpen className="h-5 w-5" />
                        )}
                    </Button>

                    <Breadcrumb className="hidden md:block select-none">
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="font-medium text-zinc-950 text-sm">
                                    {moduleName}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                {/* Center: Navigation Links (Tab Style) */}
                <div className="flex items-center justify-center">
                    <nav className="flex items-center gap-6 h-full">
                        {links.map((link) => {
                            const isActive = pathname.startsWith(link.href)
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        'relative h-[72px] flex items-center px-1 text-sm font-medium transition-colors border-b-2 font-inter',
                                        isActive
                                            ? 'text-zinc-950 border-zinc-950'
                                            : 'text-zinc-500 border-transparent hover:text-zinc-950'
                                    )}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Right: Actions (Theme, Visibility, Notifications) */}
                <div className="flex items-center gap-3 justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleVisibility}
                        aria-label={isVisible ? "Ocultar valores" : "Mostrar valores"}
                        className="text-zinc-400 hover:text-zinc-950 rounded-full"
                        title={isVisible ? "Ocultar valores" : "Mostrar valores"}
                    >
                        {isVisible ? (
                            <Eye className="h-5 w-5" />
                        ) : (
                            <EyeOff className="h-5 w-5" />
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        aria-label="Alternar Tema"
                        className="text-zinc-400 hover:text-zinc-950 rounded-full"
                    >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Notificações"
                        className="text-zinc-400 hover:text-zinc-950 rounded-full"
                    >
                        <Bell className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    )
}
