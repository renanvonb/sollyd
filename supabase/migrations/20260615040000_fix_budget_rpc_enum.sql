-- Após migração 017 o enum transaction_type perdeu 'expense'. A RPC get_budget_consumption
-- filtrava t.type IN ('Despesa','expense'), causando 22P02 (invalid input value for enum).
-- Recriada usando apenas 'Despesa'.
CREATE OR REPLACE FUNCTION get_budget_consumption(p_year_month TEXT)
RETURNS TABLE (
  budget_id UUID, category_id UUID, subcategory_id UUID, category_name TEXT,
  category_icon TEXT, category_color TEXT, subcategory_name TEXT, budget_name TEXT,
  default_amount NUMERIC, is_active BOOLEAN, year_month TEXT,
  budget_amount NUMERIC, spent_amount NUMERIC, percentage NUMERIC
) LANGUAGE sql SECURITY INVOKER STABLE AS $$
  SELECT b.id, b.category_id, b.subcategory_id, c.name, c.icon, c.color, sc.name, b.name,
    b.default_amount, b.is_active, p_year_month,
    COALESCE(bm.amount, b.default_amount),
    COALESCE(SUM(t.amount), 0),
    ROUND(COALESCE(SUM(t.amount), 0) / COALESCE(bm.amount, b.default_amount) * 100, 1)
  FROM budgets b
  JOIN categories c ON c.id = b.category_id
  LEFT JOIN subcategories sc ON sc.id = b.subcategory_id
  LEFT JOIN budget_months bm ON bm.budget_id = b.id AND bm.year_month = p_year_month
  LEFT JOIN transactions t ON t.user_id = b.user_id AND t.category_id = b.category_id
    AND (b.subcategory_id IS NULL OR t.subcategory_id = b.subcategory_id)
    AND t.type = 'Despesa' AND t.competence IS NOT NULL
    AND TO_CHAR(DATE_TRUNC('month', t.competence), 'YYYY-MM') = p_year_month
  WHERE b.user_id = auth.uid() AND b.is_active = true
  GROUP BY b.id, c.name, c.icon, c.color, sc.name, b.name, b.default_amount, b.is_active, bm.amount;
$$;
