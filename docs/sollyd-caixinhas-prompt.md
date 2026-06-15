# Prompt de Implementação — Módulo Caixinhas (Sollyd)

> **Para:** Antigravity  
> **Projeto:** Sollyd — Next.js 14 + Supabase + shadcn/ui  
> **Módulo:** Caixinhas (metas financeiras com progresso)  
> **Prioridade:** Alta  
> **Data:** 2026-06-15

---

## 1. Contexto Geral

O Sollyd é uma plataforma SaaS de gestão financeira com stack Next.js 14 (App Router), Supabase (PostgreSQL + RLS), shadcn/ui, React Hook Form, Zod, Tailwind CSS e TypeScript. O módulo de **Caixinhas** permite ao usuário criar metas financeiras com nome, valor-alvo, ícone, cor e data-alvo opcional — e alimentá-las via aportes que geram transações do tipo `reserva` na tabela `transactions`. O layout da página principal é um **card grid** estilo Nubank Caixinhas, com histórico de aportes por caixinha.

A implementação deve seguir exatamente os padrões do projeto:

- Server Actions em `app/actions/`
- Componentes client em `components/`
- RLS garantindo isolamento por `user_id`
- Validação com Zod + React Hook Form
- Notificações com Sonner (`toast`)
- Rota protegida em `app/(main)/(authenticated)/caixinhas/`
- Item adicionado na sidebar (`components/app-sidebar.tsx`)

---

## 2. Schema do Banco de Dados

### 2.1 Criar migração `014_create_caixinhas.sql`

```sql
-- ============================================================
-- TABELA: savings_boxes (Caixinhas)
-- ============================================================
CREATE TABLE IF NOT EXISTS savings_boxes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  target_amount     NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  color             TEXT NOT NULL DEFAULT '#E0FE56',
  icon              TEXT NOT NULL DEFAULT 'piggy-bank',
  target_date       DATE,
  is_completed      BOOLEAN NOT NULL DEFAULT false,
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELA: savings_box_contributions (Aportes)
-- ============================================================
CREATE TABLE IF NOT EXISTS savings_box_contributions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  savings_box_id   UUID NOT NULL REFERENCES savings_boxes(id) ON DELETE CASCADE,
  transaction_id   UUID REFERENCES transactions(id) ON DELETE SET NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note             TEXT,
  contributed_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE savings_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_box_contributions ENABLE ROW LEVEL SECURITY;

-- savings_boxes policies
CREATE POLICY "Users can view own savings_boxes"
  ON savings_boxes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings_boxes"
  ON savings_boxes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings_boxes"
  ON savings_boxes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings_boxes"
  ON savings_boxes FOR DELETE USING (auth.uid() = user_id);

-- savings_box_contributions policies
CREATE POLICY "Users can view own contributions"
  ON savings_box_contributions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contributions"
  ON savings_box_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contributions"
  ON savings_box_contributions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: atualiza current_amount automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_savings_box_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE savings_boxes
  SET
    current_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM savings_box_contributions
      WHERE savings_box_id = COALESCE(NEW.savings_box_id, OLD.savings_box_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.savings_box_id, OLD.savings_box_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_savings_box_amount
  AFTER INSERT OR DELETE ON savings_box_contributions
  FOR EACH ROW EXECUTE FUNCTION update_savings_box_amount();

-- ============================================================
-- TRIGGER: marca is_completed quando meta é atingida
-- ============================================================
CREATE OR REPLACE FUNCTION check_savings_box_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount THEN
    NEW.is_completed := true;
  ELSE
    NEW.is_completed := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_completion
  BEFORE UPDATE OF current_amount ON savings_boxes
  FOR EACH ROW EXECUTE FUNCTION check_savings_box_completion();
```

> **Importante:** Execute essa migração no Supabase antes de qualquer implementação de código.

---

## 3. Tipos TypeScript

### Criar `types/savings-box.ts`

```typescript
export type SavingsBox = {
  id: string
  user_id: string
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  color: string
  icon: string
  target_date: string | null
  is_completed: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  // computed (join)
  contributions?: SavingsBoxContribution[]
}

export type SavingsBoxContribution = {
  id: string
  user_id: string
  savings_box_id: string
  transaction_id: string | null
  amount: number
  note: string | null
  contributed_at: string
  created_at: string
}

export type SavingsBoxWithProgress = SavingsBox & {
  progress_percentage: number       // 0–100
  remaining_amount: number          // target - current
  days_remaining: number | null     // null se sem data-alvo
  monthly_needed: number | null     // valor mensal para atingir meta no prazo
}
```

---

## 4. Server Actions

### Criar `app/actions/savings-boxes.ts`

Implemente as seguintes Server Actions usando o padrão do projeto (`createClient` de `@/lib/supabase/server`, `revalidatePath`):

#### 4.1 `getSavingsBoxes`
```typescript
// Retorna todas as caixinhas do usuário (não arquivadas), ordenadas por created_at DESC
// Inclui computed fields: progress_percentage, remaining_amount, days_remaining, monthly_needed
```

#### 4.2 `getSavingsBoxById`
```typescript
// Retorna uma caixinha com seu histórico de aportes (contributions), ordenados por contributed_at DESC
```

#### 4.3 `createSavingsBox`
```typescript
// Input: { name, description?, target_amount, color, icon, target_date? }
// Validação Zod:
//   - name: string min 1 max 50
//   - target_amount: number > 0
//   - color: string (hex)
//   - icon: string
//   - target_date: date opcional, deve ser futura
// Insere em savings_boxes com user_id do auth
// revalidatePath('/caixinhas')
```

#### 4.4 `addContribution`
```typescript
// Input: { savings_box_id, amount, note?, contributed_at? }
// Validação Zod:
//   - savings_box_id: uuid
//   - amount: number > 0
//   - note: string max 200, opcional
//   - contributed_at: date (default: hoje)
//
// 1. Cria transação em `transactions`:
//    - description: `Aporte: ${savings_box.name}`
//    - amount: input.amount
//    - type: 'Despesa'       <- contábil, não afeta saldo de carteira
//    - status: 'Realizado'
//    - date: contributed_at
//    - wallet_id: null        <- não vincula a carteira
//    - observation: `Reserva para caixinha: ${savings_box.name}`
//
// 2. Insere em savings_box_contributions com transaction_id retornado
// revalidatePath('/caixinhas')
// revalidatePath('/transacoes')  <- aporte aparece na lista de transações
```

#### 4.5 `deleteContribution`
```typescript
// Input: { contribution_id }
// Deleta contribution (trigger atualiza current_amount automaticamente)
// Se contribution.transaction_id não for null, deleta também a transaction vinculada
// revalidatePath('/caixinhas')
// revalidatePath('/transacoes')
```

#### 4.6 `updateSavingsBox`
```typescript
// Input: { id, name?, description?, target_amount?, color?, icon?, target_date? }
// Mesmas validações do create
// revalidatePath('/caixinhas')
```

#### 4.7 `deleteSavingsBox`
```typescript
// Input: { id }
// Deleta caixinha (CASCADE deleta contributions)
// Deleta também as transactions vinculadas (buscar transaction_ids antes)
// revalidatePath('/caixinhas')
// revalidatePath('/transacoes')
```

#### 4.8 `archiveSavingsBox`
```typescript
// Input: { id }
// SET is_archived = true
// revalidatePath('/caixinhas')
```

---

## 5. Estrutura de Arquivos

```
app/
└── (main)/
    └── (authenticated)/
        └── caixinhas/
            ├── page.tsx                  # Server Component — busca dados e passa para client
            └── [id]/
                └── page.tsx              # Detalhe da caixinha com histórico

components/
└── caixinhas/
    ├── caixinhas-client.tsx              # Client — orquestra estado e modals
    ├── savings-box-card.tsx              # Card individual com progresso
    ├── savings-box-grid.tsx              # Grid de cards
    ├── savings-box-form.tsx              # Dialog de criar/editar caixinha
    ├── contribution-form.tsx             # Dialog de aporte
    ├── contribution-history.tsx          # Lista de aportes de uma caixinha
    └── empty-caixinhas.tsx               # Estado vazio

app/actions/
└── savings-boxes.ts                      # Todas as Server Actions

types/
└── savings-box.ts                        # Tipos TypeScript
```

---

## 6. Componentes — Especificações Detalhadas

### 6.1 `app/(main)/(authenticated)/caixinhas/page.tsx`

```typescript
// Server Component
// 1. Chama getSavingsBoxes()
// 2. Renderiza <PageShell> com título "Caixinhas" e subtítulo "Suas metas financeiras"
// 3. Passa dados para <CaixinhasClient />
```

### 6.2 `savings-box-card.tsx`

Cada card deve conter:

```
┌────────────────────────────────────────┐
│  [ícone]  Nome da Caixinha     [...] ←── dropdown (Editar / Arquivar / Excluir)
│                                        │
│  ████████████░░░░░░░░  68%            │
│                                        │
│  R$ 4.079,93 / R$ 5.999,90           │
│  Faltam R$ 1.919,97                   │
│                                        │
│  📅 Até Jan/2026  |  + 3 aportes     │
│                                        │
│  [+ Aportar]                          │
└────────────────────────────────────────┘
```

**Especificações visuais:**
- Background: `bg-card border border-border rounded-2xl`
- Barra de progresso: `bg-primary` (`#E0FE56`) sobre `bg-muted`, altura `h-2`, `rounded-full`
- Quando `is_completed = true`: borda verde `border-green-500`, badge "✅ Meta atingida!"
- Quando `days_remaining <= 30 && !is_completed`: badge amarelo "⚠️ Prazo próximo"
- Ícone: renderizado via Lucide (mapeamento `icon` string → componente Lucide)
- Cor da caixinha aplicada no background do container do ícone com opacidade 20%
- Dropdown de ações: `DropdownMenu` do shadcn/ui

### 6.3 `savings-box-form.tsx`

Dialog de criação e edição. Campos:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Nome | Input text | Sim | max 50 chars |
| Descrição | Textarea | Não | max 200 chars |
| Valor alvo | Input number | Sim | formatado BRL |
| Cor | Color picker | Sim | swatches pré-definidas (10 cores) + input hex |
| Ícone | Icon picker | Sim | grid de ~20 ícones Lucide relevantes (PiggyBank, Home, Car, Plane, GraduationCap, Heart, Laptop, ShoppingBag, Dumbbell, Music, Camera, Gift, Bike, Coffee, Gem, Umbrella, Baby, Tent, Trophy, Star) |
| Data alvo | DatePicker | Não | deve ser futura; usa `react-day-picker` |

**Ícones sugeridos para o picker:**
`PiggyBank, Home, Car, Plane, GraduationCap, Heart, Laptop, ShoppingBag, Dumbbell, Music, Camera, Gift, Bike, Coffee, Gem, Umbrella, Baby, Tent, Trophy, Star`

### 6.4 `contribution-form.tsx`

Dialog de aporte. Campos:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| Valor | Input number | Sim | formatado BRL; sugerir valor mensal necessário se houver prazo |
| Observação | Input text | Não | ex: "Salário de março" |
| Data | DatePicker | Não | default: hoje |

Exibir no dialog:
- Nome e ícone da caixinha
- Progresso atual antes do aporte
- Preview do novo progresso após o valor digitado (atualiza em tempo real)

### 6.5 `contribution-history.tsx`

Lista de aportes exibida dentro do card expandido ou na página de detalhe:

```
┌──────────────────────────────────────────┐
│ Histórico de Aportes                     │
│                                          │
│  R$ 1.500,00  •  15/03/2026  🗑          │
│  Salário de março                        │
│                                          │
│  R$ 2.579,93  •  10/02/2026  🗑          │
│  Bônus anuald                            │
└──────────────────────────────────────────┘
```

- Botão de excluir aporte com confirmação via `AlertDialog`
- Ordenado por `contributed_at DESC`

### 6.6 `empty-caixinhas.tsx`

Estado vazio com:
- Ícone `PiggyBank` tamanho grande, cor `#E0FE56`
- Título: "Nenhuma caixinha ainda"
- Subtítulo: "Crie sua primeira meta financeira e comece a guardar dinheiro com propósito."
- Botão: "Criar minha primeira caixinha"

---

## 7. Sidebar — Atualização

### Editar `components/app-sidebar.tsx`

Adicionar item "Caixinhas" na navegação principal, após "Orçamentos":

```typescript
{
  title: "Caixinhas",
  url: "/caixinhas",
  icon: PiggyBank,  // import { PiggyBank } from 'lucide-react'
}
```

---

## 8. Computed Fields — Lógica de Cálculo

Implementar como função utilitária em `lib/savings-box-utils.ts`:

```typescript
export function enrichSavingsBox(box: SavingsBox): SavingsBoxWithProgress {
  const progress_percentage = Math.min(
    Math.round((box.current_amount / box.target_amount) * 100),
    100
  )

  const remaining_amount = Math.max(box.target_amount - box.current_amount, 0)

  let days_remaining: number | null = null
  let monthly_needed: number | null = null

  if (box.target_date) {
    const today = new Date()
    const target = new Date(box.target_date)
    days_remaining = Math.max(
      Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      0
    )

    const months_remaining = days_remaining / 30
    if (months_remaining > 0 && remaining_amount > 0) {
      monthly_needed = Math.ceil(remaining_amount / months_remaining)
    }
  }

  return {
    ...box,
    progress_percentage,
    remaining_amount,
    days_remaining,
    monthly_needed,
  }
}
```

---

## 9. Página de Detalhe da Caixinha

### `app/(main)/(authenticated)/caixinhas/[id]/page.tsx`

Server Component que renderiza:

1. Botão "← Voltar para Caixinhas"
2. Header com ícone, nome, cor e badge de status (Em andamento / Meta atingida / Prazo próximo)
3. Card de resumo:
   - Valor atual / Valor alvo
   - Barra de progresso grande (`h-4`)
   - Percentual centralizado
   - Dias restantes (se houver data-alvo)
   - Sugestão de aporte mensal (se houver data-alvo e meta não atingida)
4. Botão "＋ Aportar" no header
5. `<ContributionHistory />` com todos os aportes

---

## 10. Estados e Fluxos de UX

### Fluxo de Criação de Caixinha
1. Usuário clica em "Nova Caixinha" (botão no header da página)
2. `SavingsBoxForm` abre como `Dialog`
3. Usuário preenche nome, valor-alvo, ícone, cor (data é opcional)
4. Submit → `createSavingsBox` Server Action
5. Toast de sucesso: "Caixinha criada com sucesso!"
6. Grid atualiza com a nova caixinha

### Fluxo de Aporte
1. Usuário clica em "＋ Aportar" no card
2. `ContributionForm` abre como `Dialog`
3. Usuário define valor, observação e data
4. Preview de progresso atualiza em tempo real
5. Submit → `addContribution` Server Action
6. Toast de sucesso: "Aporte registrado!"
7. Se meta atingida após aporte: toast especial "🎉 Parabéns! Você atingiu sua meta!"
8. Card atualiza progresso

### Fluxo de Exclusão de Caixinha
1. Dropdown → "Excluir"
2. `AlertDialog` de confirmação: "Isso vai excluir todos os aportes e as transações vinculadas. Deseja continuar?"
3. Confirma → `deleteSavingsBox` Server Action
4. Toast: "Caixinha excluída."

### Fluxo de Arquivamento
1. Dropdown → "Arquivar"
2. Caixinha some do grid principal (filtro `is_archived = false`)
3. Botão toggle "Ver arquivadas" exibe caixinhas arquivadas em seção separada abaixo

---

## 11. Validações e Edge Cases

- **Aporte que ultrapassa a meta:** Permitido. `current_amount` pode superar `target_amount`; o progresso fica em 100% e `is_completed` vira `true`.
- **Exclusão de aporte:** Deve deletar a transaction vinculada (`transaction_id`) para manter consistência na tabela `transactions`.
- **Caixinha sem data-alvo:** Não exibir campos de `days_remaining` e `monthly_needed` — omitir o elemento completamente.
- **Data-alvo no passado (ao criar):** Zod deve rejeitar com mensagem "A data alvo deve ser uma data futura".
- **Valor-alvo zero ou negativo:** Zod deve rejeitar com mensagem "O valor alvo deve ser maior que zero".
- **Concorrência:** O trigger SQL garante que `current_amount` nunca fique inconsistente.
- **`wallet_id: null` nas transações de aporte:** Garantir que o formulário de transações não exiba esses aportes como "sem carteira" de forma confusa — a `observation` já identifica como reserva de caixinha.

---

## 12. Critérios de Conclusão (Definition of Done)

- [ ] Migração `014_create_caixinhas.sql` aplicada no Supabase com RLS funcionando
- [ ] CRUD completo de caixinhas (criar, editar, arquivar, excluir)
- [ ] Aportes criam transações do tipo `Despesa` com `wallet_id: null` na tabela `transactions`
- [ ] Exclusão de aporte deleta a transaction vinculada
- [ ] Grid de cards exibido em `/caixinhas` com progresso visual correto
- [ ] Barra de progresso em `#E0FE56` com animação suave
- [ ] Card especial quando `is_completed = true`
- [ ] Dialog de aporte com preview de progresso em tempo real
- [ ] Histórico de aportes visível por caixinha
- [ ] Página de detalhe `/caixinhas/[id]` funcional
- [ ] Item "Caixinhas" adicionado na sidebar
- [ ] Estado vazio elegante com CTA
- [ ] Toasts de feedback em todas as ações
- [ ] Responsivo em mobile (375px) sem afetar layout desktop
- [ ] TypeScript sem erros (`bun run type-check`)
- [ ] Sem console errors no browser

---

## 13. Notas Técnicas Adicionais

- **Não usar `WidthType.PERCENTAGE`** em nenhuma tabela do banco — já está em DXA no migration acima.
- **Transações de aporte** devem ter `type: 'Despesa'` (português, seguindo o padrão existente do enum — ver PROJECT_OVERVIEW seção 5, campo `type` da tabela `transactions` que aceita `'Receita' | 'Despesa'`).
- **Atenção ao schema híbrido:** O campo `type` em `transactions` aceita tanto `'revenue'/'expense'` quanto `'Receita'/'Despesa'`. Para novos aportes de caixinha, usar sempre `'Despesa'` (português) para consistência.
- **Bun como package manager:** Não usar `npm install` — usar `bun add` para qualquer dependência nova.
- **Padrão de Server Action:** Sempre retornar `{ success: true, data }` ou `{ success: false, error: string }` para tratamento no client.
- **`revalidatePath`:** Sempre revalidar `/caixinhas` e `/transacoes` após mutações que afetam a tabela `transactions`.
