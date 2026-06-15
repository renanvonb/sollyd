"use client"

import { PiggyBank } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyCaixinhasProps {
    onCreate: () => void
}

export function EmptyCaixinhas({ onCreate }: EmptyCaixinhasProps) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
            <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl mb-6 bg-brand/15"
            >
                <PiggyBank className="h-10 w-10 text-brand" />
            </div>
            <h2 className="text-xl font-semibold text-foreground font-jakarta">
                Nenhuma caixinha ainda
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground font-inter">
                Crie sua primeira meta financeira e comece a guardar dinheiro com propósito.
            </p>
            <Button onClick={onCreate} className="mt-6 font-sans">
                Criar minha primeira caixinha
            </Button>
        </div>
    )
}
