'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Folder, SearchX } from 'lucide-react';
import { HighlightText } from '@/components/ui/highlight-text';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CategoryForm } from './category-form';
import { getIconByName } from './icon-picker';
import { getColorHex } from './color-picker';
import { ModuleCardsSkeleton } from '@/components/ui/skeletons';
import { CategorySheet } from './category-sheet';

interface CategoriesContentProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    searchQuery: string;
    activeTab?: 'Receita' | 'Despesa';
    onCountChange?: (count: number) => void;
}

export function CategoriesContent({ isOpen, onOpenChange, searchQuery, activeTab = 'Despesa', onCountChange }: CategoriesContentProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<Category | null>(null);
    const [deleteItem, setDeleteItem] = useState<Category | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const filteredCategories = categories
        .filter(item => item.type === activeTab)
        .filter(item => {
            const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
            return normalize(item.name).includes(normalize(searchQuery));
        });

    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        onCountChange?.(categories.length)
    }, [categories])

    const fetchData = async () => {
        await fetchCategories();
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error('Sessão expirada', {
                    description: 'Faça login novamente para continuar.'
                });
                return;
            }

            const { data, error } = await supabase
                .from('categories')
                .select('*, transactions(count), subcategories(count)')
                .eq('user_id', user.id)
                .order('name', { ascending: true });

            if (error) throw error;
            setCategories(data || []);

            // If sheet is open, update selected category data
            if (isSheetOpen && selectedCategory) {
                const updated = data?.find(c => c.id === selectedCategory.id);
                if (updated) setSelectedCategory(updated);
            }
        } catch (error: any) {
            console.error('Error fetching categories:', error);
            toast.error('Erro de carregamento', {
                description: 'Não foi possível carregar as categorias.'
            });
        } finally {
            setLoading(false);
        }
    };



    const handleEdit = (item: Category) => {
        setEditingItem(item);
        setIsSheetOpen(false); // Close sheet before opening edit dialog
        onOpenChange(true);
    };

    const handleDelete = async () => {
        if (!deleteItem) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', deleteItem.id)
                .eq('user_id', user.id);

            if (error) {
                if (error.code === '23503') {
                    toast.warning('Ação impedida', {
                        description: 'Existem transações ou subcategorias vinculadas a esta categoria.'
                    });
                    return;
                }
                throw error;
            }

            setCategories(prev => prev.filter(cat => cat.id !== deleteItem.id));
            setIsSheetOpen(false);
            toast.success('Categoria excluída com sucesso!');
        } catch (error: any) {
            console.error('Error deleting category:', error);
            toast.error('Erro ao excluir categoria');
        } finally {
            setDeleteItem(null);
        }
    };

    const openSheet = (category: Category) => {
        setSelectedCategory(category);
        setIsSheetOpen(true);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {loading ? (
                <ModuleCardsSkeleton />
            ) : categories.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={Folder}
                    title="Nenhuma categoria cadastrada"
                    description="Comece criando sua primeira categoria para organizar suas transações"
                    action={
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(true)}
                            className="font-inter"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar
                        </Button>
                    }
                    className="flex-1 border-border border-dashed"
                />
            ) : filteredCategories.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={SearchX}
                    title="Nenhuma categoria encontrada"
                    description="Tente novamente para encontrar o que está buscando"
                    className="flex-1 border-border border-dashed"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredCategories.map((item) => {
                        const Icon = getIconByName(item.icon || 'cart');
                        const cardColor = getColorHex(item.color || 'zinc');

                        return (
                            <Card
                                key={item.id}
                                className="group cursor-pointer hover:bg-accent/50 transition-all duration-300 border-border relative overflow-hidden"
                                onClick={() => openSheet(item)}
                            >

                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: cardColor }}
                                        >
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate font-jakarta">
                                                <HighlightText text={item.name} highlight={searchQuery} />
                                            </h3>
                                            <p className="text-sm text-muted-foreground font-inter truncate">
                                                {item.subcategories?.[0]?.count || 0} subcategorias
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <CategorySheet
                category={selectedCategory}
                isOpen={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                onEdit={handleEdit}
                onDelete={(cat) => setDeleteItem(cat)}
                onRefresh={fetchCategories}
            />

            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="font-jakarta">
                            {editingItem ? 'Editar categoria' : 'Nova categoria'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? 'Atualize as informações da categoria'
                                : 'Preencha as informações da categoria'}
                        </DialogDescription>
                    </DialogHeader>

                    <CategoryForm
                        classifications={[]}
                        categoryId={editingItem?.id}
                        onSuccess={() => {
                            onOpenChange(false);
                            fetchCategories();
                        }}
                        onCancel={() => onOpenChange(false)}
                        defaultValues={editingItem ? {
                            name: editingItem.name,
                            type: editingItem.type,
                            color: editingItem.color,
                            icon: editingItem.icon
                        } : { type: activeTab }}
                        onDelete={editingItem && !editingItem.is_default ? () => {
                            onOpenChange(false);
                            setDeleteItem(editingItem);
                        } : undefined}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
                <AlertDialogContent className="sm:max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a realizar uma exclusão permanente que não poderá ser desfeita. Tem certeza que deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            variant="destructive"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
