'use client';

import { useState, useEffect } from 'react';
import { Plus, User, SearchX } from 'lucide-react';
import { HighlightText } from '@/components/ui/highlight-text';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
    Payee,
    getPayees,
    deletePayee,
} from '@/lib/supabase/cadastros';
import { PayeeForm } from './payee-form';
import { getIconByName } from './icon-picker';
import { getColorHex } from './color-picker';
import { ModuleCardsSkeleton } from '@/components/ui/skeletons';
import { useVisibility } from '@/hooks/use-visibility-state';

export interface PayeesContentProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    searchQuery: string;
    onCountChange?: (count: number) => void;
}

export function PayeesContent({ isOpen, onOpenChange, searchQuery, onCountChange }: PayeesContentProps) {
    const router = useRouter();
    const [payees, setPayees] = useState<Payee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingPayee, setEditingPayee] = useState<Payee | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { isVisible } = useVisibility();

    const filteredPayees = payees.filter(payee => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normalize(payee.name).includes(normalize(searchQuery));
    });

    const fetchPayees = async () => {
        setLoading(true);
        try {
            const data = await getPayees('favored');
            setPayees(data);
        } catch (error: any) {
            console.error('Erro ao carregar beneficiários:', error);
            if (error.message === 'Usuário não autenticado') {
                toast.error('Sessão expirada', {
                    description: 'Faça login novamente para continuar.'
                });
                router.push('/login');
            } else {
                toast.error('Erro de carregamento', {
                    description: 'Não foi possível carregar os beneficiários.'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayees();
    }, []);

    useEffect(() => {
        onCountChange?.(payees.length)
    }, [payees])

    useEffect(() => {
        if (!isOpen) {
            setEditingPayee(null);
        }
    }, [isOpen]);

    const handleDelete = async () => {
        if (!deletingId) return;

        setSubmitting(true);
        try {
            await deletePayee(deletingId);
            setPayees(prev => prev.filter(payee => payee.id !== deletingId));
            toast.success('Beneficiário excluído com sucesso!');
            setIsDeleteDialogOpen(false);
            setDeletingId(null);
        } catch (error: any) {
            if (error.message === 'Usuário não autenticado') {
                toast.error('Sessão expirada. Faça login novamente.');
                router.push('/login');
            } else {
                toast.error('Erro ao excluir beneficiário');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Content */}
            {loading ? (
                <ModuleCardsSkeleton />
            ) : payees.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={User}
                    title="Nenhum beneficiário cadastrado"
                    description="Adicione seu primeiro beneficiário para registrar suas despesas"
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
            ) : filteredPayees.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={SearchX}
                    title="Nenhum beneficiário encontrado"
                    description="Tente novamente para encontrar o que está buscando"
                    className="flex-1 border-border border-dashed"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPayees.map((payee) => {
                        const IconComponent = getIconByName('arrow-down-right');
                        const cardColor = getColorHex('red');

                        return (
                            <Card
                                key={payee.id}
                                className="hover:bg-accent/50 transition-all duration-300 cursor-pointer group border-border"
                                onClick={() => {
                                    setEditingPayee(payee);
                                    onOpenChange(true);
                                }}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: cardColor }}
                                        >
                                            <IconComponent className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate font-jakarta">
                                                <HighlightText text={payee.name} highlight={searchQuery} />
                                            </h3>
                                            <p className="text-sm text-muted-foreground font-inter truncate">
                                                {isVisible ? (payee.transactions?.[0]?.count || 0) : '••'} transações
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="font-jakarta">
                            {editingPayee ? 'Editar beneficiário' : 'Novo beneficiário'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPayee
                                ? 'Atualize as informações do beneficiário'
                                : 'Preencha as informações do beneficiário'}
                        </DialogDescription>
                    </DialogHeader>

                    <PayeeForm
                        type="favored"
                        payeeId={editingPayee?.id}
                        defaultValues={editingPayee ? {
                            name: editingPayee.name,
                        } : undefined}
                        onSuccess={() => {
                            onOpenChange(false);
                            fetchPayees();
                        }}
                        onCancel={() => onOpenChange(false)}
                        onDelete={editingPayee ? () => {
                            setDeletingId(editingPayee.id);
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
