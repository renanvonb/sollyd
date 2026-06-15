'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
    { name: 'Resumo', href: '/financeiro/resumo' },
    { name: 'Transações', href: '/financeiro/transacoes' },
    { name: 'Investimentos', href: '/financeiro/investimentos' },
]

export function FinanceHeader() {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-30 w-full border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md font-sans">
            <div className="flex px-10">
                <nav className="flex gap-10">
                    {links.map((link) => {
                        const isActive = pathname === link.href

                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={cn(
                                    'relative py-5 text-[15px] font-medium transition-all duration-200',
                                    isActive
                                        ? 'text-white'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                )}
                            >
                                {link.name}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100 rounded-full" />
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </header>
    )
}
