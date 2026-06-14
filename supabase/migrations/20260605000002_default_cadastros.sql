-- Defaults "Sem categoria / Sem subcategoria / Sem classificação"
-- Pré-cadastrados por usuário, pré-selecionáveis e não excluíveis.

-- 1. Flag is_default
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE subcategories   ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE classifications ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- 2. Função de seed (idempotente) por usuário
CREATE OR REPLACE FUNCTION public.seed_default_cadastros(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cat_despesa uuid;
    v_cat_receita uuid;
BEGIN
    -- Classificação padrão
    IF NOT EXISTS (SELECT 1 FROM classifications WHERE user_id = p_user_id AND is_default) THEN
        INSERT INTO classifications (user_id, name, color, icon, is_default)
        VALUES (p_user_id, 'Sem classificação', 'zinc', 'circle', true);
    END IF;

    -- Categoria padrão (Despesa) + subcategoria padrão
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

    -- Categoria padrão (Receita) + subcategoria padrão
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

-- 3. Trigger: cria defaults ao criar usuário
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

-- 4. Backfill usuários existentes
DO $$
DECLARE u record;
BEGIN
    FOR u IN SELECT id FROM auth.users LOOP
        PERFORM public.seed_default_cadastros(u.id);
    END LOOP;
END;
$$;

-- 5. Impedir exclusão dos defaults
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
