-- DIAGNÓSTICO: lista todas as UNIQUE (constraints + índices) das tabelas de cadastro
-- e marca as que NÃO incluem user_id (causa do bug de nome duplicado entre usuários).
-- Rodar no Supabase SQL Editor.

-- 1. Constraints UNIQUE
SELECT
    rel.relname                              AS tabela,
    con.conname                              AS constraint_name,
    pg_get_constraintdef(con.oid)            AS definicao,
    EXISTS (
        SELECT 1 FROM unnest(con.conkey) ck
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ck
        WHERE a.attname = 'user_id'
    )                                        AS inclui_user_id
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
  AND con.contype = 'u'
  AND rel.relname IN ('categories','subcategories','classifications','payees','payers','wallets','transactions')
ORDER BY rel.relname;

-- 2. Índices UNIQUE
SELECT
    t.relname                AS tabela,
    i.relname                AS indice,
    pg_get_indexdef(i.oid)   AS definicao,
    EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = t.oid AND a.attname = 'user_id'
          AND a.attnum = ANY (ix.indkey)
    )                        AS inclui_user_id
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace ns ON ns.oid = t.relnamespace
WHERE ns.nspname = 'public'
  AND ix.indisunique
  AND t.relname IN ('categories','subcategories','classifications','payees','payers','wallets','transactions')
ORDER BY t.relname;
