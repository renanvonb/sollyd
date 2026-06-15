-- Endurece as funções introduzidas nas migrations 000000-040000.
-- Resolve os advisors de segurança do Supabase para esses objetos:
--   - 0011 function_search_path_mutable
--   - 0028/0029 (anon|authenticated)_security_definer_function_executable

-- Fixa search_path mutável (lint 0011).
ALTER FUNCTION public.get_budget_consumption(text)        SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_investment_asset_totals()      SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_value_update()                SET search_path = public, pg_temp;
ALTER FUNCTION public.update_savings_box_amount()         SET search_path = public, pg_temp;
ALTER FUNCTION public.check_savings_box_completion()      SET search_path = public, pg_temp;

-- Revoga EXECUTE das trigger functions SECURITY DEFINER expostas via REST (lint 0028/0029).
-- Triggers seguem disparando: execução de trigger não exige privilégio EXECUTE.
REVOKE EXECUTE ON FUNCTION public.sync_investment_asset_totals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_value_update()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_savings_box_amount()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_savings_box_completion() FROM PUBLIC, anon, authenticated;
