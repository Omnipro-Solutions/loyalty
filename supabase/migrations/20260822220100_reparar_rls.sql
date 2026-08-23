-- Repara un desfase encontrado entre el archivo de migración
-- 20260822205859_rls.sql y el estado real de la base remota: `current_org_id()`
-- y `handle_new_user()` sí existen (confirmado por REST), pero `org_scoped()`
-- y todo lo que depende de ella (políticas de tenencia, GRANTs) no —
-- lo más probable es que ese archivo se haya seguido editando después de
-- su primer `db push`, y el CLI no vuelve a aplicar un archivo ya marcado
-- como aplicado aunque su contenido cambie.
--
-- Esta migración reconstruye SOLO esa cola faltante, de forma idempotente
-- (`create or replace`, `drop policy if exists`, GRANTs repetibles) para que
-- sea segura de aplicar sin saber exactamente qué subconjunto faltaba. No
-- toca `current_org_id()`, `handle_new_user()` ni su trigger — esos ya
-- funcionan y `create trigger` no es idempotente.

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

drop policy if exists organizations_select_own on organizations;
create policy organizations_select_own on organizations
  for select to authenticated
  using (org_scoped(id));

drop policy if exists profiles_select_org on profiles;
create policy profiles_select_org on profiles
  for select to authenticated
  using (org_scoped(org_id));

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists role_permissions_select_all on role_permissions;
create policy role_permissions_select_all on role_permissions
  for select to authenticated
  using (true);

drop policy if exists trusted_devices_own on trusted_devices;
create policy trusted_devices_own on trusted_devices
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists mfa_backup_codes_own on mfa_backup_codes;
create policy mfa_backup_codes_own on mfa_backup_codes
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists tiers_org on tiers;
create policy tiers_org on tiers
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

drop policy if exists members_org on members;
create policy members_org on members
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

drop policy if exists points_ledger_org on points_ledger;
create policy points_ledger_org on points_ledger
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

drop policy if exists coupons_org on coupons;
create policy coupons_org on coupons
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

drop policy if exists challenges_org on challenges;
create policy challenges_org on challenges
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

drop policy if exists segments_org on segments;
create policy segments_org on segments
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

drop policy if exists workflows_org on workflows;
create policy workflows_org on workflows
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

drop policy if exists workflow_versions_org on workflow_versions;
create policy workflow_versions_org on workflow_versions
  for all to authenticated
  using (workflow_owned_by_current_org(workflow_id))
  with check (workflow_owned_by_current_org(workflow_id));

drop policy if exists workflow_nodes_org on workflow_nodes;
create policy workflow_nodes_org on workflow_nodes
  for all to authenticated
  using (workflow_owned_by_current_org(workflow_id))
  with check (workflow_owned_by_current_org(workflow_id));

drop policy if exists workflow_edges_org on workflow_edges;
create policy workflow_edges_org on workflow_edges
  for all to authenticated
  using (workflow_owned_by_current_org(workflow_id))
  with check (workflow_owned_by_current_org(workflow_id));

drop policy if exists workflow_runs_org on workflow_runs;
create policy workflow_runs_org on workflow_runs
  for all to authenticated
  using (workflow_owned_by_current_org(workflow_id))
  with check (workflow_owned_by_current_org(workflow_id));

drop policy if exists workflow_run_steps_org on workflow_run_steps;
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
