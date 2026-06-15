<img width="978" height="550" alt="case-readme-sollyd" src="https://github.com/user-attachments/assets/d528577e-5199-4474-8c20-bdbf1062216e" />

# Sollyd SaaS - Project Documentation & AI Guidelines

## 1. Project Overview
Sollyd is a SaaS financial management application built for speed, strict data accuracy, and a premium user experience.

## 2. Tech Stack
- **Runtime**: Bun (Strictly use `bun` commands for package management and script execution).
- **Framework**: Next.js 14+ (App Router).
- **Styling**: TailwindCSS + Shadcn/UI.
- **Database**: Supabase (PostgreSQL).
- **Language**: TypeScript (Strict mode).

### Modules
`/dashboard` · `/transacoes` · `/financeiro` · `/cadastros` · `/orcamentos` (budgets) · `/caixinhas` (savings goals) · `/investimentos` (asset portfolio).

## 3. Core Protocols & Rules (Strict Adherence Required)

### 3.1. Transaction Types
The `transaction_type` enum is standardized to **`'Receita'` / `'Despesa'`** only (migration `..._standardize_transaction_type_enum`). The legacy english values `revenue`/`expense` are **no longer stored** in the database.

| Concept | Database Value (Strict) | Color Theme |
| :--- | :--- | :--- |
| **Income** | `'Receita'` | **Emerald (Green)** |
| **Expense** | `'Despesa'` | **Rose (Red)** |

*   **Source of truth**: `lib/constants.ts` (`TRANSACTION_TYPES`). Import these constants — do not retype the string literals.
*   **Legacy input only**: `normalizeTransactionType()` in `lib/constants.ts` coerces any stale `revenue`/`expense`/`investment` value coming from old callers into the canonical Portuguese value before it reaches the DB. Never write english variants back.

### 3.2. Date & Competence Filtering
Timezone issues are critical. Follow these rules to prevent "off-by-one-day" errors.

*   **Competence (`competence`)**: Used for accounting periods (Month/Year).
    *   **Format**: ALWAYS `'YYYY-MM-01'` (First day of the month).
    *   **Filtering**: When `range === 'mes'`, use strict equality (`.eq('competence', '2024-02-01')`). **DO NOT** use `.gte`/`.lte` for competence in monthly views to avoid timezone shifts.
*   **Transaction Date (`date`)**: Used for the actual event date.
    *   **Pending Items**: Items with `status === 'Pendente'` might not have a `date`. Filter them primarily by `competence`.

### 3.3. Financial Aggregation
*   **Client-Side**: When aggregating totals, filter by the canonical values from `TRANSACTION_TYPES` (`'Receita'` / `'Despesa'`).
*   **Visuals**:
    *   **Income**: Display in Green.
    *   **Expense**: Display in Red.
    *   **Badges**: Use specific Tailwind classes defined in `columns.tsx` for consistent look and feel.

### 3.4. Contacts (Pagadores vs Beneficiários)
*   The `payees` table serves both "Pagadores" (Payers) and "Beneficiários" (Payees).
*   **Context**:
    *   If Transaction Type is **Receita**, filter contacts to show **Pagadores**.
    *   If Transaction Type is **Despesa**, filter contacts to show **Beneficiários**.
*   **Hook**: Use `usePayees(type)` (`hooks/use-payees.ts`) which handles this logic automatically.

### 3.5. Brand Color
*   The brand color is the Tailwind token **`brand`** (`#E0FE56`), defined in `tailwind.config.ts`.
*   Use `bg-brand` / `text-brand` / `bg-brand-hover` / `text-brand-foreground`. **Do not** hardcode the hex literal in components.

## 4. Architecture Standards

### 4.1. Server Actions
*   Located in `app/actions/`.
*   Must be `'use server'`.
*   **Authentication**: Always validate `supabase.auth.getUser()` before performing mutations.
*   **Validation**: Use `Zod` schemas for all inputs. The schema should mirror the Database Constraints.

### 4.2. Shadcn/UI & Styling
*   Use `lucide-react` for icons.
*   Stick to the `zinc` neutral palette for structure, using semantic colors (green/red/blue) only for financial status.
*   **Inter Font**: Standard font for the application.

### 4.3. State Management
*   **URL Search Params**: The Source of Truth for filters (`range`, `from`, `to`, `search`, `status`).
*   **Mutations**: Use `React.useTransition` to handle loading states for Server Actions.

## 5. Deployment
*   Platform: Vercel (auto-deploy on push to `master`).
*   Build Command: `bun run build`.
*   Environment Variables (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (server-only, admin features).

## 6. Common Issues & fixes
*   **Empty Dashboard**: Ensure filters use the canonical `'Receita'`/`'Despesa'` values from `TRANSACTION_TYPES`.
*   **Wrong Month Data**: Caused by sending `endDate` in a monthly view or timezone shifts. **Fix**: Use strict `competence` equality for monthly views.

---
**Last Updated**: 2026-06-15
