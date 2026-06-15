"use client"

import { TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EmptyInvestimentos({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
            <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl mb-6 bg-brand/15"
            >
                <TrendingUp className="h-10 w-10 text-brand" />
            </div>
            <h2 className="text-xl font-semibold text-foreground font-jakarta">
                Nenhum investimento cadastrado
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground font-inter">
                Cadastre seus ativos e acompanhe o crescimento do seu patrimônio em um só lugar.
            </p>
            <Button onClick={onCreate} className="mt-6 font-sans">
                Adicionar primeiro ativo
            </Button>
        </div>
    )
}
