-- Decisión en bloque y motivo de la decisión.
--
-- Dos cosas que la aprobación obligatoria
-- (`20260901100000_aprobacion_obligatoria.sql`) volvió necesarias:
--
--   1. Activar 12 promociones crea 12 solicitudes. Con `decide_*_approval`
--      decidiendo de una en una, la bandeja pide 12 viajes al servidor y 12
--      clics. Antes no se notaba porque quien activaba en bloque solía ser
--      un admin, que no generaba ninguna solicitud.
--   2. `note` es texto libre: sirve para explicarle algo a una persona, no
--      para agrupar ni filtrar el historial. Una decisión sobre 12 filas
--      necesita un código, igual que la SOLICITUD ya tiene `codigo_motivo`.
--
-- Las tres funciones singulares se sustituyen por su versión en lote. No se
-- mantienen las dos: duplicar la regla de cuatro ojos en dos sitios es
-- exactamente como se desincroniza.

-- ── 1. El motivo de la decisión ──────────────────────────────────────────
--
-- Espeja `DECISION_REASONS` de `src/types/domain.ts`. `null` es legítimo:
-- las filas decididas antes de esta migración no lo tienen, y forzar un
-- valor inventado las haría mentir.
do $$
declare
  t text;
begin
  foreach t in array array['promotion_approval', 'workflow_approval', 'coupon_approval']
  loop
    execute format($f$
      alter table %I
        add column codigo_decision text
          check (codigo_decision is null or codigo_decision in (
            'cumple_politica', 'urgencia_comercial', 'revisado_con_solicitante',
            'error_configuracion', 'fuera_de_politica', 'presupuesto',
            'requiere_ajustes', 'otro'
          )),
        add constraint %I check (
          codigo_decision is distinct from 'otro'
          or (note is not null and length(trim(note)) > 0)
        )
    $f$, t, t || '_nota_decision_check');
  end loop;
end
$$;

-- ── 2. Promociones ───────────────────────────────────────────────────────
--
-- Devuelve `jsonb` en vez de fallar al primer problema: en un lote de 12,
-- que una ya la hubiera decidido otra persona hace un minuto no debe tirar
-- las once restantes. Cada id sale en `decided` o en `skipped` con su
-- motivo, y la bandeja lo cuenta.
--
-- La regla de cuatro ojos se comprueba fila a fila, no una vez por lote: un
-- aprobador puede tener delante solicitudes suyas y ajenas mezcladas, y las
-- suyas tienen que saltarse sin bloquear el resto.
drop function if exists decide_promotion_approval(uuid, text, text);

create or replace function decide_promotion_approvals(
  p_approval_ids uuid[],
  p_decision text,
  p_codigo_decision text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_approval promotion_approval%rowtype;
  v_id uuid;
  v_decided jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida: %', p_decision
      using errcode = 'check_violation';
  end if;

  foreach v_id in array coalesce(p_approval_ids, '{}'::uuid[])
  loop
    select * into v_approval
    from promotion_approval where id = v_id for update;

    if not found or v_approval.org_id <> current_org_id() then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', 'no_existe');
      continue;
    end if;
    if v_approval.status <> 'pending' then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', 'ya_decidida');
      continue;
    end if;
    if v_approval.requested_by = auth.uid() then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', 'propia_solicitud');
      continue;
    end if;

    update promotion_approval
    set status = p_decision,
        approver_id = auth.uid(),
        decided_at = now(),
        codigo_decision = p_codigo_decision,
        note = p_note
    where id = v_id;

    if p_decision = 'approved' then
      update promociones set estado_publicacion = 'activa'
      where id = v_approval.promocion_id
        and estado_publicacion = 'pendiente_aprobacion';
    else
      update promociones set estado_publicacion = 'borrador'
      where id = v_approval.promocion_id
        and estado_publicacion = 'pendiente_aprobacion';
    end if;

    v_decided := v_decided || jsonb_build_object(
      'id', v_id, 'promocion_id', v_approval.promocion_id
    );
  end loop;

  return jsonb_build_object('decided', v_decided, 'skipped', v_skipped);
end;
$$;

grant execute on function
  decide_promotion_approvals(uuid[], text, text, text) to authenticated;

-- ── 3. Reglas del builder ────────────────────────────────────────────────

drop function if exists decide_workflow_approval(uuid, text, text);

create or replace function decide_workflow_approvals(
  p_approval_ids uuid[],
  p_decision text,
  p_codigo_decision text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_approval workflow_approval%rowtype;
  v_id uuid;
  v_decided jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida: %', p_decision
      using errcode = 'check_violation';
  end if;

  foreach v_id in array coalesce(p_approval_ids, '{}'::uuid[])
  loop
    select * into v_approval
    from workflow_approval where id = v_id for update;

    if not found or not workflow_owned_by_current_org(v_approval.workflow_id) then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', 'no_existe');
      continue;
    end if;
    if v_approval.status <> 'pending' then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', 'ya_decidida');
      continue;
    end if;
    if v_approval.requested_by = auth.uid() then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', 'propia_solicitud');
      continue;
    end if;

    update workflow_approval
    set status = p_decision,
        approver_id = auth.uid(),
        decided_at = now(),
        codigo_decision = p_codigo_decision,
        note = p_note
    where id = v_id;

    if p_decision = 'approved' then
      update workflows set estado = 'activa'
      where id = v_approval.workflow_id and estado = 'pendiente_aprobacion';
    else
      update workflows set estado = 'borrador'
      where id = v_approval.workflow_id and estado = 'pendiente_aprobacion';
    end if;

    v_decided := v_decided || jsonb_build_object(
      'id', v_id, 'workflow_id', v_approval.workflow_id
    );
  end loop;

  return jsonb_build_object('decided', v_decided, 'skipped', v_skipped);
end;
$$;

grant execute on function
  decide_workflow_approvals(uuid[], text, text, text) to authenticated;

-- ── 4. Cupones ───────────────────────────────────────────────────────────
--
-- Su aprobación arrastra más cosas que las otras dos: además de mover el
-- batch a `generating`, estampa `approved_by`/`approved_at` y arranca el
-- reloj de generación (`generation_started_at`). Se conserva tal cual.

drop function if exists decide_coupon_approval(uuid, text, text);

create or replace function decide_coupon_approvals(
  p_approval_ids uuid[],
  p_decision text,
  p_codigo_decision text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_approval coupon_approval%rowtype;
  v_id uuid;
  v_decided jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida: %', p_decision
      using errcode = 'check_violation';
  end if;

  foreach v_id in array coalesce(p_approval_ids, '{}'::uuid[])
  loop
    select * into v_approval
    from coupon_approval where id = v_id for update;

    if not found or v_approval.org_id <> current_org_id() then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', 'no_existe');
      continue;
    end if;
    if v_approval.status <> 'pending' then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', 'ya_decidida');
      continue;
    end if;
    if v_approval.requested_by = auth.uid() then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', 'propia_solicitud');
      continue;
    end if;

    update coupon_approval
    set status = p_decision,
        approver_id = auth.uid(),
        decided_at = now(),
        codigo_decision = p_codigo_decision,
        note = p_note
    where id = v_id;

    if p_decision = 'approved' then
      update coupon_batch
      set status = 'generating',
          approved_by = auth.uid(),
          approved_at = now(),
          generation_started_at = now()
      where id = v_approval.batch_id and status = 'pending_approval';
    else
      update coupon_batch set status = 'draft'
      where id = v_approval.batch_id and status = 'pending_approval';
    end if;

    v_decided := v_decided || jsonb_build_object(
      'id', v_id, 'batch_id', v_approval.batch_id
    );
  end loop;

  return jsonb_build_object('decided', v_decided, 'skipped', v_skipped);
end;
$$;

grant execute on function
  decide_coupon_approvals(uuid[], text, text, text) to authenticated;
