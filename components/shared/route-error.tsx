"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error("[Sollyd Error]", error)
    }, [error])

    return (
        <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-4 text-center p-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-foreground font-jakarta">Algo deu errado</h2>
            <p className="max-w-sm text-sm text-muted-foreground font-inter">
                Ocorreu um erro ao carregar esta página. Tente novamente.
            </p>
            <Button onClick={reset} variant="outline" className="font-sans">Tentar novamente</Button>
        </div>
    )
}
