'use client';

import { Eye, EyeOff, Menu } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { useSidebar } from '@/hooks/use-sidebar-state';
import { useVisibility } from '@/hooks/use-visibility-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface Tab {
    id: string;
    label: string;
}

interface TopBarProps {
    /** Nome do módulo (ex: "Financeiro", "Cadastros") */
    moduleName: string;
    /** Tabs para navegação */
    tabs?: Tab[];
    /** Tab ativa atual */
    activeTab?: string;
    /** Callback quando uma tab é clicada */
    onTabChange?: (tabId: string) => void;
    /** Variante do top bar */
    variant?: 'default' | 'simple';
    /** Conteúdo customizado no centro (substitui tabs) */
    centerContent?: ReactNode;
    /** Conteúdo customizado na direita (substitui ícones padrão) */
    rightContent?: ReactNode;
    /** Se true, mostra o nome da tab ativa ao invés do módulo */
    showActiveTabName?: boolean;
}

export function TopBar({
    moduleName,
    tabs = [],
    activeTab,
    onTabChange,
    variant = 'default',
    centerContent,
    rightContent,
    showActiveTabName = false,
}: TopBarProps) {
    const { toggle } = useSidebar();
    const { isVisible, toggleVisibility } = useVisibility();

    // Encontra o nome da tab ativa
    const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label || moduleName;
    const displayName = showActiveTabName ? activeTabLabel : moduleName;

    return (
        <TooltipProvider delayDuration={300}>
            {/* ── MOBILE Topbar (oculto em desktop) ── */}
            <header className="sticky top-0 z-30 border-b border-border bg-card dark:bg-[#0a0a0a] h-14 flex-none font-sans flex md:hidden items-center justify-between px-4 relative">
                {/* Esquerda: ocultar valores */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={toggleVisibility}
                        aria-label={isVisible ? "Ocultar valores" : "Mostrar valores"}
                    >
                        {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Centro: símbolo da Sollyd */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    <div className="relative h-6 w-6">
                        <Image
                            src="/brand/symbol.png"
                            alt="Sollyd"
                            fill
                            className="object-contain"
                            style={{ filter: 'brightness(0) saturate(100%) invert(93%) sepia(46%) saturate(1272%) hue-rotate(8deg) brightness(104%) contrast(98%)' }}
                        />
                    </div>
                </div>

                {/* Direita: menu hamburguer */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggle}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label="Abrir menu"
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </header>

            {/* ── DESKTOP TopBar (oculto em mobile) ── */}
            <header className="sticky top-0 z-30 w-[calc(100%+16px)] -ml-4 pl-4 border-b border-border bg-background flex-none font-sans transition-colors duration-200 hidden md:block">
                <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between w-full">

                    {/* Left: Module Name */}
                    <div className="flex items-center">
                        <span className="text-sm font-normal text-foreground font-inter">
                            {displayName}
                        </span>
                    </div>

                    {/* Right: Custom or default */}
                    {rightContent ? (
                        rightContent
                    ) : (
                        <div className="flex items-center gap-2 justify-end">
                            <Button variant="outline" size="icon" className="text-muted-foreground hover:text-foreground" onClick={toggleVisibility}>
                                {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                        </div>
                    )}
                </div>
            </header>
        </TooltipProvider>
    );
}
