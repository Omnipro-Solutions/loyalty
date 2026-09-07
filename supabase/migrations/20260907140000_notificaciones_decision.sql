-- Notificaciones reales, y la primera que las estrena: la decisión de una
-- doble aprobación.
--
-- Qué había: la campana del topbar (`notifications-menu.tsx`) es un ejemplo
-- visual con cinco notificaciones escritas a mano en memoria. Nada del
-- sistema notifica nada — así que quien pide una firma se queda esperando
-- sin saber que ya se decidió, y quien decide no tiene forma de avisar. En
-- un flujo de dos personas, eso es la mitad del mecanismo.
--
-- Por qué un trigger y no la Server Action: la decisión ya ocurre dentro de
-- `decide_promotion_approvals` / `decide_workflow_approvals` /
-- `decide_coupon_approvals`, que son RPC transaccionales. Un trigger sobre
-- las tres tablas garantiza que **no se puede decidir sin notificar**, venga
-- la escritura de la RPC, de un script o de una pantalla que todavía no
-- existe. En la acción de TypeScript sería una promesa de que nadie se
-- olvide de llamarla.
--
-- Por qué `security definer`: la notificación es PARA OTRA PERSONA (quien
-- pidió la firma), y la política de RLS solo deja ver y escribir las
-- propias. Sin `definer`, el aprobador no podría insertar la fila del
-- solicitante — que es justo la que hay que insertar. `search_path` se fija
-- por la misma razón de siempre en una función `definer`.
--
-- Qué NO hace: avisar a los aprobadores cuando llega una solicitud nueva.
-- Eso pide resolver «quiénes pueden aprobar esto» (una consulta sobre
-- `role_permissions`) y decidir si se notifica a todos o a uno; es el
-- siguiente paso natural, no parte de este.

-- ── 1 · La tabla ───────────────────────────────────────────────────────

create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  -- A quién le llega. Cae con el perfil: una notificación sin destinatario
  -- no es de nadie.
  destinatario_id uuid not null references profiles (id) on delete cascade,
  tipo text not null check (
    tipo in (
      'aprobacion_concedida',
      'aprobacion_rechazada',
      'aprobacion_retirada'
    )
  ),
  titulo text not null,
  descripcion text not null,
  /** A dónde lleva el clic. Nulo si la entidad ya no existe. */
  href text,
  /**
   * El motivo de la decisión, tal cual se registró. La notificación tiene
   * que poder decir POR QUÉ, no solo qué: «Rechazada» a secas obliga a
   * abrir la bandeja para entender qué corregir.
   */
  codigo_motivo text,
  nota text,
  leida_en timestamptz,
  creado_en timestamptz not null default now()
);

create index notificaciones_destinatario_idx
  on notificaciones (destinatario_id, creado_en desc);

-- Para la insignia de la campana, que solo cuenta las no leídas.
create index notificaciones_no_leidas_idx
  on notificaciones (destinatario_id)
  where leida_en is null;

alter table notificaciones enable row level security;

-- Cada persona ve y marca las suyas. No hay caso de uso para leer las de
-- otro: una bandeja compartida sería otra cosa, con otro nombre.
create policy notificaciones_propias on notificaciones
  for select to authenticated
  using (destinatario_id = (select auth.uid()));

create policy notificaciones_marcar_leida on notificaciones
  for update to authenticated
  using (destinatario_id = (select auth.uid()))
  with check (destinatario_id = (select auth.uid()));

-- El GRANT explícito no es opcional en tablas nuevas (ver
-- `auto_expose_new_tables` en config.toml). Sin `insert` a propósito: las
-- escribe el trigger, no la app.
grant usage on schema public to authenticated;
grant select, update on notificaciones to authenticated;

-- ── 2 · El trigger, uno para los tres dominios ─────────────────────────
--
-- Las tres tablas de aprobación tienen la misma forma en lo que importa
-- aquí (`requested_by`, `approver_id`, `status`, `codigo_decision`, `note`),
-- así que la función se ramifica por `tg_table_name` para resolver las dos
-- cosas que sí cambian: cómo se llama la entidad y a dónde lleva el enlace.

create or replace function notificar_decision_aprobacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entidad text;
  v_href text;
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
    select nombre into v_entidad from promociones where id = new.promocion_id;
    v_href := '/promociones/' || new.promocion_id::text || '/editar';
  elsif tg_table_name = 'workflow_approval' then
    select nombre into v_entidad from workflows where id = new.workflow_id;
    v_href := '/journeys/' || new.workflow_id::text;
  else
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
    new.org_id,
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

create trigger promotion_approval_notificar
  after update of status on promotion_approval
  for each row execute function notificar_decision_aprobacion();

create trigger workflow_approval_notificar
  after update of status on workflow_approval
  for each row execute function notificar_decision_aprobacion();

create trigger coupon_approval_notificar
  after update of status on coupon_approval
  for each row execute function notificar_decision_aprobacion();

comment on table notificaciones is
  'Notificaciones por persona. Las escriben triggers (ver notificar_decision_aprobacion), no la app: así una decisión no puede ocurrir sin avisar a quien la pidió.';
