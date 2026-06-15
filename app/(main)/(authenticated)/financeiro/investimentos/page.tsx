import { redirect } from "next/navigation"

// Rota consolidada: o módulo completo de investimentos vive em /investimentos.
export default function FinanceiroInvestimentosPage() {
    redirect("/investimentos")
}
