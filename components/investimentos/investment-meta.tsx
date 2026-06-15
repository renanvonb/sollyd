import {
    Landmark, TrendingUp, PieChart, Bitcoin,
    PlusCircle, ArrowDownCircle, Coins, RefreshCw,
    type LucideIcon,
} from "lucide-react"
import { INVESTMENT_CLASSES, type InvestmentClass, type OperationType } from "@/types/investment"

const CLASS_ICONS: Record<InvestmentClass, LucideIcon> = {
    renda_fixa: Landmark,
    renda_variavel: TrendingUp,
    fundos: PieChart,
    cripto: Bitcoin,
}

export function getClassIcon(cls: string): LucideIcon {
    return CLASS_ICONS[cls as InvestmentClass] ?? TrendingUp
}

export function getClassMeta(cls: string) {
    return INVESTMENT_CLASSES[cls as InvestmentClass] ?? INVESTMENT_CLASSES.renda_variavel
}

export const OPERATION_META: Record<OperationType, { label: string; icon: LucideIcon; color: string; bg: string }> = {
    aporte: { label: "Aporte", icon: PlusCircle, color: "text-green-500", bg: "bg-green-500/15" },
    resgate: { label: "Resgate", icon: ArrowDownCircle, color: "text-red-500", bg: "bg-red-500/15" },
    rendimento: { label: "Rendimento", icon: Coins, color: "text-blue-500", bg: "bg-blue-500/15" },
    atualizacao_valor: { label: "Atualização de valor", icon: RefreshCw, color: "text-muted-foreground", bg: "bg-muted" },
}
