-- Módulo de Equipo y permisos (Figma "09 · Equipo y permisos").
--
-- Reemplaza el modelo de rol fijo (`profiles.rol` con `check` de 4 valores +
-- `role_permissions` clave `rol`) por roles reales de organización: la
-- pantalla 09.2 permite crear/duplicar roles y editar su matriz de permisos,
-- así que esa matriz deja de poder vivir en un `check` constraint — ahora
-- vive en filas de `roles`/`role_permissions` por `org_id`.
--
-- `rol_base` se conserva como el archetype de 4 valores (mismo conjunto que
-- antes) para plantillas ("Nuevo rol" parte de un archetype) y como bandera
-- de fallback — pero la fuente de verdad para autorización real ahora es
-- `role_permissions`, no la matriz pura de `src/lib/permissions.ts`.

drop table if exists role_permissions;

create table roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  descripcion text,
  tipo text not null default 'personalizado' check (tipo in ('sistema', 'personalizado')),
  -- Archetype de partida (mismo conjunto que el `Rol` original) — plantilla
  -- para "Nuevo rol" y fallback de `can()` en src/lib/permissions.ts.
  rol_base text not null check (rol_base in ('admin', 'gestor', 'aprobador', 'lector')),
  -- 'propia' = solo la tienda de `profiles.tienda_id` de cada persona con
  -- este rol (09.2 "Su tienda"). No hay alcance "seleccionadas" (lista de
  -- tiendas a mano): el Figma no lo pide y hubiera exigido una tabla de
  -- unión (`role_tiendas`) sin caso de uso real todavía.
  alcance_tiendas text not null default 'todas' check (alcance_tiendas in ('todas', 'propia')),
  alcance_canal text not null default 'pos_ecommerce' check (alcance_canal in ('pos', 'ecommerce', 'pos_ecommerce')),
  descuento_maximo_pct smallint check (descuento_maximo_pct is null or descuento_maximo_pct between 0 and 100),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (org_id, nombre)
);

create index roles_org_id_idx on roles (org_id);

create trigger roles_set_actualizado_en
  before update on roles
  for each row execute function set_actualizado_en();

-- Matriz rol → permiso, ahora por rol de organización (antes por los 4
-- valores fijos de `rol`). Solo se guardan las filas concedidas
-- (`permitido` siempre `true`) — la ausencia de fila es "no concedido", y
-- la ausencia de la propia combinación recurso×acción en
-- `ACCIONES_POR_RECURSO` (src/lib/permissions.ts) es "no aplica" (celda
-- bloqueada en la UI, ej. "Aprobar" sobre "Facturación").
create table role_permissions (
  role_id uuid not null references roles (id) on delete cascade,
  recurso text not null,
  accion text not null,
  permitido boolean not null default true,
  primary key (role_id, recurso, accion)
);

create table invitaciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  role_id uuid not null references roles (id) on delete cascade,
  tienda_id uuid references tiendas (id) on delete set null,
  invitado_por uuid not null references profiles (id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'cancelada', 'expirada')),
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null default (now() + interval '7 days'),
  aceptada_en timestamptz
);

create index invitaciones_org_id_idx on invitaciones (org_id);

-- Como mucho una invitación pendiente por correo dentro de la organización
-- — cancelada/expirada/aceptada no cuentan (permiten re-invitar).
create unique index invitaciones_pendiente_unica on invitaciones (org_id, email)
  where estado = 'pendiente';

-- Crea los 3 roles de sistema de una organización (Administrador / Gerente
-- comercial / Analista, Figma 09.2) con su matriz de permisos por defecto.
-- Se llama una vez por organización: automáticamente al crearla (trigger
-- de abajo) y explícitamente aquí mismo para organizaciones que ya
-- existían antes de esta migración (mismo motivo que
-- `20260822220100_reparar_rls.sql`: reparar drift en un proyecto remoto ya
-- sembrado). `on conflict ... do nothing` la vuelve segura de repetir.
create or replace function create_system_roles_for_org(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid;
  v_gestor_id uuid;
  v_lector_id uuid;
begin
  insert into roles (org_id, nombre, descripcion, tipo, rol_base)
  values (
    target_org_id, 'Administrador',
    'Acceso total a todos los módulos y a la configuración de la organización.',
    'sistema', 'admin'
  )
  on conflict (org_id, nombre) do nothing;

  select id into v_admin_id from roles
  where org_id = target_org_id and nombre = 'Administrador';

  insert into roles (org_id, nombre, descripcion, tipo, rol_base, descuento_maximo_pct)
  values (
    target_org_id, 'Gerente comercial',
    'Puede crear y activar reglas, promociones y journeys. No accede a facturación ni al equipo.',
    'sistema', 'gestor', 25
  )
  on conflict (org_id, nombre) do nothing;

  select id into v_gestor_id from roles
  where org_id = target_org_id and nombre = 'Gerente comercial';

  insert into roles (org_id, nombre, descripcion, tipo, rol_base)
  values (
    target_org_id, 'Analista',
    'Acceso de solo lectura a reportes y operación, sin permisos de edición.',
    'sistema', 'lector'
  )
  on conflict (org_id, nombre) do nothing;

  select id into v_lector_id from roles
  where org_id = target_org_id and nombre = 'Analista';

  -- Administrador: todo permitido (aprobar solo existe en los 6 recursos operativos).
  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, recurso, accion
  from unnest(array[
    'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas', 'journeys', 'equipo', 'facturacion'
  ]) as recurso
  cross join unnest(array['ver', 'crear', 'editar', 'eliminar']) as accion
  on conflict (role_id, recurso, accion) do nothing;

  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, recurso, 'aprobar'
  from unnest(array['catalogo', 'tiendas', 'clientes', 'promociones', 'reglas', 'journeys']) as recurso
  on conflict (role_id, recurso, accion) do nothing;

  -- Gerente comercial: lectura de reportes, gestión amplia del catálogo y
  -- control total sobre promociones/reglas/journeys (incluye aprobar).
  insert into role_permissions (role_id, recurso, accion)
  values
    (v_gestor_id, 'resumen', 'ver'),
    (v_gestor_id, 'catalogo', 'ver'), (v_gestor_id, 'catalogo', 'crear'), (v_gestor_id, 'catalogo', 'editar'),
    (v_gestor_id, 'tiendas', 'ver'), (v_gestor_id, 'tiendas', 'editar'),
    (v_gestor_id, 'clientes', 'ver'), (v_gestor_id, 'clientes', 'crear'), (v_gestor_id, 'clientes', 'editar'),
    (v_gestor_id, 'promociones', 'ver'), (v_gestor_id, 'promociones', 'crear'), (v_gestor_id, 'promociones', 'editar'),
      (v_gestor_id, 'promociones', 'eliminar'), (v_gestor_id, 'promociones', 'aprobar'),
    (v_gestor_id, 'reglas', 'ver'), (v_gestor_id, 'reglas', 'crear'), (v_gestor_id, 'reglas', 'editar'),
      (v_gestor_id, 'reglas', 'aprobar'),
    (v_gestor_id, 'journeys', 'ver'), (v_gestor_id, 'journeys', 'crear'), (v_gestor_id, 'journeys', 'editar'),
      (v_gestor_id, 'journeys', 'aprobar')
  on conflict (role_id, recurso, accion) do nothing;

  -- Analista: solo lectura, incluso de reportes.
  insert into role_permissions (role_id, recurso, accion)
  select v_lector_id, recurso, 'ver'
  from unnest(array['resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas', 'journeys']) as recurso
  on conflict (role_id, recurso, accion) do nothing;
end;
$$;

create or replace function organizations_create_system_roles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform create_system_roles_for_org(new.id);
  return new;
end;
$$;

create trigger organizations_after_insert_system_roles
  after insert on organizations
  for each row execute function organizations_create_system_roles();

-- Repara organizaciones creadas antes de esta migración (ej. 'omni' si el
-- proyecto remoto ya estaba sembrado) — no-op en un `db reset` limpio,
-- porque ahí todavía no existe ninguna fila en `organizations` (la crea
-- `seed.sql`, que corre después de las migraciones; el trigger de arriba
-- es lo que le da sus roles de sistema en ese caso).
select create_system_roles_for_org(id) from organizations;

-- `profiles.rol` (check de 4 valores) → `profiles.role_id` (fila real de
-- `roles`). `tienda_id` habilita el alcance 'propia' de arriba. `estado`
-- soporta "Sin acceso hace 60 días: revisar y desactivar" (09.1 KPI).
alter table profiles add column role_id uuid references roles (id);
alter table profiles add column tienda_id uuid references tiendas (id) on delete set null;
alter table profiles add column estado text not null default 'activo' check (estado in ('activo', 'inactivo'));

update profiles p
set role_id = r.id
from roles r
where r.org_id = p.org_id and r.rol_base = p.rol and r.tipo = 'sistema' and p.role_id is null;

alter table profiles alter column role_id set not null;
alter table profiles drop column rol;

-- La política `profiles_update_self` (RLS de tenencia) solo exige
-- `id = auth.uid()` — no impide que una persona autenticada cambie su
-- PROPIO `role_id`/`estado`/`tienda_id`/`org_id` vía una llamada REST
-- directa (autoescalada de privilegios). RLS aquí es aislamiento de
-- tenencia, no el motor de permisos — así que el guardado se hace con un
-- trigger, no reescribiendo esa política. Las Server Actions que sí deben
-- poder mover estas columnas (aceptar invitación, admin reasignando rol)
-- usan el cliente de service role, que no pasa por `auth.role() = 'authenticated'`.
create or replace function guard_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' and (
    new.role_id is distinct from old.role_id
    or new.estado is distinct from old.estado
    or new.org_id is distinct from old.org_id
    or new.tienda_id is distinct from old.tienda_id
  ) then
    raise exception 'No tienes permiso para cambiar el rol, estado, tienda u organización de un perfil.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role_change
  before update on profiles
  for each row execute function guard_profile_role_change();

create or replace function role_owned_by_current_org(target_role_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from roles r
    where r.id = target_role_id and r.org_id = (select current_org_id())
  )
$$;

-- Al confirmar el signup: si hay una invitación pendiente para ese correo
-- se usa su rol/tienda y se marca aceptada; si no, cae al rol de sistema
-- 'lector' (Analista) de la organización — mismo default que antes.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_dominio text;
  v_role_id uuid;
  v_tienda_id uuid;
  v_invitacion_id uuid;
begin
  v_dominio := split_part(new.email, '@', 2);

  select id into v_org_id from organizations where dominio_correo = v_dominio;

  if v_org_id is null then
    raise exception 'No existe una organización para el dominio %', v_dominio;
  end if;

  select id, role_id, tienda_id
    into v_invitacion_id, v_role_id, v_tienda_id
  from invitaciones
  where org_id = v_org_id and email = new.email and estado = 'pendiente'
  order by creado_en desc
  limit 1;

  if v_role_id is null then
    select id into v_role_id from roles
    where org_id = v_org_id and rol_base = 'lector' and tipo = 'sistema'
    limit 1;
  end if;

  insert into profiles (id, org_id, nombre, email, role_id, tienda_id)
  values (
    new.id, v_org_id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), new.email,
    v_role_id, v_tienda_id
  );

  if v_invitacion_id is not null then
    update invitaciones set estado = 'aceptada', aceptada_en = now() where id = v_invitacion_id;
  end if;

  return new;
end;
$$;

alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table invitaciones enable row level security;

-- Igual que `tiendas_org`: aislamiento de tenencia vía RLS; quién puede de
-- verdad crear/editar un rol o invitar a alguien se decide en la Server
-- Action (`equipoActionClient`, exige `equipo:editar`), no aquí.
create policy roles_org on roles
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy role_permissions_org on role_permissions
  for all to authenticated
  using (role_owned_by_current_org(role_id))
  with check (role_owned_by_current_org(role_id));

create policy invitaciones_org on invitaciones
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant usage on schema public to authenticated;

grant select, insert, update, delete on roles, role_permissions, invitaciones to authenticated;

grant execute on function role_owned_by_current_org(uuid) to authenticated;
