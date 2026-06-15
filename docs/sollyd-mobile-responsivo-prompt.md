# Prompt de Implementação — Responsividade Mobile Completa (Sollyd)

> **Para:** Antigravity
> **Projeto:** Sollyd — Next.js 14 + Supabase + shadcn/ui
> **Tipo:** Responsividade mobile — experiência completa sem impactar desktop
> **Breakpoint alvo:** 390px (iPhone 14/15 Pro) — funcional de 375px a 430px
> **Data:** 2026-06-15

---

## ⚠️ REGRA ABSOLUTA — NÃO NEGOCIÁVEL

**Nenhuma alteração mobile deve quebrar ou alterar o layout desktop.**

A estratégia é estritamente **aditiva**: adicionar classes `md:` para desktop, deixar o comportamento padrão (sem prefixo) para mobile. Nunca remover classes existentes de desktop. Ao final de cada seção, validar obrigatoriamente em **dois viewports simultaneamente**: 390px e 1280px.

```
Mobile first com Tailwind:
  sem prefixo  → mobile (< 768px)
  md:          → desktop (≥ 768px)
```

Antes de qualquer alteração, rodar:
```bash
bun run type-check && bun run build
```
Ambos devem passar sem erros. Rodar novamente ao final de cada seção.

---

## 1. Fundação — Configuração Global de Viewport

### 1.1 — Verificar `app/layout.tsx` ou layout raiz

Garantir que o viewport meta está configurado corretamente:

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,        // previne zoom automático em inputs no iOS
  userScalable: false,
}
```

### 1.2 — Verificar `globals.css`

Adicionar regras base que previnem problemas comuns em mobile:

```css
/* app/globals.css — adicionar na seção de base styles */

/* Previne scroll horizontal acidental */
html, body {
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Previne highlight azul ao tocar em elementos no mobile */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Garante que inputs não causem zoom no iOS (font-size mínimo 16px) */
input, select, textarea {
  font-size: max(16px, 1rem);
}

/* Safe area para dispositivos com notch (iPhone 14 Pro tem Dynamic Island) */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px);
}
```

### 1.3 — Atualizar `tailwind.config.ts`

Garantir que o breakpoint `md` está em 768px (padrão Tailwind — confirmar que não foi customizado):

```typescript
// tailwind.config.ts
screens: {
  'sm': '640px',
  'md': '768px',   // breakpoint de corte mobile/desktop
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
},
```

---

## 2. Navegação Mobile — Sidebar vira Drawer

### Contexto
A `AppSidebar` atual é colapsável em desktop (expandido ↔ ícones). Em mobile, deve virar um drawer que desliza da esquerda, acionado por um botão hamburguer no header mobile.

### 2.1 — Modificar `components/app-sidebar.tsx`

A sidebar deve:
- **Desktop (`md:`):** comportamento atual preservado (colapsável, sempre visível)
- **Mobile (< `md`):** oculta por padrão, abre como drawer via estado + overlay

```tsx
// Adicionar no topo do componente
'use client'

// Usar o Sheet do shadcn/ui para o drawer mobile
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

// Estado do drawer mobile — controlado externamente via contexto ou prop
// O hook use-sidebar-state.tsx já existe; estender para suportar mobile
```

**Estrutura de renderização:**

```tsx
export function AppSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebarState()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <>
      {/* DESKTOP: sidebar fixa, sempre visível */}
      <aside className={cn(
        "hidden md:flex flex-col h-screen sticky top-0",
        "bg-[#0a0a0a] border-r border-[#262626]",
        isCollapsed ? "w-16" : "w-64",
        "transition-all duration-300"
      )}>
        <SidebarContent
          isCollapsed={isCollapsed}
          onToggle={toggleSidebar}
        />
      </aside>

      {/* MOBILE: Sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-72 bg-[#0a0a0a] border-r border-[#262626]"
        >
          <SidebarContent
            isCollapsed={false}   // sempre expandido no mobile
            onClose={() => setMobileOpen(false)}
            isMobile
          />
        </SheetContent>
      </Sheet>

      {/* Expor setMobileOpen via contexto para o MobileHeader acessar */}
    </>
  )
}
```

### 2.2 — Criar `components/shared/mobile-header.tsx`

Header fixo no topo — visível apenas em mobile:

```tsx
// components/shared/mobile-header.tsx
'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface MobileHeaderProps {
  onMenuOpen: () => void
}

export function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  return (
    <header className={cn(
      "md:hidden",                          // invisível em desktop
      "fixed top-0 left-0 right-0 z-50",
      "h-14 px-4",
      "flex items-center justify-between",
      "bg-[#0a0a0a] border-b border-[#262626]",
      "safe-area-top"
    )}>
      {/* Botão hamburguer */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuOpen}
        className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo centralizado */}
      <span className="font-bold text-white text-lg tracking-tight"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Sollyd
      </span>

      {/* Espaço reservado para ícone direito (notificações futuras) */}
      <div className="w-9" />
    </header>
  )
}
```

### 2.3 — Modificar `app/(main)/layout.tsx`

Integrar o `MobileHeader` e adicionar padding-top no mobile para compensar o header fixo:

```tsx
// app/(main)/layout.tsx

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        mobileOpen={mobileDrawerOpen}
        onMobileOpenChange={setMobileDrawerOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile fixo */}
        <MobileHeader onMenuOpen={() => setMobileDrawerOpen(true)} />

        {/* Conteúdo principal — padding-top somente no mobile para o header fixo */}
        <main className="flex-1 pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 2.4 — Estilização do SidebarContent em mobile

Dentro do `SidebarContent` (parte extraída da sidebar para reutilização), quando `isMobile=true`:
- Adicionar `safe-area-top` no padding do topo
- Links de navegação com altura mínima de `min-h-[48px]` (área de toque adequada)
- Ao clicar em qualquer link de navegação, chamar `onClose()` para fechar o drawer automaticamente

```tsx
// No NavItem da sidebar
<Link
  href={item.url}
  onClick={isMobile ? onClose : undefined}
  className={cn(
    "flex items-center gap-3 rounded-lg px-3",
    "min-h-[48px]",          // área de toque mínima (WCAG 2.5.5)
    "text-zinc-400 hover:text-white hover:bg-zinc-800",
    "transition-colors"
  )}
>
  <item.icon className="h-5 w-5 shrink-0" />
  <span className={cn(isCollapsed && !isMobile ? "hidden" : "block")}>
    {item.title}
  </span>
</Link>
```

---

## 3. Layout Global — PageShell e PageHeader

### 3.1 — Modificar `components/shared/page-shell.tsx`

```tsx
// ANTES (apenas desktop)
<div className="p-6 space-y-6">

// DEPOIS (mobile first)
<div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
```

### 3.2 — Modificar `components/shared/page-header.tsx`

O header de página tem título + subtítulo + botão de ação. Em mobile, empilhar verticalmente:

```tsx
// ANTES
<div className="flex items-center justify-between">
  <div>
    <h1>{title}</h1>
    <p>{subtitle}</p>
  </div>
  <div>{actions}</div>  {/* botão de criar */}
</div>

// DEPOIS
<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <div>
    <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
    {subtitle && (
      <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
    )}
  </div>
  {/* Ações visíveis apenas em desktop — mobile usa FAB */}
  {actions && (
    <div className="hidden md:flex items-center gap-2">
      {actions}
    </div>
  )}
</div>
```

---

## 4. FAB — Botão Flutuante de Ação Principal

### 4.1 — Criar `components/shared/fab.tsx`

```tsx
// components/shared/fab.tsx
'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FabProps {
  onClick: () => void
  label: string          // para acessibilidade
  icon?: React.ReactNode // ícone customizado (default: Plus)
  className?: string
}

export function Fab({ onClick, label, icon, className }: FabProps) {
  return (
    <Button
      onClick={onClick}
      aria-label={label}
      className={cn(
        // Visível apenas em mobile
        "md:hidden",
        // Posicionamento fixo
        "fixed bottom-6 right-4 z-40",
        // Tamanho e forma
        "h-14 w-14 rounded-full shadow-lg",
        // Cor da marca
        "bg-[#E0FE56] hover:bg-[#d4f04d] text-black",
        // Safe area para iPhones com home indicator
        "mb-[env(safe-area-inset-bottom,0px)]",
        className
      )}
    >
      {icon ?? <Plus className="h-6 w-6" />}
      <span className="sr-only">{label}</span>
    </Button>
  )
}
```

### 4.2 — Integrar o FAB em cada módulo

**Dashboard:** sem FAB (somente leitura)

**Transações (`/transacoes`):**
```tsx
// Em TransactionsClient
import { Fab } from '@/components/shared/fab'
import { useRouter } from 'next/navigation'

const router = useRouter()

<Fab
  onClick={() => router.push('/transacoes/nova')}
  label="Nova transação"
/>
```

**Caixinhas (`/caixinhas`):**
```tsx
<Fab
  onClick={() => setCreateDialogOpen(true)}
  label="Nova caixinha"
/>
```

**Orçamentos (`/orcamentos`):**
```tsx
<Fab
  onClick={() => setBudgetFormOpen(true)}
  label="Novo orçamento"
/>
```

**Investimentos (`/investimentos`):**
```tsx
<Fab
  onClick={() => setAssetFormOpen(true)}
  label="Adicionar ativo"
/>
```

**Cadastros (`/cadastros`):**
```tsx
// FAB com ação contextual dependendo da aba ativa
<Fab
  onClick={handleCreateForActiveTab}
  label={`Novo ${activeTabLabel}`}
/>
```

---

## 5. Dashboard — Responsividade

### 5.1 — Cards de resumo financeiro

```tsx
// ANTES: grid fixo de 3 colunas
<div className="grid grid-cols-3 gap-4">

// DEPOIS: 1 coluna no mobile, 3 no desktop
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
```

Cada card internamente:
```tsx
<div className="rounded-2xl border p-4 md:p-6 space-y-1">
  <p className="text-sm text-muted-foreground">{label}</p>
  <p className="text-2xl md:text-3xl font-bold">{value}</p>
  {/* Ícone grande: menor em mobile */}
  <Icon className="h-8 w-8 md:h-10 md:w-10" />
</div>
```

### 5.2 — Filtros do dashboard

```tsx
// ANTES: inline horizontal
<div className="flex items-center gap-4">
  <DateFilterPicker />
  <WalletFilter />
</div>

// DEPOIS: scroll horizontal em mobile
<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none md:gap-4">
  <DateFilterPicker className="shrink-0" />
  <WalletFilter className="shrink-0" />
</div>
```

### 5.3 — Gráficos do dashboard

```tsx
// Wrapper de gráfico com altura responsiva
<div className="w-full h-[220px] md:h-[320px]">
  <ResponsiveContainer width="100%" height="100%">
    {/* gráfico existente */}
  </ResponsiveContainer>
</div>
```

No Recharts, ajustar fontes e margens para mobile:
```tsx
<XAxis
  tick={{ fontSize: 10 }}
  tickLine={false}
/>
<YAxis
  tick={{ fontSize: 10 }}
  width={50}     // menos espaço em mobile
/>
<CartesianGrid strokeDasharray="3 3" />
<Tooltip
  contentStyle={{ fontSize: 12 }}
/>
```

### 5.4 — Card de alertas de orçamento no dashboard

```tsx
// Card responsivo — empilhado em mobile
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border-l-4">
  <div className="space-y-1">
    <p className="font-medium text-sm">{alertTitle}</p>
    <p className="text-xs text-muted-foreground">{alertDetail}</p>
  </div>
  <Button variant="ghost" size="sm" className="self-start sm:self-center shrink-0">
    Ver orçamentos →
  </Button>
</div>
```

---

## 6. Transações — Cards Mobile

### 6.1 — Criar `components/transacoes/transaction-card-mobile.tsx`

Cada linha da tabela vira um card em mobile:

```tsx
// components/transacoes/transaction-card-mobile.tsx
'use client'

import type { Transaction } from '@/types'
import { Badge } from '@/components/ui/badge'
import { formatDisplayDate, formatCurrency } from '@/lib/utils'
import { MoreHorizontal, CheckCircle, Clock, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TransactionCardMobileProps {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
  onMarkAsPaid: (id: string) => void
  onMarkAsPending: (id: string) => void
  hideValues?: boolean
}

export function TransactionCardMobile({
  transaction,
  onEdit,
  onDelete,
  onMarkAsPaid,
  onMarkAsPending,
  hideValues,
}: TransactionCardMobileProps) {
  const isReceita = transaction.type === 'Receita'

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">

      {/* Linha 1: descrição + valor + menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{transaction.description}</p>
          {transaction.payee && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {transaction.payee.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "font-semibold text-base tabular-nums",
            isReceita ? "text-emerald-500" : "text-rose-500"
          )}>
            {hideValues
              ? "••••••"
              : `${isReceita ? '+' : '-'} ${formatCurrency(transaction.amount)}`
            }
          </span>

          {/* Dropdown de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Ações</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(transaction)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              {transaction.status === 'Pendente' && (
                <DropdownMenuItem onClick={() => onMarkAsPaid(transaction.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Marcar como pago
                </DropdownMenuItem>
              )}
              {transaction.status === 'Realizado' && (
                <DropdownMenuItem onClick={() => onMarkAsPending(transaction.id)}>
                  <Clock className="h-4 w-4 mr-2" /> Marcar como pendente
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(transaction.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Linha 2: badges de categoria, tipo e status */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-xs h-5 px-1.5">
          {isReceita ? 'Receita' : 'Despesa'}
        </Badge>
        {transaction.category && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {transaction.category.name}
          </Badge>
        )}
        <Badge
          variant="outline"
          className={cn(
            "text-xs h-5 px-1.5",
            transaction.status === 'Realizado'
              ? "border-emerald-500/30 text-emerald-600"
              : "border-amber-500/30 text-amber-600"
          )}
        >
          {transaction.status}
        </Badge>
      </div>

      {/* Linha 3: data e competência */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDisplayDate(transaction.date)}</span>
        {transaction.competence && (
          <span>{formatCompetenceDisplay(transaction.competence)}</span>
        )}
      </div>
    </div>
  )
}
```

### 6.2 — Modificar `components/transacoes/transactions-client.tsx`

Renderização condicional mobile/desktop:

```tsx
// Detectar mobile via hook ou CSS
// Opção preferida: usar CSS para mostrar/ocultar (sem JS de detecção)

{/* DESKTOP: tabela existente — intacta */}
<div className="hidden md:block">
  <TransactionTable
    data={transactions}
    // ... todas as props atuais preservadas
  />
</div>

{/* MOBILE: lista de cards */}
<div className="block md:hidden space-y-2">
  {transactions.length === 0 ? (
    <EmptyTransactions />
  ) : (
    transactions.map(transaction => (
      <TransactionCardMobile
        key={transaction.id}
        transaction={transaction}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMarkAsPaid={handleMarkAsPaid}
        onMarkAsPending={handleMarkAsPending}
        hideValues={hideValues}
      />
    ))
  )}
</div>
```

### 6.3 — Filtros de transações em mobile

```tsx
// Filtros ficam em um Sheet que abre da esquerda/direita em mobile
// Em desktop, mantém o comportamento atual (inline ou sidebar de filtros)

{/* Botão de filtros — mobile */}
<Button
  variant="outline"
  size="sm"
  className="md:hidden gap-2"
  onClick={() => setFilterSheetOpen(true)}
>
  <Filter className="h-4 w-4" />
  Filtros
  {activeFiltersCount > 0 && (
    <Badge className="ml-1 h-4 w-4 p-0 text-xs">{activeFiltersCount}</Badge>
  )}
</Button>

{/* Sheet de filtros mobile */}
<Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
  <SheetContent side="right" className="w-[300px] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Filtros</SheetTitle>
    </SheetHeader>
    <div className="space-y-4 mt-4">
      {/* Todos os filtros existentes, empilhados verticalmente */}
      <TransactionFiltersContent
        onApply={() => setFilterSheetOpen(false)}
      />
    </div>
  </SheetContent>
</Sheet>

{/* Desktop: filtros inline — comportamento atual preservado */}
<div className="hidden md:flex items-center gap-2 flex-wrap">
  <TransactionFiltersInline />
</div>
```

---

## 7. Formulário de Transação — Rota Própria Mobile

### 7.1 — Criar `app/(main)/(authenticated)/transacoes/nova/page.tsx`

```tsx
// app/(main)/(authenticated)/transacoes/nova/page.tsx
import { TransactionForm } from '@/components/transacoes/transaction-form'
import { getTransactionFormData } from '@/app/actions/transactions-fetch'
import { redirect } from 'next/navigation'

export default async function NovaTransacaoPage() {
  const formData = await getTransactionFormData()

  return (
    // Padding-bottom para não sobrepor o FAB (não existe nesta página)
    <div className="p-4 pb-8 space-y-4">
      {/* Header mobile com botão voltar */}
      <div className="flex items-center gap-3">
        <BackButton href="/transacoes" />
        <h1 className="text-lg font-semibold">Nova Transação</h1>
      </div>

      {/* Formulário existente reutilizado */}
      <TransactionForm
        formData={formData}
        onSuccess={() => redirect('/transacoes')}
        layout="mobile"    // nova prop para ajustes internos de layout
      />
    </div>
  )
}
```

### 7.2 — Criar `app/(main)/(authenticated)/transacoes/[id]/editar/page.tsx`

```tsx
// Rota de edição mobile — mesma lógica
export default async function EditarTransacaoPage({
  params
}: { params: { id: string } }) {
  const [transaction, formData] = await Promise.all([
    getTransactionById(params.id),
    getTransactionFormData(),
  ])

  if (!transaction) notFound()

  return (
    <div className="p-4 pb-8 space-y-4">
      <div className="flex items-center gap-3">
        <BackButton href="/transacoes" />
        <h1 className="text-lg font-semibold">Editar Transação</h1>
      </div>

      <TransactionForm
        formData={formData}
        defaultValues={transaction}
        onSuccess={() => redirect('/transacoes')}
        layout="mobile"
      />
    </div>
  )
}
```

### 7.3 — Ajustes internos no `transaction-form.tsx` para layout mobile

Adicionar prop `layout?: 'desktop' | 'mobile'` e ajustar:

```tsx
// Campos side-by-side em desktop, empilhados em mobile
<div className={cn(
  "grid gap-4",
  layout === 'mobile' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
)}>
  <FormField name="amount" ... />
  <FormField name="date" ... />
</div>

// Selects em full-width no mobile
<Select>
  <SelectTrigger className="w-full">
    ...
  </SelectTrigger>
</Select>

// Botão de submit — sticky no bottom em mobile
<div className={cn(
  layout === 'mobile'
    ? "fixed bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom"
    : "flex justify-end gap-2 pt-4"
)}>
  <Button type="submit" className={layout === 'mobile' ? "w-full h-12" : ""}>
    Salvar transação
  </Button>
</div>
```

### 7.4 — Modificar o FAB de transações para navegar para `/transacoes/nova`

```tsx
// Em TransactionsClient — o Dialog de criar transação existente
// fica para desktop; mobile usa a rota própria

{/* Desktop: abre Dialog como antes */}
<div className="hidden md:block">
  <Button onClick={() => setDialogOpen(true)}>Nova transação</Button>
</div>

{/* Mobile: FAB navega para /transacoes/nova */}
<Fab
  onClick={() => router.push('/transacoes/nova')}
  label="Nova transação"
/>
```

---

## 8. Módulo Caixinhas — Responsividade

### 8.1 — Grid de cards

```tsx
// ANTES: grid fixo
<div className="grid grid-cols-3 gap-4">

// DEPOIS: 1 col mobile, 2 tablet, 3 desktop
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
```

### 8.2 — SavingsBoxCard em mobile

O card já tem layout vertical — apenas garantir:
- `p-4` em mobile, `p-6` em desktop
- Barra de progresso `h-2` em mobile, `h-2.5` em desktop
- Botão "Aportar" full-width em mobile:

```tsx
<Button
  onClick={() => setContributionOpen(true)}
  className="w-full md:w-auto"
  size="sm"
>
  + Aportar
</Button>
```

### 8.3 — ContributionForm como bottom sheet em mobile

```tsx
// Em mobile, usar Sheet com side="bottom" em vez de Dialog
// Em desktop, manter Dialog

const isMobile = useIsMobile()  // hook descrito na seção 12

{isMobile ? (
  <Sheet open={open} onOpenChange={setOpen}>
    <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
      <SheetHeader className="mb-4">
        <SheetTitle>Registrar aporte</SheetTitle>
      </SheetHeader>
      <ContributionFormContent onSuccess={() => setOpen(false)} />
    </SheetContent>
  </Sheet>
) : (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
      <ContributionFormContent onSuccess={() => setOpen(false)} />
    </DialogContent>
  </Dialog>
)}
```

---

## 9. Módulo Orçamentos — Responsividade

### 9.1 — Seletor de mês

```tsx
// Em mobile: compactar o seletor de mês
<div className="flex items-center gap-1 md:gap-2">
  <Button variant="ghost" size="icon" className="h-8 w-8">
    <ChevronLeft className="h-4 w-4" />
  </Button>

  <span className="text-sm font-medium min-w-[80px] text-center">
    {formatYearMonth(currentMonth)}
  </span>

  <Button variant="ghost" size="icon" className="h-8 w-8">
    <ChevronRight className="h-4 w-4" />
  </Button>
</div>
```

### 9.2 — Grid de cards de orçamento

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
```

### 9.3 — BudgetMonthEditor como bottom sheet em mobile

```tsx
// Sheet com side="bottom" em mobile, side="right" em desktop
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent
    side={isMobile ? "bottom" : "right"}
    className={cn(
      isMobile ? "h-[85vh] rounded-t-2xl" : "w-[420px]",
      "overflow-y-auto"
    )}
  >
    <BudgetMonthEditorContent budget={budget} />
  </SheetContent>
</Sheet>
```

---

## 10. Módulo Investimentos — Responsividade

### 10.1 — PortfolioSummaryHeader

```tsx
// Cards de métricas: 2 cols mobile, 3 desktop
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  <MetricCard label="Total Investido" value={summary.total_invested} />
  <MetricCard label="Rendimentos" value={summary.total_income} />
  <MetricCard
    label="Ganho/Perda"
    value={summary.total_gain_loss}
    className="col-span-2 md:col-span-1"  // ocupa 2 cols na linha 2 do mobile
  />
</div>
```

### 10.2 — Gráfico de pizza

```tsx
// Altura reduzida em mobile
<div className="w-full h-[200px] md:h-[260px]">
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        innerRadius={isMobile ? 50 : 70}
        outerRadius={isMobile ? 80 : 110}
        // ...
      />
    </PieChart>
  </ResponsiveContainer>
</div>

// Legenda em grid 2x2 abaixo do gráfico em mobile
<div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 mt-3">
  {summary.by_class.map(cls => (
    <LegendItem key={cls.class} {...cls} />
  ))}
</div>
```

### 10.3 — AssetCard

```tsx
// Igual ao padrão das caixinhas: p-4 mobile, p-6 desktop
// Grid de métricas do card: 2 cols mobile
<div className="grid grid-cols-2 gap-3 text-sm">
  <div>
    <p className="text-xs text-muted-foreground">Valor Atual</p>
    <p className="font-semibold">{formatCurrency(current_value)}</p>
  </div>
  <div>
    <p className="text-xs text-muted-foreground">Investido</p>
    <p className="font-semibold">{formatCurrency(total_invested)}</p>
  </div>
</div>
```

---

## 11. Módulo Cadastros — Responsividade

### 11.1 — Tabs de cadastro

As tabs atuais (Carteiras / Favorecidos / Categorias / Classificações) em mobile devem ter scroll horizontal:

```tsx
<Tabs defaultValue="carteiras">
  <TabsList className="flex overflow-x-auto scrollbar-none w-full md:w-auto">
    <TabsTrigger value="carteiras" className="shrink-0">Carteiras</TabsTrigger>
    <TabsTrigger value="favorecidos" className="shrink-0">Favorecidos</TabsTrigger>
    <TabsTrigger value="categorias" className="shrink-0">Categorias</TabsTrigger>
    <TabsTrigger value="classificacoes" className="shrink-0 text-xs md:text-sm">
      Classificações
    </TabsTrigger>
  </TabsList>
  {/* conteúdo das tabs */}
</Tabs>
```

### 11.2 — Listas de cadastro

Cada item de cadastro (carteira, favorecido, categoria) vira um card compacto em mobile:

```tsx
// ANTES: tabela ou grid fixo
// DEPOIS: lista de cards responsiva
<div className="space-y-2">
  {items.map(item => (
    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
      <div className="flex items-center gap-3 min-w-0">
        {/* ícone/cor */}
        <div className="h-8 w-8 rounded-lg shrink-0" style={{ background: item.color }} />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{item.name}</p>
          {item.type && (
            <p className="text-xs text-muted-foreground">{item.type}</p>
          )}
        </div>
      </div>
      {/* Ações */}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  ))}
</div>
```

---

## 12. Hook `useIsMobile`

Criar hook utilitário para os poucos casos onde a lógica JS precisa saber o tamanho da tela (ex: Sheet side="bottom" vs "right"):

```typescript
// hooks/use-is-mobile.ts
'use client'

import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)

    setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
```

> **Regra:** Usar `useIsMobile()` somente quando CSS puro (`md:` classes) não for suficiente para alternar comportamento. CSS é sempre preferível por ser mais performático (sem flash de conteúdo).

---

## 13. Formulários — Ajustes Globais de UX Mobile

Aplicar em **todos** os formulários do projeto (transaction-form, savings-box-form, budget-form, asset-form, todos os forms de cadastro):

### 13.1 — Inputs com altura adequada para toque

```tsx
// Todos os inputs devem ter altura mínima de 44px em mobile
<Input className="h-11 md:h-10" />
<SelectTrigger className="h-11 md:h-10" />
<Button className="h-11 md:h-10" />
```

### 13.2 — DatePicker adaptado para mobile

O `react-day-picker` em mobile deve abrir como bottom sheet:

```tsx
// Em date-filter-picker.tsx e campos de data nos forms
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full h-11 md:h-10 justify-start">
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? formatDisplayDate(date) : 'Selecionar data'}
    </Button>
  </PopoverTrigger>
  <PopoverContent
    className="w-auto p-0"
    align="start"
    // Em mobile, alinhar ao centro da tela
    side="bottom"
    sideOffset={4}
  >
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      // Calendário menor em mobile
      className="rounded-xl"
    />
  </PopoverContent>
</Popover>
```

### 13.3 — Selects em full-width no mobile

```tsx
<Select>
  <SelectTrigger className="w-full h-11 md:h-10">
    <SelectValue placeholder="Selecionar..." />
  </SelectTrigger>
  <SelectContent
    // Previne o select de sair da tela em mobile
    position="popper"
    className="max-h-[40vh]"
  >
    {options.map(opt => (
      <SelectItem key={opt.value} value={opt.value}>
        {opt.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 13.4 — Botões de submit fixos no bottom de páginas longas

Para qualquer formulário em página própria (ex: `/transacoes/nova`):

```tsx
// O botão de submit fica fixo no rodapé em mobile
// Em desktop, mantém posição inline no final do form

<div className="
  fixed bottom-0 left-0 right-0
  md:static
  p-4 md:p-0
  bg-background md:bg-transparent
  border-t md:border-t-0
  safe-area-bottom
  z-30
">
  <Button
    type="submit"
    className="w-full md:w-auto h-12 md:h-10"
    disabled={isPending}
  >
    {isPending ? 'Salvando...' : 'Salvar'}
  </Button>
</div>
```

---

## 14. Toasts e Notificações em Mobile

### 14.1 — Posição do Sonner em mobile

```tsx
// No layout principal onde o Toaster está configurado
<Toaster
  position="top-center"          // mobile: topo centro (não obstrui FAB)
  toastOptions={{
    className: 'text-sm',
    duration: 3000,
  }}
  // Em desktop: manter bottom-right
  // Usar prop responsiva do Sonner se disponível,
  // caso contrário usar position="top-center" que funciona bem em ambos
/>
```

---

## 15. ProfileSheet — Responsividade

```tsx
// ProfileSheet já usa Sheet do shadcn — apenas garantir side correto
<Sheet>
  <SheetContent
    side={isMobile ? "bottom" : "right"}
    className={cn(
      isMobile ? "h-auto rounded-t-2xl pb-safe" : "w-[400px]",
    )}
  >
    {/* conteúdo do perfil */}
  </SheetContent>
</Sheet>
```

---

## 16. Checklist de Validação Final

Executar em **dois dispositivos/viewports simultaneamente** ao final de cada seção:
- **Mobile:** 390px (Chrome DevTools — iPhone 14 Pro)
- **Desktop:** 1280px (janela normal)

### Por módulo:

**Navegação:**
- [ ] Sidebar oculta em mobile (< 768px)
- [ ] Header mobile com hamburguer visível
- [ ] Drawer abre/fecha corretamente com overlay
- [ ] Links do drawer fecham o menu ao navegar
- [ ] Sidebar desktop intacta e funcional

**Dashboard:**
- [ ] Cards em coluna única em mobile
- [ ] Gráficos com scroll ou tamanho reduzido — sem overflow horizontal
- [ ] Filtros em scroll horizontal — sem quebrar layout
- [ ] Toggle de visibilidade funcional em mobile

**Transações:**
- [ ] Cards empilhados visíveis apenas em mobile (< md)
- [ ] Tabela visível apenas em desktop (≥ md)
- [ ] FAB navega para `/transacoes/nova`
- [ ] `/transacoes/nova` abre corretamente em mobile
- [ ] Botão submit fixo no bottom da rota nova
- [ ] Filtros abrem em Sheet lateral em mobile
- [ ] Dropdown de ações nos cards funcional em toque

**Formulários globais:**
- [ ] Inputs com altura ≥ 44px em mobile
- [ ] Nenhum input causa zoom ao focar no iOS
- [ ] Selects abrem corretamente e não saem da tela
- [ ] DatePicker abre dentro da viewport
- [ ] Campos empilhados em coluna única em mobile

**Caixinhas:**
- [ ] Grid de 1 coluna em mobile
- [ ] FAB presente e funcional
- [ ] ContributionForm como bottom sheet
- [ ] Cards com padding mobile correto

**Orçamentos:**
- [ ] Seletor de mês compacto funcional
- [ ] Grid de 1 coluna em mobile
- [ ] FAB presente e funcional
- [ ] BudgetMonthEditor como bottom sheet

**Investimentos:**
- [ ] Header patrimonial em 2 cols mobile
- [ ] Gráfico de pizza com tamanho reduzido
- [ ] Legenda em grid 2x2 mobile
- [ ] AssetCards em 1 coluna
- [ ] FAB presente e funcional

**Cadastros:**
- [ ] Tabs com scroll horizontal sem overflow
- [ ] Listas em cards compactos
- [ ] FAB contextual por aba ativa

**Qualidade:**
- [ ] Zero overflow horizontal em qualquer página
- [ ] `bun run type-check` sem erros
- [ ] `bun run build` compila com sucesso
- [ ] FAB não obstrui conteúdo importante (padding-bottom nas listas)
- [ ] Safe area aplicada em iPhones com notch/Dynamic Island
- [ ] Nenhuma funcionalidade desktop foi alterada ou removida

---

## NOTAS TÉCNICAS FINAIS

- **CSS first:** Sempre preferir classes `md:` do Tailwind antes de `useIsMobile()`. O hook deve ser reservado para alterações de comportamento JavaScript que CSS não consegue controlar (ex: `side="bottom"` vs `side="right"` em Sheet).
- **`hidden md:block` vs `block md:hidden`:** O padrão é sempre render ambos no HTML e usar CSS para ocultar. Isso é mais performático que renderização condicional e evita hydration mismatch.
- **FAB e padding-bottom:** Toda lista ou página que tem FAB deve ter `pb-20 md:pb-0` para que o último item não fique escondido atrás do botão flutuante.
- **`safe-area-inset-bottom`:** Aplicar em FAB, bottom sheets e botões sticky. iPhones com home indicator (iPhone X em diante) têm 34px de safe area.
- **Bun:** Usar `bun add` para qualquer nova dependência — não `npm install`.
- **Toque mínimo:** Todos os elementos clicáveis devem ter área de toque ≥ 44×44px (WCAG 2.5.5). Use `min-h-[44px] min-w-[44px]` quando necessário.
- **`overflow-x: hidden` no body:** Já definido na Seção 1.2 — resolve a maioria dos casos de scroll horizontal indesejado.
- **Não alterar `components/ui/`:** Os componentes shadcn/ui base não devem ser modificados. Aplicar ajustes mobile via `className` nas chamadas dos componentes, nunca nos arquivos base.
