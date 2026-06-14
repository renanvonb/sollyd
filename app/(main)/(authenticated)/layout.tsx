import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider } from '@/hooks/use-sidebar-state'
import { MainContentWrapper } from '@/components/main-content-wrapper'

import { VisibilityProvider } from '@/hooks/use-visibility-state'

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    return (
        <SidebarProvider>
            <VisibilityProvider>
                <div className="flex h-[100dvh] overflow-hidden bg-background">
                    <AppSidebar user={user} />
                    <MainContentWrapper>
                        {children}
                    </MainContentWrapper>
                </div>
            </VisibilityProvider>
        </SidebarProvider>
    )
}
