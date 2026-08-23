-- Descubrimiento de IdP por dominio de correo (01.3 · SSO · Proveedor
-- corporativo) tiene que poder correr ANTES de que exista sesión — no hay
-- `auth.uid()` todavía, así que la RLS normal de `organizations`
-- (`organizations_select_own`, basada en `current_org_id()`) no aplica.
-- Se resuelve con una función SECURITY DEFINER de superficie mínima: solo
-- expone nombre + tipo de IdP para un dominio dado, nunca la tabla completa.

create function lookup_org_idp_by_domain(p_dominio text)
returns table (nombre text, tenant_idp text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select nombre, tenant_idp from organizations where dominio_correo = p_dominio
$$;

grant execute on function lookup_org_idp_by_domain(text) to anon, authenticated;
