"use client"

import * as React from "react"
import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, startOfMonth, parseISO } from "date-fns"
import { Loader2, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { MoneyInput } from "@/components/ui/money-input"
import { DatePicker } from "@/components/ui/date-picker"
import { MonthPicker } from "@/components/ui/month-picker"
import { cn } from "@/lib/utils"

import { saveTransaction, updateTransaction } from "@/app/actions/transactions"
import {
    getWallets,
    getCategories,
    getClassifications,
    getSubcategories
} from "@/app/actions/transaction-data"
import { getColorClass } from "@/components/cadastros/color-picker"
import { usePayees } from "@/hooks/use-payees"
import { Wallet, Category, Classification, Subcategory } from "@/types/transaction"

const transactionSchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória"),
    amount: z.coerce.number().gt(0, "Valor deve ser maior que zero"),
    type: z.enum(["revenue", "expense"]),
    wallet_id: z.string().min(1, "Carteira é obrigatória"),
    payee_id: z.string().optional(), // Usado para Beneficiário (Despesa) e Pagador (Receita)
    payment_method: z.string().optional(),
    classification_id: z.string().optional(),
    category_id: z.string().optional(),
    subcategory_id: z.string().optional(),
    date: z.date().optional(),
    competence: z.date().optional(),
    status: z.enum(["Realizado", "Pendente"]).optional(),
}).superRefine((data, ctx) => {
    // Validação de Pagador/Beneficiário
    if (!data.payee_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: data.type === 'revenue' ? "Pagador é obrigatório" : "Beneficiário é obrigatório",
            path: ["payee_id"],
        })
    }

    // Categoria é obrigatória para ambos
    if (!data.category_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Categoria é obrigatória",
            path: ["category_id"],
        })
    }

    // Validações específicas para Despesa
    if (data.type === 'expense') {
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
        if (!data.subcategory_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Subcategoria é obrigatória",
                path: ["subcategory_id"],
            })
        }
    }
})

type TransactionFormValues = z.infer<typeof transactionSchema>

interface TransactionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction?: any | null
    defaultType?: "revenue" | "expense" | "investment"
    onSuccess?: () => void
}

export function TransactionDialog({
    open,
    onOpenChange,
    transaction,
    defaultType = "expense",
    onSuccess,
}: TransactionDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [wallets, setWallets] = React.useState<Wallet[]>([])
    const [categories, setCategories] = React.useState<Category[]>([])
    const [classifications, setClassifications] = React.useState<Classification[]>([])
    const [subcategories, setSubcategories] = React.useState<Subcategory[]>([])
    const [dataLoaded, setDataLoaded] = React.useState(false)

    const isEditMode = !!transaction

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema) as any,
        defaultValues: {
            description: "",
            amount: 0,
            type: (defaultType === "investment" ? "expense" : defaultType) as any,
            wallet_id: "",
            payee_id: "",
            payment_method: "",
            classification_id: "",
            category_id: "",
            subcategory_id: "",
            date: new Date(),
            competence: startOfMonth(new Date()),
            status: "Pendente",
        },
    })

    const type = form.watch("type")
    const selectedCategoryId = form.watch("category_id")
    const { payees } = usePayees(type)

    // Sincronizar subcategorias quando a categoria mudar
    React.useEffect(() => {
        if (selectedCategoryId) {
            getSubcategories(selectedCategoryId).then(setSubcategories)
        } else {
            setSubcategories([])
        }
    }, [selectedCategoryId])

    // Carregar dados iniciais e dados da transação se em modo edição
    // Carregar dados iniciais e dados da transação se em modo edição
    React.useEffect(() => {
        if (open) {
            const loadData = async () => {
                let currentWallets = wallets

                if (!dataLoaded) {
                    const [w, c, cl] = await Promise.all([
                        getWallets(),
                        getCategories(),
                        getClassifications(),
                    ])
                    setWallets(w)
                    setCategories(c)
                    setClassifications(cl)
                    setDataLoaded(true)
                    currentWallets = w
                }

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
                    // Novo: Selecionar carteira principal se existir
                    const principal = currentWallets.find(wallet => wallet.is_principal)
                    if (principal && !form.getValues("wallet_id")) {
                        form.setValue("wallet_id", principal.id)
                    }
                }
            }
            loadData()
        } else {
            form.reset()
        }
    }, [open, transaction, form])

    const onSubmit = async (data: TransactionFormValues) => {
        startTransition(() => {
            const run = async () => {
                try {
                    // Formatar datas para o formato esperado pelo Supabase (YYYY-MM-DD)
                    const payload = {
                        ...data,
                        date: data.date ? format(data.date, 'yyyy-MM-dd') : null,
                        competence: data.competence ? format(data.competence, 'yyyy-MM-dd') : null,
                    }

                    const result = isEditMode && transaction?.id
                        ? await updateTransaction(transaction.id, payload)
                        : await saveTransaction(payload)

                    if (result.success) {
                        toast.success(isEditMode ? "Transação atualizada!" : "Transação registrada com sucesso!")
                        form.reset()
                        onOpenChange(false)
                        if (onSuccess) onSuccess()
                    } else {
                        toast.error(result.error || "Erro ao salvar transação")
                    }
                } catch (error) {
                    console.error(error)
                    toast.error("Ocorreu um erro inesperado")
                }
            }
            run()
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[480px] p-0 overflow-hidden bg-white border-none shadow-2xl"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold font-jakarta text-zinc-950">
                        {isEditMode ? "Editar transação" : "Nova transação"}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 font-inter">
                        {isEditMode ? "Atualize os dados da transação selecionada" : "Preencha os dados da nova transação"}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-6 space-y-6">
                        {/* Tabs Integradas */}
                        <Tabs
                            value={type}
                            onValueChange={(v) => form.setValue("type", v as any)}
                            className="w-full bg-zinc-100 p-1 rounded-lg"
                        >
                            <TabsList className="grid w-full grid-cols-2 bg-transparent">
                                <TabsTrigger
                                    value="revenue"
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all font-inter"
                                >
                                    Receita
                                </TabsTrigger>
                                <TabsTrigger
                                    value="expense"
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all font-inter"
                                >
                                    Despesa
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="space-y-6">
                            {/* 1. Descrição (Total 100%) */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <RequiredLabel error={!!form.formState.errors.description}>Descrição</RequiredLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Informe uma descrição"
                                                className="font-inter h-10 border-zinc-200"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 2 & 3. Valor e Carteira (Metade 50%) */}
                            <div className="grid grid-cols-2 gap-6">
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
                                                    className="h-10 border-zinc-200"
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
                                                    <SelectTrigger className="h-10 border-zinc-200 font-inter text-zinc-600">
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-white border-zinc-200">
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

                            {/* Campos Específicos por Tipo */}
                            {type === 'expense' ? (
                                <>
                                    {/* 4. Método (Total 100%) */}
                                    <FormField
                                        control={form.control}
                                        name="payment_method"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <RequiredLabel error={!!form.formState.errors.payment_method}>Método</RequiredLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-10 border-zinc-200 font-inter text-zinc-600">
                                                            <SelectValue placeholder="Selecione" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-white border-zinc-200">
                                                        {["Boleto", "Crédito", "Débito", "Pix", "Dinheiro"].map(m => (
                                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* 5. Beneficiário (Metade 50%) */}
                                        <FormField
                                            control={form.control}
                                            name="payee_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.payee_id}>Beneficiário</RequiredLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 border-zinc-200 font-inter text-zinc-600">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white border-zinc-200 max-h-[250px]">
                                                            {payees.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {/* 6. Classificação (Metade 50%) */}
                                        <FormField
                                            control={form.control}
                                            name="classification_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.classification_id}>Classificação</RequiredLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 border-zinc-200 font-inter text-zinc-600">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white border-zinc-200">
                                                            {classifications.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
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

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* 7. Categoria (Metade 50%) */}
                                        <FormField
                                            control={form.control}
                                            name="category_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.category_id}>Categoria</RequiredLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 border-zinc-200 font-inter text-zinc-600">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white border-zinc-200">
                                                            {categories.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {/* 8. Subcategoria (Metade 50%) */}
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
                                                            <SelectTrigger className="h-10 border-zinc-200 font-inter text-zinc-600">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white border-zinc-200">
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
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* 4. Pagador (Metade 50%) */}
                                        <FormField
                                            control={form.control}
                                            name="payee_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.payee_id}>Pagador</RequiredLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 border-zinc-200 font-inter text-zinc-600">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white border-zinc-200 max-h-[250px]">
                                                            {payees.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {/* 5. Categoria (Metade 50%) */}
                                        <FormField
                                            control={form.control}
                                            name="category_id"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <RequiredLabel error={!!form.formState.errors.category_id}>Categoria</RequiredLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 border-zinc-200 font-inter text-zinc-600">
                                                                <SelectValue placeholder="Selecione" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white border-zinc-200">
                                                            {categories.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 9 & 10. Competência e Data (Comum - Metade 50%) */}
                            <div className="grid grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="competence"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2 flex flex-col">
                                            <FormLabel className={cn("text-zinc-700", !!form.formState.errors.competence && "text-red-600")}>Competência</FormLabel>
                                            <FormControl>
                                                <MonthPicker
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    className="w-full h-10 border-zinc-200"
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
                                            <FormLabel className={cn("text-zinc-700", !!form.formState.errors.date && "text-red-600")}>Data</FormLabel>
                                            <FormControl>
                                                <DatePicker
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    className="w-full h-10 border-zinc-200"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* 11. Status Switch (Total 100%) */}
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-zinc-200 p-4 space-y-0 bg-zinc-50/50">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base font-semibold text-zinc-950">
                                                {type === 'expense' ? 'Pago' : 'Recebido'}
                                            </FormLabel>
                                            <p className="text-xs text-zinc-500 font-inter">
                                                {type === 'expense'
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
                        </div>

                        <DialogFooter className="gap-2 pt-2 border-t border-zinc-100 flex-row justify-end space-x-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="font-medium text-zinc-700 h-10 px-6 rounded-lg font-inter"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-zinc-950 text-white hover:bg-zinc-800 h-10 px-8 rounded-lg font-medium font-inter shadow-sm"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function RequiredLabel({ children, error }: { children: React.ReactNode; error?: boolean }) {
    return (
        <FormLabel className={cn("text-zinc-700 flex items-center gap-0.5", error && "text-red-600")}>
            {children}
            <span className="text-red-600 ml-0.5">*</span>
        </FormLabel>
    )
}
