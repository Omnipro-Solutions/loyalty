-- Arregla: aprobar (o rechazar) una **regla del builder** fallaba con
-- `record "new" has no field "org_id"`, y como el trigger corre dentro de la
-- transacción de `decide_workflow_approvals`, la decisión entera se
-- revertía — la regla se quedaba en «Pendiente de aprobación».
--
-- Por qué pasaba: `notificar_decision_aprobacion()` (ver
-- `20260907140000_notificaciones_decision.sql`) sirve a las tres tablas de
-- aprobación y leía `new.org_id` en el `insert`, asumiendo que las tres lo
-- tienen. `promotion_approval` y `coupon_approval` sí; `workflow_approval`
-- **no**, y a propósito: su comentario de creación lo dice — la tenencia de
-- una regla ya se resuelve por `workflow_id`
-- (`workflow_owned_by_current_org`), así que duplicar `org_id` ahí no
-- añadiría nada. Promociones y cupones nunca lo notaron porque su rama sí
-- encontraba el campo.
--
-- Por qué se arregla en el trigger y no añadiendo la columna: la columna
-- ausente es la decisión de diseño correcta, no el descuido. El trigger ya
-- se ramificaba por `tg_table_name` para resolver las dos cosas que cambian
-- entre dominios (nombre de la entidad y enlace); la organización es
-- simplemente la tercera. Se resuelve desde `workflows` en la misma consulta
-- que ya traía el nombre, sin round-trip extra.

create or replace function notificar_decision_aprobacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entidad text;
  v_href text;
  v_org_id uuid;
  v_tipo text;
  v_titulo text;
  v_quien text;
begin
  -- Solo la transición a decidida, y solo una vez.
  if new.status = old.status or new.status = 'pending' then
    return new;
  end if;

  -- Sin destinatario no hay nada que enviar: una solicitud cuyo autor se
  -- borró del equipo no deja huérfana una notificación.
  if new.requested_by is null then
    return new;
  end if;

  -- Nadie necesita que le notifiquen lo que acaba de hacer. `withdrawn` lo
  -- ejecuta el propio solicitante, así que ahí no se notifica a nadie.
  if new.status = 'withdrawn' or new.approver_id is null
     or new.approver_id = new.requested_by then
    return new;
  end if;

  if tg_table_name = 'promotion_approval' then
    v_org_id := new.org_id;
    select nombre into v_entidad from promociones where id = new.promocion_id;
    v_href := '/promociones/' || new.promocion_id::text || '/editar';
  elsif tg_table_name = 'workflow_approval' then
    -- La única de las tres sin `org_id` propio: sale de la regla misma.
    select org_id, nombre into v_org_id, v_entidad
    from workflows where id = new.workflow_id;
    v_href := '/journeys/' || new.workflow_id::text;
  else
    v_org_id := new.org_id;
    select coalesce(name, reference) into v_entidad
    from coupon_batch where id = new.batch_id;
    v_href := '/cupones/' || new.batch_id::text;
  end if;

  select nombre into v_quien from profiles where id = new.approver_id;

  if new.status = 'approved' then
    v_tipo := 'aprobacion_concedida';
    v_titulo := 'Se aprobó «' || coalesce(v_entidad, 'tu solicitud') || '»';
  else
    v_tipo := 'aprobacion_rechazada';
    v_titulo := 'Se rechazó «' || coalesce(v_entidad, 'tu solicitud') || '»';
  end if;

  insert into notificaciones (
    org_id, destinatario_id, tipo, titulo, descripcion, href,
    codigo_motivo, nota, creado_en
  )
  values (
    v_org_id,
    new.requested_by,
    v_tipo,
    v_titulo,
    case
      when new.status = 'approved'
        then coalesce(v_quien, 'Otra persona') || ' la aprobó y ya está activa.'
      else coalesce(v_quien, 'Otra persona')
        || ' la rechazó: volvió a Borrador y puedes editarla.'
    end,
    v_href,
    new.codigo_decision,
    new.note,
    coalesce(new.decided_at, now())
  );

  return new;
end;
$$;
