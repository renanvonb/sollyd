# Prompt de Implementação — Módulo Investimentos (Sollyd)

> **Para:** Antigravity
> **Projeto:** Sollyd — Next.js 14 + Supabase + shadcn/ui
> **Módulo:** Investimentos (carteira patrimonial com aportes, resgates, rendimentos e atualização de valor)
> **Prioridade:** Alta
> **Data:** 2026-06-15

---

## 1. Contexto Geral

O Sollyd é uma plataforma SaaS de gestão financeira com stack Next.js 14 (App Router), Supabase (PostgreSQL + RLS), shadcn/ui, React Hook Form, Zod, Tailwind CSS e TypeScript. A rota `/investimentos` já existe no projeto como stub em desenvolvimento.

O módulo de **Investimentos** é uma **carteira patrimonial manual**: o usuário cadastra ativos, registra aportes, resgates, rendimentos recebidos (dividendos, juros, cupons) e atualiza manualmente o valor atual de cada ativo. Não há integração com APIs externas de cotação nesta versão — tudo é declarativo.

**Premissa central:** investimentos se integram às carteiras (wallets) existentes do Sollyd. Aportes e resgates geram transações na tabela `transactions`, afetando o saldo total visível no dashboard. O total do patrimônio investido aparece como card no dashboard principal.

---

## 2. Modelo Mental do Módulo

Antes de qualquer implementação, internalize este modelo:

```
Ativo (investment_asset)
├── Classe: Renda Fixa | Renda Variável | Fundos | Cripto
├── Tipo específico: CDB, Ações, FII, Bitcoin, etc.
├── current_value: valor atual declarado pelo usuário (atualizado manualmente)
├── total_invested: soma de aportes - soma de resgates (calculado)
├── total_income: soma de rendimentos recebidos (calculado)
└── Operações (investment_operations)
    ├── APORTE    → gera transação Despesa na wallet (saída de dinheiro)
    ├── RESGATE   → gera transação Receita na wallet (entrada de dinheiro)
    ├── RENDIMENTO→ registra renda recebida (dividendo, juros, cupom) — opcional gerar transação Receita
    └── ATUALIZACAO_VALOR → apenas atualiza current_value, sem gerar transação
```

**Lógica de ganho/perda:**
```
ganho_perda = current_value - total_invested
ganho_perda_pct = (ganho_perda / total_invested) * 100
```

---

## 3. Classes e Tipos de Ativos Suportados

```typescript
export const INVESTMENT_CLASSES = {
  renda_fixa: {
    label: 'Renda Fixa',
    color: '#22C55E',   // green-500
    icon: 'Landmark',
    types: ['CDB', 'LCI', 'LCA', 'Tesouro Direto', 'Poupança', 'LC', 'Debênture', 'CRI', 'CRA', 'Outro RF']
  },
  renda_variavel: {
    label: 'Renda Variável',
    color: '#3B82F6',   // blue-500
    icon: 'TrendingUp',
    types: ['Ação', 'FII', 'ETF', 'BDR', 'Outro RV']
  },
  fundos: {
    label: 'Fundos',
    color: '#8B5CF6',   // violet-500
    icon: 'PieChart',
    types: ['Fundo de Renda Fixa', 'Fundo Multimercado', 'Fundo de Ações', 'Fundo Cambial', 'Previdência Privada', 'Outro Fundo']
  },
  cripto: {
    label: 'Criptomoedas',
    color: '#F59E0B',   // amber-500
    icon: 'Bitcoin',
    types: ['Bitcoin', 'Ethereum', 'Stablecoin', 'Altcoin', 'Outro Cripto']
  },
} as const

export type InvestmentClass = keyof typeof INVESTMENT_CLASSES
export type OperationType = 'aporte' | 'resgate' | 'rendimento' | 'atualizacao_valor'
```

---

## 4. Schema do Banco de Dados

### 4.1 Criar migração `016_create_investments.sql`

```sql
-- ============================================================
-- ENUM: tipo de operação
-- ============================================================
CREATE TYPE investment_operation_type AS ENUM (
  'aporte',
  'resgate',
  'rendimento',
  'atualizacao_valor'
);

-- ============================================================
-- TABELA: investment_assets (Ativos da carteira)
-- ============================================================
CREATE TABLE IF NOT EXISTS investment_assets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,                          -- Ex: "PETR4", "CDB Banco Inter 120% CDI"
  ticker           TEXT,                                   -- Opcional: PETR4, BTC, etc.
  asset_class      TEXT NOT NULL,                          -- renda_fixa | renda_variavel | fundos | cripto
  asset_type       TEXT NOT NULL,                          -- CDB, Ação, FII, Bitcoin, etc.
  institution      TEXT,                                   -- Corretora/banco: XP, Nubank, Binance, etc.
  wallet_id        UUID REFERENCES wallets(id) ON DELETE SET NULL, -- Carteira vinculada (opcional)
  current_value    NUMERIC(15,2) NOT NULL DEFAULT 0,       -- Valor atual declarado
  total_invested   NUMERIC(15,2) NOT NULL DEFAULT 0,       -- Soma de aportes - resgates (mantido por trigger)
  total_income     NUMERIC(15,2) NOT NULL DEFAULT 0,       -- Soma de rendimentos recebidos (mantido por trigger)
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,          -- false = encerrado/resgatado totalmente
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELA: investment_operations (Aportes, resgates, rendimentos, atualizações)
-- ============================================================
CREATE TABLE IF NOT EXISTS investment_operations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id          UUID NOT NULL REFERENCES investment_assets(id) ON DELETE CASCADE,
  operation_type    investment_operation_type NOT NULL,
  amount            NUMERIC(15,2),                         -- NULL para atualizacao_valor
  new_value         NUMERIC(15,2),                         -- Novo valor atual (somente para atualizacao_valor)
  transaction_id    UUID REFERENCES transactions(id) ON DELETE SET NULL, -- Transação vinculada (aporte/resgate/rendimento)
  operation_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints de integridade semântica
  CONSTRAINT chk_amount_required
    CHECK (
      (operation_type = 'atualizacao_valor' AND amount IS NULL AND new_value IS NOT NULL) OR
      (operation_type != 'atualizacao_valor' AND amount IS NOT NULL AND amount > 0)
    )
);

-- ============================================================
-- ROW LEVEL SECURITY — investment_assets
-- ============================================================
ALTER TABLE investment_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investment_assets"
  ON investment_assets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investment_assets"
  ON investment_assets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investment_assets"
  ON investment_assets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investment_assets"
  ON investment_assets FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ROW LEVEL SECURITY — investment_operations
-- ============================================================
ALTER TABLE investment_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investment_operations"
  ON investment_operations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investment_operations"
  ON investment_operations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own investment_operations"
  ON investment_operations FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: atualiza total_invested e total_income no ativo
-- após INSERT ou DELETE em investment_operations
-- ============================================================
CREATE OR REPLACE FUNCTION sync_investment_asset_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_asset_id UUID;
BEGIN
  v_asset_id := COALESCE(NEW.asset_id, OLD.asset_id);

  UPDATE investment_assets SET
    total_invested = COALESCE((
      SELECT SUM(amount) FROM investment_operations
      WHERE asset_id = v_asset_id AND operation_type = 'aporte'
    ), 0) - COALESCE((
      SELECT SUM(amount) FROM investment_operations
      WHERE asset_id = v_asset_id AND operation_type = 'resgate'
    ), 0),
    total_income = COALESCE((
      SELECT SUM(amount) FROM investment_operations
      WHERE asset_id = v_asset_id AND operation_type = 'rendimento'
    ), 0),
    updated_at = now()
  WHERE id = v_asset_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_asset_totals
  AFTER INSERT OR DELETE ON investment_operations
  FOR EACH ROW EXECUTE FUNCTION sync_investment_asset_totals();

-- ============================================================
-- TRIGGER: atualiza current_value quando operação é atualizacao_valor
-- ============================================================
CREATE OR REPLACE FUNCTION apply_value_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.operation_type = 'atualizacao_valor' AND NEW.new_value IS NOT NULL THEN
    UPDATE investment_assets
    SET current_value = NEW.new_value, updated_at = now()
    WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_apply_value_update
  AFTER INSERT ON investment_operations
  FOR EACH ROW EXECUTE FUNCTION apply_value_update();
```

> **Importante:** Execute esta migração no Supabase **após** as migrações 014 e 015. Confirme que as tabelas `wallets` e `transactions` já existem antes de aplicar.

---

## 5. Tipos TypeScript

### Criar `types/investment.ts`

```typescript
export type InvestmentClass = 'renda_fixa' | 'renda_variavel' | 'fundos' | 'cripto'
export type OperationType = 'aporte' | 'resgate' | 'rendimento' | 'atualizacao_valor'

export type InvestmentAsset = {
  id: string
  user_id: string
  name: string
  ticker: string | null
  asset_class: InvestmentClass
  asset_type: string
  institution: string | null
  wallet_id: string | null
  current_value: number
  total_invested: number
  total_income: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // joins opcionais
  wallet?: { id: string; name: string; color: string } | null
  operations?: InvestmentOperation[]
}

export type InvestmentOperation = {
  id: string
  user_id: string
  asset_id: string
  operation_type: OperationType
  amount: number | null
  new_value: number | null
  transaction_id: string | null
  operation_date: string
  notes: string | null
  created_at: string
}

export type InvestmentAssetWithMetrics = InvestmentAsset & {
  gain_loss: number           // current_value - total_invested
  gain_loss_pct: number       // gain_loss / total_invested * 100
  portfolio_pct: number       // % do patrimônio total (calculado externamente)
}

export type PortfolioSummary = {
  total_current_value: number          // soma de current_value de todos os ativos ativos
  total_invested: number               // soma de total_invested
  total_income: number                 // soma de total_income
  total_gain_loss: number              // total_current_value - total_invested
  total_gain_loss_pct: number          // total_gain_loss / total_invested * 100
  by_class: {
    class: InvestmentClass
    label: string
    color: string
    current_value: number
    pct: number                        // % do total
  }[]
}
```

---

## 6. Utilitários

### Criar `lib/investment-utils.ts`

```typescript
import type { InvestmentAsset, InvestmentAssetWithMetrics, PortfolioSummary, InvestmentClass } from '@/types/investment'
import { INVESTMENT_CLASSES } from '@/types/investment'

export function enrichAsset(
  asset: InvestmentAsset,
  portfolioTotal: number
): InvestmentAssetWithMetrics {
  const gain_loss = asset.current_value - asset.total_invested
  const gain_loss_pct = asset.total_invested > 0
    ? (gain_loss / asset.total_invested) * 100
    : 0
  const portfolio_pct = portfolioTotal > 0
    ? (asset.current_value / portfolioTotal) * 100
    : 0

  return { ...asset, gain_loss, gain_loss_pct, portfolio_pct }
}

export function buildPortfolioSummary(assets: InvestmentAsset[]): PortfolioSummary {
  const active = assets.filter(a => a.is_active)

  const total_current_value = active.reduce((sum, a) => sum + a.current_value, 0)
  const total_invested      = active.reduce((sum, a) => sum + a.total_invested, 0)
  const total_income        = active.reduce((sum, a) => sum + a.total_income, 0)
  const total_gain_loss     = total_current_value - total_invested
  const total_gain_loss_pct = total_invested > 0
    ? (total_gain_loss / total_invested) * 100
    : 0

  const classMap = new Map<InvestmentClass, number>()
  for (const asset of active) {
    const cls = asset.asset_class as InvestmentClass
    classMap.set(cls, (classMap.get(cls) ?? 0) + asset.current_value)
  }

  const by_class = (Object.keys(INVESTMENT_CLASSES) as InvestmentClass[])
    .filter(cls => classMap.has(cls))
    .map(cls => ({
      class: cls,
      label: INVESTMENT_CLASSES[cls].label,
      color: INVESTMENT_CLASSES[cls].color,
      current_value: classMap.get(cls) ?? 0,
      pct: total_current_value > 0
        ? ((classMap.get(cls) ?? 0) / total_current_value) * 100
        : 0,
    }))

  return { total_current_value, total_invested, total_income, total_gain_loss, total_gain_loss_pct, by_class }
}

// Formata ganho/perda com sinal e cor
export function formatGainLoss(value: number, pct: number): {
  label: string
  color: string
  sign: '+' | '-' | ''
} {
  if (value === 0) return { label: 'R$ 0,00 (0,00%)', color: 'text-muted-foreground', sign: '' }
  const sign = value > 0 ? '+' : '-'
  const color = value > 0 ? 'text-green-500' : 'text-red-500'
  const absValue = Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const absPct = Math.abs(pct).toFixed(2)
  return { label: `${sign}${absValue} (${sign}${absPct}%)`, color, sign }
}
```

---

## 7. Server Actions

### Criar `app/actions/investments.ts`

Use `createClient` de `@/lib/supabase/server` e `revalidatePath`. Todas as actions retornam `{ success: true, data } | { success: false, error: string }`.

#### 7.1 `getInvestmentAssets`
```typescript
// Retorna todos os ativos do usuário (ativos e encerrados), ordenados por asset_class ASC, name ASC
// JOIN com wallets (id, name, color)
// Não inclui operações (use getAssetById para detalhe)
```

#### 7.2 `getAssetById`
```typescript
// Input: { id: string }
// Retorna o ativo com operações completas ordenadas por operation_date DESC
// JOIN com wallets
```

#### 7.3 `getPortfolioSummary`
```typescript
// Retorna PortfolioSummary calculado a partir de todos os ativos ativos do usuário
// Pode chamar buildPortfolioSummary() do lib/investment-utils.ts após buscar os dados
// Usado pelo dashboard e pela página principal do módulo
```

#### 7.4 `createInvestmentAsset`
```typescript
// Input: {
//   name: string
//   ticker?: string
//   asset_class: InvestmentClass
//   asset_type: string
//   institution?: string
//   wallet_id?: string | null
//   initial_amount?: number   // Se informado, cria também um aporte inicial
//   initial_date?: string     // Data do aporte inicial (default: hoje)
//   notes?: string
// }
// Validação Zod:
//   - name: string min 1 max 100
//   - asset_class: enum válido
//   - asset_type: string min 1
//   - initial_amount: number > 0, opcional
//
// Fluxo:
// 1. INSERT em investment_assets (current_value = initial_amount ?? 0)
// 2. Se initial_amount > 0: chama registerOperation internamente com type='aporte'
// revalidatePath('/investimentos')
```

#### 7.5 `updateInvestmentAsset`
```typescript
// Input: { id, name?, ticker?, institution?, wallet_id?, notes? }
// Não permite alterar asset_class ou asset_type após criação
// revalidatePath('/investimentos')
```

#### 7.6 `registerOperation`
```typescript
// Input: {
//   asset_id: string
//   operation_type: OperationType
//   amount?: number           // para aporte, resgate, rendimento
//   new_value?: number        // para atualizacao_valor
//   operation_date?: string   // default: hoje
//   notes?: string
//   wallet_id?: string | null // carteira para gerar transação (usa wallet_id do ativo se null)
// }
//
// Validação Zod por tipo:
//   aporte:           amount > 0 obrigatório
//   resgate:          amount > 0 obrigatório; não pode resgatar mais que total_invested atual
//   rendimento:       amount > 0 obrigatório
//   atualizacao_valor: new_value >= 0 obrigatório, amount deve ser null
//
// Fluxo por tipo de operação:
//
// APORTE:
//   1. Cria transação em `transactions`:
//      - description: `Aporte: ${asset.name}`
//      - amount: input.amount
//      - type: 'Despesa'          ← saída de dinheiro da carteira
//      - status: 'Realizado'
//      - date: operation_date
//      - wallet_id: wallet_id resolvido (input.wallet_id ?? asset.wallet_id ?? null)
//      - observation: `Investimento em ${asset.asset_type}: ${asset.name}`
//   2. INSERT em investment_operations (trigger atualiza total_invested)
//   3. Atualiza current_value += amount (aporte aumenta valor inicial declarado)
//
// RESGATE:
//   1. Valida: amount <= asset.total_invested atual
//   2. Cria transação em `transactions`:
//      - description: `Resgate: ${asset.name}`
//      - type: 'Receita'          ← entrada de dinheiro na carteira
//      - status: 'Realizado'
//      - wallet_id: wallet_id resolvido
//   3. INSERT em investment_operations (trigger atualiza total_invested)
//   4. Atualiza current_value -= amount
//   5. Se current_value <= 0 após resgate: SET is_active = false
//
// RENDIMENTO:
//   1. Cria transação em `transactions`:
//      - description: `Rendimento: ${asset.name}`
//      - type: 'Receita'
//      - status: 'Realizado'
//      - wallet_id: wallet_id resolvido
//      - observation: `Dividendo/Juros/Cupom de ${asset.name}`
//   2. INSERT em investment_operations (trigger atualiza total_income)
//   3. Atualiza current_value += amount (rendimento aumenta valor atual)
//
// ATUALIZACAO_VALOR:
//   1. INSERT em investment_operations com new_value (trigger atualiza current_value)
//   2. NÃO gera transação
//
// revalidatePath('/investimentos')
// revalidatePath('/transacoes')   ← quando gera transação
// revalidatePath('/dashboard')    ← sempre (afeta total patrimonial)
```

#### 7.7 `deleteOperation`
```typescript
// Input: { operation_id: string }
// Busca a operação para obter transaction_id e tipo
// Se operation_type != 'atualizacao_valor' e transaction_id != null:
//   → deleta a transação vinculada
// Deleta a operação (trigger ressincroniza total_invested / total_income)
// Se tipo era 'atualizacao_valor': recalcula current_value
//   → Busca a operação de atualizacao_valor mais recente anterior; se existir, usa esse new_value
//   → Senão: current_value = total_invested (posição inicial)
// revalidatePath('/investimentos')
// revalidatePath('/transacoes')
// revalidatePath('/dashboard')
```

#### 7.8 `archiveAsset`
```typescript
// Input: { id }
// SET is_active = false
// Não deleta operações nem transações vinculadas
// revalidatePath('/investimentos')
```

#### 7.9 `deleteAsset`
```typescript
// Input: { id }
// 1. Busca todas as operations do ativo com transaction_id != null
// 2. Deleta as transações vinculadas
// 3. DELETE FROM investment_assets (CASCADE deleta operations)
// revalidatePath('/investimentos')
// revalidatePath('/transacoes')
// revalidatePath('/dashboard')
```

---

## 8. Estrutura de Arquivos

```
app/
└── (main)/
    └── (authenticated)/
        └── investimentos/
            ├── page.tsx                         # Server Component — busca dados
            └── [id]/
                └── page.tsx                     # Detalhe do ativo com histórico

components/
└── investimentos/
    ├── investimentos-client.tsx                 # Client — orquestra estado e modals
    ├── portfolio-summary-header.tsx             # Header com total patrimônio + métricas
    ├── portfolio-allocation-chart.tsx           # Gráfico de pizza de alocação por classe
    ├── asset-list.tsx                           # Lista de ativos com filtro por classe
    ├── asset-card.tsx                           # Card de ativo individual
    ├── asset-form.tsx                           # Dialog de criar/editar ativo
    ├── operation-form.tsx                       # Dialog de registrar operação
    ├── operation-history.tsx                    # Histórico de operações do ativo
    ├── operation-type-badge.tsx                 # Badge de tipo de operação
    ├── class-filter-tabs.tsx                    # Tabs de filtro por classe de ativo
    └── empty-investimentos.tsx                  # Estado vazio

app/actions/
└── investments.ts

types/
└── investment.ts

lib/
└── investment-utils.ts
```

---

## 9. Componentes — Especificações Detalhadas

### 9.1 `app/(main)/(authenticated)/investimentos/page.tsx`

```typescript
// Server Component
// 1. Chama getInvestmentAssets() e getPortfolioSummary() em paralelo (Promise.all)
// 2. Renderiza <PageShell> com título "Investimentos" e subtítulo "Sua carteira patrimonial"
// 3. Passa dados para <InvestimentosClient />
```

### 9.2 `portfolio-summary-header.tsx`

Exibe no topo da página:

```
┌───────────────────────────────────────────────────────────────┐
│  💼 Patrimônio Total                                          │
│  R$ 87.450,00                                                 │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Total Invest.│  │ Rendimentos  │  │ Ganho/Perda  │       │
│  │ R$ 80.000,00 │  │ R$ 3.200,00  │  │ +R$ 7.450,00 │       │
│  │              │  │              │  │ +9,31%        │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────────────────────────────────────┘
```

- Ganho/Perda: verde se positivo, vermelho se negativo
- Respeita o toggle de visibilidade de valores (`use-visibility-state`)

### 9.3 `portfolio-allocation-chart.tsx`

Gráfico de pizza usando **Recharts** (já na stack):

```typescript
// PieChart com dados de summary.by_class
// Cada fatia tem a cor da classe (INVESTMENT_CLASSES[cls].color)
// Legenda abaixo: nome da classe + valor + %
// No centro do donut: total patrimônio (usar PieChart com innerRadius)
// Tooltip ao hover: valor da classe + percentual
// Tamanho: 260px de altura, responsivo
```

### 9.4 `class-filter-tabs.tsx`

```typescript
// Tabs horizontais com scroll: "Todos" | "Renda Fixa" | "Renda Variável" | "Fundos" | "Cripto"
// Só exibe tabs das classes que o usuário tem ativos
// Estado no InvestimentosClient via useState
// Filtro aplicado na lista de ativos abaixo
```

### 9.5 `asset-card.tsx`

```
┌────────────────────────────────────────────────────────┐
│  [ícone classe]  PETR4 — Ação          [⋯ dropdown]   │
│  Renda Variável  •  XP Investimentos                   │
│                                                        │
│  Valor Atual          Total Investido                  │
│  R$ 12.500,00         R$ 10.000,00                     │
│                                                        │
│  +R$ 2.500,00  (+25,00%)  ← verde                      │
│  Rendimentos recebidos: R$ 800,00                      │
│                                                        │
│  3,4% da carteira  ████░░░░░░░░░░░░░  ← barra         │
│                                                        │
│  [+ Registrar operação]                                │
└────────────────────────────────────────────────────────┘
```

**Especificações visuais:**
- Background: `bg-card border border-border rounded-2xl`
- Ícone da classe: Lucide icon com cor da classe com 20% opacidade no container
- Ganho/Perda: verde (`text-green-500`) se positivo, vermelho (`text-red-500`) se negativo
- Barra de alocação: cor da classe, altura `h-1.5`
- Ativo encerrado (`is_active = false`): opacidade reduzida + badge "Encerrado"
- Dropdown: Editar / Registrar operação / Encerrar / Excluir

### 9.6 `asset-form.tsx`

Dialog de criação e edição. Campos:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Nome | Input text | Sim | max 100 chars; ex: "CDB Banco Inter 120% CDI" |
| Ticker | Input text | Não | max 20 chars; ex: "PETR4", "BTC" |
| Classe | Select | Sim | Renda Fixa / Renda Variável / Fundos / Cripto |
| Tipo | Select | Sim | Carregado dinamicamente pela classe selecionada |
| Instituição | Input text | Não | ex: "XP", "Nubank", "Binance" |
| Carteira vinculada | Select | Não | Lista de wallets do usuário; "Nenhuma" → null |
| Valor inicial (aporte) | Input number | Não | Apenas no CREATE; se preenchido, cria aporte inicial |
| Data do aporte inicial | DatePicker | Não | Visível somente se valor inicial preenchido |
| Observações | Textarea | Não | max 300 chars |

### 9.7 `operation-form.tsx`

Dialog de registro de operação. Adapta campos por tipo:

**Seletor de tipo (radio/tabs) no topo:**
- 💰 Aporte  |  💸 Resgate  |  📈 Rendimento  |  ✏️ Atualizar Valor

| Campo | Aporte | Resgate | Rendimento | Atualizar Valor |
|---|---|---|---|---|
| Valor | ✅ | ✅ | ✅ | ❌ |
| Novo valor atual | ❌ | ❌ | ❌ | ✅ |
| Data | ✅ | ✅ | ✅ | ✅ |
| Carteira (override) | ✅ | ✅ | ✅ | ❌ |
| Observação | ✅ | ✅ | ✅ | ✅ |

Exibir no topo do dialog:
- Nome e classe do ativo
- Valor atual antes da operação
- Para Resgate: aviso se `amount > total_invested`

### 9.8 `operation-history.tsx`

Lista de operações na página de detalhe do ativo:

```
Histórico de Operações

  💰 Aporte          R$ 5.000,00   15/06/2026   ← verde
  📈 Rendimento      R$ 400,00     30/05/2026   ← azul
  ✏️ Valor atualizado → R$ 12.500,00  01/05/2026  ← cinza
  💸 Resgate         R$ 2.000,00   10/03/2026   ← vermelho
  💰 Aporte          R$ 7.000,00   01/01/2026   ← verde
```

- Ordenado por `operation_date DESC`
- Ícone e cor por tipo de operação
- Botão de excluir operação com `AlertDialog` de confirmação
- Para `atualizacao_valor`: exibir "→ R$ X" (novo valor declarado)

### 9.9 `empty-investimentos.tsx`

Estado vazio:
- Ícone `TrendingUp` grande, cor `#E0FE56`
- Título: "Nenhum investimento cadastrado"
- Subtítulo: "Cadastre seus ativos e acompanhe o crescimento do seu patrimônio em um só lugar."
- Botão: "Adicionar primeiro ativo"

---

## 10. Página de Detalhe do Ativo

### `app/(main)/(authenticated)/investimentos/[id]/page.tsx`

Server Component que renderiza:

1. Botão "← Voltar para Investimentos"
2. Header: ícone da classe + nome + ticker (se houver) + badge da classe
3. Cards de métricas:
   - Valor Atual
   - Total Investido
   - Rendimentos Recebidos
   - Ganho/Perda (com cor)
4. Informações: Instituição / Carteira vinculada / Tipo / Data do primeiro aporte
5. Botão "Registrar operação"
6. `<OperationHistory>` com todas as operações

---

## 11. Integração com Dashboard

### 11.1 Adicionar card "Patrimônio Investido" em `components/dashboard-client.tsx`

O dashboard já tem cards de Receitas, Despesas e Saldo. Adicionar um quarto card:

```
┌──────────────────────────────┐
│  💼 Patrimônio Investido     │
│  R$ 87.450,00                │
│  +R$ 7.450,00  (+9,31%)      │  ← ganho/perda total
│  [Ver carteira →]            │
└──────────────────────────────┘
```

**Modificação necessária em `dashboard-metrics.ts`:**
```typescript
// Adicionar export: getInvestmentSummaryForDashboard()
// Retorna: { total_current_value, total_gain_loss, total_gain_loss_pct }
// Reutiliza getPortfolioSummary() de investments.ts
```

**Modificação em `app/(main)/(authenticated)/dashboard/page.tsx`:**
```typescript
// Adicionar chamada paralela a getInvestmentSummaryForDashboard()
// Passar resultado como prop para DashboardClient
```

O card deve:
- Respeitar o toggle de visibilidade de valores (`use-visibility-state`)
- Ter link "Ver carteira →" que navega para `/investimentos`
- Exibir ganho/perda com cor (verde/vermelho)
- Se não houver ativos cadastrados: exibir "Nenhum investimento" sem valores

---

## 12. Sidebar

### Editar `components/app-sidebar.tsx`

Ativar o link `/investimentos` que já existe como stub. Garantir que o ícone usado seja `TrendingUp` do Lucide React, mantendo o padrão visual da sidebar.

---

## 13. Fluxos de UX

### Fluxo de Cadastro de Ativo
1. "Adicionar ativo" → `AssetForm` abre como Dialog
2. Usuário define classe → tipos carregam dinamicamente
3. Se preencher valor inicial → campo de data aparece
4. Submit → `createInvestmentAsset` → se valor inicial: `registerOperation` interno
5. Toast: "Ativo adicionado à carteira!"
6. Card aparece na lista com valor e métricas

### Fluxo de Aporte
1. "Registrar operação" → `OperationForm` com tipo "Aporte" pré-selecionado
2. Usuário define valor, data, carteira (opcional override)
3. Submit → `registerOperation` → cria transação Despesa na wallet
4. Toast: "Aporte registrado! Transação criada em [carteira]."
5. Card atualiza `total_invested` e `current_value`

### Fluxo de Atualização de Valor
1. "Registrar operação" → tipo "Atualizar Valor"
2. Usuário informa novo valor atual (ex: PETR4 hoje vale R$ 13.200,00)
3. Submit → `registerOperation` → apenas atualiza `current_value`, sem transação
4. Toast: "Valor atualizado."
5. Card recalcula ganho/perda automaticamente

### Fluxo de Resgate Total
1. "Registrar operação" → tipo "Resgate"
2. Usuário informa valor = total_invested (resgate total)
3. Sistema alerta: "Resgate total — este ativo será marcado como encerrado"
4. Submit → `registerOperation` → cria transação Receita + `is_active = false`
5. Card fica com badge "Encerrado" e opacidade reduzida

### Fluxo de Exclusão de Ativo
1. Dropdown → "Excluir"
2. AlertDialog: "Isso vai remover o ativo e todas as operações e transações vinculadas. Continuar?"
3. `deleteAsset` → deleta transações vinculadas
4. Toast: "Ativo removido da carteira."

---

## 14. Validações e Edge Cases

- **Resgate maior que total_invested:** Zod + server-side rejeita com "Valor de resgate não pode ser maior que o total investido (R$ X,00)"
- **Aporte em ativo encerrado:** Bloquear via UI (botão desabilitado) e validar no server — um aporte reativa o ativo (`is_active = true`)
- **Exclusão de operação de atualizacao_valor:** Recalcular `current_value` para a última atualização anterior; se não houver, usar `total_invested`
- **Ativo sem wallet_id:** Aportes/resgates/rendimentos ainda são registrados em `investment_operations` e geram transações com `wallet_id = null` — comportamento idêntico ao módulo de Caixinhas
- **`current_value` após múltiplas operações:** O trigger cuida de `total_invested` e `total_income`; o `current_value` é mantido pela lógica da Server Action `registerOperation` (não por trigger), pois envolve lógica condicional por tipo
- **Gráfico de pizza com um único ativo:** Recharts renderiza corretamente; testar esse edge case
- **Portfolio summary com todos os ativos encerrados:** `total_current_value = 0` — exibir estado "vazio" no gráfico
- **Transações de investimento na tabela `/transacoes`:** Aparecem normalmente. A `observation` identifica a origem ("Investimento em Ação: PETR4"). Não há filtro especial nesta versão

---

## 15. Ordem de Implementação Recomendada

1. **Migração SQL** `016_create_investments.sql` no Supabase
2. **Tipos** `types/investment.ts` + **utilitários** `lib/investment-utils.ts`
3. **Server Actions** `app/actions/investments.ts` (todas as 9 actions)
4. **Módulo `/investimentos`** — page.tsx + todos os componentes
5. **Sidebar** — ativar link `/investimentos`
6. **Dashboard** — card de Patrimônio Investido + `getInvestmentSummaryForDashboard`
7. **Página de detalhe** `/investimentos/[id]`

---

## 16. Critérios de Conclusão (Definition of Done)

- [ ] Migração `016_create_investments.sql` aplicada com RLS funcionando e triggers testados
- [ ] CRUD completo de ativos (criar, editar, encerrar, excluir)
- [ ] 4 tipos de operação funcionando: aporte, resgate, rendimento, atualização de valor
- [ ] Aportes geram transação `Despesa` na wallet vinculada
- [ ] Resgates geram transação `Receita` na wallet vinculada
- [ ] Rendimentos geram transação `Receita` na wallet vinculada
- [ ] Atualização de valor NÃO gera transação
- [ ] Exclusão de operação deleta transação vinculada
- [ ] Trigger `sync_investment_asset_totals` mantém `total_invested` e `total_income` corretos
- [ ] Trigger `apply_value_update` atualiza `current_value` em atualizacao_valor
- [ ] Header de patrimônio total com 3 cards de métricas
- [ ] Gráfico de pizza Recharts com alocação por classe
- [ ] Tabs de filtro por classe funcionando
- [ ] Cards de ativo com ganho/perda em cor semântica
- [ ] Página de detalhe `/investimentos/[id]` com histórico de operações
- [ ] Card "Patrimônio Investido" no dashboard com ganho/perda
- [ ] Toggle de visibilidade de valores respeitado em todo o módulo
- [ ] Sidebar link `/investimentos` ativo
- [ ] Estado vazio com CTA
- [ ] TypeScript sem erros (`bun run type-check`)
- [ ] Sem console errors no browser
- [ ] Responsivo em mobile (375px) sem afetar layout desktop

---

## 17. Notas Técnicas Adicionais

- **Bun como package manager:** usar `bun add` para qualquer dependência nova — não `npm install`
- **Recharts já na stack:** usar para o gráfico de pizza — não instalar Chart.js para isso
- **`current_value` é mantido pela Server Action**, não por trigger, pois a lógica varia por tipo de operação (aporte soma, resgate subtrai, rendimento soma, atualizacao_valor substitui)
- **`total_invested` e `total_income` são mantidos por trigger** — nunca atualizá-los manualmente nas Server Actions
- **Padrão de retorno:** `{ success: true, data } | { success: false, error: string }`
- **`revalidatePath('/dashboard')`** sempre após qualquer mutação — o card de patrimônio do dashboard depende de dados frescos
- **Enum híbrido de `type` em `transactions`:** aportes usam `'Despesa'`, resgates e rendimentos usam `'Receita'` (português) — consistente com o padrão do projeto
- **Ativos encerrados** (`is_active = false`) não entram no `PortfolioSummary` — filtrar por `is_active = true` nas queries de resumo
- **Promise.all no page.tsx** para buscar assets e summary em paralelo — não fazer sequencialmente
