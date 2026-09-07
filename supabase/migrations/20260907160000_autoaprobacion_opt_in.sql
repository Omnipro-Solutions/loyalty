-- Autoaprobación: la excepción explícita a la regla de cuatro ojos.
--
-- `20260901100000_aprobacion_obligatoria.sql` cerró la doble aprobación con
-- una consecuencia que ese mismo archivo declara buscada, en su §4: «una
-- organización con una sola persona no puede publicar NADA». Es la postura
-- correcta por defecto y no se toca. Lo que faltaba era una salida para el
-- caso en que esa persona ES la organización — una demo, un tenant de un
-- solo operador, una org recién creada que todavía no contrató a su segundo
-- aprobador.
--
-- La salida que se retiró en esa migración era `rol_base = 'admin'`
-- publicando directo. No se restituye, y esto NO es lo mismo:
--
--   · Era **implícita** — venía con el archetype, nadie la concedía.
--     Ahora es una celda de la matriz de permisos que alguien marca a mano.
--   · Era **invisible** — la promoción saltaba de `borrador` a `activa` sin
--     dejar solicitud. Ahora el flujo entero ocurre igual: se crea la fila
--     en `*_approval`, se pide motivo al solicitar y motivo al decidir, y
--     queda `approver_id = requested_by`, que es la huella de que nadie más
--     firmó. Una autoaprobación es auditable como tal, sin columna nueva.
--   · Era **total** — un admin publicaba cualquier cosa. Ahora es por
--     recurso: se puede dar autoaprobación de cupones y no de promociones.
--
-- Y sigue siendo un permiso que hay que tener ADEMÁS de `aprobar`, no en su
-- lugar: `can_self_approve()` exige los dos. Un rol que no puede aprobar
-- nada tampoco puede autoaprobarse.
--
-- Decisión explícita del usuario: el rol de sistema «Administrador» NO lo
-- recibe con su matriz de acceso total (ver `OPT_IN_ACTIONS` en
-- `src/lib/permissions.ts`). Si «acceso total» lo incluyera, todo admin de
-- toda organización quedaría autoaprobando por defecto y sin forma de
-- quitárselo — el trigger de `20260901090000_roles_sistema_blindaje.sql`
-- prohíbe recortarle filas a ese rol. Así que la autoaprobación existe solo
-- en roles personalizados, donde se concede y se revoca.

-- ── 1 · Leer los permisos del usuario de la sesión desde SQL ────────────
--
-- No existía forma de hacerlo: `current_org_id()` y `current_rol_base()`
-- resuelven tenencia y archetype, pero la autorización fina vivía solo en
-- las Server Actions (`hasPermission` sobre el set de `role_permissions`).
-- Para una compuerta que decide si se salta la regla de cuatro ojos, eso no
-- alcanza: la regla se aplica dentro de la RPC, así que la excepción tiene
-- que poder comprobarse ahí mismo.
--
-- Mismo patrón que `current_org_id()`: STABLE + SECURITY DEFINER para leer
-- `profiles`/`roles`/`role_permissions` sin depender de sus políticas, con
-- `search_path` fijo, y `auth.uid()` resolviendo al usuario real de la
-- sesión — no hay nada que falsear desde el cliente.
create or replace function current_has_permission(
  p_recurso text,
  p_accion text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from profiles p
    join role_permissions rp on rp.role_id = p.role_id
    where p.id = auth.uid()
      and rp.recurso = p_recurso
      and rp.accion = p_accion
      and rp.permitido
  )
$$;

grant execute on function current_has_permission(text, text) to authenticated;

-- La compuerta, en un solo sitio para los tres dominios. Exige los dos
-- permisos a propósito: `autoaprobar` amplía `aprobar`, no lo sustituye.
create or replace function can_self_approve(p_recurso text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select current_has_permission(p_recurso, 'aprobar')
     and current_has_permission(p_recurso, 'autoaprobar')
$$;

grant execute on function can_self_approve(text) to authenticated;

comment on function can_self_approve(text) is
  'Si el usuario de la sesión puede decidir sus PROPIAS solicitudes de este recurso. Excepción opt-in a la regla de cuatro ojos: exige `aprobar` y `autoaprobar` a la vez.';

-- ── 2 · Las tres RPC, con la excepción dentro ──────────────────────────
--
-- Se reescriben enteras (`create or replace`) y no se parchea la condición
-- desde fuera porque en plpgsql no hay forma de hacerlo. Lo único que
-- cambia respecto a `20260901110000_aprobacion_masiva_y_motivo.sql` es la
-- guarda de cuatro ojos: pasa de rechazar toda solicitud propia a
-- rechazarla salvo que el rol tenga la excepción. El resto —el bloqueo
-- `for update`, el no fallar al primer problema, la transición atómica— es
-- idéntico.
--
-- `can_self_approve()` se resuelve UNA vez antes del bucle: es el mismo
-- usuario y el mismo recurso para todas las filas del lote, y dentro del
-- bucle serían N consultas para N respuestas iguales.
--
-- Nota sobre el trigger de notificaciones
-- (`20260907140000_notificaciones_decision.sql`): ya vuelve sin escribir
-- nada cuando `approver_id = requested_by`, que es exactamente el caso de
-- una autoaprobación. Nadie necesita que le notifiquen lo que acaba de
-- hacer, así que no hace falta tocarlo.

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
  v_self_approve boolean := can_self_approve('promociones');
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
    if v_approval.requested_by = auth.uid() and not v_self_approve then
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
  -- El recurso de las reglas del builder es `journeys`, no `reglas`: es el
  -- que gatea `decideWorkflowApprovalsAction` y el que lee la bandeja.
  v_self_approve boolean := can_self_approve('journeys');
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
    if v_approval.requested_by = auth.uid() and not v_self_approve then
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
  v_self_approve boolean := can_self_approve('cupones');
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
    if v_approval.requested_by = auth.uid() and not v_self_approve then
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
