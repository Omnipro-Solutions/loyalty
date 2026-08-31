-- Flujo de doble aprobación para promociones y reglas del builder — mismo
-- mecanismo que ya prueba `20260824180000_cupones_doble_aprobacion.sql`
-- (tabla lateral + RPC SECURITY DEFINER con la regla de cuatro ojos), pero
-- con el gate reforzado también con triggers sobre la tabla publicada: en
-- cupones el gate vive en `guard_coupon_batch_transition()` porque
-- `coupon_batch.status` ya tenía ese trigger desde el esquema original; acá
-- no existía ninguno, así que hay que crearlo — sin él, cualquier miembro
-- autenticado de la organización podría poner `estado_publicacion = 'activa'`
-- con un PATCH directo a la Data API, saltándose la Server Action entera.
--
--   borrador             ──(publicar, no admin)──▶ pendiente_aprobacion
--   pendiente_aprobacion ──(aprobada)─────────────▶ activa
--   pendiente_aprobacion ──(rechazada | retirada)─▶ borrador
--   borrador             ──(publicar, admin)──────▶ activa   (directo, sin solicitud)
--
-- Reactivar/inactivar/finalizar (los otros estados publicados entre sí) NO
-- pasan por aprobación — solo la primera publicación.

-- ── 1. Ampliar los tres `check` que validan estos estados ─────────────────

alter table promociones
  drop constraint promociones_estado_publicacion_check;
alter table promociones
  add constraint promociones_estado_publicacion_check check (
    estado_publicacion in (
      'borrador', 'pendiente_aprobacion', 'activa', 'inactiva', 'finalizada'
    )
  );

alter table workflows
  drop constraint workflows_estado_check;
alter table workflows
  add constraint workflows_estado_check check (
    estado in ('borrador', 'pendiente_aprobacion', 'activa', 'inactiva', 'finalizada')
  );

-- Fácil de pasar por alto: la bitácora del builder valida el estado DESTINO
-- contra los mismos cuatro valores. Sin ampliar esto, el primer envío a
-- aprobación fallaría al intentar registrar su propio evento.
alter table workflow_status_events
  drop constraint workflow_status_events_estado_nuevo_check;
alter table workflow_status_events
  add constraint workflow_status_events_estado_nuevo_check check (
    estado_nuevo in (
      'borrador', 'pendiente_aprobacion', 'activa', 'inactiva', 'finalizada'
    )
  );

alter table promocion_eventos
  drop constraint promocion_eventos_tipo_check;
alter table promocion_eventos
  add constraint promocion_eventos_tipo_check check (
    tipo in (
      'creada', 'editada', 'activada', 'inactivada', 'finalizada',
      'presupuesto_incrementado', 'presupuesto_agotado', 'vencida',
      'cancelada', 'canje', 'canje_rechazado',
      'aprobacion_solicitada', 'aprobacion_concedida',
      'aprobacion_rechazada', 'aprobacion_retirada'
    )
  );

-- ── 2. Quién puede publicar directo: el archetype real del rol, no un
--       permiso de la matriz ────────────────────────────────────────────
--
-- Espejo de `current_org_id()` (`20260822205859_rls.sql`): STABLE +
-- SECURITY DEFINER para poder leer `profiles`/`roles` sin depender de sus
-- políticas, pero `auth.uid()` sigue resolviendo al usuario real de la
-- sesión, así que no hay forma de falsear el resultado desde el cliente.
create or replace function current_rol_base()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.rol_base
  from profiles p
  join roles r on r.id = p.role_id
  where p.id = auth.uid()
$$;

grant execute on function current_rol_base() to authenticated;

-- ── 3. Tablas de solicitud ─────────────────────────────────────────────

create table promotion_approval (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  promocion_id uuid not null references promociones (id) on delete cascade,

  requested_by uuid references profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  codigo_motivo text not null check (codigo_motivo in (
    'decision_comercial', 'presupuesto', 'error_configuracion',
    'bajo_rendimiento', 'fin_de_campana', 'otro'
  )),
  nota_motivo text,
  constraint promotion_approval_nota_check check (
    codigo_motivo <> 'otro'
    or (nota_motivo is not null and length(trim(nota_motivo)) > 0)
  ),

  approver_id uuid references profiles (id) on delete set null,
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'withdrawn'
  )),
  note text,
  decided_at timestamptz
);

create index promotion_approval_org_id_idx on promotion_approval (org_id);
create index promotion_approval_promocion_id_idx
  on promotion_approval (promocion_id);
create index promotion_approval_status_idx
  on promotion_approval (org_id, status);

alter table promotion_approval enable row level security;

create policy promotion_approval_select on promotion_approval
  for select to authenticated
  using (org_scoped(org_id));

create policy promotion_approval_insert on promotion_approval
  for insert to authenticated
  with check (org_scoped(org_id) and requested_by = auth.uid());

-- Único UPDATE permitido desde el cliente: retirar la propia solicitud
-- mientras siga pendiente. Aprobar/rechazar exige `decide_promotion_approval()`
-- (SECURITY DEFINER, más abajo) — sin este límite, cualquiera con acceso a la
-- Data API podría aprobarse a sí mismo con un PATCH directo.
create policy promotion_approval_withdraw on promotion_approval
  for update to authenticated
  using (org_scoped(org_id) and requested_by = auth.uid() and status = 'pending')
  with check (org_scoped(org_id) and requested_by = auth.uid() and status = 'withdrawn');

grant select, insert, update on promotion_approval to authenticated;

-- Sin `org_id` propio, igual que `workflow_status_events`: la tenencia de
-- una regla ya se resuelve por `workflow_id` (`workflow_owned_by_current_org`),
-- así que duplicar `org_id` aquí no añadiría nada.
create table workflow_approval (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows (id) on delete cascade,

  requested_by uuid references profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  codigo_motivo text not null check (codigo_motivo in (
    'decision_comercial', 'presupuesto', 'error_configuracion',
    'bajo_rendimiento', 'fin_de_campana', 'otro'
  )),
  nota_motivo text,
  constraint workflow_approval_nota_check check (
    codigo_motivo <> 'otro'
    or (nota_motivo is not null and length(trim(nota_motivo)) > 0)
  ),

  approver_id uuid references profiles (id) on delete set null,
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'withdrawn'
  )),
  note text,
  decided_at timestamptz
);

create index workflow_approval_workflow_id_idx on workflow_approval (workflow_id);
create index workflow_approval_status_idx on workflow_approval (workflow_id, status);

alter table workflow_approval enable row level security;

create policy workflow_approval_select on workflow_approval
  for select to authenticated
  using (workflow_owned_by_current_org(workflow_id));

create policy workflow_approval_insert on workflow_approval
  for insert to authenticated
  with check (
    workflow_owned_by_current_org(workflow_id) and requested_by = auth.uid()
  );

create policy workflow_approval_withdraw on workflow_approval
  for update to authenticated
  using (
    workflow_owned_by_current_org(workflow_id)
    and requested_by = auth.uid() and status = 'pending'
  )
  with check (
    workflow_owned_by_current_org(workflow_id)
    and requested_by = auth.uid() and status = 'withdrawn'
  );

grant select, insert, update on workflow_approval to authenticated;

-- ── 4. El gate en la propia tabla publicada ────────────────────────────
--
-- Las políticas de `promociones`/`workflows` siguen siendo "cualquier
-- miembro de la organización" (`org_scoped` / lo que ya tuvieran) — el
-- control de QUIÉN puede mover el estado no es cosa de RLS aquí, es cosa de
-- estos triggers, igual que `guard_coupon_batch_transition()` no vive en una
-- policy sino en un trigger sobre `coupon_batch`.
--
-- Regla nueva, y deliberada: una fila SIEMPRE se crea en 'borrador'. Igual
-- que `coupon_batch` (que nace sin `status` explícito y solo lo cambia con
-- un UPDATE posterior), publicar directo desde el INSERT queda cerrado —
-- así un solo trigger de UPDATE basta para cubrir todo el ciclo, sin
-- duplicar la regla de admin en un trigger de INSERT aparte.
create or replace function guard_new_row_starts_as_borrador()
returns trigger
language plpgsql
as $$
begin
  if new.estado_publicacion is distinct from 'borrador' then
    raise exception 'Una promoción nueva siempre empieza en borrador.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger promociones_insert_guard
  before insert on promociones
  for each row execute function guard_new_row_starts_as_borrador();

create or replace function guard_promotion_publication_transition()
returns trigger
language plpgsql
as $$
begin
  -- Sin sesión de usuario (migraciones, seeds, service role) el gate no
  -- aplica — si no, ningún script de datos demo podría dejar nada publicado.
  if auth.uid() is null then
    return new;
  end if;

  if new.estado_publicacion is not distinct from old.estado_publicacion then
    return new;
  end if;

  if new.estado_publicacion = 'activa' and old.estado_publicacion = 'borrador' then
    if current_rol_base() is distinct from 'admin' then
      raise exception
        'Solo un administrador puede publicar sin pasar por aprobación — el resto debe solicitarla.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.estado_publicacion = 'activa'
     and old.estado_publicacion = 'pendiente_aprobacion' then
    if not exists (
      select 1 from promotion_approval
      where promocion_id = new.id and status = 'approved'
    ) then
      raise exception 'Esta promoción requiere una aprobación registrada antes de publicarse.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger promotion_publication_guard
  before update on promociones
  for each row execute function guard_promotion_publication_transition();

create or replace function guard_new_workflow_starts_as_borrador()
returns trigger
language plpgsql
as $$
begin
  if new.estado is distinct from 'borrador' then
    raise exception 'Una regla nueva siempre empieza en borrador.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger workflows_insert_guard
  before insert on workflows
  for each row execute function guard_new_workflow_starts_as_borrador();

create or replace function guard_workflow_publication_transition()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.estado is not distinct from old.estado then
    return new;
  end if;

  if new.estado = 'activa' and old.estado = 'borrador' then
    if current_rol_base() is distinct from 'admin' then
      raise exception
        'Solo un administrador puede publicar sin pasar por aprobación — el resto debe solicitarla.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.estado = 'activa' and old.estado = 'pendiente_aprobacion' then
    if not exists (
      select 1 from workflow_approval
      where workflow_id = new.id and status = 'approved'
    ) then
      raise exception 'Esta regla requiere una aprobación registrada antes de publicarse.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger workflow_publication_guard
  before update on workflows
  for each row execute function guard_workflow_publication_transition();

-- ── 5. Decidir una solicitud: único camino para aprobar/rechazar ───────
--
-- Calco de `decide_coupon_approval()`. SECURITY DEFINER para escribir sin
-- depender de una policy de UPDATE abierta, pero `auth.uid()` sigue
-- resolviendo al usuario real que llama — la regla de cuatro ojos y el
-- aislamiento por org se verifican contra esa identidad real, no contra el
-- dueño de la función.
create or replace function decide_promotion_approval(
  p_approval_id uuid,
  p_decision text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_approval promotion_approval%rowtype;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida: %', p_decision
      using errcode = 'check_violation';
  end if;

  select * into v_approval
  from promotion_approval where id = p_approval_id for update;
  if not found or v_approval.org_id <> current_org_id() then
    raise exception 'La solicitud de aprobación no existe.'
      using errcode = 'no_data_found';
  end if;
  if v_approval.status <> 'pending' then
    raise exception 'Esta solicitud ya fue decidida.'
      using errcode = 'check_violation';
  end if;
  if v_approval.requested_by = auth.uid() then
    raise exception 'Quien solicita la aprobación no puede decidirla.'
      using errcode = 'insufficient_privilege';
  end if;

  update promotion_approval
  set status = p_decision, approver_id = auth.uid(), decided_at = now(), note = p_note
  where id = p_approval_id;

  if p_decision = 'approved' then
    update promociones set estado_publicacion = 'activa'
    where id = v_approval.promocion_id and estado_publicacion = 'pendiente_aprobacion';
  else
    update promociones set estado_publicacion = 'borrador'
    where id = v_approval.promocion_id and estado_publicacion = 'pendiente_aprobacion';
  end if;

  return v_approval.promocion_id;
end;
$$;

grant execute on function decide_promotion_approval(uuid, text, text) to authenticated;

create or replace function decide_workflow_approval(
  p_approval_id uuid,
  p_decision text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_approval workflow_approval%rowtype;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida: %', p_decision
      using errcode = 'check_violation';
  end if;

  select * into v_approval
  from workflow_approval where id = p_approval_id for update;
  if not found or not workflow_owned_by_current_org(v_approval.workflow_id) then
    raise exception 'La solicitud de aprobación no existe.'
      using errcode = 'no_data_found';
  end if;
  if v_approval.status <> 'pending' then
    raise exception 'Esta solicitud ya fue decidida.'
      using errcode = 'check_violation';
  end if;
  if v_approval.requested_by = auth.uid() then
    raise exception 'Quien solicita la aprobación no puede decidirla.'
      using errcode = 'insufficient_privilege';
  end if;

  update workflow_approval
  set status = p_decision, approver_id = auth.uid(), decided_at = now(), note = p_note
  where id = p_approval_id;

  if p_decision = 'approved' then
    update workflows set estado = 'activa'
    where id = v_approval.workflow_id and estado = 'pendiente_aprobacion';
  else
    update workflows set estado = 'borrador'
    where id = v_approval.workflow_id and estado = 'pendiente_aprobacion';
  end if;

  return v_approval.workflow_id;
end;
$$;

grant execute on function decide_workflow_approval(uuid, text, text) to authenticated;

-- ── 6. Cerrar el auto-aprobado de `gestor` ──────────────────────────────
--
-- `gestor` tenía a la vez crear/editar Y aprobar sobre estos tres recursos:
-- podía publicar su propio borrador sin que nadie más lo revisara. Se le
-- quita `aprobar`, mismo criterio que ya aplicaba a `cupones` desde
-- `20260824100000_cupones_permisos.sql` — pedir aprobación no exige el
-- permiso, decidirla sí.
delete from role_permissions
where recurso in ('promociones', 'reglas', 'journeys')
  and accion = 'aprobar'
  and role_id in (
    select id from roles where tipo = 'sistema' and rol_base = 'gestor'
  );

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
  where org_id = target_org_id and rol_base = 'admin' and tipo = 'sistema' limit 1;

  insert into roles (org_id, nombre, descripcion, tipo, rol_base, descuento_maximo_pct)
  values (
    target_org_id, 'Gerente comercial',
    'Puede crear y solicitar la publicación de reglas, promociones y journeys. No accede a facturación ni al equipo.',
    'sistema', 'gestor', 25
  )
  on conflict (org_id, nombre) do nothing;

  select id into v_gestor_id from roles
  where org_id = target_org_id and rol_base = 'gestor' and tipo = 'sistema' limit 1;

  insert into roles (org_id, nombre, descripcion, tipo, rol_base)
  values (
    target_org_id, 'Analista',
    'Acceso de solo lectura a reportes y operación, sin permisos de edición.',
    'sistema', 'lector'
  )
  on conflict (org_id, nombre) do nothing;

  select id into v_lector_id from roles
  where org_id = target_org_id and rol_base = 'lector' and tipo = 'sistema' limit 1;

  -- Administrador: todo permitido. Además de publicar directo (por
  -- `rol_base = 'admin'`, ver `guard_promotion_publication_transition`),
  -- lleva `aprobar` en los 7 recursos operativos para que toda organización
  -- nazca con al menos un aprobador — mismo motivo que ya documentaba
  -- `cupones:aprobar` aquí.
  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, recurso, accion
  from unnest(array[
    'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas',
    'journeys', 'equipo', 'facturacion', 'cupones'
  ]) as recurso
  cross join unnest(array['ver', 'crear', 'editar', 'eliminar']) as accion
  on conflict (role_id, recurso, accion) do nothing;

  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, recurso, 'aprobar'
  from unnest(array[
    'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas', 'journeys', 'cupones'
  ]) as recurso
  on conflict (role_id, recurso, accion) do nothing;

  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, 'cupones', accion
  from unnest(array['emitir', 'anular', 'imprimir', 'exportar']) as accion
  on conflict (role_id, recurso, accion) do nothing;

  -- Gerente comercial: "maker" en los tres recursos con doble aprobación
  -- (promociones, reglas, journeys) igual que ya lo era en cupones — crea y
  -- solicita, pero NUNCA aprueba: dárselo recrearía el agujero que esta
  -- migración cierra.
  insert into role_permissions (role_id, recurso, accion)
  values
    (v_gestor_id, 'resumen', 'ver'),
    (v_gestor_id, 'catalogo', 'ver'), (v_gestor_id, 'catalogo', 'crear'), (v_gestor_id, 'catalogo', 'editar'),
    (v_gestor_id, 'tiendas', 'ver'), (v_gestor_id, 'tiendas', 'editar'),
    (v_gestor_id, 'clientes', 'ver'), (v_gestor_id, 'clientes', 'crear'), (v_gestor_id, 'clientes', 'editar'),
    (v_gestor_id, 'promociones', 'ver'), (v_gestor_id, 'promociones', 'crear'), (v_gestor_id, 'promociones', 'editar'),
      (v_gestor_id, 'promociones', 'eliminar'),
    (v_gestor_id, 'reglas', 'ver'), (v_gestor_id, 'reglas', 'crear'), (v_gestor_id, 'reglas', 'editar'),
    (v_gestor_id, 'journeys', 'ver'), (v_gestor_id, 'journeys', 'crear'), (v_gestor_id, 'journeys', 'editar'),
    (v_gestor_id, 'cupones', 'ver'), (v_gestor_id, 'cupones', 'crear'), (v_gestor_id, 'cupones', 'editar'),
      (v_gestor_id, 'cupones', 'emitir'), (v_gestor_id, 'cupones', 'imprimir'), (v_gestor_id, 'cupones', 'exportar')
  on conflict (role_id, recurso, accion) do nothing;

  -- Analista: solo lectura, incluso de reportes. Sin `cupones:exportar`:
  -- exportar cupones saca códigos ligados a personas (PII), y este rol es
  -- de lectura de reportes, no de extracción de datos de cliente.
  insert into role_permissions (role_id, recurso, accion)
  select v_lector_id, recurso, 'ver'
  from unnest(array[
    'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas',
    'journeys', 'cupones'
  ]) as recurso
  on conflict (role_id, recurso, accion) do nothing;
end;
$$;
