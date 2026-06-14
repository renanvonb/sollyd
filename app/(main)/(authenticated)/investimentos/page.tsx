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
            <div className="max-w-[1440px] mx-auto px-6 w-full flex-1 flex flex-col pt-4 md:pt-6 pb-4 md:pb-8 gap-5 md:gap-6 overflow-hidden">
                <div className="flex items-center justify-end flex-none">
                    <div className="flex items-center gap-3 font-sans justify-end flex-wrap">
                        <Button disabled className="h-10 w-10 shrink-0 p-0 font-inter font-medium opacity-50 cursor-not-allowed md:w-auto md:px-4 md:gap-0">
                            <Plus className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Adicionar</span>
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
