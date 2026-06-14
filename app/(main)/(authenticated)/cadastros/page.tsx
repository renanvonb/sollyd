'use client';

import { useState } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Search, Plus, Eye, EyeOff, Wallet, Users, UserRound, Tag, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TopBar } from '@/components/ui/top-bar';
import { useVisibility } from '@/hooks/use-visibility-state';
import { cn } from '@/lib/utils';
import { WalletsContent } from '@/components/cadastros/wallets-content';
import { PayersContent } from '@/components/cadastros/payers-content';
import { PayeesContent } from '@/components/cadastros/payees-content';
import { CategoriesContent } from '@/components/cadastros/categories-content';
import { ClassificationsContent } from '@/components/cadastros/classifications-content';

type TabType = 'carteiras' | 'pagadores' | 'beneficiarios' | 'categorias' | 'classificacoes';

const tabs: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'carteiras', label: 'Carteiras', icon: Wallet },
    { id: 'pagadores', label: 'Pagadores', icon: UserRound },
    { id: 'beneficiarios', label: 'Beneficiários', icon: Users },
    { id: 'categorias', label: 'Categorias', icon: Tag },
    { id: 'classificacoes', label: 'Classificações', icon: Layers },
];

const tabTitles: Record<TabType, { title: string; description: string }> = {
    carteiras: {
        title: 'Carteiras',
        description: 'Gerencie suas carteiras e contas financeiras',
    },
    pagadores: {
        title: 'Pagadores',
        description: 'Gerencie os pagadores das suas transações',
    },
    beneficiarios: {
        title: 'Beneficiários',
        description: 'Gerencie quem recebe seus pagamentos'
    },
    categorias: {
        title: 'Categorias',
        description: 'Gerencie as categorias de receitas e despesas',
    },
    classificacoes: {
        title: 'Classificações',
        description: 'Gerencie as classificações das suas despesas',
    },
};

export default function CadastrosPage() {
    const { isVisible, toggleVisibility } = useVisibility();
    const [activeTab, setActiveTab] = useState<TabType>('carteiras');
    const [searchValue, setSearchValue] = useState('');
    const [categoryType, setCategoryType] = useState<'Receita' | 'Despesa'>('Despesa');
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [isClassificationDialogOpen, setIsClassificationDialogOpen] = useState(false);
    const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
    const [isPayerDialogOpen, setIsPayerDialogOpen] = useState(false);
    const [isPayeeDialogOpen, setIsPayeeDialogOpen] = useState(false);
    const [counts, setCounts] = useState<Record<TabType, number>>({
        carteiras: 0,
        pagadores: 0,
        beneficiarios: 0,
        categorias: 0,
        classificacoes: 0,
    });

    const countNouns: Record<TabType, [string, string]> = {
        carteiras: ['carteira cadastrada', 'carteiras cadastradas'],
        pagadores: ['pagador cadastrado', 'pagadores cadastrados'],
        beneficiarios: ['beneficiário cadastrado', 'beneficiários cadastrados'],
        categorias: ['categoria cadastrada', 'categorias cadastradas'],
        classificacoes: ['classificação cadastrada', 'classificações cadastradas'],
    };
    const currentCount = counts[activeTab];
    const currentDescription = `${currentCount} ${currentCount === 1 ? countNouns[activeTab][0] : countNouns[activeTab][1]}`;

    const currentTab = tabTitles[activeTab];

    const handleAddClick = () => {
        switch (activeTab) {
            case 'carteiras':
                setIsWalletDialogOpen(true);
                break;
            case 'pagadores':
                setIsPayerDialogOpen(true);
                break;
            case 'beneficiarios':
                setIsPayeeDialogOpen(true);
                break;
            case 'categorias':
                setIsCategoryDialogOpen(true);
                break;
            case 'classificacoes':
                setIsClassificationDialogOpen(true);
                break;
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Top Bar - Usando componente reutilizável */}
            <TopBar
                moduleName="Cadastros"
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(tabId) => setActiveTab(tabId as TabType)}
                variant="simple"
                rightContent={
                    <div className="hidden md:flex items-center gap-3">
                        <div className="relative w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar" className="pl-9 h-10 font-inter" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
                        </div>
                        <div className="flex items-center h-10 rounded-md border border-input overflow-hidden">
                            {tabs.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id as TabType)}
                                    className={cn(
                                        "h-10 px-4 text-sm font-inter transition-colors border-r border-input last:border-r-0",
                                        activeTab === t.id
                                            ? "bg-accent text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    )}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <t.icon className="h-3.5 w-3.5" />
                                        {t.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <Button variant="outline" size="icon" className="text-muted-foreground hover:text-foreground" onClick={toggleVisibility}>
                            {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                    </div>
                }
            />

            {/* Wrapper Principal */}
            <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 pb-4 md:pb-8 gap-5 md:gap-6 overflow-hidden">

                {/* Page Header */}
                <div className="flex items-center justify-between flex-none">
                    <div className="hidden md:flex items-center gap-3">
                        <h2 className="text-2xl font-semibold text-foreground font-jakarta">{currentTab.title}</h2>
                        <span className="w-px h-5 bg-border" />
                        <p className="text-sm text-muted-foreground font-inter">{currentDescription}</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        {activeTab === 'categorias' && (
                            <Tabs value={categoryType} onValueChange={(v) => setCategoryType(v as any)} className="w-auto hidden md:flex">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="Despesa">Despesa</TabsTrigger>
                                    <TabsTrigger value="Receita">Receita</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}

                        {/* Add Button — ícone no mobile, texto no desktop */}
                        <Button
                            onClick={handleAddClick}
                            className="h-10 w-10 shrink-0 p-0 font-inter font-medium md:w-auto md:px-4 md:gap-0"
                        >
                            <Plus className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Adicionar</span>
                        </Button>
                    </div>
                </div>

                {/* Tabs mobile para navegação entre áreas */}
                <div className="flex md:hidden -mt-2 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-1.5 min-w-max">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`px-4 py-2 rounded-full text-sm font-medium font-inter whitespace-nowrap transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-secondary text-foreground border border-transparent'
                                        : 'border border-border text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <tab.icon className="h-3.5 w-3.5" />
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search mobile */}
                <div className="relative flex md:hidden -mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar..."
                        className="pl-9 h-10 font-inter w-full text-sm"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                </div>

                {/* Content Area - Cards */}
                <div className="flex-1 flex flex-col gap-8 overflow-auto scrollbar-hide">
                    {activeTab === 'carteiras' && <WalletsContent isOpen={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen} searchQuery={searchValue} onCountChange={(n) => setCounts(c => ({ ...c, carteiras: n }))} />}
                    {activeTab === 'pagadores' && <PayersContent isOpen={isPayerDialogOpen} onOpenChange={setIsPayerDialogOpen} searchQuery={searchValue} onCountChange={(n) => setCounts(c => ({ ...c, pagadores: n }))} />}
                    {activeTab === 'beneficiarios' && <PayeesContent isOpen={isPayeeDialogOpen} onOpenChange={setIsPayeeDialogOpen} searchQuery={searchValue} onCountChange={(n) => setCounts(c => ({ ...c, beneficiarios: n }))} />}
                    {activeTab === 'categorias' && <CategoriesContent isOpen={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen} searchQuery={searchValue} activeTab={categoryType} onCountChange={(n) => setCounts(c => ({ ...c, categorias: n }))} />}
                    {activeTab === 'classificacoes' && <ClassificationsContent isOpen={isClassificationDialogOpen} onOpenChange={setIsClassificationDialogOpen} searchQuery={searchValue} onCountChange={(n) => setCounts(c => ({ ...c, classificacoes: n }))} />}
                </div>
            </div>
        </div>
    );
}
