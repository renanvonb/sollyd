import {
    PiggyBank, Home, Car, Plane, GraduationCap, Heart, Laptop, ShoppingBag,
    Dumbbell, Music, Camera, Gift, Bike, Coffee, Gem, Umbrella, Baby, Tent,
    Trophy, Star, type LucideIcon,
} from "lucide-react"

// Mapeamento string (armazenada no banco) → componente Lucide
export const SAVINGS_ICONS: Record<string, LucideIcon> = {
    "piggy-bank": PiggyBank,
    "home": Home,
    "car": Car,
    "plane": Plane,
    "graduation-cap": GraduationCap,
    "heart": Heart,
    "laptop": Laptop,
    "shopping-bag": ShoppingBag,
    "dumbbell": Dumbbell,
    "music": Music,
    "camera": Camera,
    "gift": Gift,
    "bike": Bike,
    "coffee": Coffee,
    "gem": Gem,
    "umbrella": Umbrella,
    "baby": Baby,
    "tent": Tent,
    "trophy": Trophy,
    "star": Star,
}

export const SAVINGS_ICON_KEYS = Object.keys(SAVINGS_ICONS)

export function getSavingsIcon(key: string): LucideIcon {
    return SAVINGS_ICONS[key] ?? PiggyBank
}

// Swatches pré-definidas (10 cores)
export const SAVINGS_COLORS = [
    "#E0FE56", // lima (primary)
    "#22C55E", // verde
    "#3B82F6", // azul
    "#06B6D4", // ciano
    "#8B5CF6", // roxo
    "#EC4899", // rosa
    "#F97316", // laranja
    "#EF4444", // vermelho
    "#EAB308", // amarelo
    "#94A3B8", // cinza
]

const brlFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
})

export function formatBRL(value: number): string {
    return brlFormatter.format(value || 0)
}
