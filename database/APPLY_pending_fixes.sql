-- =====================================================================
-- SOLLYD — Correções pendentes (idempotente). Cole no Supabase SQL Editor e RUN.
-- Ordem importa: (1) unicidade por usuário  (2) colunas transactions  (3) defaults de cadastro
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. FIX: unicidade de nome deve ser POR USUÁRIO (não global)
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT con.conname, rel.relname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = 'public'
          AND con.contype = 'u'
          AND rel.relname IN ('categories','subcategories','classifications','payees','payers','wallets')
          AND NOT EXISTS (
              SELECT 1 FROM unnest(con.conkey) ck
              JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ck
              WHERE a.attname = 'user_id'
          )
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.relname, r.conname);
        RAISE NOTICE 'Dropped unique constraint %.%', r.relname, r.conname;
    END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT i.relname AS idxname, t.relname AS tblname
        FROM pg_index ix
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_namespace ns ON ns.oid = t.relnamespace
        WHERE ns.nspname = 'public'
          AND ix.indisunique
          AND NOT ix.indisprimary
          AND t.relname IN ('categories','subcategories','classifications','payees','payers','wallets')
          AND NOT EXISTS (
              SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = t.oid AND a.attname = 'user_id'
                AND a.attnum = ANY (ix.indkey)
          )
          AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.oid)
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I', r.idxname);
        RAISE NOTICE 'Dropped unique index %', r.idxname;
    END LOOP;
END $$;

-- categories: remover uniques que não incluam 'type' (permite "Sem categoria" em Despesa E Receita)
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT con.conname FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = 'public' AND con.contype = 'u' AND rel.relname = 'categories'
          AND NOT EXISTS (
              SELECT 1 FROM unnest(con.conkey) ck
              JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ck
              WHERE a.attname = 'type'
          )
    LOOP
        EXECUTE format('ALTER TABLE public.categories DROP CONSTRAINT %I', r.conname);
    END LOOP;
    FOR r IN
        SELECT i.relname FROM pg_index ix
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_namespace ns ON ns.oid = t.relnamespace
        WHERE ns.nspname = 'public' AND t.relname = 'categories' AND ix.indisunique AND NOT ix.indisprimary
          AND NOT EXISTS (
              SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = t.oid AND a.attname = 'type' AND a.attnum = ANY (ix.indkey)
          )
          AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.oid)
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I', r.relname);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_type_key   ON public.categories     (user_id, name, type);
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_user_cat_name_key ON public.subcategories  (user_id, category_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS classifications_user_name_key   ON public.classifications (user_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_name_key           ON public.wallets        (user_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS payees_user_name_key            ON public.payees         (user_id, name);

-- ---------------------------------------------------------------------
-- 2. Colunas em transactions (recorrência / parcelamento / data realizado)
-- ---------------------------------------------------------------------
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_recurring          BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_installment        BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_frequency   TEXT     CHECK (recurring_frequency IN ('monthly','yearly')),
  ADD COLUMN IF NOT EXISTS recurring_occurrences INTEGER  CHECK (recurring_occurrences BETWEEN 2 AND 60),
  ADD COLUMN IF NOT EXISTS recurring_group_id    UUID,
  ADD COLUMN IF NOT EXISTS realized_at           DATE;

-- ---------------------------------------------------------------------
-- 3. Defaults de cadastro (Sem categoria/subcategoria/classificação)
-- ---------------------------------------------------------------------
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE subcategories   ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE classifications ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

CREATE OR REPLACE FUNCTION public.seed_default_cadastros(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cat_despesa uuid;
    v_cat_receita uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM classifications WHERE user_id = p_user_id AND is_default) THEN
        INSERT INTO classifications (user_id, name, color, icon, is_default)
        VALUES (p_user_id, 'Sem classificação', 'zinc', 'circle', true);
    END IF;

    SELECT id INTO v_cat_despesa FROM categories
        WHERE user_id = p_user_id AND is_default AND type = 'Despesa' LIMIT 1;
    IF v_cat_despesa IS NULL THEN
        INSERT INTO categories (user_id, name, type, color, icon, is_default)
        VALUES (p_user_id, 'Sem categoria', 'Despesa', 'zinc', 'circle', true)
        RETURNING id INTO v_cat_despesa;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM subcategories WHERE user_id = p_user_id AND is_default AND category_id = v_cat_despesa) THEN
        INSERT INTO subcategories (user_id, name, category_id, is_default)
        VALUES (p_user_id, 'Sem subcategoria', v_cat_despesa, true);
    END IF;

    SELECT id INTO v_cat_receita FROM categories
        WHERE user_id = p_user_id AND is_default AND type = 'Receita' LIMIT 1;
    IF v_cat_receita IS NULL THEN
        INSERT INTO categories (user_id, name, type, color, icon, is_default)
        VALUES (p_user_id, 'Sem categoria', 'Receita', 'zinc', 'circle', true)
        RETURNING id INTO v_cat_receita;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM subcategories WHERE user_id = p_user_id AND is_default AND category_id = v_cat_receita) THEN
        INSERT INTO subcategories (user_id, name, category_id, is_default)
        VALUES (p_user_id, 'Sem subcategoria', v_cat_receita, true);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_cadastros()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.seed_default_cadastros(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_cadastros ON auth.users;
CREATE TRIGGER on_auth_user_created_cadastros
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_cadastros();

DO $$
DECLARE u record;
BEGIN
    FOR u IN SELECT id FROM auth.users LOOP
        PERFORM public.seed_default_cadastros(u.id);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_default_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_default THEN
        RAISE EXCEPTION 'Registro padrão não pode ser excluído';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_default_delete_categories ON categories;
CREATE TRIGGER prevent_default_delete_categories
    BEFORE DELETE ON categories FOR EACH ROW EXECUTE FUNCTION public.prevent_default_delete();
DROP TRIGGER IF EXISTS prevent_default_delete_subcategories ON subcategories;
CREATE TRIGGER prevent_default_delete_subcategories
    BEFORE DELETE ON subcategories FOR EACH ROW EXECUTE FUNCTION public.prevent_default_delete();
DROP TRIGGER IF EXISTS prevent_default_delete_classifications ON classifications;
CREATE TRIGGER prevent_default_delete_classifications
    BEFORE DELETE ON classifications FOR EACH ROW EXECUTE FUNCTION public.prevent_default_delete();

NOTIFY pgrst, 'reload schema';
