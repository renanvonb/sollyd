"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, parseISO, startOfMonth, addMonths, differenceInMonths, isSameMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Loader2, Repeat, X, CreditCard, CheckCircle2, FileText, Tag, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { MonthPicker } from "@/components/ui/month-picker"
import { MoneyInput } from "@/components/ui/money-input"
import { BudgetPreview } from "@/components/orcamentos/budget-preview"
import { currentYearMonth } from "@/lib/budget-utils"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { DatePicker } from "@/components/ui/date-picker"
import { saveTransaction, updateTransaction, deleteTransaction } from "@/app/actions/transactions"
import { getCategories, getAllSubcategories, getWallets, getClassifications } from "@/app/actions/transaction-data"
import { getColorClass } from "@/components/cadastros/color-picker"
import { usePayees } from "@/hooks/use-payees"
import type { Transaction, Wallet, Category, Classification, Subcategory } from "@/types/transaction"
import { toast } from "sonner"

// Schema limpo - apenas campos que existem no banco
const transactionBaseSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    amount: z.coerce.number().gt(0, "Valor deve ser maior que zero"),
    type: z.enum(["revenue", "expense", "Receita", "Despesa"]),
    wallet_id: z.string().min(1, "Carteira é obrigatória"),
    payee_id: z.string().optional(),
    payment_method: z.string().optional(),
    classification_id: z.string().optional(),
    category_id: z.string().optional(),
    subcategory_id: z.string().optional(),
    date: z.date().optional(),
    realized_at: z.date().optional(),
    competence: z.date().optional(),
    status: z.enum(["Realizado", "Pendente"]).optional(),
    repeat_mode: z.enum(["none", "recurring", "installment"]).optional().default("none"),
    repeat_start_month: z.date().optional(),
    repeat_end_month: z.date().optional(),
    installment_count: z.coerce.number().optional(),
})

type TransactionFormValues = z.infer<typeof transactionBaseSchema>

const transactionSchema = transactionBaseSchema.superRefine((data, ctx) => {
    // 1. Pagador / Beneficiário
    if (!data.payee_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: (data.type === 'revenue' || data.type === 'Receita') ? "Pagador é obrigatório" : "Beneficiário é obrigatório",
            path: ["payee_id"],
        })
    }

    // Método obrigatório apenas para despesa. Classificação/Categoria/Subcategoria são opcionais
    // (default "Sem ..." aplicado no submit).
    if (data.type === 'expense' || data.type === 'Despesa') {
        if (!data.payment_method) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Método é obrigatório",
                path: ["payment_method"],
            })
        }
    }

    // Recorrente: Mês inicial + Mês final (manuais)
    if (data.repeat_mode === "recurring") {
        if (!data.repeat_start_month) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Selecione o mês inicial",
                path: ["repeat_start_month"],
            })
        }
        if (!data.repeat_end_month) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Selecione o mês final",
                path: ["repeat_end_month"],
            })
        } else if (data.repeat_start_month && differenceInMonths(startOfMonth(data.repeat_end_month), startOfMonth(data.repeat_start_month)) < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Mês final deve ser ao menos 1 mês após o inicial",
                path: ["repeat_end_month"],
            })
        }
    }

    // Parcelamento: Qtd parcelas + Mês inicial (Mês final calculado)
    if (data.repeat_mode === "installment") {
        if (!data.installment_count || data.installment_count < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Mínimo de 2 parcelas",
                path: ["installment_count"],
            })
        }
        if (!data.repeat_start_month) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Selecione o mês inicial",
                path: ["repeat_start_month"],
            })
        }
    }
})

export interface TransactionFormProps {
    open?: boolean
    transaction?: Transaction | null
    defaultType?: "revenue" | "expense" | "investment"
    onSuccess?: () => void
    onCancel?: () => void
    initialDate?: Date
}

export function TransactionForm({ open, transaction, defaultType = "expense", onSuccess, onCancel, initialDate }: TransactionFormProps) {
    const [isPending, startTransition] = React.useTransition()
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

    const [isLoadingData, setIsLoadingData] = React.useState(false)

    const [allCategories, setAllCategories] = React.useState<Category[]>([])
    const [allSubcategoriesData, setAllSubcategoriesData] = React.useState<Subcategory[]>([])
    const [subcategories, setSubcategories] = React.useState<Subcategory[]>([])
    const [wallets, setWallets] = React.useState<Wallet[]>([])
    const [classifications, setClassifications] = React.useState<Classification[]>([])

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema) as any,
        mode: "onChange",
        defaultValues: {
            description: "",
            amount: 0,
            type: (defaultType === "investment" ? "Despesa" : (defaultType === "revenue" ? "Receita" : "Despesa")) as any,
            wallet_id: "",
            payee_id: "",
            payment_method: "",
            classification_id: "",
            category_id: "",
            subcategory_id: "",
            // Data pagamento/recebimento: hoje só se a competência for o mês atual; senão vazio.
            date: isSameMonth(startOfMonth(initialDate || new Date()), new Date()) ? new Date() : undefined,
            // Realizado em: opcional, vazio por default.
            realized_at: undefined,
            competence: startOfMonth(initialDate || new Date()),
            status: "Realizado",
            repeat_mode: "none",
            repeat_start_month: startOfMonth(initialDate || new Date()),
            repeat_end_month: undefined,
            installment_count: undefined,
        },
    })

    const type = form.watch("type")
    const selectedCategoryId = form.watch("category_id")
    const status = form.watch("status")
    const repeatMode = form.watch("repeat_mode")
    const competenceValue = form.watch("competence")
    const repeatMinDate = addMonths(startOfMonth(competenceValue || new Date()), 1)

    const repeatStart = form.watch("repeat_start_month")
    const repeatEnd = form.watch("repeat_end_month")
    const repeatEndMinDate = repeatStart ? addMonths(startOfMonth(repeatStart), 1) : repeatMinDate
    const installmentCount = form.watch("installment_count")
    const amountValue = form.watch("amount")

    // Parcelamento: Mês final = Mês inicial + (Qtd - 1)
    const installmentEnd = React.useMemo(() => {
        if (!repeatStart || !installmentCount || installmentCount < 1) return undefined
        return addMonths(startOfMonth(repeatStart), installmentCount - 1)
    }, [repeatStart, installmentCount])
    const installmentEndLabel = React.useMemo(() => {
        if (!installmentEnd) return ""
        return format(installmentEnd, "MMM/yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())
    }, [installmentEnd])

    // Mantém repeat_end_month sincronizado com o cálculo do parcelamento
    React.useEffect(() => {
        if (repeatMode !== 'installment') return
        const current = form.getValues("repeat_end_month")
        if (installmentEnd?.getTime() !== current?.getTime()) {
            form.setValue("repeat_end_month", installmentEnd, { shouldValidate: true })
        }
    }, [repeatMode, installmentEnd])

    const installmentSummary = React.useMemo(() => {
        if (!installmentCount || installmentCount < 1 || !amountValue || !installmentEnd) return null
        const perValue = amountValue / installmentCount
        const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(perValue)
        return `${installmentCount} ${installmentCount === 1 ? 'parcela' : 'parcelas'} de ${valor} mensais.`
    }, [installmentCount, amountValue, installmentEnd])
    const competenceLabel = competenceValue
        ? (() => { const s = format(competenceValue, "MMMM yyyy", { locale: ptBR }); return s.charAt(0).toUpperCase() + s.slice(1) })()
        : null
    const { payees } = usePayees(type)

    const filteredCategories = React.useMemo(() => {
        const targetType = (type === 'revenue' || type === 'Receita') ? 'Receita' : 'Despesa';
        return allCategories.filter(c => !c.type || c.type === targetType);
    }, [allCategories, type]);

    // Clear category if incompatible with type
    React.useEffect(() => {
        const currentCatId = form.getValues("category_id");
        if (currentCatId) {
            const cat = allCategories.find(c => c.id === currentCatId);
            const targetType = (type === 'revenue' || type === 'Receita') ? 'Receita' : 'Despesa';
            if (cat && cat.type && cat.type !== targetType) {
                form.setValue("category_id", "");
                form.setValue("subcategory_id", "");
            }
        }
    }, [type, allCategories, form]);

    // Sync subcategories from in-memory data — no server fetch, auto-select default
    React.useEffect(() => {
        if (!selectedCategoryId) {
            setSubcategories([])
            return
        }
        const subs = allSubcategoriesData.filter(s => s.category_id === selectedCategoryId)
        setSubcategories(subs)
        // Subcategoria não é auto-preenchida; limpa se incompatível com a categoria atual.
        const currentSubId = form.getValues("subcategory_id")
        if (currentSubId && !subs.some(s => s.id === currentSubId)) {
            form.setValue("subcategory_id", "", { shouldValidate: true })
        }
    }, [selectedCategoryId, allSubcategoriesData])

    // Clear date when status is Pendente
    React.useEffect(() => {
        if (status === 'Pendente') {
            form.setValue('date', undefined as any)
        }
    }, [status])

    const watchedDate = form.watch("date")

    // Load initial data
    React.useEffect(() => {
        if (open) {
            const loadData = async () => {
                setIsLoadingData(true)
                try {
                    const [w, c, cl, allSubs] = await Promise.all([
                        getWallets(),
                        getCategories(),
                        getClassifications(),
                        getAllSubcategories(),
                    ])
                    setWallets(w)
                    setAllCategories(c)
                    setClassifications(cl)
                    setAllSubcategoriesData(allSubs)

                    if (transaction) {
                        form.reset({
                            description: transaction.description,
                            amount: transaction.amount,
                            type: transaction.type,
                            wallet_id: transaction.wallet_id || "",
                            payee_id: transaction.payee_id || transaction.payer_id || "",
                            payment_method: transaction.payment_method || "",
                            classification_id: transaction.classification_id || "",
                            category_id: transaction.category_id || "",
                            subcategory_id: transaction.subcategory_id || "",
                            date: transaction.date ? parseISO(transaction.date) : new Date(),
                            realized_at: (transaction as any).realized_at ? parseISO((transaction as any).realized_at) : undefined,
                            competence: transaction.competence ? parseISO(transaction.competence) : startOfMonth(new Date()),
                            status: transaction.status === 'Realizado' ? 'Realizado' : 'Pendente',
                        })
                    } else {
                        const principal = w.find(wallet => wallet.is_principal)
                        if (principal && !form.getValues("wallet_id")) {
                            form.setValue("wallet_id", principal.id, { shouldValidate: true })
                        }
                        if (initialDate) {
                            form.setValue("competence", startOfMonth(initialDate))
                            // Hoje pré-selecionado só quando a competência é o mês corrente.
                            form.setValue("date", isSameMonth(startOfMonth(initialDate), new Date()) ? new Date() : undefined)
                        }
                        // Classificação/Categoria/Subcategoria ficam vazias (opcionais).
                        // No submit, vazio → defaults "Sem ..." (is_default).
                    }
                } finally {
                    setIsLoadingData(false)
                }
            }
            loadData()
        } else {
            form.reset()
        }
    }, [open, transaction])

    const onSubmit = async (data: TransactionFormValues) => {
        startTransition(() => {
            const run = async () => {
                try {
                    // Classificação opcional: fallback para defaults "Sem ..." (is_default) quando vazio.
                    const targetType = (data.type === 'revenue' || data.type === 'Receita') ? 'Receita' : 'Despesa'
                    const defClassification = classifications.find(x => x.is_default)
                    const defCategory = allCategories.find(x => x.is_default && x.type === targetType)
                    const resolvedClassificationId = data.classification_id || defClassification?.id || null
                    const resolvedCategoryId = data.category_id || defCategory?.id || null
                    const defSubcategory = resolvedCategoryId
                        ? allSubcategoriesData.find(s => s.is_default && s.category_id === resolvedCategoryId)
                        : undefined
                    const resolvedSubcategoryId = data.subcategory_id || defSubcategory?.id || null

                    // Ocorrências: recorrente = meses entre início/fim; parcelamento = qtd parcelas
                    const isRepeat = !transaction && data.repeat_mode !== 'none'
                    const occurrences = !isRepeat
                        ? undefined
                        : data.repeat_mode === 'installment'
                            ? data.installment_count
                            : (data.repeat_start_month && data.repeat_end_month
                                ? differenceInMonths(startOfMonth(data.repeat_end_month), startOfMonth(data.repeat_start_month)) + 1
                                : undefined)

                    const payload = {
                        description: data.description,
                        amount: data.amount,
                        type: data.type,
                        wallet_id: data.wallet_id,
                        payee_id: data.payee_id || null,
                        payment_method: data.payment_method || null,
                        classification_id: resolvedClassificationId,
                        category_id: resolvedCategoryId,
                        subcategory_id: resolvedSubcategoryId,
                        date: data.status === 'Realizado' && data.date ? format(data.date, 'yyyy-MM-dd') : null,
                        realized_at: data.realized_at ? format(data.realized_at, 'yyyy-MM-dd') : null,
                        competence: (isRepeat && data.repeat_start_month)
                            ? format(startOfMonth(data.repeat_start_month), 'yyyy-MM-01')
                            : (data.competence ? format(data.competence, 'yyyy-MM-01') : null),
                        status: data.status || 'Realizado',
                        is_recurring: !transaction && data.repeat_mode === 'recurring' ? true : undefined,
                        is_installment: !transaction && data.repeat_mode === 'installment' ? true : undefined,
                        recurring_frequency: isRepeat ? 'monthly' : undefined,
                        recurring_occurrences: occurrences,
                    }

                    const isEditMode = !!transaction?.id
                    const result = isEditMode
                        ? await updateTransaction(transaction.id, payload)
                        : await saveTransaction(payload)

                    if (result.success) {
                        toast.success(isEditMode ? "Transação atualizada com sucesso!" : "Transação registrada com sucesso!")
                        form.reset()
                        if (onSuccess) onSuccess()
                    } else {
                        const errorMsg = result.error || "Erro ao salvar transação"
                        if (errorMsg.includes("check_competence_is_first_day") || (errorMsg.includes("check constraint") && errorMsg.includes("competence"))) {
                            console.error("[TransactionForm] DB Constraint Violation:", errorMsg)
                            toast.error("Erro de validação: Data de competência inválida.", {
                                description: "A competência deve ser sempre o primeiro dia do mês (ex: 01/04/2026). O sistema tentou corrigir mas foi rejeitado pelo banco."
                            })
                        } else {
                            toast.error(errorMsg)
                        }
                    }
                } catch (error) {
                    console.error(error)
                    toast.error("Erro inesperado ao processar transação")
                }
            }
            run()
        })
    }

    const handleDelete = async () => {
        if (!transaction?.id) return
        startTransition(async () => {
            const result = await deleteTransaction(transaction.id)
            if (result.success) {
                toast.success("Transação excluída com sucesso!")
                if (onSuccess) onSuccess()
            } else {
                toast.error(result.error || "Erro ao excluir transação")
            }
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                <div className="flex flex-col gap-6 px-6 pt-6 pb-0 shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-foreground font-jakarta leading-none">
                            {`${transaction?.id ? 'Editar' : 'Nova'} ${(type === 'expense' || type === 'Despesa') ? 'despesa' : 'receita'}`}
                        </h2>
                        {competenceLabel && (
                            <Badge
                                className={cn(
                                    "font-inter font-normal border-transparent",
                                    (type === 'expense' || type === 'Despesa')
                                        ? "bg-red-500/15 text-red-600 hover:bg-red-500/15"
                                        : "bg-green-500/15 text-green-600 hover:bg-green-500/15"
                                )}
                            >
                                {competenceLabel}
                            </Badge>
                        )}
                    </div>
                    {!transaction?.id && (
                        <div className="flex rounded-md border border-input overflow-hidden shrink-0">
                            <button
                                type="button"
                                onClick={() => form.setValue("type", "Despesa" as any)}
                                className={cn(
                                    "flex-1 h-9 text-sm font-medium font-inter transition-colors",
                                    (type === 'Despesa' || type === 'expense')
                                        ? "bg-accent text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                            >
                                Despesa
                            </button>
                            <button
                                type="button"
                                onClick={() => form.setValue("type", "Receita" as any)}
                                className={cn(
                                    "flex-1 h-9 text-sm font-medium font-inter transition-colors border-l border-input",
                                    (type === 'Receita' || type === 'revenue')
                                        ? "bg-accent text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                            >
                                Receita
                            </button>
                        </div>
                    )}
                    <div className="border-t border-border" />
                </div>

                <div className="flex flex-col gap-5 flex-1 overflow-y-auto min-h-0 scrollbar-hide px-6 pt-6">
                    {isLoadingData ? (
                        <div className="flex flex-col gap-5">
                            {/* Detalhes */}
                            <Skeleton className="h-4 w-24" />

                            {/* Descrição */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full" />
                            </div>

                            {['expense', 'Despesa'].includes(transaction?.type || type) ? (
                                <>
                                    {/* Valor | Método */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-12" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    </div>
                                    {/* Conta | Beneficiário */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-14" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Valor */}
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-12" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                    {/* Conta | Pagador */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-14" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Realizado em */}
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>

                            <div className="border-t border-border" />

                            {/* Classificação */}
                            <Skeleton className="h-4 w-28" />

                            {['expense', 'Despesa'].includes(transaction?.type || type) ? (
                                <>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <span className="text-sm font-semibold text-foreground font-jakarta flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Detalhes
                            </span>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <RequiredLabel error={!!form.formState.errors.description}>Descrição</RequiredLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                autoFocus
                                                placeholder="Informe uma descrição"
                                                className="font-inter"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {(type === 'expense' || type === 'Despesa') ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="amount"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.amount}>Valor</RequiredLabel>
                                                    <FormControl>
                                                        <MoneyInput
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            placeholder="R$ 0,00"
                                                            className="font-inter"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="payment_method"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.payment_method}>Método</RequiredLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="font-inter w-full text-left font-normal cursor-pointer">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {["Boleto", "Crédito", "Débito", "Pix", "Dinheiro"].map(m => (
                                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <WalletSelect form={form} wallets={wallets} />
                                        <FormField
                                            control={form.control}
                                            name="payee_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.payee_id}>Beneficiário</RequiredLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="font-inter w-full text-left font-normal cursor-pointer">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="max-h-[250px]">
                                                            {payees.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <RequiredLabel error={!!form.formState.errors.amount}>Valor</RequiredLabel>
                                                <FormControl>
                                                    <MoneyInput
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        placeholder="R$ 0,00"
                                                        className="font-inter"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <WalletSelect form={form} wallets={wallets} />
                                        <FormField
                                            control={form.control}
                                            name="payee_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.payee_id}>Pagador</RequiredLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="font-inter w-full text-left font-normal cursor-pointer">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="max-h-[250px]">
                                                            {payees.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </>
                            )}

                            <FormField
                                control={form.control}
                                name="realized_at"
                                render={({ field }) => (
                                    <FormItem className="space-y-2 flex flex-col">
                                        <FormLabel className="text-muted-foreground">Realizado em</FormLabel>
                                        <FormControl>
                                            <DatePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                                className="w-full font-inter"
                                                clearable
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <div className="border-t border-border" />

                            <span className="text-sm font-semibold text-foreground font-jakarta flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Classificação
                            </span>

                            {(type === 'expense' || type === 'Despesa') ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="classification_id"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-muted-foreground">Classificação</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="font-inter w-full text-left font-normal cursor-pointer">
                                                            <SelectValue placeholder="Selecione" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {classifications.map(c => (
                                                            <SelectItem key={c.id} value={c.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn("h-2.5 w-2.5 rounded-full", getColorClass(c.color || 'zinc'))} />
                                                                    {c.name}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="category_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <FormLabel className="text-muted-foreground">Categoria</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="font-inter w-full text-left font-normal cursor-pointer">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {filteredCategories.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={cn("h-2.5 w-2.5 rounded-full", getColorClass(c.color || 'zinc'))} />
                                                                        {c.name}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="subcategory_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <FormLabel className="text-muted-foreground">Subcategoria</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        disabled={!selectedCategoryId}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="font-inter w-full text-left font-normal cursor-pointer">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {subcategories.map(s => (
                                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    {selectedCategoryId && (
                                        <BudgetPreview
                                            categoryId={selectedCategoryId}
                                            subcategoryId={form.watch("subcategory_id") || null}
                                            yearMonth={competenceValue ? format(competenceValue, "yyyy-MM") : currentYearMonth()}
                                            pendingAmount={amountValue}
                                        />
                                    )}
                                </>
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="category_id"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-muted-foreground">Categoria</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="font-inter w-full text-left font-normal cursor-pointer">
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {filteredCategories.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("h-2.5 w-2.5 rounded-full", getColorClass(c.color || 'zinc'))} />
                                                                {c.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            </FormItem>
                                    )}
                                />
                            )}

                            {!transaction && (
                                <>
                                    <div className="border-t border-border" />

                                    <FormField
                                        control={form.control}
                                        name="repeat_mode"
                                        render={({ field }) => (
                                            <FormItem className="space-y-4">
                                                <div className="flex flex-row items-center justify-between">
                                                    <FormLabel className={cn("text-sm font-semibold font-jakarta flex items-center gap-2", field.value !== 'recurring' && "text-muted-foreground opacity-60")}>
                                                        <Repeat className="h-4 w-4" />
                                                        Recorrente
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Switch
                                                            size="sm"
                                                            className="data-[state=checked]:bg-brand"
                                                            checked={field.value === 'recurring'}
                                                            onCheckedChange={(checked) => {
                                                                field.onChange(checked ? 'recurring' : 'none')
                                                                if (!checked) form.setValue('repeat_end_month', undefined)
                                                            }}
                                                        />
                                                    </FormControl>
                                                </div>
                                {field.value === 'recurring' && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <FormField
                                                            control={form.control}
                                                            name="repeat_start_month"
                                                            render={({ field: sf }) => (
                                                                <FormItem className="space-y-2 flex flex-col">
                                                                    <RequiredLabel error={!!form.formState.errors.repeat_start_month}>Mês inicial</RequiredLabel>
                                                                    <FormControl>
                                                                        <MonthPicker
                                                                            value={sf.value}
                                                                            onChange={sf.onChange}
                                                                            placeholder="Mês inicial"
                                                                            className="w-full font-inter"
                                                                        />
                                                                    </FormControl>
                                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name="repeat_end_month"
                                                            render={({ field: ef }) => (
                                                                <FormItem className="space-y-2 flex flex-col">
                                                                    <RequiredLabel error={!!form.formState.errors.repeat_end_month}>Mês final</RequiredLabel>
                                                                    <FormControl>
                                                                        <MonthPicker
                                                                            value={ef.value}
                                                                            onChange={ef.onChange}
                                                                            minDate={repeatEndMinDate}
                                                                            placeholder="Mês final"
                                                                            className="w-full font-inter"
                                                                        />
                                                                    </FormControl>
                                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                )}
                                            </FormItem>
                                        )}
                                    />

                                    <div className="border-t border-border" />

                                    <FormField
                                        control={form.control}
                                        name="repeat_mode"
                                        render={({ field }) => (
                                            <FormItem className="space-y-4">
                                                <div className="flex flex-row items-center justify-between">
                                                    <FormLabel className={cn("text-sm font-semibold font-jakarta flex items-center gap-2", field.value !== 'installment' && "text-muted-foreground opacity-60")}>
                                                        <CreditCard className="h-4 w-4" />
                                                        Parcelamento
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Switch
                                                            size="sm"
                                                            className="data-[state=checked]:bg-brand"
                                                            checked={field.value === 'installment'}
                                                            onCheckedChange={(checked) => {
                                                                field.onChange(checked ? 'installment' : 'none')
                                                                if (!checked) form.setValue('repeat_end_month', undefined)
                                                            }}
                                                        />
                                                    </FormControl>
                                                </div>
                                                {field.value === 'installment' && (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <FormField
                                                                control={form.control}
                                                                name="installment_count"
                                                                render={({ field: cf }) => (
                                                                    <FormItem className="space-y-2 flex flex-col">
                                                                        <RequiredLabel error={!!form.formState.errors.installment_count}>Qtd parcelas</RequiredLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="text"
                                                                                inputMode="numeric"
                                                                                placeholder="Ex: 12"
                                                                                className="font-inter"
                                                                                value={cf.value ?? ""}
                                                                                onChange={(e) => {
                                                                                    const digits = e.target.value.replace(/\D/g, "")
                                                                                    cf.onChange(digits === "" ? undefined : Number(digits))
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                                        </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name="repeat_start_month"
                                                                render={({ field: sf }) => (
                                                                    <FormItem className="space-y-2 flex flex-col">
                                                                        <RequiredLabel error={!!form.formState.errors.repeat_start_month}>Mês inicial</RequiredLabel>
                                                                        <FormControl>
                                                                            <MonthPicker
                                                                                value={sf.value}
                                                                                onChange={sf.onChange}
                                                                                placeholder="Mês inicial"
                                                                                className="w-full font-inter"
                                                                            />
                                                                        </FormControl>
                                                                                        </FormItem>
                                                                )}
                                                            />
                                                            <FormItem className="space-y-2 flex flex-col">
                                                                <FormLabel className="text-muted-foreground">Mês final</FormLabel>
                                                                <Input
                                                                    readOnly
                                                                    disabled
                                                                    value={installmentEndLabel}
                                                                    placeholder="—"
                                                                    className="font-inter"
                                                                />
                                                            </FormItem>
                                                        </div>
                                                        {installmentSummary && (
                                                            <p className="text-sm text-muted-foreground font-inter">
                                                                {installmentSummary}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                        </>
                    )}
                </div>

                <div className="shrink-0 flex flex-col gap-6 px-6 pt-6 pb-6">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem className={cn(
                                "rounded-lg border border-input p-4 space-y-4",
                                field.value === 'Realizado' && "bg-gradient-to-t from-brand/10 to-transparent"
                            )}>
                                <div className="flex flex-row items-center justify-between">
                                    <FormLabel className="text-sm flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {(type === 'expense' || type === 'Despesa') ? 'Marcar como pago' : 'Marcar como recebido'}
                                    </FormLabel>
                                    <FormControl>
                                        <Switch
                                            size="sm"
                                            className="data-[state=checked]:bg-brand"
                                            checked={field.value === 'Realizado'}
                                            onCheckedChange={(checked) => field.onChange(checked ? 'Realizado' : 'Pendente')}
                                        />
                                    </FormControl>
                                </div>
                                {field.value === 'Realizado' && (
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field: df }) => (
                                            <FormItem className="flex flex-col">
                                                <FormControl>
                                                    <DatePicker
                                                        value={df.value}
                                                        onChange={df.onChange}
                                                        className="w-full font-inter"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-between gap-3">
                        {transaction?.id && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={isPending || isLoadingData}
                                className="text-red-600 hover:text-red-700 hover:bg-destructive/10 font-inter"
                            >
                                Excluir
                            </Button>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isPending}
                                className="font-inter"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending || isLoadingData || !form.formState.isValid}
                                className="font-inter"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {transaction?.id ? "Atualizar" : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
        </Form>
    )
}

function RequiredLabel({ children, error }: { children: React.ReactNode; error?: boolean }) {
    return (
        <FormLabel className={cn("text-muted-foreground flex items-center gap-0.5", error && "text-destructive")}>
            {children}
            <span className={cn("ml-0.5", error ? "text-destructive" : "text-destructive")}>*</span>
        </FormLabel>
    )
}

function WalletSelect({ form, wallets }: { form: any; wallets: Wallet[] }) {
    return (
        <FormField
            control={form.control}
            name="wallet_id"
            render={({ field }: any) => (
                <FormItem className="space-y-2">
                    <RequiredLabel error={!!form.formState.errors.wallet_id}>Conta</RequiredLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger className="font-inter w-full text-left font-normal cursor-pointer">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[250px]">
                            {wallets.slice().sort((a, b) => Number(!!b.is_principal) - Number(!!a.is_principal)).map(w => (
                                <SelectItem key={w.id} value={w.id}>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-2.5 w-2.5 rounded-full", getColorClass(w.color || 'zinc'))} />
                                        {w.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormItem>
            )}
        />
    )
}
