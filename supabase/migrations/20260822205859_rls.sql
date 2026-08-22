-- Row Level Security: aislamiento multi-tenant por org_id.
--
-- El helper `current_org_id()` es SECURITY DEFINER (patrón recomendado por
-- Supabase para evitar recursión de RLS al consultar `profiles` desde
-- dentro de otras políticas) con `search_path` fijo para evitar hijacking.
--
-- Alcance del MVP: las políticas garantizan aislamiento por organización
-- (una org nunca ve ni escribe filas de otra). La autorización fina por rol
-- (quién puede publicar un workflow, aprobar una promoción, etc.) vive en la
-- función pura `can(rol, accion, recurso)` de src/lib/permissions.ts —
-- RLS es la red de seguridad de tenencia, no el motor de permisos de producto.

create or replace function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select org_id from profiles where id = auth.uid()
$$;

-- Crea el perfil automáticamente al confirmar el signup, resolviendo la
-- organización por el dominio del correo corporativo (organizations.dominio_correo).
-- Signup es solo para dominios ya dados de alta — coherente con el login
-- "Correo corporativo" del Figma, no un self-serve público.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_dominio text;
begin
  v_dominio := split_part(new.email, '@', 2);

  select id into v_org_id from organizations where dominio_correo = v_dominio;

  if v_org_id is null then
    raise exception 'No existe una organización para el dominio %', v_dominio;
  end if;

  insert into profiles (id, org_id, nombre, email)
  values (new.id, v_org_id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), new.email);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helpers de políticas, reusados por las ~9 tablas con org_id directo y las
-- 4 que cuelgan de `workflows`. Ambos son `language sql stable` (no
-- `plpgsql`) a propósito: Postgres puede inlinear funciones SQL simples
-- dentro de la política que las llama, así que el `(select current_org_id())`
-- de adentro sigue elegible para el InitPlan caching de Postgres — evaluado
-- una vez por consulta en vez de una vez por fila (el problema de rendimiento
-- documentado de RLS + funciones sin envolver en `select`).
create or replace function org_scoped(target_org_id uuid)
returns boolean
language sql
stable
as $$
  select target_org_id = (select current_org_id())
$$;

create or replace function workflow_owned_by_current_org(target_workflow_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from workflows w
    where w.id = target_workflow_id and w.org_id = (select current_org_id())
  )
$$;

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table role_permissions enable row level security;
alter table trusted_devices enable row level security;
alter table mfa_backup_codes enable row level security;
alter table tiers enable row level security;
alter table members enable row level security;
alter table points_ledger enable row level security;
alter table coupons enable row level security;
alter table challenges enable row level security;
alter table segments enable row level security;
alter table workflows enable row level security;
alter table workflow_versions enable row level security;
alter table workflow_nodes enable row level security;
alter table workflow_edges enable row level security;
alter table workflow_runs enable row level security;
alter table workflow_run_steps enable row level security;

-- organizations: solo la propia.
create policy organizations_select_own on organizations
  for select to authenticated
  using (org_scoped(id));

-- profiles: ver a todo el equipo de la propia org; editar solo el propio perfil.
create policy profiles_select_org on profiles
  for select to authenticated
  using (org_scoped(org_id));

create policy profiles_update_self on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- role_permissions: catálogo de solo lectura para cualquier usuario autenticado.
create policy role_permissions_select_all on role_permissions
  for select to authenticated
  using (true);

-- trusted_devices / mfa_backup_codes: cada usuario solo ve y gestiona lo suyo.
create policy trusted_devices_own on trusted_devices
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy mfa_backup_codes_own on mfa_backup_codes
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Tablas de dominio con org_id directo: CRUD completo dentro de la propia org.
create policy tiers_org on tiers
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy members_org on members
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy points_ledger_org on points_ledger
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy coupons_org on coupons
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy challenges_org on challenges
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy segments_org on segments
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy workflows_org on workflows
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

-- Tablas hijas sin org_id propio: se filtran por join al workflow dueño.
create policy workflow_versions_org on workflow_versions
  for all to authenticated
  using (workflow_owned_by_current_org(workflow_id))
  with check (workflow_owned_by_current_org(workflow_id));

create policy workflow_nodes_org on workflow_nodes
  for all to authenticated
  using (workflow_owned_by_current_org(workflow_id))
  with check (workflow_owned_by_current_org(workflow_id));

create policy workflow_edges_org on workflow_edges
  for all to authenticated
  using (workflow_owned_by_current_org(workflow_id))
  with check (workflow_owned_by_current_org(workflow_id));

create policy workflow_runs_org on workflow_runs
  for all to authenticated
  using (workflow_owned_by_current_org(workflow_id))
  with check (workflow_owned_by_current_org(workflow_id));

-- Único caso de 2 saltos (run → workflow → org); no vale la pena un tercer
-- helper para una sola política.
create policy workflow_run_steps_org on workflow_run_steps
  for all to authenticated
  using (exists (
    select 1 from workflow_runs r
    join workflows w on w.id = r.workflow_id
    where r.id = workflow_run_steps.workflow_run_id and w.org_id = (select current_org_id())
  ))
  with check (exists (
    select 1 from workflow_runs r
    join workflows w on w.id = r.workflow_id
    where r.id = workflow_run_steps.workflow_run_id and w.org_id = (select current_org_id())
  ));

-- GRANTs: desde la versión de Supabase usada aquí, las tablas nuevas ya NO
-- se auto-exponen a los roles de la Data API (anon/authenticated/service_role)
-- sin un GRANT explícito (ver comentario de `auto_expose_new_tables` en
-- supabase/config.toml — ese comportamiento antiguo se retira del todo el
-- 2026-10-30). Sin este bloque, Postgres rechaza el acceso a nivel de
-- privilegios ANTES de evaluar RLS, y las políticas de arriba nunca llegan
-- a ejecutarse. RLS sigue siendo el control real; esto solo abre la puerta.
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  organizations,
  profiles,
  role_permissions,
  trusted_devices,
  mfa_backup_codes,
  tiers,
  members,
  points_ledger,
  coupons,
  challenges,
  segments,
  workflows,
  workflow_versions,
  workflow_nodes,
  workflow_edges,
  workflow_runs,
  workflow_run_steps
to authenticated;

grant execute on function current_org_id() to authenticated;
grant execute on function org_scoped(uuid) to authenticated;
grant execute on function workflow_owned_by_current_org(uuid) to authenticated;
