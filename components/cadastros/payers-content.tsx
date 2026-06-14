'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, User, SearchX, ArrowDownRight } from 'lucide-react';
import { HighlightText } from '@/components/ui/highlight-text';
import { getIconByName } from './icon-picker';
import { getColorClass } from './color-picker';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Payee,
    getPayees,
    deletePayee,
} from '@/lib/supabase/cadastros';
import { ModuleCardsSkeleton } from '@/components/ui/skeletons';
import { PayeeForm } from './payee-form';
import { useVisibility } from '@/hooks/use-visibility-state';





export interface PayersContentProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    searchQuery: string;
    onCountChange?: (count: number) => void;
}

export function PayersContent({ isOpen, onOpenChange, searchQuery, onCountChange }: PayersContentProps) {
    const router = useRouter();
    const [payers, setPayers] = useState<Payee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingPayer, setEditingPayer] = useState<Payee | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { isVisible } = useVisibility();

    const filteredPayers = payers.filter(payer => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normalize(payer.name).includes(normalize(searchQuery));
    });

    useEffect(() => {
        if (!isOpen) {
            setEditingPayer(null);
        }
    }, [isOpen]);

    const fetchPayers = async () => {
        setLoading(true);
        try {
            const data = await getPayees('payer');
            setPayers(data);
        } catch (error: any) {
            console.error('Erro ao carregar pagadores:', error);
            if (error.message === 'Usuário não autenticado') {
                toast.error('Sessão expirada', {
                    description: 'Faça login novamente para continuar.'
                });
                router.push('/login');
            } else {
                toast.error('Erro de carregamento', {
                    description: 'Não foi possível carregar os pagadores.'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayers();
    }, []);

    useEffect(() => {
        onCountChange?.(payers.length)
    }, [payers])

    const handleDelete = async () => {
        if (!deletingId) return;

        setSubmitting(true);
        try {
            await deletePayee(deletingId);
            setPayers(prev => prev.filter(payer => payer.id !== deletingId));
            toast.success('Pagador excluído com sucesso!');
            setIsDeleteDialogOpen(false);
            setDeletingId(null);
        } catch (error: any) {
            if (error.message === 'Usuário não autenticado') {
                toast.error('Sessão expirada. Faça login novamente.');
                router.push('/login');
            } else {
                toast.error('Erro ao excluir pagador');
            }
        } finally {
            setSubmitting(false);
        }
    };





    return (
        <>
            {loading ? (
                <ModuleCardsSkeleton />
            ) : payers.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={User}
                    title="Nenhum pagador cadastrado"
                    description="Adicione seu primeiro pagador para registrar suas entradas"
                    action={
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(true)}
                            className="font-inter"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar
                        </Button>
                    }
                    className="flex-1 border-border border-dashed"
                />
            ) : filteredPayers.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={SearchX}
                    title="Nenhum pagador encontrado"
                    description="Tente novamente para encontrar o que está buscando"
                    className="flex-1 border-border border-dashed"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPayers.map((payer) => {
                        const IconComponent = getIconByName('arrow-up-right');
                        const colorClass = getColorClass('green');

                        return (
                            <Card
                                key={payer.id}
                                className="hover:bg-accent/50 transition-all duration-300 cursor-pointer group border-border relative overflow-hidden"
                                onClick={() => {
                                    setEditingPayer(payer);
                                    onOpenChange(true);
                                }}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={cn('rounded-full p-2.5 flex-shrink-0', colorClass)}>
                                            <IconComponent className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate">
                                                <HighlightText text={payer.name} highlight={searchQuery} />
                                            </h3>
                                            <p className="text-sm text-muted-foreground font-inter truncate">
                                                {isVisible ? (payer.transactions?.[0]?.count || 0) : '••'} transações
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
                            {editingPayer ? 'Editar pagador' : 'Novo pagador'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPayer
                                ? 'Atualize as informações do pagador'
                                : 'Preencha as informações do pagador'}
                        </DialogDescription>
                    </DialogHeader>

                    <PayeeForm
                        type="payer"
                        payeeId={editingPayer?.id}
                        defaultValues={editingPayer ? {
                            name: editingPayer.name,
                        } : undefined}
                        onSuccess={() => {
                            onOpenChange(false);
                            fetchPayers();
                        }}
                        onCancel={() => onOpenChange(false)}
                        onDelete={editingPayer ? () => {
                            setDeletingId(editingPayer.id);
                            onOpenChange(false);
                            setIsDeleteDialogOpen(true);
                        } : undefined}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                            disabled={submitting}
                            variant="destructive"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
