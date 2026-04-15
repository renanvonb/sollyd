'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthSkeleton } from '@/components/ui/skeletons'
import { Checkbox } from '@/components/ui/checkbox'

const loginSchema = z.object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    rememberMe: z.boolean().optional(),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const supabase = createClient()

    // Handle initial loading
    useEffect(() => {
        const timer = setTimeout(() => setInitialLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])


    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false,
        },
    })

    async function onSubmit(data: LoginValues) {
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (error) {
                setError('E-mail ou senha incorretos.')
                setLoading(false)
                return
            }

            router.push('/')
            router.refresh()
        } catch (err) {
            setError('Ocorreu um erro inesperado.')
            setLoading(false)
        }
    }

    if (initialLoading) {
        return <AuthSkeleton mode="login" />
    }

    return (
        <div className="flex h-screen font-sans bg-zinc-50 overflow-hidden">
            {/* Left Column: Form (Login Area - 60%) */}
            <div className="flex-1 md:w-[60%] md:flex-none flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white relative">
                <div className="w-full flex flex-col items-center">
                    <div className="w-full max-w-[360px] flex flex-col items-center text-center">
                        {/* Brand Symbol Block */}
                        <div className="bg-[#E0FE56] rounded-xl p-3 mb-4 h-12 w-12 flex items-center justify-center">
                            <div className="relative h-6 w-6">
                                <Image
                                    src="/brand/symbol.png"
                                    alt="Sollyd"
                                    fill
                                    className="object-contain"
                                    style={{
                                        filter: 'brightness(0) saturate(100%) invert(4%) sepia(8%) saturate(2456%) hue-rotate(202deg) brightness(96%) contrast(94%)'
                                    }}
                                />
                            </div>
                        </div>
                        <h1 className="text-2xl font-semibold md:font-bold tracking-tight text-zinc-950 font-jakarta mb-2">
                            Bem-vindo!
                        </h1>
                        <p className="text-zinc-500 font-inter">
                            Insira suas credenciais abaixo.
                        </p>
                        <Separator className="mt-[24px] mb-[24px] w-full opacity-50 bg-zinc-200" />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[360px] space-y-6">
                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className={cn(
                                    "text-sm font-medium transition-colors text-zinc-900",
                                    errors.email && "text-red-600"
                                )}
                            >
                                E-mail
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Informe seu e-mail"
                                className={cn(
                                    "h-11 rounded-lg border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                    errors.email && "border-red-600 focus-visible:ring-red-600"
                                )}
                                {...register('email')}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label
                                    htmlFor="password"
                                    className={cn(
                                        "text-sm font-medium transition-colors",
                                        errors.password && "text-destructive"
                                    )}
                                >
                                    Senha
                                </Label>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Insira sua senha"
                                    className={cn(
                                        "h-11 rounded-lg border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10",
                                        errors.password && "border-red-600 focus-visible:ring-red-600"
                                    )}
                                    {...register('password')}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Manter conectado + Esqueci minha senha */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="rememberMe"
                                    className="border-zinc-300 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 data-[state=checked]:text-white"
                                    {...register('rememberMe')}
                                    disabled={loading}
                                />
                                <label
                                    htmlFor="rememberMe"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-zinc-700"
                                >
                                    Manter conectado
                                </label>
                            </div>
                            <Link
                                href="/forgot-password"
                                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:underline transition-all whitespace-nowrap"
                            >
                                Esqueci minha senha
                            </Link>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20 text-center">
                                <p className="text-sm text-destructive font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-5">
                            <Button
                                type="submit"
                                className="w-full h-11 rounded-lg font-semibold shadow-sm transition-all active:scale-[0.98] bg-zinc-950 text-white hover:bg-zinc-800"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    'Entrar'
                                )}
                            </Button>

                            <div className="text-center">
                                <p className="text-sm text-zinc-500">
                                    Não tem uma conta?{' '}
                                    <Link
                                        href="/signup"
                                        className="font-semibold text-zinc-900 hover:underline transition-all"
                                    >
                                        Crie agora
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

            </div>

            {/* Right Column: Branding Area (40%) */}
            <div className="hidden md:flex md:flex-col md:w-[40%] relative m-4 rounded-[16px] overflow-hidden bg-neutral-950">
                {/* Brand Logo in top-left */}
                <div className="absolute top-8 left-8 z-20">
                    <span className="text-2xl font-bold font-jakarta tracking-tight text-white">Sollyd</span>
                </div>

                {/* Content Area - Filling space and aligning bottom */}
                <div className="flex-1 flex flex-col justify-end px-8 pb-8 z-10 relative">
                    <div className="mb-12">
                        <h2 className="text-[40px] font-bold tracking-tight leading-tight text-white font-jakarta">
                            Gestão financeira<br />
                            <span className="text-[#E0FE56]">inteligente</span> para um<br />
                            futuro sólido
                        </h2>
                        <p className="text-lg text-neutral-400 mt-4 max-w-md">
                            Monitore seu presente e planeje seu futuro com inteligência de dados e gestão em tempo real.
                        </p>
                    </div>

                    {/* Footer Info inside the flow */}
                    <div>
                        <p className="font-inter text-[14px] text-neutral-500 font-medium">
                            © 2026 Sollyd. Todos os direitos reservados
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
