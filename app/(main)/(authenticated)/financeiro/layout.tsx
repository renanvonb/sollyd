import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'



export default async function FinanceLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 font-sans">
            {/* Área B - Top App Bar (Sempre Visível) */}
            <PageHeader links={[]} />

            {/* Área C, D e E - Conteúdo Principal */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    )
}


