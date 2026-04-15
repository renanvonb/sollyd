"use client"

import { TopBar } from "@/components/ui/top-bar"
import { Button } from "@/components/ui/button"
import { Plus, Construction } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"

export default function InvestimentosPage() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <TopBar moduleName="Investimentos" variant="simple" />
            <div className="max-w-[1440px] mx-auto px-8 w-full flex-1 flex flex-col pt-8 pb-8 gap-8 overflow-hidden">
                <div className="flex items-center justify-between flex-none px-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-semibold md:font-bold tracking-tight text-foreground font-jakarta">
                            Investimentos
                        </h1>
                        <Badge variant="secondary" className="font-sans mt-1.5">Em breve</Badge>
                    </div>
                    <div className="flex items-center gap-3 font-sans justify-end flex-wrap">
                        <Button disabled className="font-inter font-medium opacity-50 cursor-not-allowed">
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar
                        </Button>
                    </div>
                </div>

                <EmptyState
                    variant="outlined"
                    size="lg"
                    icon={Construction}
                    title="Em construção"
                    description="Este módulo está sendo desenvolvido e estará disponível em breve."
                    className="flex-1 min-h-0 bg-neutral-900 rounded-lg border border-neutral-800 border-dashed shadow-sm"
                />
            </div>
        </div>
    )
}
