# Sollyd — Arquitetura

> Next.js 14 (App Router) + Supabase (PostgreSQL). Multi-tenant via RLS (`auth.uid() = user_id`).
> Para setup, scripts e protocolos, ver o [README](../README.md).

## Estrutura de diretórios

```
app/
├── (auth)/                     # login, signup, callback
└── (main)/(authenticated)/     # rotas protegidas (middleware Supabase SSR)
    ├── dashboard/              # métricas + gráficos
    ├── transacoes/             # tabela avançada (filtros, ordenação, status)
    ├── financeiro/             # resumo e subseções
    ├── cadastros/              # carteiras, favorecidos, categorias, classificações
    ├── orcamentos/             # orçamentos por categoria/subcategoria
    ├── caixinhas/[id]/         # metas de poupança + aportes
    ├── investimentos/[id]/     # carteira de ativos + operações
    └── admin/                  # import de transações

app/actions/                    # Server Actions ('use server')
├── auth.ts          transactions.ts        transactions-fetch.ts
├── transaction-data.ts         dashboard-metrics.ts
├── payees.ts        budgets.ts             savings-boxes.ts        investments.ts

components/                     # por domínio: cadastros, caixinhas, charts, dashboard,
                                # financeiro, investimentos, orcamentos, transactions,
                                # shared (reutilizáveis), ui (shadcn base)

lib/
├── supabase/        # clients: client.ts, server.ts (+ createAdminClient), middleware.ts
├── constants.ts     # fonte única: TRANSACTION_TYPES, STATUS, PAYMENT_METHODS, formatos, cores
├── auth-utils.ts    budget-utils.ts  investment-utils.ts  savings-box-utils.ts  date-utils.ts

types/               # budget, investment, savings-box, transaction, entities, time-range, index
hooks/               # use-payees, use-sidebar-state, use-visibility-state, use-header, use-mobile
supabase/migrations/ # migrações SQL versionadas (fonte de verdade do schema)
scripts/             # wipe-data.ts, verify-supabase.ts
```

## Modelo de dados

Núcleo: `wallets`, `transactions`, `payees`, `categories`, `subcategories`, `classifications`.

Módulos:
- **Orçamentos**: `budgets` (orçamento por categoria/subcategoria), `budget_months` (sobrescrita mensal). RPC `get_budget_consumption(p_year_month)` calcula consumo vs orçado pelo `competence` das transações.
- **Caixinhas**: `savings_boxes` (meta), `savings_box_contributions` (aportes). Triggers mantêm `current_amount` e `is_completed`.
- **Investimentos**: `investment_assets`, `investment_operations` (enum `investment_operation_type`: `aporte`, `resgate`, `rendimento`, `atualizacao_valor`). Triggers sincronizam `total_invested`, `total_income`, `current_value`.

### Enum `transaction_type`
Padronizado para **`'Receita'` / `'Despesa'`** (compartilhado por `transactions.type` e `categories.type`). Valores legados em inglês não são mais armazenados — ver `normalizeTransactionType()` em `lib/constants.ts`.

## Segurança

- RLS habilitado em todas as tabelas; padrão `auth.uid() = user_id` (SELECT/UPDATE/DELETE) e `WITH CHECK` (INSERT).
- Funções com `search_path` fixado (`public, pg_temp`); trigger functions `SECURITY DEFINER` com `EXECUTE` revogado de `anon`/`authenticated`/`PUBLIC`.
- Bucket `avatars` é público (acesso por URL), sem policy de listagem.
- **Pendência manual**: habilitar "Leaked password protection" no dashboard (Authentication → Password).

## Convenções

- **Datas/competência**: competência sempre `'YYYY-MM-01'`; filtros mensais usam igualdade estrita em `competence` (evita timezone shift). Formatos em `lib/constants.ts`.
- **Validação**: Zod em todas as Server Actions, espelhando os constraints do banco; sempre validar `supabase.auth.getUser()` antes de mutação.
- **Filtros**: URL search params como fonte de verdade (`range`, `from`, `to`, `search`, `status`).
- **Cor de marca**: token Tailwind `brand` (`#E0FE56`) — `bg-brand`/`text-brand`, nunca o hex literal.
