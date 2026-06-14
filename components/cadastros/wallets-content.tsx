'use client';

import { useState, useEffect } from 'react';
import { HighlightText } from '@/components/ui/highlight-text';
import {
    Plus,
    Wallet as WalletIcon,
    UserRound,
    SearchX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
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
    Wallet,
    getWallets,
    deleteWallet,
} from '@/lib/supabase/cadastros';
import { WalletForm } from './wallet-form';
import { getIconByName } from './icon-picker';
import { getColorHex } from './color-picker';
import { ModuleCardsSkeleton } from '@/components/ui/skeletons';
import { useVisibility } from '@/hooks/use-visibility-state';

interface WalletsContentProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    searchQuery: string;
    onCountChange?: (count: number) => void;
}

export function WalletsContent({ isOpen, onOpenChange, searchQuery, onCountChange }: WalletsContentProps) {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { isVisible } = useVisibility();

    const filteredWallets = wallets.filter(wallet => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normalize(wallet.name).includes(normalize(searchQuery));
    });

    const fetchWallets = async () => {
        try {
            setLoading(true);
            const data = await getWallets();
            const sorted = [...data].sort((a, b) => {
                const aP = a.is_principal ? 1 : 0;
                const bP = b.is_principal ? 1 : 0;
                if (aP !== bP) return bP - aP;
                return a.name.localeCompare(b.name);
            });
            setWallets(sorted);
        } catch (error) {
            console.error('Erro ao carregar carteiras:', error);
            toast.error('Erro de carregamento', {
                description: 'Não foi possível carregar suas carteiras.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallets();
    }, []);

    useEffect(() => {
        onCountChange?.(wallets.length)
    }, [wallets])

    // Clear form when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setEditingWallet(null);
        }
    }, [isOpen]);

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            setSubmitting(true);
            await deleteWallet(deletingId);
            setWallets((prev) => prev.filter((w) => w.id !== deletingId));
            toast.success('Carteira excluída com sucesso!');
            setIsDeleteDialogOpen(false);
        } catch (error: any) {
            console.error('Erro ao excluir:', error);
            toast.error('Erro ao excluir a carteira.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {loading ? (
                <ModuleCardsSkeleton />
            ) : wallets.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={WalletIcon}
                    title="Nenhuma carteira cadastrada"
                    description="Crie carteiras para organizar suas finanças (Ex: NuBank, Itaú, Dinheiro)."
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
                    className="flex-1 border-border border-dashed"
                />
            ) : filteredWallets.length === 0 ? (
                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={SearchX}
                    title="Nenhuma carteira encontrada"
                    description="Tente novamente para encontrar o que está buscando"
                    className="flex-1 border-border border-dashed"
                />
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredWallets.map((wallet) => {
                        const Icon = getIconByName('dollar-sign');
                        const cardColor = getColorHex(wallet.color || 'zinc');

                        return (
                            <Card
                                key={wallet.id}
                                className="group cursor-pointer hover:bg-accent/50 transition-all duration-300 border-border relative overflow-hidden"
                                onClick={() => {
                                    setEditingWallet(wallet);
                                    onOpenChange(true);
                                }}
                            >
                                <div className="absolute top-4 right-4">
                                    {(wallet.icon === 'building-2' || wallet.icon === 'building') ? (
                                        <Badge variant="secondary" className="font-inter text-[10px] uppercase tracking-wider px-2 py-0 border bg-muted/80 backdrop-blur-sm shadow-sm">
                                            JURÍDICA
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="font-inter text-[10px] uppercase tracking-wider px-2 py-0 border bg-muted/80 backdrop-blur-sm shadow-sm">
                                            FÍSICA
                                        </Badge>
                                    )}
                                </div>

                                {wallet.is_principal && (
                                    <div className="absolute bottom-4 right-4">
                                        <Badge variant="secondary" className="font-inter text-[10px] uppercase tracking-wider px-2 py-0 border bg-muted/80 backdrop-blur-sm shadow-sm">
                                            Principal
                                        </Badge>
                                    </div>
                                )}
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0"
                                            style={{
                                                backgroundColor: cardColor,
                                            }}
                                        >
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate font-jakarta">
                                                <HighlightText text={wallet.name} highlight={searchQuery} />
                                            </h3>
                                            <p className="text-sm text-muted-foreground truncate font-inter">
                                                {isVisible ? (wallet.transactions?.[0]?.count || 0) : '••'} transações
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Dialog de Criação/Edição */}
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="font-jakarta">{editingWallet ? 'Editar carteira' : 'Nova carteira'}</DialogTitle>
                        <DialogDescription>
                            {editingWallet
                                ? 'Atualize as informações da carteira'
                                : 'Preencha as informações da carteira'}
                        </DialogDescription>
                    </DialogHeader>

                    <WalletForm
                        walletId={editingWallet?.id}
                        defaultValues={editingWallet ? {
                            name: editingWallet.name,
                            color: editingWallet.color,
                            icon: editingWallet.icon,
                            is_principal: editingWallet.is_principal
                        } : undefined}
                        onSuccess={() => {
                            onOpenChange(false);
                            fetchWallets();
                        }}
                        onCancel={() => onOpenChange(false)}
                        onDelete={editingWallet ? () => {
                            setDeletingId(editingWallet.id);
                            onOpenChange(false);
                            setIsDeleteDialogOpen(true);
                        } : undefined}
                    />
                </DialogContent>
            </Dialog>

            {/* Dialog de Exclusão */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                            disabled={submitting}
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
