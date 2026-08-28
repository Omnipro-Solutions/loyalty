-- Cierra el hueco que arrastra todo el proyecto desde
-- 20260823120000_promociones.sql: las bitácoras de los tres módulos —
-- Promociones, Cupones y Loyalty Builder— existen, pero no se tocan entre
-- sí. Cada una es cierta por separado y ninguna reconcilia con las otras,
-- así que cualquier estadística que cruce módulos ("¿cuántos socios tocó
-- esta campaña?", "¿estos puntos de quién salieron?") no tiene con qué
-- calcularse.
--
-- Esto NO construye el motor de transacciones (sigue sin existir un
-- checkout). Lo que hace es dar a los eventos ya registrados las llaves que
-- les faltaban para cruzarse, y sembrar las filas transaccionales que las
-- consultas de atribución ya sabían leer pero nunca encontraban:
--
--   1. `promocion_eventos.member_id` — un canje sin socio no se puede
--      contar como alcance ni cruzar con Clientes.
--   2. `points_ledger` de las promociones de puntos — hoy el panel dice
--      "500 puntos otorgados" y el saldo del socio no lo refleja. Dos
--      números ciertos que se contradicen es peor que uno solo.
--   3. `workflow_runs` reales — `getAttributionByWorkflow` lee
--      `points_ledger.workflow_run_id` contra `workflow_runs`, y no había
--      NI UNA fila de corrida sembrada: la atribución del builder devolvía
--      null siempre, no porque no hubiera actividad sino porque no había
--      dónde mirar.
--   4. Cupón ↔ promoción en los dos sentidos — `coupon_batch.promotion_id`
--      ya existía, pero desde un canje no había forma de llegar al cupón.
--
-- Determinismo: siempre `hashtext(<prefijo> || id) % N`, el patrón del
-- resto del seed. Dos corridas producen los mismos números.

-- ── 1. El socio del canje ────────────────────────────────────────────────
alter table promocion_eventos
  add column member_id uuid references members (id) on delete set null;

comment on column promocion_eventos.member_id is
  'Socio que canjeó. Nulo en eventos de ciclo de vida (creada/activada/...) — igual que `canal`, solo se captura en canje/canje_rechazado.';

create index promocion_eventos_member_id_idx
  on promocion_eventos (member_id) where member_id is not null;

-- El reparto no es uniforme a propósito: se sesga hacia los socios del
-- segmento al que apunta cada promoción cuando lo tiene. Un reparto plano
-- haría que "15 % Clientes VIP" mostrara el mismo perfil de socios que una
-- promoción de carrito abierta, y el corte por segmento del panel dejaría
-- de significar nada.
with org as (select id from organizations where slug = 'omni'),
socios as (
  -- El nivel vive en `tiers`, no en una columna de `members` — se une para
  -- poder sesgar el reparto por nivel más abajo.
  select m.id, t.nombre as nivel,
         row_number() over (order by m.id) - 1 as idx,
         count(*) over () as total
  from members m
  left join tiers t on t.id = m.tier_id
  where m.org_id = (select id from org)
),
-- Los socios de nivel alto son el universo de las promociones dirigidas a
-- segmentos VIP/frecuentes; el resto reparte sobre toda la base.
premium as (
  select id, row_number() over (order by id) - 1 as idx, count(*) over () as total
  from socios where nivel in ('oro', 'diamante')
)
update promocion_eventos e
set member_id = case
  when p.tipo = 'segmento' and exists (select 1 from premium)
    then (select id from premium where idx = abs(hashtext('mp' || e.id::text)) % (select total from premium limit 1))
  else (select id from socios where idx = abs(hashtext('ms' || e.id::text)) % (select total from socios limit 1))
end
from promociones p
where e.promocion_id = p.id
  and e.tipo in ('canje', 'canje_rechazado')
  and e.member_id is null
  and exists (select 1 from socios);

-- ── 2. Corridas reales del builder ───────────────────────────────────────
-- `getAttributionByWorkflow` ("En recorrido", "Conversión", "Ingreso" del
-- panel 08.2) resuelve socio → corrida → workflow a través de
-- `points_ledger.workflow_run_id`. Sin corridas sembradas devolvía null en
-- las tres métricas, indistinguible de "no pasó nada".
with wf as (
  select w.id, w.version_actual, w.nombre
  from workflows w
  join organizations o on o.id = w.org_id
  where o.slug = 'omni' and w.estado = 'activa'
)
insert into workflow_runs (workflow_id, workflow_version, tipo, estado, resumen, iniciado_en, finalizado_en)
select
  wf.id,
  greatest(wf.version_actual, 1),
  'publicacion',
  'completado',
  jsonb_build_object(
    'origen', 'seed_transaccional',
    'nota', 'Corrida real de la versión publicada — alimenta la atribución del panel.'
  ),
  now() - interval '14 days',
  now() - interval '14 days' + interval '3 minutes'
from wf
where not exists (
  select 1 from workflow_runs r
  where r.workflow_id = wf.id and r.tipo = 'publicacion'
);

-- Conteos por nodo de esas corridas: es lo que dibuja el embudo de
-- `/journeys/[id]/analitica`. Se derivan del grafo real (un nodo, una
-- fila), con una caída monótona por profundidad — un embudo que sube
-- entre pasos sería un dato imposible, no un dato optimista.
with runs as (
  select r.id as run_id, r.workflow_id
  from workflow_runs r
  join workflows w on w.id = r.workflow_id
  join organizations o on o.id = w.org_id
  where o.slug = 'omni' and r.tipo = 'publicacion'
    and (r.resumen ->> 'origen') = 'seed_transaccional'
),
nodos as (
  select
    runs.run_id,
    n.id as node_id,
    row_number() over (partition by runs.run_id order by n.posicion_x, n.posicion_y) - 1 as paso
  from runs
  join workflow_nodes n on n.workflow_id = runs.workflow_id
)
insert into workflow_run_steps (workflow_run_id, node_id, port, conteo_entrada, conteo_salida)
select
  nodos.run_id,
  nodos.node_id,
  'out',
  round(8240 * power(0.72, nodos.paso)),
  round(8240 * power(0.72, nodos.paso + 1))
from nodos
where not exists (
  select 1 from workflow_run_steps s
  where s.workflow_run_id = nodos.run_id and s.node_id = nodos.node_id
);

-- ── 3. Puntos que sí cuadran con el saldo del socio ──────────────────────
-- OJO: `points_ledger` tiene un trigger (`points_ledger_apply_after_insert`)
-- que suma a `members.saldo_puntos`. Es exactamente lo que se busca —que el
-- saldo refleje lo que el panel dice haber otorgado— pero significa que
-- esta migración MUEVE saldos reales, no solo inserta bitácora.
--
-- Se acreditan solo los canjes de mecánicas de puntos que ya tienen socio
-- (paso 1) y `puntos_otorgados` en metadatos (paso de enriquecimiento de
-- 20260827220000). Los puntos vencen a 12 meses, la vigencia del programa.
with org as (select id from organizations where slug = 'omni'),
run_por_workflow as (
  select r.id as run_id, row_number() over (order by r.id) - 1 as idx, count(*) over () as total
  from workflow_runs r
  join workflows w on w.id = r.workflow_id
  where w.org_id = (select id from org)
    and r.tipo = 'publicacion'
    and (r.resumen ->> 'origen') = 'seed_transaccional'
)
insert into points_ledger (org_id, member_id, tipo, puntos, origen, workflow_run_id, expira_en, creado_en)
select
  (select id from org),
  e.member_id,
  'acumulacion',
  (e.metadatos ->> 'puntos_otorgados')::int,
  'promocion:' || p.codigo,
  -- La mitad de los canjes se atribuye a una corrida del builder: son las
  -- promociones que el journey dispara, no las que se aplican solas en
  -- caja. Sin esta mezcla, la atribución del builder sería 0 % o 100 %, y
  -- ninguna de las dos es una demo realista.
  case when abs(hashtext('wr' || e.id::text)) % 2 = 0
    then (select run_id from run_por_workflow
          where idx = abs(hashtext('wi' || e.id::text)) % (select total from run_por_workflow limit 1))
    else null
  end,
  e.ocurrido_en + interval '12 months',
  e.ocurrido_en
from promocion_eventos e
join promociones p on p.id = e.promocion_id
where e.tipo = 'canje'
  and e.member_id is not null
  and p.tipo_beneficio in ('bono_puntos', 'multiplicador_puntos')
  and (e.metadatos ->> 'puntos_otorgados') ~ '^[0-9]+$'
  and not exists (
    select 1 from points_ledger l
    where l.member_id = e.member_id
      and l.creado_en = e.ocurrido_en
      and l.origen = 'promocion:' || p.codigo
  );

-- ── 4. Cupón ↔ promoción en los dos sentidos ─────────────────────────────
-- `coupon_batch.promotion_id` ya llevaba de cupón a promoción. Faltaba el
-- regreso: desde el canje de la promoción no había forma de llegar al
-- cupón que lo permitió, que es justo lo que se necesita para auditar una
-- redención puntual.
update promocion_eventos e
set metadatos = e.metadatos || jsonb_build_object('coupon_batch_id', b.id)
from promociones p
join coupon_batch b on b.promotion_id = p.id
where e.promocion_id = p.id
  and e.tipo = 'canje'
  and not (e.metadatos ? 'coupon_batch_id');

-- Redención real de los cupones ya asignados a un socio: hoy quedaban en
-- `assigned` para siempre. Un lote sin ninguna redención hace que toda la
-- estadística de cupones (tasa de uso, tiempo hasta redención) sea cero por
-- falta de datos, no por comportamiento.
with org as (select id from organizations where slug = 'omni'),
redimibles as (
  select c.id, c.batch_id, c.member_id, c.valid_from
  from coupon c
  where c.org_id = (select id from org)
    and c.status = 'assigned'
    and c.member_id is not null
    and abs(hashtext('cr' || c.id::text)) % 10 < 6
)
insert into coupon_event (
  org_id, coupon_id, batch_id, type, title, detail,
  actor_type, actor_label, metadata, occurred_at
)
select
  (select id from org), r.id, r.batch_id, 'redeemed',
  'Cupón redimido',
  'Canal: ' || case when abs(hashtext('cc' || r.id::text)) % 2 = 0 then 'POS' else 'e-commerce' end,
  'system', 'Motor de promociones',
  jsonb_build_object(
    'member_id', r.member_id,
    'canal', case when abs(hashtext('cc' || r.id::text)) % 2 = 0 then 'pos' else 'ecommerce' end,
    'promocion_id', (select b.promotion_id from coupon_batch b where b.id = r.batch_id)
  ),
  -- Acotado a un momento ANTERIOR a ahora. `valid_from` puede ser de hace
  -- pocos días —los lotes de aniversario y VIP se emitieron esta semana—, y
  -- sumarle hasta 17 días dejaba la redención con fecha futura: un cupón
  -- "redimido la semana que viene" no es un dato optimista, es imposible, y
  -- se cuela en la línea de tiempo del cupón y en la bitácora del sistema.
  least(
    greatest(r.valid_from, now() - interval '25 days')
      + ((abs(hashtext('cd' || r.id::text)) % 18) || ' days')::interval,
    now() - interval '2 hours'
  )
from redimibles r
where not exists (
  select 1 from coupon_event ce
  where ce.coupon_id = r.id and ce.type = 'redeemed'
);

-- El estado sigue al evento, no al revés: si la fila quedara en `assigned`
-- con un evento `redeemed` en su bitácora, la tabla de Cupones y su
-- historial dirían cosas distintas del mismo cupón.
with org as (select id from organizations where slug = 'omni')
update coupon c
set status = 'redeemed',
    -- `uses_count` acompaña al estado: la tabla de Cupones lo muestra, y un
    -- cupón redimido con 0 usos se lee como un dato roto.
    uses_count = greatest(c.uses_count, 1),
    redeemed_at = (
      select ce.occurred_at from coupon_event ce
      where ce.coupon_id = c.id and ce.type = 'redeemed'
      order by ce.occurred_at limit 1
    )
where c.org_id = (select id from org)
  and c.status = 'assigned'
  and exists (
    select 1 from coupon_event ce
    where ce.coupon_id = c.id and ce.type = 'redeemed'
  );
