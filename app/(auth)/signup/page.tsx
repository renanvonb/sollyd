'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthSkeleton } from '@/components/ui/skeletons'

const signupSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string()
        .min(8, 'A senha deve ter pelo menos 8 caracteres')
        .regex(/[A-Z]/, 'Precisa de uma letra maiúscula')
        .regex(/[0-9]/, 'Precisa de um número'),
    confirmPassword: z.string().min(1, 'Confirme sua senha')
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
})

type SignupValues = z.infer<typeof signupSchema>

// Helper requirements for visual display
const passwordRequirements = [
    { regex: /.{8,}/, text: "Pelo menos 8 caracteres" },
    { regex: /[A-Z]/, text: "Uma letra maiúscula" },
    { regex: /[0-9]/, text: "Um número" },
]

export default function SignupPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const supabase = createClient()

    // Handle initial loading
    useEffect(() => {
        const timer = setTimeout(() => setInitialLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])


    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        mode: "onChange", // Enable real-time validation for visual feedback
    })

    const password = watch("password", "")

    async function onSubmit(data: SignupValues) {
        setLoading(true)
        setError(null)

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.name,
                    },
                },
            })

            if (signUpError) {
                setError(signUpError.message)
                setLoading(false)
                return
            }

            // Cadastro realizado com sucesso, redirecionar para dashboard
            router.push('/')
            router.refresh()
        } catch (err) {
            setError('Ocorreu um erro inesperado.')
            setLoading(false)
        }
    }

    if (initialLoading) {
        return <AuthSkeleton mode="signup" />
    }

    return (
        <div className="flex h-screen font-sans bg-zinc-50 overflow-hidden">
            {/* Left Column: Form (Signup Area - 60%) */}
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
                            Crie sua conta
                        </h1>
                        <p className="text-zinc-500 font-inter">
                            Preencha seus dados abaixo para começar
                        </p>
                        <Separator className="mt-[24px] mb-[24px] w-full opacity-50 bg-zinc-200" />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[360px] space-y-6">
                        {/* Name Field */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="name"
                                className={cn(
                                    "text-sm font-medium transition-colors text-zinc-900",
                                    errors.name && "text-red-600"
                                )}
                            >
                                Nome completo
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Informe seu nome completo"
                                className={cn(
                                    "h-11 rounded-lg border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                    errors.name && "border-red-600 focus-visible:ring-red-600"
                                )}
                                {...register('name')}
                                disabled={loading}
                            />
                        </div>

                        {/* Email Field */}
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

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="password"
                                className={cn(
                                    "text-sm font-medium transition-colors text-zinc-900",
                                    errors.password && "text-red-600"
                                )}
                            >
                                Senha
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Defina uma senha"
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
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Password Requirements List */}
                            <div className="space-y-1.5 pt-1">
                                {passwordRequirements.map((req, index) => {
                                    const isMet = req.regex.test(password)
                                    return (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className={cn(
                                                "h-1.5 w-1.5 rounded-full transition-colors",
                                                isMet ? "bg-emerald-500" : "bg-neutral-300"
                                            )} />
                                            <span className={cn(
                                                "text-xs transition-colors",
                                                isMet ? "text-emerald-600 font-medium" : "text-zinc-500"
                                            )}>
                                                {req.text}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="confirmPassword"
                                className={cn(
                                    "text-sm font-medium transition-colors text-zinc-900",
                                    errors.confirmPassword && "text-red-600"
                                )}
                            >
                                Confirmar senha
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirme sua senha"
                                    className={cn(
                                        "h-11 rounded-lg border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10",
                                        errors.confirmPassword && "border-red-600 focus-visible:ring-red-600"
                                    )}
                                    {...register('confirmPassword')}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-center">
                                <p className="text-sm text-red-600 font-medium">{error}</p>
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
                                        Criando conta...
                                    </>
                                ) : (
                                    'Criar conta'
                                )}
                            </Button>

                            <div className="text-center">
                                <p className="text-sm text-zinc-500">
                                    Já tem uma conta?{' '}
                                    <Link
                                        href="/login"
                                        className="font-semibold text-zinc-900 hover:underline transition-all"
                                    >
                                        Entrar
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
                            Comece sua<br />
                            jornada <span className="text-[#E0FE56]">financeira</span><br />
                            hoje mesmo
                        </h2>
                        <p className="text-lg text-neutral-400 mt-4 max-w-md">
                            Junte-se a milhares de usuários que já transformaram sua gestão financeira com a Sollyd.
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
