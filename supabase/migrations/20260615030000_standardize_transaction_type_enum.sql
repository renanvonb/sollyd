-- Padroniza enum transaction_type para somente 'Receita'/'Despesa'.
-- IMPORTANTE: o tipo transaction_type é compartilhado por transactions.type E
-- categories.type (default 'Despesa'). Ambas as colunas são tratadas — a versão
-- do prompt (que só tocava transactions) quebraria categories no DROP TYPE.
-- Dados já estavam limpos (sem revenue/expense/investment); cast direto é seguro.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM transactions WHERE type::text NOT IN ('Receita','Despesa'))
     OR EXISTS (SELECT 1 FROM categories WHERE type::text NOT IN ('Receita','Despesa')) THEN
    RAISE EXCEPTION 'Existem registros com tipo legado. Converta antes de continuar.';
  END IF;
END $$;

ALTER TABLE categories ALTER COLUMN type DROP DEFAULT;

ALTER TABLE transactions ALTER COLUMN type TYPE TEXT;
ALTER TABLE categories   ALTER COLUMN type TYPE TEXT;

DROP TYPE transaction_type;
CREATE TYPE transaction_type AS ENUM ('Receita','Despesa');

ALTER TABLE transactions ALTER COLUMN type TYPE transaction_type USING type::transaction_type;
ALTER TABLE categories   ALTER COLUMN type TYPE transaction_type USING type::transaction_type;

ALTER TABLE transactions ALTER COLUMN type SET NOT NULL;
ALTER TABLE categories   ALTER COLUMN type SET DEFAULT 'Despesa'::transaction_type;
