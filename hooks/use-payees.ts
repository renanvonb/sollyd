import { useState, useEffect } from 'react';
import { getPayees } from '@/app/actions/transaction-data';
import { Payee } from '@/types/transaction';

/**
 * Hook para buscar contatos (Pagadores/Favorecidos) baseado no tipo de transação.
 * - 'revenue' -> Filtra por 'payer' (e 'both')
 * - 'expense' -> Filtra por 'payee' (e 'both')
 * - undefined -> Busca todos
 */
export function usePayees(type: 'revenue' | 'expense' | 'investment' | 'Receita' | 'Despesa' | undefined) {
    const [payees, setPayees] = useState<Payee[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchPayees = async () => {
            setLoading(true);
            try {
                let typeFilter: 'payer' | 'favored' | undefined;

                if (type === 'revenue' || type === 'Receita') {
                    typeFilter = 'payer';
                } else if (type === 'expense' || type === 'Despesa') {
                    typeFilter = 'favored';
                }
                // Se investment, por padrão traz benefícios (payee) ou todos?
                // Vamos assumir comportamento de 'payee' (Corretora) ou todos se não definido.
                // Se typeFilter for undefined, getPayees traz todos.

                const data = await getPayees(typeFilter);

                if (isMounted) {
                    setPayees(data);
                }
            } catch (error) {
                console.error("Erro ao buscar contatos:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchPayees();

        return () => {
            isMounted = false;
        };
    }, [type]);

    return { payees, setPayees, loading };
}
