'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const transactions = [
    {
        tipo: "DESPESA",
        descricao: "ALUGUEL",
        favorecido: "BERTA IMÓVEIS",
        categoria: "MORADIA",
        data_pagamento: "2026-01-07",
        valor: 1153.00,
    },
    {
        tipo: "DESPESA",
        descricao: "CONDOMINIO",
        favorecido: "BERTA IMÓVEIS",
        categoria: "MORADIA",
        data_pagamento: "2026-01-08",
        valor: 182.90,
    },
    {
        tipo: "DESPESA",
        descricao: "ENERGIA",
        favorecido: "CELESC",
        categoria: "MORADIA",
        data_pagamento: "2026-01-07",
        valor: 140.74,
    },
    {
        tipo: "DESPESA",
        descricao: "GÁS",
        favorecido: "ZAT",
        categoria: "MORADIA",
        data_pagamento: "2026-01-07",
        valor: 12.34,
    },
    {
        tipo: "DESPESA",
        descricao: "INTERNET",
        favorecido: "UNIFIQUE",
        categoria: "MORADIA",
        data_pagamento: "2026-01-08",
        valor: 239.80,
    }
]

export default function ImportTransactionsPage() {
    const [logs, setLogs] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    }

    const insertTransactions = async () => {
        setIsLoading(true)
        setLogs([])

        const supabase = createClient()

        try {
            // Obter o usuário atual
            const { data: { user }, error: authError } = await supabase.auth.getUser()

            if (authError || !user) {
                addLog('❌ Erro de autenticação')
                return
            }

            addLog(`✅ Usuário autenticado: ${user.email}`)

            // Buscar ou criar categoria MORADIA
            let { data: categoriaData } = await supabase
                .from('categories')
                .select('id, name')
                .eq('name', 'MORADIA')
                .eq('user_id', user.id)
                .maybeSingle()

            if (!categoriaData) {
                const { data: newCat, error: createCatError } = await supabase
                    .from('categories')
                    .insert({ name: 'MORADIA', user_id: user.id })
                    .select()
                    .single()

                if (createCatError) {
                    addLog(`❌ Erro ao criar categoria: ${createCatError.message}`)
                    return
                }
                categoriaData = newCat
                addLog('✅ Categoria MORADIA criada')
            } else {
                addLog('✅ Categoria MORADIA encontrada')
            }

            // Buscar/criar favorecidos
            const favorecidos = ['BERTA IMÓVEIS', 'CELESC', 'ZAT', 'UNIFIQUE']
            const favorecidosMap = new Map<string, string>()

            for (const nome of favorecidos) {
                let { data: payeeData } = await supabase
                    .from('payees')
                    .select('id, name')
                    .eq('name', nome)
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (!payeeData) {
                    const { data: newPayee, error: createPayeeError } = await supabase
                        .from('payees')
                        .insert({ name: nome, user_id: user.id })
                        .select()
                        .single()

                    if (createPayeeError) {
                        addLog(`❌ Erro ao criar favorecido ${nome}`)
                        continue
                    }
                    payeeData = newPayee
                    addLog(`✅ Favorecido ${nome} criado`)
                } else {
                    addLog(`✅ Favorecido ${nome} encontrado`)
                }

                if (payeeData) {
                    favorecidosMap.set(nome, payeeData.id)
                }
            }

            // Inserir as transações
            addLog('\n📝 Inserindo transações...')

            for (const transaction of transactions) {
                const payeeId = favorecidosMap.get(transaction.favorecido)

                if (!categoriaData || !payeeId) {
                    addLog(`❌ Categoria ou favorecido não encontrado para: ${transaction.descricao}`)
                    continue
                }

                const transactionData = {
                    user_id: user.id,
                    description: transaction.descricao,
                    amount: transaction.valor,
                    type: 'expense',
                    date: transaction.data_pagamento,
                    competence: transaction.data_pagamento, // Use same date for simplified import
                    status: 'Realizado',
                    category_id: categoriaData.id,
                    payee_id: payeeId,
                }

                const { error } = await supabase
                    .from('transactions')
                    .insert(transactionData)

                if (error) {
                    addLog(`❌ Erro ao inserir ${transaction.descricao}: ${error.message}`)
                } else {
                    addLog(`✅ ${transaction.descricao}: R$ ${transaction.valor.toFixed(2)}`)
                }
            }

            addLog('\n🎉 Importação concluída!')

        } catch (error) {
            addLog(`❌ Erro: ${error}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-[1440px] mx-auto px-8 py-8">
            <Card className="p-6">
                <h1 className="text-2xl font-semibold md:font-bold mb-4 font-jakarta">Importar Transações - Janeiro 2026</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    Este script irá inserir {transactions.length} transações de despesas de moradia no banco de dados.
                </p>

                <Button
                    onClick={insertTransactions}
                    disabled={isLoading}
                    className="mb-6"
                >
                    {isLoading ? 'Importando...' : 'Importar Transações'}
                </Button>

                {logs.length > 0 && (
                    <div className="bg-zinc-950 text-zinc-50 p-4 rounded-lg font-mono text-xs max-h-96 overflow-auto">
                        {logs.map((log, index) => (
                            <div key={index} className="mb-1">{log}</div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}
