"use client"

import { PieChart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyOrcamentosProps {
    onCreate: () => void
}

export function EmptyOrcamentos({ onCreate }: EmptyOrcamentosProps) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
            <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl mb-6"
                style={{ backgroundColor: "rgba(224, 254, 86, 0.15)" }}
            >
                <PieChart className="h-10 w-10" style={{ color: "#E0FE56" }} />
            </div>
            <h2 className="text-xl font-semibold text-foreground font-jakarta">
                Nenhum orçamento definido
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground font-inter">
                Defina limites de gasto por categoria e acompanhe seu progresso mês a mês.
            </p>
            <Button onClick={onCreate} className="mt-6 font-sans">
                Criar primeiro orçamento
            </Button>
        </div>
    )
}
