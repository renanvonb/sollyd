'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TopBar } from '@/components/ui/top-bar';
import { WalletsContent } from '@/components/cadastros/wallets-content';
import { PayersContent } from '@/components/cadastros/payers-content';
import { PayeesContent } from '@/components/cadastros/payees-content';
import { CategoriesContent } from '@/components/cadastros/categories-content';
import { ClassificationsContent } from '@/components/cadastros/classifications-content';

type TabType = 'carteiras' | 'pagadores' | 'beneficiarios' | 'categorias' | 'classificacoes';

const tabs = [
    { id: 'carteiras', label: 'Carteiras' },
    { id: 'pagadores', label: 'Pagadores' },
    { id: 'beneficiarios', label: 'Beneficiários' },
    { id: 'categorias', label: 'Categorias' },
    { id: 'classificacoes', label: 'Classificações' },
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
    const [activeTab, setActiveTab] = useState<TabType>('carteiras');
    const [searchValue, setSearchValue] = useState('');
    const [categoryType, setCategoryType] = useState<'Receita' | 'Despesa'>('Despesa');
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [isClassificationDialogOpen, setIsClassificationDialogOpen] = useState(false);
    const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
    const [isPayerDialogOpen, setIsPayerDialogOpen] = useState(false);
    const [isPayeeDialogOpen, setIsPayeeDialogOpen] = useState(false);

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
            />

            {/* Wrapper Principal */}
            <div className="max-w-[1440px] mx-auto px-4 md:px-8 w-full flex-1 flex flex-col pt-5 md:pt-8 pb-4 md:pb-8 gap-5 md:gap-8 overflow-hidden">

                {/* Page Header */}
                <div className="flex items-center justify-between flex-none">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground font-jakarta">
                        Cadastros
                    </h1>

                    <div className="flex items-center gap-2 md:gap-3">
                        {activeTab === 'categorias' && (
                            <Tabs value={categoryType} onValueChange={(v) => setCategoryType(v as any)} className="w-auto hidden md:flex">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="Despesa">Despesa</TabsTrigger>
                                    <TabsTrigger value="Receita">Receita</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}

                        {/* Search Bar — desktop only */}
                        <div className="relative w-[250px] hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Buscar"
                                className="pl-9 h-10 font-inter w-full"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>

                        {/* Add Button — ícone no mobile, texto no desktop */}
                        <Button
                            onClick={handleAddClick}
                            className="h-10 w-10 shrink-0 p-0 font-inter font-medium md:w-auto md:px-3 md:gap-0"
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
                                {tab.label}
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
                    {activeTab === 'carteiras' && <WalletsContent isOpen={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen} searchQuery={searchValue} />}
                    {activeTab === 'pagadores' && <PayersContent isOpen={isPayerDialogOpen} onOpenChange={setIsPayerDialogOpen} searchQuery={searchValue} />}
                    {activeTab === 'beneficiarios' && <PayeesContent isOpen={isPayeeDialogOpen} onOpenChange={setIsPayeeDialogOpen} searchQuery={searchValue} />}
                    {activeTab === 'categorias' && <CategoriesContent isOpen={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen} searchQuery={searchValue} activeTab={categoryType} />}
                    {activeTab === 'classificacoes' && <ClassificationsContent isOpen={isClassificationDialogOpen} onOpenChange={setIsClassificationDialogOpen} searchQuery={searchValue} />}
                </div>
            </div>
        </div>
    );
}
