-- FIX: unicidade de nome deve ser POR USUÁRIO (não global).
-- Bug: usuários diferentes não conseguem cadastrar registros com o mesmo nome,
-- porque há constraints/índices UNIQUE em (name) sem incluir user_id.
-- Esta migration remove qualquer UNIQUE nessas tabelas que NÃO inclua user_id
-- e recria a unicidade correta por usuário.

-- 1. Remover constraints UNIQUE sem user_id
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
              SELECT 1
              FROM unnest(con.conkey) ck
              JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ck
              WHERE a.attname = 'user_id'
          )
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.relname, r.conname);
        RAISE NOTICE 'Dropped unique constraint %.%', r.relname, r.conname;
    END LOOP;
END $$;

-- 2. Remover índices UNIQUE (sem constraint) sem user_id
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

-- 3. Recriar unicidade correta por usuário
--    (categorias: por tipo também, para permitir mesmo nome em Despesa e Receita)
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_type_key   ON public.categories     (user_id, name, type);
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_user_cat_name_key ON public.subcategories  (user_id, category_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS classifications_user_name_key   ON public.classifications (user_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_name_key           ON public.wallets        (user_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS payees_user_name_key            ON public.payees         (user_id, name);

NOTIFY pgrst, 'reload schema';
