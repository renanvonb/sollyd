# Prompt de Implementação — Módulo Orçamentos (Sollyd)

> **Para:** Antigravity
> **Projeto:** Sollyd — Next.js 14 + Supabase + shadcn/ui
> **Módulo:** Orçamentos (controle de limites de gasto por categoria/subcategoria)
> **Prioridade:** Alta
> **Data:** 2026-06-15

---

## 1. Contexto Geral

O Sollyd é uma plataforma SaaS de gestão financeira com stack Next.js 14 (App Router), Supabase (PostgreSQL + RLS), shadcn/ui, React Hook Form, Zod, Tailwind CSS e TypeScript. A rota `/orcamentos` já existe no projeto como stub em desenvolvimento.

O módulo de **Orçamentos** permite ao usuário definir um limite máximo de gastos por categoria (e opcionalmente por subcategoria), com um valor padrão mensal recorrente e a possibilidade de sobrescrever meses específicos. O consumo do orçamento é calculado com base no campo `competence` (mês de competência) das transações do tipo `Despesa`. Alertas visuais (badges e cores) são exibidos no módulo de orçamentos, na tabela de transações e no dashboard quando um orçamento está se aproximando do limite ou foi ultrapassado.

A implementação deve seguir exatamente os padrões do projeto:

- Server Actions em `app/actions/`
- Componentes client em `components/`
- RLS garantindo isolamento por `user_id`
- Validação com Zod + React Hook Form
- Notificações com Sonner (`toast`)
- Rota protegida em `app/(main)/(authenticated)/orcamentos/`
- Item ativado na sidebar (`components/app-sidebar.tsx`) — já existe, apenas ativar o link

---

## 2. Regras de Negócio Centrais

Antes de implementar qualquer código, internalize estas regras:

### 2.1 Hierarquia de orçamento

Um orçamento pode ser definido em dois níveis:
- **Nível categoria** — aplica-se à soma de todas as transações da categoria (independente de subcategoria)
- **Nível subcategoria** — aplica-se apenas às transações daquela subcategoria específica

Ambos podem coexistir. Exemplo: categoria "Alimentação" tem limite de R$2.000/mês; subcategoria "Restaurantes" (dentro de Alimentação) tem limite de R$800/mês. O consumo de "Restaurantes" conta tanto para o orçamento da subcategoria quanto para o da categoria-pai.

### 2.2 Valor padrão + sobrescrita mensal

Cada orçamento tem:
- `default_amount` — valor padrão que se repete automaticamente em todo mês sem sobrescrita
- `budget_months` — tabela de sobrescritas: define um `amount` específico para um `year_month` (ex: `2026-03`). Se não houver registro para um mês, usa `default_amount`.

### 2.3 Campo de referência temporal

O consumo é sempre calculado pelo campo `competence` da transação, nunca pelo campo `date`. Transações sem `competence` preenchido **não são contabilizadas** em nenhum orçamento.

### 2.4 Tipos de transação

Orçamentos se aplicam **somente a Despesas** (`type IN ('Despesa', 'expense')`).

### 2.5 Limiares de alerta (thresholds)

| Status | Condição | Cor / Badge |
|---|---|---|
| `ok` | consumido < 75% | Verde / sem badge |
| `warning` | consumido ≥ 75% e < 100% | Amarelo `#F59E0B` |
| `exceeded` | consumido ≥ 100% | Vermelho `#EF4444` |

Os thresholds (75% e 100%) são fixos nesta versão.

---

## 3. Schema do Banco de Dados

### 3.1 Criar migração `015_create_budgets.sql`

```sql
-- ============================================================
-- TABELA: budgets (Orçamentos)
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subcategory_id   UUID REFERENCES subcategories(id) ON DELETE CASCADE,
  name             TEXT,                          -- opcional, para identificação rápida
  default_amount   NUMERIC(12,2) NOT NULL CHECK (default_amount > 0),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garante um orçamento por categoria (ou por categoria+subcategoria) por usuário
  UNIQUE (user_id, category_id, subcategory_id)
);

-- ============================================================
-- TABELA: budget_months (Sobrescritas mensais)
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_months (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  year_month  TEXT NOT NULL,   -- formato: 'YYYY-MM' (ex: '2026-03')
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (budget_id, year_month)
);

-- ============================================================
-- ROW LEVEL SECURITY — budgets
-- ============================================================
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ROW LEVEL SECURITY — budget_months
-- ============================================================
ALTER TABLE budget_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget_months"
  ON budget_months FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget_months"
  ON budget_months FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget_months"
  ON budget_months FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget_months"
  ON budget_months FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- VIEW: budget_consumption (leitura de consumo por mês)
-- Facilita queries de consumo sem lógica repetida no app
-- ============================================================
CREATE OR REPLACE VIEW budget_consumption AS
SELECT
  b.id                              AS budget_id,
  b.user_id,
  b.category_id,
  b.subcategory_id,
  b.name,
  b.default_amount,
  b.is_active,
  TO_CHAR(DATE_TRUNC('month', t.competence), 'YYYY-MM') AS year_month,
  -- Usa sobrescrita mensal se existir, senão usa default
  COALESCE(bm.amount, b.default_amount)                  AS budget_amount,
  COALESCE(SUM(t.amount), 0)                             AS spent_amount,
  COALESCE(SUM(t.amount), 0) / COALESCE(bm.amount, b.default_amount) * 100
                                                          AS percentage
FROM budgets b
LEFT JOIN budget_months bm
  ON bm.budget_id = b.id
  AND bm.year_month = TO_CHAR(DATE_TRUNC('month', t.competence), 'YYYY-MM')
LEFT JOIN transactions t
  ON t.user_id   = b.user_id
  AND t.category_id = b.category_id
  AND (b.subcategory_id IS NULL OR t.subcategory_id = b.subcategory_id)
  AND t.type IN ('Despesa', 'expense')
  AND t.competence IS NOT NULL
WHERE b.is_active = true
GROUP BY
  b.id, b.user_id, b.category_id, b.subcategory_id,
  b.name, b.default_amount, b.is_active,
  TO_CHAR(DATE_TRUNC('month', t.competence), 'YYYY-MM'),
  bm.amount;
```

> **Atenção:** A view `budget_consumption` usa RLS indiretamente via `b.user_id`. Para segurança adicional, ao consultar a view sempre filtre por `user_id` = auth.uid() nas queries das Server Actions.

---

## 4. Tipos TypeScript

### Criar `types/budget.ts`

```typescript
export type Budget = {
  id: string
  user_id: string
  category_id: string
  subcategory_id: string | null
  name: string | null
  default_amount: number
  is_active: boolean
  created_at: string
  updated_at: string
  // joins
  category?: {
    id: string
    name: string
    icon: string
    color: string
  }
  subcategory?: {
    id: string
    name: string
  } | null
  months?: BudgetMonth[]
}

export type BudgetMonth = {
  id: string
  user_id: string
  budget_id: string
  year_month: string   // 'YYYY-MM'
  amount: number
  created_at: string
  updated_at: string
}

export type BudgetStatus = 'ok' | 'warning' | 'exceeded'

export type BudgetConsumption = {
  budget_id: string
  category_id: string
  subcategory_id: string | null
  category_name: string
  category_icon: string
  category_color: string
  subcategory_name: string | null
  budget_name: string | null
  year_month: string           // 'YYYY-MM'
  budget_amount: number        // limite para aquele mês (sobrescrita ou default)
  spent_amount: number         // total gasto no mês
  remaining_amount: number     // budget_amount - spent_amount
  percentage: number           // 0–N (pode passar de 100)
  status: BudgetStatus
}

export type BudgetWithConsumption = Budget & {
  current_month_consumption: BudgetConsumption | null
}
```

---

## 5. Utilitário de Status

### Criar `lib/budget-utils.ts`

```typescript
import type { BudgetStatus, BudgetConsumption } from '@/types/budget'

export const BUDGET_THRESHOLDS = {
  WARNING: 75,    // % a partir do qual exibe aviso amarelo
  EXCEEDED: 100,  // % a partir do qual exibe alerta vermelho
} as const

export function getBudgetStatus(percentage: number): BudgetStatus {
  if (percentage >= BUDGET_THRESHOLDS.EXCEEDED) return 'exceeded'
  if (percentage >= BUDGET_THRESHOLDS.WARNING) return 'warning'
  return 'ok'
}

export function getBudgetStatusColor(status: BudgetStatus): string {
  switch (status) {
    case 'exceeded': return '#EF4444'   // red-500
    case 'warning':  return '#F59E0B'   // amber-500
    case 'ok':       return '#22C55E'   // green-500
  }
}

export function getBudgetStatusLabel(status: BudgetStatus): string {
  switch (status) {
    case 'exceeded': return 'Limite ultrapassado'
    case 'warning':  return 'Próximo do limite'
    case 'ok':       return 'Dentro do limite'
  }
}

// Formata 'YYYY-MM' → 'Jan/2026'
export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace(' de ', '/')
    .replace('.', '')
}

// Retorna 'YYYY-MM' do mês atual
export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Enriquece dados brutos com status calculado
export function enrichConsumption(raw: Omit<BudgetConsumption, 'remaining_amount' | 'status'>): BudgetConsumption {
  return {
    ...raw,
    remaining_amount: Math.max(raw.budget_amount - raw.spent_amount, 0),
    status: getBudgetStatus(raw.percentage),
  }
}
```

---

## 6. Server Actions

### Criar `app/actions/budgets.ts`

Use `createClient` de `@/lib/supabase/server` e `revalidatePath` do Next.js. Todas as actions retornam `{ success: true, data } | { success: false, error: string }`.

#### 6.1 `getBudgets`
```typescript
// Retorna todos os orçamentos ativos do usuário
// JOIN com categories e subcategories
// Para cada budget, inclui também a sobrescrita do mês atual (budget_months)
// Ordenar por: category name ASC, subcategory name ASC NULLS FIRST
```

#### 6.2 `getBudgetConsumptionForMonth`
```typescript
// Input: { year_month: string }  ex: '2026-06'
// Retorna BudgetConsumption[] para todos os orçamentos do usuário no mês informado
// Query principal:
//   SELECT b.*, c.name, c.icon, c.color, sc.name,
//          COALESCE(bm.amount, b.default_amount) AS budget_amount,
//          COALESCE(SUM(t.amount), 0) AS spent_amount
//   FROM budgets b
//   JOIN categories c ON c.id = b.category_id
//   LEFT JOIN subcategories sc ON sc.id = b.subcategory_id
//   LEFT JOIN budget_months bm ON bm.budget_id = b.id AND bm.year_month = input.year_month
//   LEFT JOIN transactions t ON
//     t.user_id = b.user_id AND
//     t.category_id = b.category_id AND
//     (b.subcategory_id IS NULL OR t.subcategory_id = b.subcategory_id) AND
//     t.type IN ('Despesa', 'expense') AND
//     TO_CHAR(DATE_TRUNC('month', t.competence), 'YYYY-MM') = input.year_month
//   WHERE b.user_id = auth.uid() AND b.is_active = true
//   GROUP BY b.id, c.name, c.icon, c.color, sc.name, bm.amount
// Aplicar enrichConsumption() em cada item antes de retornar
```

#### 6.3 `getBudgetConsumptionForTransaction`
```typescript
// Input: { category_id: string, subcategory_id?: string | null, year_month: string }
// Retorna BudgetConsumption | null para UMA categoria/subcategoria num mês
// Usado pelo transaction-form para exibir preview de orçamento ao salvar transação
// Reutiliza a mesma query de 6.2 mas filtrando por category_id e subcategory_id
```

#### 6.4 `createBudget`
```typescript
// Input: {
//   category_id: string (uuid)
//   subcategory_id?: string | null
//   name?: string
//   default_amount: number
// }
// Validação Zod:
//   - category_id: uuid obrigatório
//   - subcategory_id: uuid opcional nullable
//   - name: string max 60 opcional
//   - default_amount: number > 0
// Verifica se já existe budget para category_id + subcategory_id do usuário
//   → Se existir: retorna { success: false, error: 'Já existe um orçamento para esta categoria' }
// Insere em budgets
// revalidatePath('/orcamentos')
```

#### 6.5 `updateBudget`
```typescript
// Input: { id, name?, default_amount? }
// Atualiza budgets SET name, default_amount, updated_at WHERE id AND user_id
// revalidatePath('/orcamentos')
```

#### 6.6 `upsertBudgetMonth`
```typescript
// Input: { budget_id, year_month, amount }
// Validação: year_month deve ser 'YYYY-MM'
// Se amount === default_amount do budget → deleta a sobrescrita (se existir), retornando ao padrão
// Caso contrário: INSERT ... ON CONFLICT (budget_id, year_month) DO UPDATE SET amount
// revalidatePath('/orcamentos')
```

#### 6.7 `deleteBudgetMonth`
```typescript
// Input: { budget_id, year_month }
// Deleta a sobrescrita mensal, restaurando o default_amount para aquele mês
// revalidatePath('/orcamentos')
```

#### 6.8 `deleteBudget`
```typescript
// Input: { id }
// DELETE FROM budgets WHERE id AND user_id (CASCADE deleta budget_months)
// revalidatePath('/orcamentos')
```

#### 6.9 `toggleBudgetActive`
```typescript
// Input: { id, is_active: boolean }
// Pausa/ativa um orçamento sem deletá-lo
// revalidatePath('/orcamentos')
```

#### 6.10 `getBudgetsAlertSummary`
```typescript
// Retorna resumo de alertas para o mês atual — usado pelo Dashboard
// Retorna: { warning: number, exceeded: number, total: number }
// Onde warning e exceeded são contagens de orçamentos nesses status no mês corrente
// Usado para exibir badge de alerta no card do dashboard
```

---

## 7. Estrutura de Arquivos

```
app/
└── (main)/
    └── (authenticated)/
        └── orcamentos/
            └── page.tsx                       # Server Component — busca dados e passa para client

components/
└── orcamentos/
    ├── orcamentos-client.tsx                  # Client — orquestra estado, mês selecionado, modals
    ├── budget-card.tsx                        # Card de orçamento com barra de progresso
    ├── budget-grid.tsx                        # Grid de cards de orçamento
    ├── budget-form.tsx                        # Dialog de criar orçamento
    ├── budget-month-editor.tsx                # Sheet/Dialog de edição de meses do orçamento
    ├── budget-month-row.tsx                   # Linha de cada mês com valor e override
    ├── budget-status-badge.tsx                # Badge reutilizável (ok/warning/exceeded)
    ├── budget-progress-bar.tsx                # Barra de progresso reutilizável com cor semântica
    └── empty-orcamentos.tsx                   # Estado vazio

app/actions/
└── budgets.ts                                 # Todas as Server Actions

types/
└── budget.ts                                  # Tipos TypeScript

lib/
└── budget-utils.ts                            # Utilitários e thresholds
```

---

## 8. Componentes — Especificações Detalhadas

### 8.1 `app/(main)/(authenticated)/orcamentos/page.tsx`

```typescript
// Server Component
// 1. Chama getBudgets() e getBudgetConsumptionForMonth({ year_month: currentYearMonth() })
// 2. Renderiza <PageShell> com título "Orçamentos" e subtítulo "Controle seus limites de gasto por categoria"
// 3. Passa dados para <OrcamentosClient budgets={} consumptions={} />
```

### 8.2 `budget-card.tsx`

Layout de cada card:

```
┌────────────────────────────────────────────────────┐
│  [ícone categoria]  Alimentação          [⋯ menu]  │
│  Restaurantes ← subcategoria (se houver)           │
│                                                    │
│  ████████████████░░░░  82%    ← barra semântica    │
│                                                    │
│  R$ 1.640,00 gastos de R$ 2.000,00                │
│  ⚠ Faltam R$ 360,00  ← badge amarelo              │
│                                                    │
│  Padrão: R$ 2.000,00/mês  [Editar meses →]        │
└────────────────────────────────────────────────────┘
```

**Especificações visuais:**
- Background: `bg-card border border-border rounded-2xl`
- Barra de progresso: componente `<BudgetProgressBar>` com cor semântica
  - `ok` → `bg-green-500`
  - `warning` → `bg-amber-500`
  - `exceeded` → `bg-red-500`
- Badge de status via `<BudgetStatusBadge>`
- Ícone da categoria: renderizado via Lucide, cor da categoria aplicada no container com 20% opacidade
- Dropdown de ações: `DropdownMenu` shadcn/ui com opções: Editar padrão / Editar meses / Pausar / Excluir
- Quando `is_active = false`: card com opacidade reduzida + badge "Pausado"

### 8.3 `budget-progress-bar.tsx`

```typescript
// Props: { percentage: number, status: BudgetStatus, showLabel?: boolean }
// Barra com altura h-2.5, rounded-full, animação de fill via width transition
// Pode ultrapassar 100% visualmente — cap na largura em 100%, mas manter label numérico real
// showLabel=true exibe o percentual à direita
```

### 8.4 `budget-status-badge.tsx`

```typescript
// Props: { status: BudgetStatus, percentage?: number }
// ok      → sem badge (retorna null)
// warning → badge amarelo "⚠ {percentage}% — Próximo do limite"
// exceeded→ badge vermelho "🔴 {percentage}% — Limite ultrapassado"
// Usar <Badge> do shadcn/ui com variant customizado por status
```

### 8.5 `budget-form.tsx`

Dialog de criação de orçamento. Campos:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Categoria | Select | Sim | Busca de `categories` do usuário com `type = 'Despesa'` apenas |
| Subcategoria | Select | Não | Carregado dinamicamente ao selecionar categoria; opção "Toda a categoria" para null |
| Nome | Input text | Não | Identificação rápida; max 60 chars |
| Valor padrão mensal | Input number | Sim | Formatado BRL; label "Limite padrão (todos os meses)" |

Exibir ao pé do form:
> "O valor padrão se repete em todos os meses. Você pode sobrescrever meses específicos após criar o orçamento."

Ao selecionar uma categoria que já possui orçamento (sem subcategoria), exibir aviso inline:
> "Esta categoria já possui um orçamento geral. Você pode criar um orçamento específico para uma subcategoria."

### 8.6 `budget-month-editor.tsx`

Sheet lateral (ou Dialog largo) que abre ao clicar "Editar meses". Exibe os últimos 6 meses + próximos 6 meses (12 meses no total), centrado no mês atual.

Para cada mês exibe `<BudgetMonthRow>`:

```
Jan/2026   [R$ 2.000,00]  ← input editável     [Restaurar padrão ×]
Fev/2026   [R$ 1.500,00]  ← sobrescrita ativa   [Restaurar padrão ×]
Mar/2026   [R$ 2.000,00]  ← usando padrão       (sem botão de restaurar)
Abr/2026   R$ 1.892,40 gastos  82%  ⚠           ← mês com consumo
```

**Comportamento:**
- Meses sem sobrescrita exibem o `default_amount` em cinza (placeholder)
- Ao editar um valor e confirmar: chama `upsertBudgetMonth`
- Se o valor digitado for igual ao `default_amount`: chama `deleteBudgetMonth` (restaura padrão)
- Meses com consumo registrado exibem a barra de progresso inline

### 8.7 `empty-orcamentos.tsx`

Estado vazio com:
- Ícone `PieChart` tamanho grande, cor `#E0FE56`
- Título: "Nenhum orçamento definido"
- Subtítulo: "Defina limites de gasto por categoria e acompanhe seu progresso mês a mês."
- Botão: "Criar primeiro orçamento"

---

## 9. Seletor de Mês na Página Principal

A página `/orcamentos` deve ter um seletor de mês no header (ao lado do botão "Novo Orçamento") que permite navegar entre meses (← Mês anterior | Mai/2026 | Mês seguinte →).

- Estado gerenciado no `OrcamentosClient` via `useState` com `year_month` atual como default
- Ao trocar de mês: chama `getBudgetConsumptionForMonth` com o novo mês (pode ser uma Server Action chamada via `useTransition` ou refetch do Server Component via `router.push` com query param `?month=YYYY-MM`)
- **Recomendado:** usar query param `?month=YYYY-MM` na URL para que o estado seja compartilhável e o Server Component faça o fetch direto — leia o `searchParams` no `page.tsx`

---

## 10. Integrações com Módulos Existentes

Esta é a parte crítica da implementação. Os módulos abaixo devem ser modificados para exibir informações de orçamento.

---

### 10.1 Dashboard — `components/dashboard-client.tsx`

**Adicionar seção "Alertas de Orçamento"** no dashboard, abaixo dos cards de resumo financeiro existentes. A seção deve:

1. Chamar `getBudgetsAlertSummary()` no Server Component do dashboard (`app/(main)/(authenticated)/dashboard/page.tsx`) e passar como prop
2. Se `summary.warning === 0 && summary.exceeded === 0`: não exibir a seção
3. Se houver alertas: exibir card compacto:

```
┌──────────────────────────────────────────────────────┐
│  ⚠ Alertas de Orçamento                             │
│                                                      │
│  2 orçamentos próximos do limite                     │
│  1 orçamento ultrapassado                            │
│                                                      │
│  [Ver orçamentos →]                                  │
└──────────────────────────────────────────────────────┘
```

- Card com borda esquerda colorida: amarela se só warnings, vermelha se houver exceeded
- Link "Ver orçamentos →" navega para `/orcamentos`
- Respeita o filtro de mês do dashboard (passar o mês selecionado no dashboard para a query de alertas)

**Modificação necessária em `dashboard-metrics.ts`:**
```typescript
// Adicionar export: getBudgetsAlertSummaryForDashboard(year_month: string)
// Reutilizar getBudgetsAlertSummary() já criado em budgets.ts
```

---

### 10.2 Tabela de Transações — `components/transaction-table.tsx`

**Adicionar indicador de orçamento na coluna "Categoria".**

Atualmente a coluna Categoria exibe um Badge simples com o nome. Modificar para:

1. Ao renderizar uma transação do tipo `Despesa` com `category_id` preenchido e `competence` preenchido:
   - Verificar se existe orçamento ativo para aquela `category_id` / `subcategory_id`
   - Se existir e o status for `warning` ou `exceeded`: exibir um ícone de alerta ao lado do badge da categoria

2. Os dados de consumo devem ser passados como prop para a tabela — **não fazer fetch por linha** (isso causaria N+1 queries).

**Implementação recomendada:**

No Server Component que busca as transações (`app/actions/transactions-fetch.ts` ou o page.tsx de `/transacoes`):

```typescript
// Após buscar as transações, buscar também:
const currentMonthConsumptions = await getBudgetConsumptionForMonth({ year_month: currentYearMonth() })

// Criar um Map para lookup O(1):
// key: `${category_id}:${subcategory_id ?? 'null'}`
// value: BudgetConsumption
const budgetMap = new Map(
  currentMonthConsumptions.map(c => [
    `${c.category_id}:${c.subcategory_id ?? 'null'}`,
    c
  ])
)
```

Passar `budgetMap` como prop para `TransactionTable` / `TransactionsClient`.

Na coluna Categoria da tabela:
```tsx
// Após o badge da categoria, se a transação for Despesa:
{transaction.type === 'Despesa' || transaction.type === 'expense' ? (
  <BudgetIndicatorIcon
    consumption={budgetMap.get(`${transaction.category_id}:${transaction.subcategory_id ?? 'null'}`)}
  />
) : null}
```

**Criar `components/orcamentos/budget-indicator-icon.tsx`:**
```typescript
// Props: { consumption: BudgetConsumption | undefined }
// se consumption === undefined ou status === 'ok': retorna null
// warning: ícone AlertTriangle amarelo com Tooltip "⚠ 82% do orçamento utilizado em Mai/2026"
// exceeded: ícone AlertCircle vermelho com Tooltip "🔴 Orçamento de Alimentação ultrapassado em Mai/2026"
// Usar <Tooltip> do shadcn/ui
```

---

### 10.3 Formulário de Transação — `components/transaction-form.tsx`

**Exibir preview de orçamento ao selecionar categoria em transações do tipo Despesa.**

Quando o usuário:
1. Seleciona `type = 'Despesa'`
2. Seleciona uma `category_id`
3. E há um `competence` preenchido (ou usa o mês atual como fallback)

Exibir abaixo do campo de categoria um componente inline `<BudgetPreview>`:

```
┌────────────────────────────────────────┐
│  Orçamento: Alimentação — Mai/2026     │
│  ████████████░░░░  68%                 │
│  R$ 1.360,00 de R$ 2.000,00 usados    │
│  Após este lançamento: R$ 1.860,00    │← se amount preenchido
└────────────────────────────────────────┘
```

**Implementação:**

1. Criar `components/orcamentos/budget-preview.tsx`:
```typescript
// Props: { categoryId: string, subcategoryId?: string | null, yearMonth: string, pendingAmount?: number }
// Faz fetch client-side via Server Action getBudgetConsumptionForTransaction()
// Usar useEffect + useState para buscar quando categoryId ou yearMonth mudam
// Exibir skeleton enquanto carrega
// Se não houver orçamento para a categoria: retorna null (sem exibir nada)
// Se houver: exibir card compacto com barra de progresso e valores
// Se pendingAmount > 0: exibir linha extra "Após este lançamento: R$ X"
//   e mudar a cor da barra para amarela/vermelha se o novo total ultrapassar threshold
```

2. No `transaction-form.tsx`, integrar `<BudgetPreview>` após o campo de categoria:
```typescript
// Adicionar watch dos campos: type, category_id, subcategory_id, competence, amount
// Extrair year_month de competence (ou currentYearMonth() se nulo)
// Renderizar <BudgetPreview> condicionalmente:
{watchedType === 'Despesa' && watchedCategoryId && (
  <BudgetPreview
    categoryId={watchedCategoryId}
    subcategoryId={watchedSubcategoryId}
    yearMonth={extractYearMonth(watchedCompetence)}
    pendingAmount={watchedAmount}
  />
)}
```

---

## 11. Fluxos de UX

### Fluxo de Criação de Orçamento
1. Usuário clica em "Novo Orçamento"
2. `BudgetForm` abre como `Dialog`
3. Usuário seleciona categoria (somente tipo Despesa), subcategoria opcional, valor padrão
4. Submit → `createBudget`
5. Toast: "Orçamento criado com sucesso!"
6. Card aparece no grid com consumo do mês atual calculado

### Fluxo de Edição de Meses
1. Usuário clica em "Editar meses" no dropdown do card
2. `BudgetMonthEditor` abre como Sheet lateral
3. Usuário edita valores de meses específicos
4. Cada campo tem botão de salvar inline (ou auto-save com debounce de 800ms)
5. Ao salvar: `upsertBudgetMonth` → toast discreto "Mês atualizado"
6. "Restaurar padrão" → `deleteBudgetMonth` → campo volta a mostrar default_amount em cinza

### Fluxo de Pausa de Orçamento
1. Dropdown → "Pausar"
2. `toggleBudgetActive({ id, is_active: false })`
3. Card fica com opacidade reduzida + badge "Pausado"
4. Orçamento pausado não aparece em alertas nem no dashboard
5. Dropdown passa a mostrar "Reativar" no lugar de "Pausar"

### Fluxo de Exclusão
1. Dropdown → "Excluir"
2. `AlertDialog`: "Isso vai remover o orçamento e todas as sobrescritas mensais. Os gastos registrados não serão afetados. Continuar?"
3. Confirma → `deleteBudget`
4. Toast: "Orçamento removido."

---

## 12. Validações e Edge Cases

- **Categoria já orçamentada (nível geral):** Ao tentar criar orçamento geral para categoria que já tem um → erro inline no form. Permitir criar orçamento de subcategoria mesmo se já existir orçamento geral da categoria.
- **Subcategoria sem orçamento próprio:** Transações da subcategoria ainda contam para o orçamento da categoria-pai — isso é comportamento correto pela query (quando `subcategory_id IS NULL` no budget, conta todas as transações da categoria).
- **Transação sem `competence`:** Não conta em nenhum orçamento. Nenhuma indicação de alerta deve aparecer nessas transações na tabela.
- **Orçamento pausado:** Não aparece em alertas, não exibe `BudgetPreview` no form, não exibe ícone na tabela de transações.
- **Mês sem transações:** `spent_amount = 0`, `percentage = 0`, status `ok` — exibir card normalmente com 0%.
- **Transações de aportes de Caixinhas** (tipo `Despesa`, `wallet_id: null`, criadas pelo módulo Caixinhas): Se tiverem `category_id` preenchido, contarão para o orçamento. Se `category_id` for null, não contam — comportamento correto.
- **Enum híbrido de type:** A query de consumo filtra `t.type IN ('Despesa', 'expense')` para cobrir o schema híbrido existente.
- **Performance na tabela de transações:** O `budgetMap` deve ser construído uma única vez no nível do Server Component e passado via props — nunca fazer fetch por linha.
- **`year_month` formato:** Sempre `'YYYY-MM'` (string). Ao extrair de um campo `competence` (tipo `DATE`): `format(new Date(competence), 'yyyy-MM')` usando `date-fns`.

---

## 13. Ordem de Implementação Recomendada

Implementar nesta sequência para evitar dependências quebradas:

1. **Migração SQL** `015_create_budgets.sql` no Supabase
2. **Tipos** `types/budget.ts`
3. **Utilitários** `lib/budget-utils.ts`
4. **Server Actions** `app/actions/budgets.ts` (todas as 10 actions)
5. **Módulo `/orcamentos`** — page.tsx + todos os componentes em `components/orcamentos/`
6. **Sidebar** — ativar link `/orcamentos` no `app-sidebar.tsx` (já existe como stub)
7. **Dashboard** — adicionar seção de alertas em `dashboard-client.tsx` + `dashboard-metrics.ts`
8. **Tabela de transações** — adicionar `budgetMap` + `BudgetIndicatorIcon` na coluna Categoria
9. **Formulário de transação** — adicionar `BudgetPreview` após campo de categoria

---

## 14. Critérios de Conclusão (Definition of Done)

- [ ] Migração `015_create_budgets.sql` aplicada no Supabase com RLS funcionando
- [ ] CRUD completo de orçamentos (criar, editar valor padrão, pausar, excluir)
- [ ] Edição de meses individuais com upsert/delete de sobrescritas
- [ ] Grid de cards em `/orcamentos` com consumo do mês selecionado
- [ ] Seletor de mês funcional na página de orçamentos
- [ ] Barras de progresso com cor semântica (verde / amarelo / vermelho)
- [ ] Badges de status corretos nos thresholds 75% e 100%
- [ ] Seção de alertas no dashboard (somente quando há warning/exceeded)
- [ ] Ícone de alerta na coluna Categoria da tabela de transações (sem N+1 queries)
- [ ] `BudgetPreview` funcional no formulário de transação para Despesas
- [ ] Preview mostra impacto do valor sendo lançado em tempo real
- [ ] Orçamentos pausados não aparecem em alertas nem no form/tabela
- [ ] Edge case: transações sem `competence` não contam para orçamentos
- [ ] Edge case: enum híbrido (`Despesa`/`expense`) tratado em todas as queries
- [ ] Sidebar link `/orcamentos` ativo e navegável
- [ ] Estado vazio elegante com CTA
- [ ] TypeScript sem erros (`bun run type-check`)
- [ ] Sem console errors no browser
- [ ] Responsivo em mobile (375px) sem afetar layout desktop

---

## 15. Notas Técnicas Adicionais

- **Bun como package manager:** Não usar `npm install` — usar `bun add` para qualquer dependência nova.
- **Padrão de Server Action:** Sempre retornar `{ success: true, data } | { success: false, error: string }`.
- **`revalidatePath`:** Após qualquer mutação em orçamentos, revalidar `/orcamentos`. Mutações que afetam o dashboard revalidar também `/dashboard`.
- **Enum híbrido nas queries:** Sempre filtrar `type IN ('Despesa', 'expense')` nas queries de consumo — nunca apenas um dos dois valores.
- **`date-fns` para `year_month`:** Usar `format(parseISO(competence), 'yyyy-MM')` para extrair o mês de um campo `DATE` do Supabase.
- **Não criar nova dependência de gráfico** para o módulo — os componentes de barra de progresso são CSS puro com Tailwind, não Recharts.
- **Categorias no form:** Filtrar somente categorias com `type = 'Despesa'` no select, já que orçamentos são somente para despesas nesta versão.
- **View `budget_consumption`:** Pode ser usada para queries ad-hoc no Supabase Studio, mas as Server Actions devem usar queries diretas com joins explícitos para manter o controle de RLS e evitar dependência de view em produção.
