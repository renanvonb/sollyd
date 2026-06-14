"use client"

import { useState, useEffect } from "react"
import { Category, Subcategory } from "@/types/entities"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { createSubcategory, updateSubcategory } from "@/lib/supabase/cadastros"
import { toast } from "sonner"
import { getIconByName } from "./icon-picker"
import { getColorClass } from "./color-picker"
import { cn } from "@/lib/utils"

interface SubcategoryDialogProps {
    category: Category | null
    subcategory?: Subcategory | null
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    onDelete?: () => void
}

export function SubcategoryDialog({
    category,
    subcategory,
    isOpen,
    onOpenChange,
    onSuccess,
    onDelete
}: SubcategoryDialogProps) {
    const [name, setName] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setName(subcategory?.name || "")
        }
    }, [isOpen, subcategory])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !category) return

        try {
            setSubmitting(true)

            if (subcategory) {
                await updateSubcategory(subcategory.id, {
                    name: name.trim()
                })
                toast.success("Subcategoria atualizada com sucesso!")
            } else {
                await createSubcategory({
                    category_id: category.id,
                    name: name.trim(),
                })
                toast.success("Subcategoria cadastrada com sucesso!")
            }

            setName("")
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            if (error?.code === '23505') {
                toast.error('Você já possui uma subcategoria com este nome. Por favor, escolha outro.');
            } else {
                toast.error("Erro ao salvar subcategoria")
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (!category) return null

    const Icon = getIconByName(category.icon || 'cart')
    const colorClass = getColorClass(category.color || 'zinc')

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="font-jakarta">
                        {subcategory ? 'Editar subcategoria' : 'Nova subcategoria'}
                    </DialogTitle>
                    <DialogDescription className="font-inter">
                        {subcategory
                            ? 'Atualize as informações da subcategoria'
                            : <>Adicione uma nova subcategoria de <span className="font-medium text-foreground">{category.name}</span></>
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Preview Badge idêntico ao CategoryForm */}
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border">
                        <div className={cn('rounded-full p-2', colorClass)}>
                            <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-foreground font-inter">
                            {name || 'Nome da subcategoria'}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name" className="font-jakarta">Nome <span className="text-red-600">*</span></Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Informe o nome da subcategoria"
                            className="font-inter"
                            autoComplete="off"
                        />
                    </div>

                    <div className={subcategory ? "flex justify-between gap-2 pt-4" : "flex justify-end gap-2 pt-4"}>
                        {subcategory && !subcategory.is_default && onDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onDelete}
                                disabled={submitting}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 font-inter"
                            >
                                Excluir
                            </Button>
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={submitting}
                                className="font-inter"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || !name.trim()}
                                className="font-inter"
                            >
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
