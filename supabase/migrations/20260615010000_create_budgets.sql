-- ============================================================
-- TABELA: budgets (Orçamentos)
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subcategory_id   UUID REFERENCES subcategories(id) ON DELETE CASCADE,
  name             TEXT,
  default_amount   NUMERIC(12,2) NOT NULL CHECK (default_amount > 0),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Postgres trata NULL como distinto em UNIQUE; COALESCE garante 1 orçamento
-- por categoria geral (subcategory_id NULL) por usuário.
CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_user_cat_subcat
  ON budgets (user_id, category_id, COALESCE(subcategory_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================================
-- TABELA: budget_months (Sobrescritas mensais)
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_months (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  year_month  TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (budget_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_months_budget ON budget_months(budget_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own budget_months" ON budget_months FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budget_months" ON budget_months FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budget_months" ON budget_months FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget_months" ON budget_months FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RPC: get_budget_consumption(p_year_month)
-- Calcula consumo por orçamento para um mês (pelo campo competence).
-- SECURITY INVOKER → RLS aplica às transações do usuário.
-- Substitui a VIEW budget_consumption do spec (que não aceita parâmetro de mês
-- e agregava year_month NULL quando não há transações).
-- ============================================================
CREATE OR REPLACE FUNCTION get_budget_consumption(p_year_month TEXT)
RETURNS TABLE (
  budget_id       UUID,
  category_id     UUID,
  subcategory_id  UUID,
  category_name   TEXT,
  category_icon   TEXT,
  category_color  TEXT,
  subcategory_name TEXT,
  budget_name     TEXT,
  default_amount  NUMERIC,
  is_active       BOOLEAN,
  year_month      TEXT,
  budget_amount   NUMERIC,
  spent_amount    NUMERIC,
  percentage      NUMERIC
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT
    b.id,
    b.category_id,
    b.subcategory_id,
    c.name,
    c.icon,
    c.color,
    sc.name,
    b.name,
    b.default_amount,
    b.is_active,
    p_year_month,
    COALESCE(bm.amount, b.default_amount) AS budget_amount,
    COALESCE(SUM(t.amount), 0) AS spent_amount,
    ROUND(COALESCE(SUM(t.amount), 0) / COALESCE(bm.amount, b.default_amount) * 100, 1) AS percentage
  FROM budgets b
  JOIN categories c ON c.id = b.category_id
  LEFT JOIN subcategories sc ON sc.id = b.subcategory_id
  LEFT JOIN budget_months bm ON bm.budget_id = b.id AND bm.year_month = p_year_month
  LEFT JOIN transactions t
    ON t.user_id = b.user_id
    AND t.category_id = b.category_id
    AND (b.subcategory_id IS NULL OR t.subcategory_id = b.subcategory_id)
    AND t.type IN ('Despesa', 'expense')
    AND t.competence IS NOT NULL
    AND TO_CHAR(DATE_TRUNC('month', t.competence), 'YYYY-MM') = p_year_month
  WHERE b.user_id = auth.uid() AND b.is_active = true
  GROUP BY b.id, c.name, c.icon, c.color, sc.name, b.name, b.default_amount, b.is_active, bm.amount;
$$;
