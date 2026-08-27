-- Ciclo de vida de una regla: el mismo que el de una promoción.
--
-- El builder tenía su propio juego de estados —`publicado` · `pausado` ·
-- `archivado`— para exactamente el mismo ciclo que el módulo de promociones
-- ya resolvía con `borrador` · `activa` · `inactiva` · `finalizada`. Dos
-- vocabularios para lo mismo obligan a traducir mentalmente entre pantallas,
-- y ninguno de los dos era más correcto: simplemente se construyeron aparte.
--
-- Se adopta el de promociones, con lo que trae consigo:
--
-- · `programada` NO es un estado guardado. Se deriva de cruzar `activa` con
--   la vigencia (`lib/publication-status.ts`), así que no puede quedar
--   desincronizado de la columna.
-- · Ninguna transición vuelve a `borrador`: volver reabriría la edición de
--   una regla que el motor ya estuvo evaluando.
-- · Publicada, lo único editable es el estado. Los bloques quedan de solo
--   lectura (`isLocked`).
-- · No hay cambio de estado sin motivo, y queda en la bitácora.
--
-- Y se agregan los dos atributos que son de la REGLA, no de un bloque:
-- prioridad y exclusividad. Resuelven qué pasa cuando dos reglas escuchan
-- el mismo evento, que es una pregunta que ningún nodo del grafo puede
-- contestar por separado. Es el mismo criterio que `si_colisiona` de
-- `aplicar_promocion`, pero a nivel de regla completa.

alter table workflows
  add column vigente_desde date not null default current_date,
  add column vigente_hasta date,
  -- Mayor número gana dentro del grupo. Se deja `integer` y no un enum de
  -- 3 niveles porque insertar una regla ENTRE dos existentes es la
  -- operación que más se hace, y con niveles cerrados obliga a renumerar.
  add column prioridad integer not null default 10,
  add column exclusividad text not null default 'acumulable'
    check (exclusividad in ('exclusiva', 'acumulable')),
  -- Solo tiene sentido con `exclusividad = 'exclusiva'`: dos reglas
  -- exclusivas compiten únicamente si comparten grupo. Sin grupo, "exclusiva"
  -- significaría "excluye a todas las demás del programa", que nunca es lo
  -- que se quiere.
  add column grupo_exclusividad text,
  add constraint workflows_grupo_exclusividad_check check (
    exclusividad = 'exclusiva' or grupo_exclusividad is null
  ),
  add constraint workflows_vigencia_check check (
    vigente_hasta is null or vigente_hasta >= vigente_desde
  );

-- El `check` viejo y el nuevo no se solapan en ningún valor, así que hay que
-- traducir los datos entre soltar uno y crear el otro.
alter table workflows drop constraint workflows_estado_check;

update workflows set estado = case estado
  -- `publicado` era "el motor la evalúa" → `activa`.
  when 'publicado' then 'activa'
  -- `pausado` era "publicada pero suspendida" → `inactiva`, mismo
  -- significado exacto.
  when 'pausado' then 'inactiva'
  -- `archivado` era "cerrada, ya no aplica" → `finalizada`. No se pierde la
  -- distinción: no había ninguna, `archivado` no significaba nada distinto
  -- salvo que no aparecía en el listado por defecto.
  when 'archivado' then 'finalizada'
  else 'borrador'
end;

alter table workflows add constraint workflows_estado_check check (
  estado in ('borrador', 'activa', 'inactiva', 'finalizada')
);

comment on column workflows.estado is
  'Ciclo de vida compartido con promociones. ''programada'' no se guarda: '
  'se deriva de cruzar ''activa'' con vigente_desde/vigente_hasta — ver '
  'src/lib/publication-status.ts.';

-- Una regla ya publicada no tiene una vigencia declarada (la columna acaba
-- de nacer), así que arranca desde la fecha en que se publicó — es la única
-- lectura honesta del dato que sí existe. Sin esto, `vigente_desde` sería
-- hoy y una regla publicada hace meses aparecería como recién arrancada.
update workflows
set vigente_desde = actualizado_en::date
where estado <> 'borrador';

-- ── Bitácora ────────────────────────────────────────────────────────────
--
-- Una fila por cambio de estado. Es lo que hace auditable el ciclo: sin el
-- motivo queda registrado QUÉ cambió pero no por qué, que es justo lo que se
-- busca al revisar por qué una regla dejó de aplicar. `codigo_motivo`
-- comparte catálogo con promociones (`STATUS_CHANGE_REASONS` en
-- `types/domain.ts`), y `otro` exige nota — mismo criterio que
-- `coupon_cancel_note_required` en cupones.
create table workflow_status_events (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows (id) on delete cascade,
  estado_anterior text not null,
  estado_nuevo text not null check (
    estado_nuevo in ('borrador', 'activa', 'inactiva', 'finalizada')
  ),
  codigo_motivo text not null check (
    codigo_motivo in (
      'decision_comercial',
      'presupuesto',
      'error_configuracion',
      'bajo_rendimiento',
      'fin_de_campana',
      'otro'
    )
  ),
  nota text,
  actor_id uuid references profiles (id) on delete set null,
  ocurrido_en timestamptz not null default now(),
  constraint workflow_status_events_nota_check check (
    codigo_motivo <> 'otro' or (nota is not null and length(trim(nota)) > 0)
  )
);

create index workflow_status_events_workflow_id_idx
  on workflow_status_events (workflow_id, ocurrido_en desc);

alter table workflow_status_events enable row level security;

create policy workflow_status_events_org on workflow_status_events
  for all to authenticated
  using (workflow_owned_by_current_org(workflow_id))
  with check (workflow_owned_by_current_org(workflow_id));

-- Las tablas nuevas ya NO se auto-exponen a los roles de la Data API sin un
-- GRANT explícito (ver `auto_expose_new_tables` en supabase/config.toml):
-- sin esto Postgres rechaza el acceso antes de evaluar las políticas.
-- Solo select+insert: una bitácora que se puede editar o borrar no es una
-- bitácora.
grant select, insert on workflow_status_events to authenticated;
