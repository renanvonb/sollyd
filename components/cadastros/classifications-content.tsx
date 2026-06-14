'use client';

import { useState, useEffect } from 'react';
import { Classification } from '@/types/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Plus, Tag, SearchX } from 'lucide-react';
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
import {
    getClassifications,
    deleteClassification
} from '@/lib/supabase/cadastros';
import { ClassificationForm } from './classification-form';
import { getIconByName } from './icon-picker';
import { getColorHex } from './color-picker';
import { ModuleCardsSkeleton } from '@/components/ui/skeletons';
import { Flag } from 'lucide-react';
import { useVisibility } from '@/hooks/use-visibility-state';

interface ClassificationsContentProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    searchQuery: string;
    onCountChange?: (count: number) => void;
}

export function ClassificationsContent({ isOpen, onOpenChange, searchQuery, onCountChange }: ClassificationsContentProps) {
    const [classifications, setClassifications] = useState<Classification[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<Classification | null>(null);
    const [deleteItem, setDeleteItem] = useState<Classification | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { isVisible } = useVisibility();

    const filteredClassifications = classifications.filter(item => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normalize(item.name).includes(normalize(searchQuery));
    });

    useEffect(() => {
        if (!isOpen) {
            setEditingItem(null);
        }
    }, [isOpen]);

    useEffect(() => {
        fetchClassifications();
    }, []);

    useEffect(() => {
        onCountChange?.(classifications.length)
    }, [classifications])

    const fetchClassifications = async () => {
        try {
            setLoading(true);
            const data = await getClassifications();
            setClassifications(data || []);
        } catch (error: any) {
            console.error('Error fetching classifications:', error);
            toast.error('Erro de carregamento', {
                description: 'Não foi possível carregar as classificações.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;

        try {
            setSubmitting(true);
            await deleteClassification(deleteItem.id);
            setClassifications(prev => prev.filter(item => item.id !== deleteItem.id));
            toast.success('Excluída!', {
                description: 'A classificação foi removida com sucesso.'
            });
        } catch (error: any) {
            console.error('Error deleting classification:', error);
            if (error.code === '23503') {
                toast.warning('Ação impedida', {
                    description: 'Existem categorias vinculadas a esta classificação.'
                });
            } else {
                toast.error('Ops!', {
                    description: 'Ocorreu um erro ao tentar excluir a classificação.'
                });
            }
        } finally {
            setDeleteItem(null);
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {loading ? (
                <ModuleCardsSkeleton />
            ) : classifications.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={Tag}
                    title="Nenhuma classificação cadastrada"
                    description="Crie classificações para agrupar suas categorias (Ex: Essencial, Estilo de Vida)."
                    action={
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(true)}
                            className="font-inter"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar
                        </Button>
                    }
                    className="flex-1 bg-card border-border border-dashed"
                />
            ) : filteredClassifications.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={SearchX}
                    title="Nenhuma classificação encontrada"
                    description="Tente novamente para encontrar o que está buscando"
                    className="flex-1 bg-card border-border border-dashed"
                />
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredClassifications.map((item) => {
                        const Icon = getIconByName(item.icon || 'flag', Flag);
                        const cardColor = getColorHex(item.color || 'zinc');
                        return (
                            <Card
                                key={item.id}
                                className="group cursor-pointer hover:bg-accent/50 transition-all duration-300 border-border"
                                onClick={() => {
                                    setEditingItem(item);
                                    onOpenChange(true);
                                }}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: cardColor }}
                                        >
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate font-jakarta">
                                                <HighlightText text={item.name} highlight={searchQuery} />
                                            </h3>
                                            <p className="text-sm text-muted-foreground font-inter truncate">
                                                {isVisible ? (item.transactions?.[0]?.count || 0) : '••'} transações
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="font-jakarta">
                            {editingItem ? 'Editar classificação' : 'Nova classificação'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? 'Atualize as informações da classificação'
                                : 'Preencha as informações da classificação'}
                        </DialogDescription>
                    </DialogHeader>

                    <ClassificationForm
                        classificationId={editingItem?.id}
                        defaultValues={editingItem ? {
                            name: editingItem.name,
                            color: editingItem.color,
                            icon: editingItem.icon
                        } : undefined}
                        onSuccess={() => {
                            onOpenChange(false);
                            fetchClassifications();
                        }}
                        onCancel={() => onOpenChange(false)}
                        onDelete={editingItem && !editingItem.is_default ? () => {
                            setDeleteItem(editingItem);
                            onOpenChange(false);
                        } : undefined}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
                <AlertDialogContent className="sm:max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a realizar uma exclusão permanente que não poderá ser desfeita. Tem certeza que deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            variant="destructive"
                            disabled={submitting}
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
