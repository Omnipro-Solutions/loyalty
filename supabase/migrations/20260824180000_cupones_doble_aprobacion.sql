-- Flujo de doble aprobación (docs/cupones.md §7.3, Fase 5 del módulo de
-- cupones). `coupon_batch.status = 'pending_approval'` y su transición ya
-- existían desde 20260824110000_cupones_esquema.sql, con el comentario
-- explícito de que esta migración añadiría la tabla `coupon_approval` y
-- reemplazaría `guard_coupon_batch_transition()` para exigirla — eso es lo
-- que hace este archivo.

-- `approved_by`/`approved_at`: espejo desnormalizado de la aprobación viva
-- en el propio batch, tal como anunciaba el comentario de esa columna en
-- el esquema original.
alter table coupon_batch
  add column approved_by uuid references profiles (id) on delete set null,
  add column approved_at timestamptz;

-- Doc §6.6 dice `threshold_reason text` (singular). Se usa `text[]` a
-- propósito: `evaluateApprovalRequirement()` (features/coupons/lib/thresholds.ts)
-- puede disparar varios umbrales a la vez (volumen Y puntos, por ejemplo) —
-- una sola columna perdería esa información sin ganar nada a cambio.
create table coupon_approval (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  batch_id uuid not null references coupon_batch (id) on delete cascade,

  requested_by uuid references profiles (id) on delete set null,
  requested_at timestamptz not null default now(),

  approver_id uuid references profiles (id) on delete set null,
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'withdrawn'
  )),
  threshold_reasons text[] not null default '{}'::text[]
    check (threshold_reasons <@ array['volume', 'unit_value', 'points_cost']::text[]),
  note text,
  decided_at timestamptz
);

create index coupon_approval_org_id_idx on coupon_approval (org_id);
create index coupon_approval_batch_id_idx on coupon_approval (batch_id);
create index coupon_approval_status_idx on coupon_approval (org_id, status);

alter table coupon_approval enable row level security;

create policy coupon_approval_select on coupon_approval
  for select to authenticated
  using (org_scoped(org_id));

create policy coupon_approval_insert on coupon_approval
  for insert to authenticated
  with check (org_scoped(org_id) and requested_by = auth.uid());

-- Único UPDATE que se permite hacer directo desde el cliente: que el propio
-- solicitante retire su solicitud mientras siga pendiente. Aprobar/rechazar
-- exige pasar por decide_coupon_approval() (más abajo, SECURITY DEFINER) —
-- si aquí hubiera una policy de update abierta, cualquiera con acceso a la
-- Data API podría aprobarse a sí mismo por un PATCH directo, saltándose la
-- regla de cuatro ojos por completo.
create policy coupon_approval_withdraw on coupon_approval
  for update to authenticated
  using (org_scoped(org_id) and requested_by = auth.uid() and status = 'pending')
  with check (org_scoped(org_id) and requested_by = auth.uid() and status = 'withdrawn');

grant select, insert, update on coupon_approval to authenticated;

-- Reemplaza la versión mínima de 20260824110000_cupones_esquema.sql: añade
-- la exigencia de una fila `coupon_approval` aprobada antes de entrar en
-- 'generating' cuando el batch la requiere. El resto del cuerpo es idéntico.
create or replace function guard_coupon_batch_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is not distinct from old.status then
    if old.status = 'pending_approval' then
      raise exception 'La emisión está esperando aprobación: no se puede editar.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if (old.status, new.status) not in (
    ('draft', 'pending_approval'), ('draft', 'generating'), ('draft', 'cancelled'),
    ('pending_approval', 'draft'), ('pending_approval', 'generating'), ('pending_approval', 'cancelled'),
    ('generating', 'issued'), ('generating', 'cancelled'),
    ('issued', 'closed'), ('issued', 'cancelled'), ('closed', 'cancelled')
  ) then
    raise exception 'Transición de estado inválida: % → %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status in ('pending_approval', 'generating') then
    if coalesce(btrim(new.issue_reason), '') = ''
       or new.authorized_by is null or new.authorized_at is null then
      raise exception 'Falta el motivo de emisión o la firma de autorización.'
        using errcode = 'check_violation';
    end if;
  end if;

  if new.status = 'generating' and new.requires_approval then
    if not exists (
      select 1 from coupon_approval
      where batch_id = new.id and status = 'approved'
    ) then
      raise exception 'La emisión requiere una aprobación registrada antes de generar códigos.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- Única forma de aprobar o rechazar una solicitud. SECURITY DEFINER para
-- poder escribir `coupon_approval`/`coupon_batch` sin depender de una
-- policy de UPDATE abierta (ver comentario de `coupon_approval_withdraw`
-- arriba) — pero eso NO baja la guardia: `auth.uid()` sigue resolviendo al
-- usuario real que llama (no al dueño de la función, ver current_org_id()),
-- así que la regla de cuatro ojos y el aislamiento por org se verifican
-- igual contra la identidad real de quien invoca.
create or replace function decide_coupon_approval(
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
  v_approval coupon_approval%rowtype;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida: %', p_decision
      using errcode = 'check_violation';
  end if;

  select * into v_approval from coupon_approval where id = p_approval_id for update;
  if not found or v_approval.org_id <> current_org_id() then
    raise exception 'La solicitud de aprobación no existe.'
      using errcode = 'no_data_found';
  end if;
  if v_approval.status <> 'pending' then
    raise exception 'Esta solicitud ya fue decidida.'
      using errcode = 'check_violation';
  end if;
  -- Regla de cuatro ojos, aplicada aquí (no solo en la UI): quien solicitó
  -- la aprobación no puede decidirla, ni siquiera si tiene el permiso
  -- `cupones:aprobar` (ej. un admin que emitió su propio batch).
  if v_approval.requested_by = auth.uid() then
    raise exception 'Quien solicita la aprobación no puede decidirla.'
      using errcode = 'insufficient_privilege';
  end if;

  update coupon_approval
  set status = p_decision,
      approver_id = auth.uid(),
      decided_at = now(),
      note = p_note
  where id = p_approval_id;

  if p_decision = 'approved' then
    update coupon_batch
    set status = 'generating',
        approved_by = auth.uid(),
        approved_at = now(),
        generation_started_at = now()
    where id = v_approval.batch_id and status = 'pending_approval';
  else
    update coupon_batch
    set status = 'draft'
    where id = v_approval.batch_id and status = 'pending_approval';
  end if;

  return v_approval.batch_id;
end;
$$;

grant execute on function decide_coupon_approval(uuid, text, text) to authenticated;
