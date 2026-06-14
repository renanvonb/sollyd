'use client';

import { useState, useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Category, Subcategory } from "@/types/entities";
import { getIconByName } from "./icon-picker";
import { getColorClass, getColorHex } from "./color-picker";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Loader2, FolderOpen, Plus } from "lucide-react";
import { getSubcategoriesByCategoryId, createSubcategory, deleteSubcategory } from "@/lib/supabase/cadastros";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { SubcategoryDialog } from "./subcategory-dialog";
import { useVisibility } from '@/hooks/use-visibility-state';

interface CategorySheetProps {
    category: Category | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
    onRefresh: () => void;
}

export function CategorySheet({
    category,
    isOpen,
    onOpenChange,
    onEdit,
    onDelete,
    onRefresh
}: CategorySheetProps) {
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [newSubName, setNewSubName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isAddSubOpen, setIsAddSubOpen] = useState(false);
    const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
    const [subToDelete, setSubToDelete] = useState<Subcategory | null>(null);
    const { isVisible } = useVisibility();

    useEffect(() => {
        if (isOpen && category) {
            fetchSubcategories();
        } else {
            setSubcategories([]);
            setNewSubName('');
        }
    }, [isOpen, category]);

    const fetchSubcategories = async () => {
        if (!category) return;
        try {
            setLoading(true);
            const data = await getSubcategoriesByCategoryId(category.id);
            setSubcategories(data || []);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubcategory = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newSubName.trim() || !category) return;

        try {
            setSubmitting(true);
            await createSubcategory({
                category_id: category.id,
                name: newSubName.trim(),
            });
            setNewSubName('');
            await fetchSubcategories();
            onRefresh(); // Refresh parent to update counts if needed
            toast.success('Pronto!', {
                description: 'Subcategoria adicionada com sucesso.'
            });
        } catch (error) {
            console.error('Error adding subcategory:', error);
            toast.error('Erro ao adicionar', {
                description: 'Não foi possível salvar a subcategoria.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSub = (sub: Subcategory) => {
        setSubToDelete(sub);
    };

    const confirmDeleteSub = async () => {
        if (!subToDelete) return;
        try {
            await deleteSubcategory(subToDelete.id);
            setSubcategories(prev => prev.filter(s => s.id !== subToDelete.id));
            onRefresh();
            toast.success('Excluído!', {
                description: 'Subcategoria removida com sucesso.'
            });
        } catch (error) {
            console.error('Error deleting subcategory:', error);
            toast.error('Erro ao remover', {
                description: 'Não foi possível excluir a subcategoria.'
            });
        } finally {
            setSubToDelete(null);
        }
    };

    const handleEditSub = (sub: Subcategory) => {
        setEditingSubcategory(sub);
        setIsAddSubOpen(true);
    };

    const handleAddSub = () => {
        setEditingSubcategory(null);
        setIsAddSubOpen(true);
    };

    if (!category) return null;

    const Icon = getIconByName(category.icon || 'cart');
    const colorClass = getColorClass(category.color || 'zinc');
    const hexColor = getColorHex(category.color || 'zinc');

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md flex flex-col h-full w-full">
                <SheetHeader className="text-left px-1 border-b pb-6 mb-4">
                    <div className="flex items-center gap-4">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", colorClass)}>
                            <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex items-center gap-3">
                            <SheetTitle className="font-jakarta text-xl">{category.name}</SheetTitle>
                            {category.type && (
                                <Badge variant="secondary">
                                    {category.type}
                                </Badge>
                            )}
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 flex flex-col min-h-0">
                    {loading ? (
                        <div className="flex flex-1 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                        </div>
                    ) : subcategories.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center">
                            <EmptyState
                                title="Nenhuma subcategoria"
                                description="Esta categoria não possui subcategorias vinculadas."
                                icon={FolderOpen}
                                variant="default"
                                className="w-full"
                                action={
                                    <Button onClick={handleAddSub}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Adicionar
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold text-foreground font-inter">Subcategorias</h3>
                            </div>
                            <div className="space-y-3">
                                {subcategories.map((sub) => (
                                    <Card
                                        key={sub.id}
                                        className="group hover:bg-accent/50 hover:shadow-sm transition-all border-border relative overflow-hidden border-l-4 cursor-pointer"
                                        style={{ borderLeftColor: hexColor }}
                                        onClick={() => handleEditSub(sub)}
                                    >
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <h4 className="font-semibold text-foreground truncate font-jakarta text-base">
                                                    {sub.name}
                                                </h4>
                                                <p className="text-sm text-muted-foreground font-inter truncate">
                                                    {isVisible ? (sub.transactions?.[0]?.count || 0) : '••'} transações
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <Button
                                variant="secondary"
                                className="w-full mt-4 font-inter"
                                onClick={handleAddSub}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar
                            </Button>
                        </div>
                    )}
                </div>

                <SheetFooter className="mt-auto flex flex-row items-center justify-between sm:justify-between">
                    {!category.is_default ? (
                        <Button
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-destructive/10 px-4 font-inter"
                            onClick={() => onDelete(category)}
                        >
                            Excluir
                        </Button>
                    ) : (
                        <span />
                    )}

                    <Button
                        variant="outline"
                        onClick={() => onEdit(category)}
                    >
                        Editar
                    </Button>
                </SheetFooter>
            </SheetContent>

            <SubcategoryDialog
                category={category}
                subcategory={editingSubcategory}
                isOpen={isAddSubOpen}
                onOpenChange={setIsAddSubOpen}
                onSuccess={() => {
                    fetchSubcategories();
                    onRefresh();
                }}
                onDelete={editingSubcategory && !editingSubcategory.is_default ? () => {
                    setIsAddSubOpen(false);
                    if (editingSubcategory) {
                        setSubToDelete(editingSubcategory);
                    }
                } : undefined}
            />

            <AlertDialog open={!!subToDelete} onOpenChange={() => setSubToDelete(null)}>
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
                            onClick={confirmDeleteSub}
                            variant="destructive"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Sheet>
    );
}
