"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, parseISO, startOfMonth } from "date-fns"
import { Loader2 } from "lucide-react"
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
import { getCategories, getSubcategories, getWallets, getClassifications } from "@/app/actions/transaction-data"
import { getColorClass } from "@/components/cadastros/color-picker"
import { usePayees } from "@/hooks/usePayees"
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
    competence: z.date().optional(),
    status: z.enum(["Realizado", "Pendente"]).optional(),
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

    if (data.type === 'expense' || data.type === 'Despesa') {
        if (!data.payment_method) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Método é obrigatório",
                path: ["payment_method"],
            })
        }
        if (!data.classification_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Classificação é obrigatória",
                path: ["classification_id"],
            })
        }
        if (!data.category_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Categoria é obrigatória",
                path: ["category_id"],
            })
        }
        if (!data.subcategory_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Subcategoria é obrigatória",
                path: ["subcategory_id"],
            })
        }
    } else {
        if (!data.category_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Categoria é obrigatória",
                path: ["category_id"],
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
    const [subcategories, setSubcategories] = React.useState<Subcategory[]>([])
    const [wallets, setWallets] = React.useState<Wallet[]>([])
    const [classifications, setClassifications] = React.useState<Classification[]>([])

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema) as any,
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
            date: initialDate || new Date(),
            competence: startOfMonth(initialDate || new Date()),
            status: "Realizado",
        },
    })

    const type = form.watch("type")
    const selectedCategoryId = form.watch("category_id")
    const status = form.watch("status")
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

    // Sync subcategories
    React.useEffect(() => {
        if (selectedCategoryId) {
            getSubcategories(selectedCategoryId).then(setSubcategories)
        } else {
            setSubcategories([])
        }
    }, [selectedCategoryId])

    // Clear date when status is Pendente
    React.useEffect(() => {
        if (status === 'Pendente') {
            form.setValue('date', undefined as any)
        }
    }, [status])

    // Sync competence with date
    const watchedDate = form.watch("date")
    React.useEffect(() => {
        if (watchedDate) {
            form.setValue("competence", watchedDate)
        }
    }, [watchedDate])

    // Load initial data
    React.useEffect(() => {
        if (open) {
            const loadData = async () => {
                setIsLoadingData(true)
                try {
                    const [w, c, cl] = await Promise.all([
                        getWallets(),
                        getCategories(),
                        getClassifications(),
                    ])
                    setWallets(w)
                    setAllCategories(c)
                    setClassifications(cl)

                    if (transaction) {
                        const categoryId = transaction.category_id || ""
                        if (categoryId) {
                            const subs = await getSubcategories(categoryId)
                            setSubcategories(subs)
                        }

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
                            competence: transaction.competence ? parseISO(transaction.competence) : startOfMonth(new Date()),
                            status: transaction.status === 'Realizado' ? 'Realizado' : 'Pendente',
                        })
                    } else {
                        const principal = w.find(wallet => wallet.is_principal)
                        if (principal && !form.getValues("wallet_id")) {
                            form.setValue("wallet_id", principal.id)
                        }
                        if (initialDate) {
                            form.setValue("date", initialDate)
                            form.setValue("competence", startOfMonth(initialDate))
                        }
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
                    // Payload limpo - apenas campos validados
                    const payload = {
                        description: data.description,
                        amount: data.amount,
                        type: data.type,
                        wallet_id: data.wallet_id,
                        payee_id: data.payee_id || null,
                        payment_method: data.payment_method || null,
                        classification_id: data.classification_id || null,
                        category_id: data.category_id || null,
                        subcategory_id: data.subcategory_id || null,
                        date: data.status === 'Realizado' && data.date ? format(data.date, 'yyyy-MM-dd') : null,
                        competence: data.competence ? format(data.competence, 'yyyy-MM-01') : null,
                        status: data.status || 'Realizado',
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 gap-4">
                <Tabs
                    value={type}
                    onValueChange={(v) => form.setValue("type", v as any)}
                    className="w-full shrink-0"
                >
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="Despesa" disabled={isLoadingData}>
                            Despesa
                        </TabsTrigger>
                        <TabsTrigger value="Receita" disabled={isLoadingData}>
                            Receita
                        </TabsTrigger>
                        <TabsTrigger value="investment" disabled={true}>
                            Investimento
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-col gap-6 flex-1 overflow-y-auto min-h-0 scrollbar-hide p-1">
                    {isLoadingData ? (
                        <div className="flex flex-col gap-6">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full" />
                            </div>

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

                            {['expense', 'Despesa'].includes(transaction?.type || type) ? (
                                <>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-16" />
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-12" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </div>

                            <div className="flex flex-row items-center justify-between rounded-lg border p-4 space-y-0 mt-auto">
                                <div className="space-y-0.5">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-4 w-48 mt-1" />
                                </div>
                                <Skeleton className="h-6 w-10 rounded-full" />
                            </div>
                        </div>
                    ) : (
                        <>
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
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="wallet_id"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <RequiredLabel error={!!form.formState.errors.wallet_id}>Carteira</RequiredLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="font-inter w-full text-left font-normal cursor-pointer">
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {wallets.map(w => (
                                                        <SelectItem key={w.id} value={w.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("h-2.5 w-2.5 rounded-full", getColorClass(w.color || 'zinc'))} />
                                                                {w.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {(type === 'expense' || type === 'Despesa') ? (
                                <>
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
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
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
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="classification_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.classification_id}>Classificação</RequiredLabel>
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
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="category_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.category_id}>Categoria</RequiredLabel>
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
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="subcategory_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.subcategory_id}>Subcategoria</RequiredLabel>
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
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
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
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="category_id"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <RequiredLabel error={!!form.formState.errors.category_id}>Categoria</RequiredLabel>
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
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="competence"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2 flex flex-col">
                                            <FormLabel className={cn("text-muted-foreground", !!form.formState.errors.competence && "text-destructive")}>Competência</FormLabel>
                                            <FormControl>
                                                <MonthPicker
                                                    value={field.value}
                                                    onChange={(val) => {
                                                        field.onChange(val)
                                                        if (val) {
                                                            form.setValue("date", startOfMonth(val))
                                                        }
                                                    }}
                                                    className="w-full font-inter"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2 flex flex-col">
                                            <FormLabel className={cn("text-muted-foreground", !!form.formState.errors.date && "text-destructive")}>Data</FormLabel>
                                            <FormControl>
                                                <DatePicker
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    className="w-full font-inter"
                                                    disabled={status === 'Pendente'}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 space-y-0 mt-auto">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">
                                                {(type === 'expense' || type === 'Despesa') ? 'Pago' : 'Recebido'}
                                            </FormLabel>
                                            <p className="text-sm text-muted-foreground font-inter">
                                                {(type === 'expense' || type === 'Despesa')
                                                    ? 'Marcar como pagamento realizado'
                                                    : 'Marcar como pagamento recebido'}
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value === 'Realizado'}
                                                onCheckedChange={(checked) => field.onChange(checked ? 'Realizado' : 'Pendente')}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </>
                    )}
                </div>

                <div className="flex justify-between gap-3 pt-3 border-t border-border shrink-0">
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
                            disabled={isPending || isLoadingData}
                            className="font-inter"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {transaction?.id ? "Atualizar" : "Salvar"}
                        </Button>
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
