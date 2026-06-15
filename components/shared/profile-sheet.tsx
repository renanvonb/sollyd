"use client"

import { useState, useEffect } from "react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Camera, Loader2, Trash2, Lock, Sun, Moon, Monitor } from "lucide-react"
import { toast } from "sonner"
import { updateProfile } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "next-themes"

interface ProfileSheetProps {
    user: any
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function ProfileSheet({ user, isOpen, onOpenChange }: ProfileSheetProps) {
    const [fullName, setFullName] = useState("")
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const supabase = createClient()
    const { theme, setTheme } = useTheme()

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || "")
            setAvatarUrl(user.user_metadata?.avatar_url || null)
        }
    }, [user, isOpen])

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem muito grande", {
                description: "O tamanho máximo é 2MB."
            })
            return
        }

        try {
            setIsUploading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}.${fileExt}`
            const filePath = `${user.id}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                if (uploadError.message.includes('bucket not found')) {
                    toast.error("Erro de configuração", {
                        description: "O bucket 'avatars' não foi encontrado no Supabase."
                    })
                }
                throw uploadError
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setAvatarUrl(publicUrl)
            toast.success("Foto carregada!")
        } catch (error: any) {
            console.error('Error uploading avatar:', error)
            toast.error("Erro ao carregar foto")
        } finally {
            setIsUploading(false)
        }
    }

    const handleRemoveAvatar = () => {
        setAvatarUrl(null)
        toast.info("Foto removida da prévia")
    }

    const handleSave = async () => {
        try {
            setIsSaving(true)
            await updateProfile({
                full_name: fullName,
                avatar_url: avatarUrl
            })
            toast.success("Perfil atualizado com sucesso!")
            onOpenChange(false)
        } catch (error: any) {
            console.error('Error updating profile:', error)
            toast.error("Erro ao salvar perfil")
        } finally {
            setIsSaving(false)
        }
    }

    const initials = fullName
        ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : user?.email?.charAt(0).toUpperCase() || "U"

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md bg-background border-border flex flex-col h-full gap-6 p-6">
                <SheetHeader className="text-left">
                    <SheetTitle className="font-jakarta text-2xl font-bold">Perfil</SheetTitle>
                    <SheetDescription className="font-inter">
                        Gerencie suas informações
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    <Tabs defaultValue="dados" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="dados" className="font-inter text-sm">Dados cadastrais</TabsTrigger>
                            <TabsTrigger value="seguranca" className="font-inter text-sm" disabled>Segurança</TabsTrigger>
                        </TabsList>

                        <TabsContent value="dados" className="space-y-6 outline-none">
                            {/* Seção de Foto */}
                            <div className="w-full border border-border rounded-lg pt-4 pr-4 pl-6 pb-8 flex flex-col items-center gap-6 mb-8">
                                <div className="w-full flex items-center justify-between">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-inter">Foto de perfil</Label>

                                    <div className="flex items-center gap-1">
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-foreground"
                                                        asChild
                                                    >
                                                        <label className="cursor-pointer">
                                                            <Camera className="h-4 w-4" />
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={handleAvatarUpload}
                                                                disabled={isUploading}
                                                            />
                                                        </label>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="text-xs">Alterar foto</TooltipContent>
                                            </Tooltip>

                                            {avatarUrl && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={handleRemoveAvatar}
                                                            disabled={isUploading}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="text-xs">Remover foto</TooltipContent>
                                                </Tooltip>
                                            )}
                                        </TooltipProvider>
                                    </div>
                                </div>

                                <div className="relative group">
                                    <Avatar className="h-36 w-36 border-4 border-background ring-2 ring-border shadow-md">
                                        <AvatarImage src={avatarUrl || ""} className="object-cover" />
                                        <AvatarFallback className="bg-brand text-brand-foreground text-4xl font-bold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>

                                    {isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                                            <Loader2 className="h-10 w-10 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>



                            {/* Nome Completo */}
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-sm font-semibold text-foreground font-inter flex items-center gap-1">
                                    Nome completo
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Seu nome completo"
                                    className="bg-transparent border-border focus:ring-primary font-inter h-10"
                                    required
                                />
                            </div>

                            {/* Preferência de tema */}
                            <div className="space-y-2 pt-2">
                                <Label className="text-sm font-semibold text-foreground font-inter">
                                    Tema
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: "light", label: "Claro", icon: Sun },
                                        { value: "dark", label: "Escuro", icon: Moon },
                                        { value: "system", label: "Sistema", icon: Monitor },
                                    ].map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setTheme(value)}
                                            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium font-inter transition-colors ${
                                                theme === value
                                                    ? "border-primary bg-primary/10 text-foreground"
                                                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="seguranca" className="space-y-6 outline-none">
                            <div className="space-y-2 opacity-70">
                                <Label className="text-sm font-semibold text-foreground font-inter text-muted-foreground flex items-center gap-2">
                                    E-mail da conta
                                </Label>
                                <Input
                                    value={user?.email || ""}
                                    disabled
                                    className="bg-muted/50 border-border font-inter h-10 cursor-not-allowed"
                                />
                                <p className="text-[11px] text-muted-foreground italic px-0.5">O e-mail não pode ser alterado por aqui.</p>
                            </div>

                            <div className="space-y-2 opacity-50">
                                <Label className="text-sm font-semibold text-foreground font-inter flex items-center gap-2">
                                    <Lock className="h-3.5 w-3.5" />
                                    Alterar senha
                                </Label>
                                <Input
                                    type="password"
                                    value="********"
                                    disabled
                                    className="bg-muted/30 border-border font-inter h-10 cursor-not-allowed"
                                />
                                <p className="text-[11px] text-muted-foreground italic px-0.5">Funcionalidade disponível em breve.</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <SheetFooter className="flex sm:justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="font-inter"
                        disabled={isSaving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="font-inter font-semibold"
                        disabled={isSaving || isUploading || !fullName.trim()}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : "Salvar"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
