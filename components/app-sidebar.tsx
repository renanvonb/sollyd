'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ArrowRightLeft, TrendingUp, UserPlus, LogOut, User, PieChart, PiggyBank, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions/auth'
import { useSidebar } from '@/hooks/use-sidebar-state'
import { SidebarSkeleton } from '@/components/ui/skeletons'
import { ProfileSheet } from '@/components/shared/profile-sheet'
import { useState } from 'react'

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet"

interface SidebarProps {
    user: {
        email?: string
    }
}

interface MenuItem {
    label: string
    href: string
    icon: any
    disabled?: boolean
    tooltip?: string
}

const menuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Transações', href: '/transacoes', icon: ArrowRightLeft },
    { label: 'Investimentos', href: '/investimentos', icon: TrendingUp },
    { label: 'Caixinhas', href: '/caixinhas', icon: PiggyBank },
    { label: 'Orçamentos', href: '/orcamentos', icon: PieChart },
    { label: 'Cadastros', href: '/cadastros', icon: UserPlus },
]

// Conteúdo de navegação compartilhado entre desktop e mobile Sheet
function SidebarNavContent({
    user,
    showLabels,
    onNavigate,
    onProfileOpen,
    onClose,
}: {
    user: SidebarProps['user']
    showLabels: boolean
    onNavigate?: () => void
    onProfileOpen: () => void
    onClose?: () => void
}) {
    const pathname = usePathname()
    const { toggle } = useSidebar()
    const userName = (user as any)?.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
    const avatarUrl = (user as any)?.user_metadata?.avatar_url || null

    return (
        <>
            {/* Logo */}
            <div className={cn("group flex items-center h-[72px]", showLabels ? "pl-5 pr-3 justify-between" : "px-3 justify-center")}>
                {showLabels ? (
                    <>
                        <div className="flex items-center">
                            <div className="relative h-8 w-8 shrink-0">
                                <Image
                                    src="/brand/symbol.png"
                                    alt="Sollyd"
                                    fill
                                    className="object-contain"
                                    style={{ filter: 'brightness(0) saturate(100%) invert(93%) sepia(46%) saturate(1272%) hue-rotate(8deg) brightness(104%) contrast(98%)' }}
                                />
                            </div>
                            <span className="font-jakarta font-bold text-2xl text-white tracking-tight ml-3 whitespace-nowrap">
                                Sollyd
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose ?? toggle}
                            className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800/50 shrink-0"
                        >
                            <PanelLeftClose className="h-4 w-4" />
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="relative h-8 w-8 shrink-0 group-hover:hidden">
                            <Image
                                src="/brand/symbol.png"
                                alt="Sollyd"
                                fill
                                className="object-contain"
                                style={{ filter: 'brightness(0) saturate(100%) invert(93%) sepia(46%) saturate(1272%) hue-rotate(8deg) brightness(104%) contrast(98%)' }}
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggle}
                            className="hidden group-hover:flex h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                        >
                            <PanelLeftOpen className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 pt-2 pb-6 space-y-1 overflow-hidden">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const Icon = item.icon

                    const linkEl = (
                        <Link
                            href={item.disabled ? '#' : item.href}
                            aria-disabled={item.disabled}
                            onClick={(e) => {
                                if (item.disabled) e.preventDefault()
                                else onNavigate?.()
                            }}
                            className={cn(
                                'flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group',
                                showLabels ? 'gap-3' : 'justify-center',
                                isActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50',
                                item.disabled && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            <Icon className={cn(
                                "h-5 w-5 min-w-[20px] transition-colors",
                                isActive ? "text-white" : "text-neutral-400 group-hover:text-white"
                            )} />
                            {showLabels && <span>{item.label}</span>}
                        </Link>
                    )

                    // Tooltip when collapsed (desktop icon mode)
                    if (!showLabels) {
                        return (
                            <Tooltip key={item.label}>
                                <TooltipTrigger asChild>
                                    <div>{linkEl}</div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p>{item.tooltip || item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    }

                    return <div key={item.label}>{linkEl}</div>
                })}
            </nav>

            {/* User dropdown */}
            <div className="p-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full flex items-center gap-3 px-2 h-auto py-2 hover:bg-neutral-800/50 rounded-lg text-neutral-400 hover:text-white",
                                !showLabels && "justify-center px-0"
                            )}
                        >
                            <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={avatarUrl || ""} className="object-cover" />
                                <AvatarFallback className="bg-brand text-brand-foreground font-medium">
                                    {userName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {showLabels && (
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{userName}</p>
                                </div>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="end"
                        sideOffset={12}
                        className="w-56 bg-neutral-900 border-neutral-800 text-neutral-300"
                    >
                        <DropdownMenuLabel className="font-normal border-b border-neutral-800 mb-1 pb-2">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none text-white">{userName}</p>
                                <p className="text-xs leading-none text-neutral-400 truncate">{user.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            className="cursor-pointer focus:bg-neutral-800 focus:text-white hover:text-white"
                            onClick={() => onProfileOpen()}
                        >
                            <User className="mr-2 h-4 w-4" />
                            <span>Perfil</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-neutral-800" />
                        <DropdownMenuItem
                            className="text-red-400 focus:text-red-400 focus:bg-red-950/20 cursor-pointer"
                            onClick={() => signOut()}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    )
}

export function AppSidebar({ user }: SidebarProps) {
    const { isOpen, isMobileSheetOpen, setMobileSheetOpen } = useSidebar()
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    if (!user) {
        return <SidebarSkeleton />
    }

    return (
        <TooltipProvider delayDuration={300}>
            {/* ── MOBILE: Sheet lateral (visível apenas em < md) ── */}
            <Sheet open={isMobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetContent
                    side="left"
                    className="p-0 w-64 max-w-[85vw] bg-[#0a0a0a] border-r border-[#262626] flex flex-col [&>button]:hidden"
                >
                    <SidebarNavContent
                        user={user}
                        showLabels={true}
                        onNavigate={() => setMobileSheetOpen(false)}
                        onProfileOpen={() => {
                            setMobileSheetOpen(false)
                            setIsProfileOpen(true)
                        }}
                        onClose={() => setMobileSheetOpen(false)}
                    />
                </SheetContent>
            </Sheet>

            {/* ── DESKTOP: Sidebar fixa (visível apenas em >= md) ── */}
            <aside
                id="main-sidebar"
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen transition-all duration-300 border-r border-[#262626] bg-[#0a0a0a] flex-col font-sans hidden md:flex",
                    isOpen ? "w-56" : "w-[68px]"
                )}
            >
                <SidebarNavContent
                    user={user}
                    showLabels={isOpen}
                    onProfileOpen={() => setIsProfileOpen(true)}
                />
            </aside>

            <ProfileSheet
                user={user}
                isOpen={isProfileOpen}
                onOpenChange={setIsProfileOpen}
            />
        </TooltipProvider>
    )
}
