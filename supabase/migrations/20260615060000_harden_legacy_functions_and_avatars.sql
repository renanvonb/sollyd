-- Endurece objetos legados (pré-módulos novos) e o bucket de avatars.
-- Resolve os advisors de segurança remanescentes do Supabase:
--   - 0011 function_search_path_mutable
--   - 0028/0029 (anon|authenticated)_security_definer_function_executable
--   - 0025 public_bucket_allows_listing

-- Fixa search_path mutável nas funções legadas (lint 0011).
ALTER FUNCTION public.handle_principal_wallet()        SET search_path = public, pg_temp;
ALTER FUNCTION public.fix_competence_timezone()        SET search_path = public, pg_temp;
ALTER FUNCTION public.force_first_day_competence()     SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column()       SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_default_delete()         SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user_cadastros()      SET search_path = public, pg_temp;
ALTER FUNCTION public.seed_default_cadastros(uuid)     SET search_path = public, pg_temp;

-- Revoga EXECUTE das SECURITY DEFINER expostas via REST (lint 0028/0029).
-- handle_new_user_cadastros: trigger em auth.users; seed_default_cadastros: chamada interna.
-- Nenhuma é chamada via RPC pelo app.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_cadastros()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_cadastros(uuid) FROM PUBLIC, anon, authenticated;

-- Remove SELECT amplo no bucket público 'avatars' (lint 0025).
-- Bucket público serve URLs via /object/public sem policy; app só usa upload+getPublicUrl.
DROP POLICY IF EXISTS "Avatar public view" ON storage.objects;

-- NOTA: lint 0001 (leaked password protection) é config de Auth e deve ser
-- habilitado manualmente no dashboard: Authentication > Sign In / Providers >
-- Password > "Leaked password protection".
