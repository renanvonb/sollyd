# Prompt de Auditoria e Otimização Completa — Sollyd

> **Para:** Antigravity
> **Projeto:** Sollyd — Next.js 14 + Supabase + shadcn/ui
> **Tipo:** Auditoria técnica, refatoração estrutural e padronização
> **Prioridade:** Alta — executar antes de qualquer nova feature
> **Data:** 2026-06-15
> **Base documental:** README.md (GLOBAL_TYPE_RECONCILIATION_V10) + PROJECT_OVERVIEW.md

---

## ⚠️ INSTRUÇÕES GERAIS DE EXECUÇÃO

Este prompt cobre múltiplas categorias de problema. Execute **na ordem exata das seções** — cada seção pode ter dependências das anteriores. Antes de qualquer alteração:

1. Rode `bun run type-check` e `bun run lint` para capturar o estado inicial
2. Confirme que `bun run build` passa com sucesso antes de começar
3. Ao final de cada seção, rode `bun run type-check` novamente para validar
4. **Nunca deletar arquivos sem primeiro confirmar que nenhum import aponta para eles** — use busca por `grep -r "from.*<caminho>"` antes de remover

---

## SEÇÃO 1 — Dívida Técnica Crítica: Enum Híbrido de Tipo de Transação

### Contexto
O README.md (protocolo `GLOBAL_TYPE_RECONCILIATION_V10`) declara que o banco foi **padronizado em português** (`'Receita'` / `'Despesa'`). No entanto, o schema ainda registra e o Zod ainda aceita os valores em inglês (`'revenue'` / `'expense'`). Isso cria uma superfície de bug permanente onde qualquer novo código pode gravar o valor errado e quebrar filtros silenciosamente.

### 1.1 — Migração SQL de consolidação do ENUM

Criar `database/migrations/017_standardize_transaction_type_enum.sql`:

```sql
-- ============================================================
-- OBJETIVO: Remover valores legados 'revenue' e 'expense' do enum
-- e garantir que TODOS os registros usem 'Receita' / 'Despesa'
-- ============================================================

-- Passo 1: Converter registros legados restantes (se houver)
UPDATE transactions
  SET type = 'Receita'
  WHERE type IN ('revenue', 'Receita');

UPDATE transactions
  SET type = 'Despesa'
  WHERE type IN ('expense', 'Despesa');

-- Passo 2: Verificar que não há mais valores legados
-- (Se retornar linhas, a migração deve falhar manualmente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM transactions WHERE type NOT IN ('Receita', 'Despesa')
  ) THEN
    RAISE EXCEPTION 'Ainda existem registros com tipo inválido. Corrija antes de continuar.';
  END IF;
END $$;

-- Passo 3: Recriar o ENUM limpo
-- Nota: PostgreSQL não permite remover valores de ENUM diretamente.
-- A abordagem segura é alterar o tipo da coluna para TEXT temporariamente,
-- dropar o enum antigo, criar o novo e restaurar.

-- 3a. Salvar o tipo atual como TEXT
ALTER TABLE transactions ALTER COLUMN type TYPE TEXT;

-- 3b. Dropar o enum antigo (se existir como tipo nomeado)
DROP TYPE IF EXISTS transaction_type CASCADE;

-- 3c. Criar novo enum limpo
CREATE TYPE transaction_type AS ENUM ('Receita', 'Despesa');

-- 3d. Restaurar a coluna com o novo enum
ALTER TABLE transactions
  ALTER COLUMN type TYPE transaction_type
  USING type::transaction_type;

-- 3e. Adicionar constraint NOT NULL explícita
ALTER TABLE transactions ALTER COLUMN type SET NOT NULL;

-- Passo 4: Verificação final
SELECT type, COUNT(*) FROM transactions GROUP BY type;
-- Deve retornar SOMENTE 'Receita' e 'Despesa'
```

> **Aplicar no Supabase antes de qualquer alteração de código.**

### 1.2 — Atualizar o Zod schema em `app/actions/transactions.ts`

Localizar o `transactionSchema` e atualizar:

```typescript
// ANTES (aceita valores legados)
type: z.enum(["revenue", "expense", "Receita", "Despesa"]),

// DEPOIS (apenas valores canônicos)
type: z.enum(["Receita", "Despesa"]),
```

### 1.3 — Atualizar o TypeScript type em `types/transaction.ts`

```typescript
// ANTES
type: 'revenue' | 'expense' | 'Receita' | 'Despesa'

// DEPOIS
type: 'Receita' | 'Despesa'
```

### 1.4 — Varredura global de dual-check desnecessários

Após a migração, os filtros de dual-check (ex: `['revenue', 'Receita'].includes(t.type)`) em componentes client-side passam a ser desnecessários. **Localize e simplifique todos**:

```bash
# Buscar todos os dual-checks no projeto
grep -rn "revenue.*Receita\|Receita.*revenue\|expense.*Despesa\|Despesa.*expense" \
  --include="*.ts" --include="*.tsx" .
```

Para cada ocorrência encontrada, simplificar para o valor único:
```typescript
// ANTES
.filter(t => ['revenue', 'Receita'].includes(t.type))

// DEPOIS
.filter(t => t.type === 'Receita')
```

> **Exceção:** Manter dual-check SOMENTE em `dashboard-metrics.ts` e `transactions-fetch.ts` até confirmar que 100% dos dados históricos foram migrados em produção. Adicionar comentário: `// TODO: remover dual-check após confirmar migração 017 em produção`.

### 1.5 — Atualizar `categories` se necessário

Verificar se a tabela `categories` também tem o campo `type` com valores mistos:

```sql
SELECT type, COUNT(*) FROM categories GROUP BY type;
SELECT type, COUNT(*) FROM payees GROUP BY type;
```

Se houver valores em inglês, criar update equivalente ao de `transactions`.

---

## SEÇÃO 2 — Cliente Supabase Duplicado

### Contexto
O projeto tem **dois pontos de entrada para o cliente Supabase**:
- `lib/supabase/` — pasta com `server.ts`, `client.ts`, `middleware.ts` (correto)
- `lib/supabase.ts` — arquivo avulso na raiz de `lib/` (legado)

Código importando de `@/lib/supabase` usa o cliente legado; código importando de `@/lib/supabase/server` usa o correto. Isso pode causar instâncias duplicadas e comportamento inconsistente de sessão.

### 2.1 — Auditar todos os imports

```bash
# Mapear todos os imports de supabase no projeto
grep -rn "from.*lib/supabase" --include="*.ts" --include="*.tsx" . | sort
```

Classificar o resultado em dois grupos:
- **Grupo A:** `from '@/lib/supabase'` ou `from '../lib/supabase'` → imports do arquivo legado
- **Grupo B:** `from '@/lib/supabase/server'`, `'@/lib/supabase/client'` → imports corretos

### 2.2 — Migrar todos os imports do Grupo A para o Grupo B

Para cada arquivo do Grupo A:
- Em Server Components e Server Actions: migrar para `@/lib/supabase/server`
- Em Client Components (marcados com `'use client'`): migrar para `@/lib/supabase/client`
- Em `middleware.ts`: manter `@/lib/supabase/middleware`

### 2.3 — Remover o arquivo legado

Somente após confirmar que nenhum import aponta para ele:
```bash
grep -rn "from.*lib/supabase'" --include="*.ts" --include="*.tsx" .
# Deve retornar zero resultados antes de deletar
```

Remover: `lib/supabase.ts`

---

## SEÇÃO 3 — Duplicação e Desorganização de Componentes

### Contexto
Existem dois problemas estruturais na pasta `components/`:
1. Pasta `shared/` na raiz do projeto (não é padrão Next.js) com `transaction-filters.tsx` que **duplica** `components/transaction-filters.tsx`
2. Componentes órfãos na raiz de `components/` que pertencem a subpastas por módulo

### 3.1 — Resolver a duplicação de `transaction-filters`

```bash
# Verificar qual dos dois é importado e onde
grep -rn "transaction-filters" --include="*.ts" --include="*.tsx" .
```

Determinar qual versão é a mais recente e completa. Consolidar em `components/shared/transaction-filters.tsx`. Atualizar todos os imports para apontar para o arquivo consolidado. Deletar o duplicado e a pasta `shared/` da raiz do projeto.

### 3.2 — Reorganizar componentes órfãos da raiz de `components/`

Mover os seguintes arquivos para suas subpastas corretas:

| Arquivo atual | Destino correto | Justificativa |
|---|---|---|
| `components/dashboard-header.tsx` | `components/dashboard/dashboard-header.tsx` | Pertence ao módulo dashboard |
| `components/dashboard-client.tsx` | `components/dashboard/dashboard-client.tsx` | Pertence ao módulo dashboard |
| `components/dashboard-graphs.tsx` | `components/dashboard/dashboard-graphs.tsx` | Pertence ao módulo dashboard |
| `components/finance-header.tsx` | `components/financeiro/finance-header.tsx` | Pertence ao módulo financeiro |
| `components/transactions-client.tsx` | `components/transacoes/transactions-client.tsx` | Pertence ao módulo transações |
| `components/transaction-table.tsx` | `components/transacoes/transaction-table.tsx` | Pertence ao módulo transações |
| `components/transaction-filters.tsx` | `components/transacoes/transaction-filters.tsx` | Pertence ao módulo transações |
| `components/transaction-form.tsx` | `components/transacoes/transaction-form.tsx` | Pertence ao módulo transações |
| `components/transaction-details-dialog.tsx` | `components/transacoes/transaction-details-dialog.tsx` | Pertence ao módulo transações |
| `components/transaction-summary-cards.tsx` | `components/transacoes/transaction-summary-cards.tsx` | Pertence ao módulo transações |
| `components/date-filter-picker.tsx` | `components/shared/date-filter-picker.tsx` | Componente compartilhado |
| `components/page-header.tsx` | `components/shared/page-header.tsx` | Componente compartilhado |
| `components/page-shell.tsx` | `components/shared/page-shell.tsx` | Componente compartilhado |
| `components/profile-sheet.tsx` | `components/shared/profile-sheet.tsx` | Componente compartilhado de usuário |

**Estrutura alvo de `components/`:**
```
components/
├── dashboard/
│   ├── dashboard-client.tsx
│   ├── dashboard-graphs.tsx
│   └── dashboard-header.tsx
├── transacoes/
│   ├── transaction-form.tsx
│   ├── transaction-table.tsx
│   ├── transaction-filters.tsx
│   ├── transaction-details-dialog.tsx
│   ├── transactions-client.tsx
│   └── transaction-summary-cards.tsx
├── financeiro/
│   └── finance-header.tsx
├── cadastros/           # já existe
├── charts/              # já existe
├── caixinhas/           # criado no módulo Caixinhas
├── orcamentos/          # criado no módulo Orçamentos
├── investimentos/       # criado no módulo Investimentos
├── shared/
│   ├── date-filter-picker.tsx
│   ├── page-header.tsx
│   ├── page-shell.tsx
│   ├── profile-sheet.tsx
│   └── transaction-filters.tsx  ← versão consolidada
├── app-sidebar.tsx      # permanece na raiz (é layout global)
└── ui/                  # shadcn/ui — não mexer
```

### 3.3 — Atualizar todos os imports após a reorganização

```bash
# Após mover, buscar todos os imports quebrados
bun run type-check 2>&1 | grep "Cannot find module"
```

Corrigir cada import reportado. Os arquivos que mais provavelmente precisam de atualização são:
- `app/(main)/(authenticated)/dashboard/page.tsx`
- `app/(main)/(authenticated)/transacoes/page.tsx`
- `app/(main)/(authenticated)/financeiro/*/page.tsx`
- `app/(main)/layout.tsx`

---

## SEÇÃO 4 — Padronização de Nomenclatura de Hooks

### Contexto
Três hooks usam `kebab-case`, um usa `camelCase` — violação do padrão estabelecido no projeto.

| Arquivo atual | Padrão | Ação |
|---|---|---|
| `hooks/use-sidebar-state.tsx` | ✅ kebab-case | Manter |
| `hooks/use-visibility-state.tsx` | ✅ kebab-case | Manter |
| `hooks/use-header.tsx` | ✅ kebab-case | Manter |
| `hooks/usePayees.ts` | ❌ camelCase | Renomear |

### 4.1 — Renomear `usePayees.ts`

```bash
# Verificar onde é importado
grep -rn "usePayees\|from.*hooks/usePayees" --include="*.ts" --include="*.tsx" .
```

Renomear o arquivo para `hooks/use-payees.ts`. O nome exportado da função (`usePayees`) permanece o mesmo — só o nome do arquivo muda. Atualizar todos os imports identificados.

---

## SEÇÃO 5 — Constantes Compartilhadas

### Contexto
Strings literais como `'Receita'`, `'Despesa'`, `'Realizado'`, `'Pendente'`, `'Boleto'`, `'Crédito'`, `'Débito'`, `'Pix'`, `'Dinheiro'` estão espalhadas em múltiplos arquivos. Qualquer typo é um bug silencioso.

### 5.1 — Criar `lib/constants.ts`

```typescript
// lib/constants.ts
// Fonte única de verdade para todas as strings do domínio financeiro

// ============================================================
// TIPOS DE TRANSAÇÃO (padronizado conforme README v10)
// ============================================================
export const TRANSACTION_TYPES = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
} as const

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES]

// ============================================================
// STATUS DE TRANSAÇÃO
// ============================================================
export const TRANSACTION_STATUS = {
  REALIZADO: 'Realizado',
  PENDENTE: 'Pendente',
} as const

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS]

// ============================================================
// MÉTODOS DE PAGAMENTO
// ============================================================
export const PAYMENT_METHODS = {
  BOLETO: 'Boleto',
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
} as const

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]

export const PAYMENT_METHOD_LIST = Object.values(PAYMENT_METHODS) as PaymentMethod[]

// ============================================================
// TIPOS DE CATEGORIA / PAYEE
// ============================================================
export const ENTITY_TYPES = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
} as const

// ============================================================
// FORMATO DE DATA (padrão do protocolo GLOBAL_TYPE_RECONCILIATION_V10)
// ============================================================
// competence: sempre 'YYYY-MM-01' (primeiro dia do mês)
export const COMPETENCE_DATE_FORMAT = 'yyyy-MM-01'
export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy'
export const DISPLAY_MONTH_FORMAT = 'MMM/yyyy'
export const YEAR_MONTH_FORMAT = 'yyyy-MM'

// ============================================================
// PALETA SEMÂNTICA (não alterar — definida no README)
// ============================================================
export const SEMANTIC_COLORS = {
  RECEITA: 'emerald',   // green
  DESPESA: 'rose',      // red
  INVESTIMENTO: 'blue',
  BRAND: '#E0FE56',
} as const
```

### 5.2 — Atualizar o Zod schema para usar as constantes

```typescript
// Em app/actions/transactions.ts
import { TRANSACTION_TYPES, TRANSACTION_STATUS, PAYMENT_METHODS, PAYMENT_METHOD_LIST } from '@/lib/constants'

const transactionSchema = z.object({
  // ...
  type: z.enum([TRANSACTION_TYPES.RECEITA, TRANSACTION_TYPES.DESPESA]),
  payment_method: z.enum(PAYMENT_METHOD_LIST).optional().nullable(),
  status: z.enum([TRANSACTION_STATUS.REALIZADO, TRANSACTION_STATUS.PENDENTE]).optional().nullable(),
  // ...
})
```

### 5.3 — Varredura e substituição gradual

```bash
# Mapear ocorrências de strings hardcoded
grep -rn "'Receita'\|'Despesa'\|'Realizado'\|'Pendente'\|'Boleto'\|'Crédito'\|'Débito'\|'Pix'\|'Dinheiro'" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="node_modules" \
  --exclude-dir=".next" .
```

Substituir gradualmente pelas constantes importadas. Prioridade:
1. `app/actions/` — maior risco (gravam no banco)
2. `components/transacoes/` — maior volume de uso
3. `components/dashboard/` — afeta métricas
4. Demais componentes

---

## SEÇÃO 6 — Dependências Duplicadas de Gráfico

### Contexto
O projeto tem duas bibliotecas de gráfico: **Recharts** e **Chart.js / react-chartjs-2**. Recharts já é o padrão em todos os módulos novos (Orçamentos, Investimentos). Chart.js é legado e deve ser removido.

### 6.1 — Auditar uso de Chart.js

```bash
# Verificar todos os imports de chart.js e react-chartjs-2
grep -rn "chart.js\|react-chartjs-2\|Chart\b" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="node_modules" .
```

Identificar quais componentes em `components/charts/` usam Chart.js.

### 6.2 — Reescrever os componentes em Recharts

Para cada componente que usa Chart.js, reescrever usando Recharts. Os tipos comuns e seus equivalentes:

| Chart.js | Recharts |
|---|---|
| `<Bar>` | `<BarChart>` + `<Bar>` |
| `<Line>` | `<LineChart>` + `<Line>` |
| `<Doughnut>` / `<Pie>` | `<PieChart>` + `<Pie>` |
| `<Radar>` | `<RadarChart>` + `<Radar>` |

Manter as mesmas props de dados — apenas trocar a camada de renderização. Os dados não mudam.

### 6.3 — Remover Chart.js do projeto

Após confirmar que nenhum import restante usa Chart.js:
```bash
bun remove chart.js react-chartjs-2
```

Remover também quaisquer imports de `@/lib/chartjs-setup` ou arquivo de configuração global do Chart.js, se existir.

---

## SEÇÃO 7 — Padronização de Datas e Competência

### Contexto
O README define regras críticas de data que podem estar sendo violadas silenciosamente:
- `competence` deve ser sempre `'YYYY-MM-01'` (primeiro dia do mês)
- Filtros mensais devem usar `.eq()`, não `.gte`/`.lte`
- Datas com timezone podem causar off-by-one-day

### 7.1 — Criar utilitários de data em `lib/date-utils.ts`

```typescript
// lib/date-utils.ts
import { format, parseISO, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COMPETENCE_DATE_FORMAT, DISPLAY_DATE_FORMAT, DISPLAY_MONTH_FORMAT } from './constants'

// Garante o formato correto de competência: 'YYYY-MM-01'
export function toCompetenceDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(startOfMonth(d), COMPETENCE_DATE_FORMAT)
}

// Extrai 'YYYY-MM' de uma data de competência
export function toYearMonth(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM')
}

// Formata data para exibição: '15/06/2026'
export function formatDisplayDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, DISPLAY_DATE_FORMAT)
}

// Formata competência para exibição: 'Jun/2026'
export function formatCompetenceDisplay(competence: string | null | undefined): string {
  if (!competence) return '—'
  const d = parseISO(competence)
  return format(d, DISPLAY_MONTH_FORMAT, { locale: ptBR })
    .replace(/^\w/, c => c.toUpperCase())
}

// Retorna competência do mês atual no formato correto
export function currentCompetence(): string {
  return toCompetenceDate(new Date())
}

// Converte input de date picker (pode ser Date ou string ISO) para string de banco
export function toDbDateString(date: Date | string | null | undefined): string | null {
  if (!date) return null
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd')
}
```

### 7.2 — Auditar queries de competência nas Server Actions

```bash
# Buscar queries que possam estar usando gte/lte em competence
grep -rn "\.gte.*competence\|\.lte.*competence\|competence.*gte\|competence.*lte" \
  --include="*.ts" . 
```

Para cada ocorrência em filtro mensal, substituir por:
```typescript
// ANTES (incorreto para filtro mensal)
.gte('competence', startDate).lte('competence', endDate)

// DEPOIS (correto conforme README)
.eq('competence', toCompetenceDate(selectedMonth))
```

### 7.3 — Auditar campos de competência no formulário

Em `components/transacoes/transaction-form.tsx`, localizar onde `competence` é enviada para o servidor e garantir:

```typescript
// Ao preparar dados para Server Action
competence: formData.competence
  ? toCompetenceDate(formData.competence)  // garante YYYY-MM-01
  : null
```

---

## SEÇÃO 8 — Reorganização de Server Actions

### Contexto
`app/actions/contacts.ts` usa o nome "contacts" mas opera na tabela `payees`. Isso cria confusão semântica e diverge do nome usado no hook (`usePayees`) e na tabela do banco.

### 8.1 — Renomear `contacts.ts` para `payees.ts`

```bash
# Verificar imports do arquivo
grep -rn "from.*actions/contacts\|actions/contacts" --include="*.ts" --include="*.tsx" .
```

Renomear `app/actions/contacts.ts` → `app/actions/payees.ts`. Atualizar todos os imports. As funções exportadas internamente podem manter seus nomes atuais ou ser renomeadas para consistência (`getPayees`, `createPayee`, `updatePayee`, `deletePayee`).

### 8.2 — Consolidar actions fragmentadas de transações

O projeto tem três arquivos de actions de transações:
- `transactions.ts` — mutações (save, update, delete, markAsPaid, markAsPending)  
- `transactions-fetch.ts` — queries de busca
- `transaction-data.ts` — dados auxiliares para formulário

Avaliar se `transaction-data.ts` pode ser absorvido por `transactions-fetch.ts` (ambos são somente leitura). Se o arquivo for pequeno (< 50 linhas), consolidar. Se for grande, manter separado mas adicionar comentário de responsabilidade no topo de cada arquivo.

---

## SEÇÃO 9 — Tipos TypeScript Centralizados

### Contexto
Os tipos estão em arquivos separados sem ponto de entrada único, dificultando imports e descoberta.

### 9.1 — Criar `types/index.ts` com re-exports

```typescript
// types/index.ts
// Ponto de entrada único para todos os tipos do Sollyd

export * from './transaction'
export * from './entities'
export * from './time-range'
export * from './budget'        // criado no módulo Orçamentos
export * from './savings-box'   // criado no módulo Caixinhas
export * from './investment'    // criado no módulo Investimentos
```

Após criar, atualizar imports nos componentes para usar `@/types` em vez de caminhos individuais como `@/types/transaction`:

```typescript
// ANTES
import type { Transaction } from '@/types/transaction'
import type { SavingsBox } from '@/types/savings-box'

// DEPOIS
import type { Transaction, SavingsBox } from '@/types'
```

---

## SEÇÃO 10 — Loading e Error States por Rota

### Contexto
Next.js App Router possui convenção de arquivos `loading.tsx` e `error.tsx` por segmento de rota. O projeto não tem nenhum deles, resultando em tela em branco durante carregamentos e erros não tratados.

### 10.1 — Criar `loading.tsx` para cada rota ativa

Criar em cada diretório de rota protegida:

```
app/(main)/(authenticated)/
├── dashboard/
│   └── loading.tsx
├── transacoes/
│   └── loading.tsx
├── cadastros/
│   └── loading.tsx
├── financeiro/
│   ├── loading.tsx
│   └── resumo/
│       └── loading.tsx
├── caixinhas/
│   └── loading.tsx
├── orcamentos/
│   └── loading.tsx
└── investimentos/
    └── loading.tsx
```

**Template padrão de `loading.tsx`** (adaptar título por módulo):
```tsx
// app/(main)/(authenticated)/dashboard/loading.tsx
import { PageShell } from '@/components/shared/page-shell'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <PageShell title="Dashboard" subtitle="Carregando...">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl mt-4" />
    </PageShell>
  )
}
```

### 10.2 — Criar `error.tsx` para cada rota ativa

```tsx
// Padrão para error.tsx em qualquer rota
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Sollyd Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-6">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="text-xl font-semibold">Algo deu errado</h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        Ocorreu um erro ao carregar esta página. Tente novamente.
      </p>
      <Button onClick={reset} variant="outline">
        Tentar novamente
      </Button>
    </div>
  )
}
```

---

## SEÇÃO 11 — Rota Duplicada: /financeiro/investimentos vs /investimentos

### Contexto
Existem duas rotas relacionadas a investimentos:
- `/financeiro/investimentos` — ativa, dentro do módulo financeiro
- `/investimentos` — novo módulo em desenvolvimento

Isso cria confusão de navegação e dados duplicados.

### 11.1 — Avaliar e decidir a estratégia

**Opção A (recomendada):** Transformar `/financeiro/investimentos` em um redirect para `/investimentos` após o módulo novo estar completo:

```typescript
// app/(main)/(authenticated)/financeiro/investimentos/page.tsx
import { redirect } from 'next/navigation'

export default function FinanceiroInvestimentosPage() {
  redirect('/investimentos')
}
```

**Opção B:** Manter `/financeiro/investimentos` como visão resumida de investimentos dentro do contexto financeiro (sumário), e `/investimentos` como a carteira completa.

Implementar a opção escolhida e **atualizar a sidebar** para refletir a navegação correta — não ter dois itens que levam a conteúdo conceitualmente igual.

---

## SEÇÃO 12 — Documentação de Código nas Server Actions

### Contexto
As Server Actions são o coração do backend da aplicação, mas não têm documentação mínima de responsabilidade, parâmetros e efeitos colaterais. Isso dificulta manutenção.

### 12.1 — Adicionar JSDoc mínimo em cada Server Action

Padrão a aplicar no topo de cada função exportada:

```typescript
/**
 * Busca transações do usuário autenticado com filtros opcionais.
 *
 * @param filters - Objeto de filtros: range, from, to, search, status, wallet_id
 * @returns Array de transações com joins de category, payee, wallet, classification
 * @throws Redireciona para /login se sessão inválida
 *
 * @sideEffects Nenhum — somente leitura
 */
export async function getTransactions(filters: TransactionFilters) { ... }

/**
 * Cria ou atualiza uma transação.
 *
 * @param data - Dados validados pelo transactionSchema (Zod)
 * @param id - Se fornecido, atualiza; se null/undefined, cria nova
 * @returns { success: true, data } | { success: false, error: string }
 *
 * @sideEffects
 * - INSERT/UPDATE em `transactions`
 * - revalidatePath('/transacoes')
 * - revalidatePath('/dashboard')
 */
export async function saveTransaction(data: TransactionInput, id?: string) { ... }
```

---

## SEÇÃO 13 — Limpeza de Migrações SQL

### Contexto
13 migrações com sobreposições óbvias (tabela `payees` tocada em 5 arquivos diferentes) tornam impossível entender o schema atual sem executar todas em ordem. Isso é um risco operacional.

### 13.1 — Criar documento de schema consolidado

Criar `database/SCHEMA_BASELINE.md`:

```markdown
# Sollyd — Schema Baseline (Estado atual após todas as migrações)

> **Última atualização:** 2026-06-15
> **Migrações aplicadas:** 001 a 013 (legado) + 014 (Caixinhas) + 015 (Orçamentos) + 016 (Investimentos) + 017 (Enum cleanup)

## Tabelas ativas e seus campos atuais

### wallets
[listar campos atuais conforme PROJECT_OVERVIEW]

### transactions
[listar campos atuais — type agora é transaction_type ENUM com 'Receita'/'Despesa']

### payees
[listar campos]

### categories / subcategories
[listar campos]

### classifications
[listar campos]

### savings_boxes / savings_box_contributions
[listar campos — adicionados pela migração 014]

### budgets / budget_months
[listar campos — adicionados pela migração 015]

### investment_assets / investment_operations
[listar campos — adicionados pela migração 016]

## Migrações legadas (001-013) — resumo do que cada uma fez
[documentar brevemente para auditoria histórica]
```

### 13.2 — Identificar e sinalizar migrações obsoletas

Adicionar comentário no topo das migrações que representam conceitos descartados:

```sql
-- 004_payers_and_payees.sql
-- ⚠️ OBSOLETA: O conceito de 'payers' separado foi descartado.
-- A tabela payees serve tanto para pagadores quanto beneficiários
-- conforme o campo 'type'. Mantida apenas por histórico.
-- Não executar em novos ambientes — use 001_cadastros_schema.sql + 003_create_payees_complete.sql.
```

---

## SEÇÃO 14 — Atualização dos Documentos de Referência

### Contexto
O README está desatualizado (2026-01-27) e não reflete os módulos novos. O PROJECT_OVERVIEW (2026-04-08) também está desatualizado.

### 14.1 — Atualizar `README.md`

Acrescentar as seguintes seções/atualizações:

**Atualizar seção 3.1 (Transaction Types):**
```markdown
| Concept | Database Value (Strict) | Note |
| Income | 'Receita' | Migração 017 removeu valores legados |
| Expense | 'Despesa' | Migração 017 removeu valores legados |
```

Remover a linha sobre `dual-check` (não é mais necessário após migração 017).

**Adicionar seção "Módulos Implementados":**
```markdown
## 7. Módulos

| Módulo | Rota | Status | Migração |
|---|---|---|---|
| Autenticação | /login, /signup | ✅ Completo | - |
| Dashboard | /dashboard | ✅ Funcional | - |
| Transações | /transacoes | ✅ Completo | 001-013 |
| Cadastros | /cadastros | ✅ Completo | 001-013 |
| Financeiro | /financeiro/* | ✅ Funcional | - |
| Caixinhas | /caixinhas | ✅ Completo | 014 |
| Orçamentos | /orcamentos | ✅ Completo | 015 |
| Investimentos | /investimentos | ✅ Completo | 016 |
| Admin | /admin | 🚧 Em desenvolvimento | - |
```

**Atualizar seção 6 (Common Issues):**
Remover o item sobre mismatch de tipo `revenue` vs `Receita` — foi resolvido pela migração 017 e padronização de constantes.

**Atualizar "Last Updated"** para a data atual.

### 14.2 — Atualizar `PROJECT_OVERVIEW.md`

- Adicionar as novas tabelas no Modelo de Dados (savings_boxes, budgets, investment_assets e suas relacionadas)
- Atualizar a lista de migrações para incluir 014-017
- Atualizar o Estado do Projeto na seção 13 para refletir Caixinhas, Orçamentos, Investimentos como completos
- Atualizar a estrutura de diretórios para refletir a nova organização de `components/`
- Atualizar os hooks: `hooks/use-payees.ts` (renomeado de usePayees.ts)
- Adicionar os novos arquivos em `lib/`: `constants.ts`, `date-utils.ts`, `budget-utils.ts`, `investment-utils.ts`, `savings-box-utils.ts`
- Adicionar os novos arquivos em `types/`: `budget.ts`, `savings-box.ts`, `investment.ts`, `index.ts`

---

## SEÇÃO 15 — Validações Finais e Checklist de Conclusão

Executar **na ordem** ao finalizar todas as seções anteriores:

```bash
# 1. Type check completo — deve passar sem erros
bun run type-check

# 2. Lint — deve passar sem warnings de unused imports
bun run lint

# 3. Build de produção — deve compilar com sucesso
bun run build

# 4. Verificação de imports quebrados
grep -rn "from.*shared/transaction-filters\|from.*lib/supabase'" \
  --include="*.ts" --include="*.tsx" .
# Deve retornar zero resultados

# 5. Verificação de strings hardcoded remanescentes
grep -rn "\"revenue\"\|\"expense\"\|'revenue'\|'expense'" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="node_modules" .
# Deve retornar zero resultados (exceto em comentários históricos)

# 6. Verificar que chart.js foi removido
grep -rn "chart.js\|react-chartjs" --include="*.ts" --include="*.tsx" .
# Deve retornar zero resultados

# 7. Verificar a migração 017 no Supabase
# SELECT type, COUNT(*) FROM transactions GROUP BY type;
# Deve retornar SOMENTE 'Receita' e 'Despesa'
```

### Checklist Final

**Banco de dados:**
- [ ] Migração 017 aplicada e verificada
- [ ] Nenhum registro com `type` em inglês em `transactions`
- [ ] `categories` e `payees` também verificados
- [ ] `SCHEMA_BASELINE.md` criado e atualizado

**Código:**
- [ ] Cliente Supabase consolidado — `lib/supabase.ts` removido
- [ ] `shared/` na raiz removida — conteúdo movido para `components/shared/`
- [ ] Todos os componentes reorganizados nas subpastas corretas
- [ ] `hooks/usePayees.ts` → `hooks/use-payees.ts`
- [ ] `app/actions/contacts.ts` → `app/actions/payees.ts`
- [ ] `lib/constants.ts` criado e sendo usado nas actions
- [ ] `lib/date-utils.ts` criado e usado onde há manipulação de datas
- [ ] `types/index.ts` criado com re-exports
- [ ] Chart.js removido — todos os gráficos em Recharts
- [ ] `loading.tsx` criado para todas as rotas ativas
- [ ] `error.tsx` criado para todas as rotas ativas
- [ ] Rota `/financeiro/investimentos` resolvida (redirect ou conteúdo diferenciado)
- [ ] JSDoc adicionado nas Server Actions principais

**Qualidade:**
- [ ] `bun run type-check` passa sem erros
- [ ] `bun run lint` passa sem warnings
- [ ] `bun run build` compila com sucesso
- [ ] Zero imports de `lib/supabase` (arquivo raiz legado)
- [ ] Zero strings `'revenue'` ou `'expense'` no código ativo
- [ ] Zero imports de `chart.js` ou `react-chartjs-2`

**Documentação:**
- [ ] `README.md` atualizado (data + módulos + remoção de regras obsoletas)
- [ ] `PROJECT_OVERVIEW.md` atualizado (estrutura + migrações + estado)

---

## NOTAS TÉCNICAS FINAIS

- **Ordem é crítica:** A migração SQL (Seção 1) deve ser aplicada no Supabase **antes** das alterações de código das Seções 1.2-1.5. Código novo com enum limpo tentando gravar no banco antigo causará erros de constraint.
- **Não fazer big-bang:** Se o projeto estiver em produção com usuários reais, a Seção 3 (reorganização de componentes) deve ser feita em branches separadas e testadas antes de merge.
- **Bun:** Usar sempre `bun` — nunca `npm` ou `yarn`. Para remover pacotes: `bun remove <pacote>`.
- **Imports absolutos:** Todos os imports devem usar o alias `@/` configurado no `tsconfig.json` — nunca caminhos relativos com `../../`.
- **`'use server'`:** Toda Server Action deve ter essa diretiva no topo do arquivo. Verificar se todos os arquivos em `app/actions/` a têm.
- **`'use client'`:** Verificar se nenhum Client Component está sendo importado diretamente por um Server Component sem passar por um boundary adequado.
