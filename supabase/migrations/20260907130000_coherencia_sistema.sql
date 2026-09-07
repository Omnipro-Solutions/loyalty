-- Coherencia de todo el dataset de demo: las mismas reglas que se aplicaron
-- a Camilo Torres (20260907120000), ahora para los 113 socios.
--
-- Lo que medí antes de escribir esto, contra la base real:
--
--   · **602 de 625 pedidos no otorgaron ni un punto.** El programa cobraba
--     canjes (647 movimientos) contra 277 acumulaciones: una economía de
--     puntos donde se redime más de lo que se gana no es un dato apretado,
--     es imposible.
--   · **109 de 113 socios tienen fecha de alta POSTERIOR a su primer
--     movimiento.** Todos se sembraron el 23 de agosto de 2026 y su
--     histórico arranca en 2025.
--   · **110 de 113 tienen `saldo_puntos` distinto de la suma de su
--     ledger.** El saldo se sembró aparte, asumiendo acumulaciones que nunca
--     se escribieron.
--   · **209 de 230 canjes con socio citan un carrito que no existe** pero
--     SÍ tienen una compra de ese socio dentro de la vigencia de la
--     promoción a la que anclarse. Otros 15 no tienen ninguna compra en esa
--     ventana —imposible— y 5 ocurren fuera de la vigencia.
--   · **Tres movimientos citan pedidos que no existen** (`PED-88210`,
--     `PED-88940`, `PED-90042`).
--
-- La regla que gobierna todo esto, y que es la que hace que un sistema se
-- pueda auditar: **cada fila apunta a un hecho que existe**. Un movimiento
-- de puntos, a una compra real. Un canje, a un carrito real dentro de la
-- vigencia de su promoción. Un saldo, a la suma de sus movimientos. Un alta,
-- antes de la primera compra.
--
-- La tasa de acumulación es 1 punto por cada $10 del pedido: la que ya usaba
-- el ledger histórico y la única compatible con `tiers.umbral_puntos`
-- (2.000 / 6.000 / 15.000) — ver el encabezado de 20260907120000.
--
-- Qué NO toca, y por qué:
--
--   · Los 727 canjes SIN socio. Una promoción aplicada a un carrito de
--     alguien que no presentó su tarjeta es un caso real de mostrador, no un
--     dato roto: no hay socio al que anclarlo y no debe inventarse uno.
--   · `promociones.canjes` y `presupuesto_consumido`. Están descuadrados
--     (9.330 canjes contados contra 957 eventos) y cuadrarlos cambia los
--     números de TODOS los tableros a la vez, así que es una decisión
--     aparte: el contador dice diez veces más canjes de los que existen, y
--     bajarlo a la verdad deja las gráficas mucho más pequeñas. La salida
--     coherente es que el volumen venga de más compras, no de un contador
--     — pero eso se decide, no se cuela en esta migración.
--   · Los importes de los canjes ya existentes. Recalcular el descuento de
--     trece mecánicas distintas desde SQL es un motor, no un seed; lo que
--     esta migración arregla es que el carrito al que se refieren exista.
--
-- Idempotencia: cada bloque es un `not exists` o un `update` condicionado a
-- que el dato esté mal. Aplicarla dos veces no cambia nada la segunda.
--
-- Orden: importa. Los saldos se recalculan al final, cuando ya están todos
-- los movimientos; las altas, después de que existan los movimientos que
-- fijan la fecha más antigua.

-- ── 1 · Un movimiento de puntos por cada compra real ───────────────────
--
-- Con esto el hilo «compró → ganó puntos» existe para los 625 pedidos, que
-- es lo que hace legible el módulo Compras de la bitácora y lo que sostiene
-- los saldos y los niveles.

with org as (select id from organizations where slug = 'omni')
insert into points_ledger (
  org_id, member_id, tipo, puntos, origen, canal, expira_en, creado_en
)
select
  p.org_id, p.member_id, 'acumulacion',
  floor(p.total / 10)::integer,
  'Compra ' || p.numero_pedido,
  p.canal,
  -- 365 días: `programa_parametros.vigencia_puntos_dias`.
  p.creado_en + interval '365 days',
  p.creado_en
from pedidos p
where p.org_id = (select id from org)
  and p.estado <> 'cancelado'
  and p.total > 0
  and not exists (
    select 1 from points_ledger l
    where l.member_id = p.member_id
      and l.origen = 'Compra ' || p.numero_pedido
  );

-- ── 2 · Movimientos que citan compras inexistentes ─────────────────────
--
-- Se compara TAMBIÉN por socio, no solo por número de pedido: un movimiento
-- que cita un pedido que existe pero es de otra persona está igual de roto
-- que uno que cita un pedido inventado, y comparando solo el texto se
-- colaba. (La migración de Camilo comparaba solo el texto — este bloque
-- también repara lo que aquella dejó pasar.)

with org as (select id from organizations where slug = 'omni')
delete from points_ledger l
where l.org_id = (select id from org)
  and l.tipo = 'acumulacion'
  and l.origen like 'Compra %PED-%'
  and not exists (
    select 1 from pedidos p
    where p.member_id = l.member_id
      and l.origen in ('Compra ' || p.numero_pedido, 'Compra #' || p.numero_pedido)
  );

-- ── 3 · Cada canje, en un carrito que existe ───────────────────────────
--
-- Se ancla cada canje a la compra de ESE socio más cercana en el tiempo
-- dentro de la vigencia de la promoción, y se le copia la fecha y el total.
-- `distinct on` + `order by` por distancia temporal es lo que elige «la más
-- cercana» sin un subquery por fila.
--
-- El `ticket` se deriva del número de pedido para que la bitácora pueda
-- cruzarse con la caja, igual que en 20260907110000.

with org as (select id from organizations where slug = 'omni'),
ancla as (
  select distinct on (pe.id)
    pe.id as evento_id,
    p.numero_pedido,
    p.total,
    p.canal,
    p.creado_en
  from promocion_eventos pe
  join promociones pr on pr.id = pe.promocion_id
  join pedidos p
    on p.member_id = pe.member_id
   and p.estado <> 'cancelado'
   and p.creado_en::date >= pr.vigente_desde
   and (pr.vigente_hasta is null or p.creado_en::date <= pr.vigente_hasta)
  where pe.org_id = (select id from org)
    and pe.tipo in ('canje', 'canje_rechazado')
    and pe.member_id is not null
  order by
    pe.id,
    abs(extract(epoch from (p.creado_en - pe.ocurrido_en)))
)
update promocion_eventos pe
set
  -- Media hora después de la compra: el canje ocurre EN la compra, y una
  -- diferencia pequeña deja los dos hechos juntos al ordenar la bitácora.
  ocurrido_en = ancla.creado_en + interval '25 minutes',
  -- `promocion_eventos.canal` no admite 'app' (ver 20260907110000): cuando
  -- la compra fue por app se deja el canal como estaba en vez de violar el
  -- check. Es el hueco del modelo, no un dato que este seed pueda cerrar.
  canal = case when ancla.canal in ('pos', 'ecommerce') then ancla.canal else pe.canal end,
  metadatos = pe.metadatos || jsonb_build_object(
    'monto_carrito', ancla.total,
    'ticket', 'TCK-' || right(ancla.numero_pedido, 5)
  )
from ancla
where pe.id = ancla.evento_id
  -- Solo si de verdad no cuadraba: así una segunda corrida no mueve nada.
  and (
    pe.metadatos ->> 'monto_carrito' is null
    or (pe.metadatos ->> 'monto_carrito')::numeric <> ancla.total
  );

-- ── 4 · Canjes que no pudieron ocurrir ─────────────────────────────────
--
-- Un canje de un socio que no compró NADA mientras la promoción estaba
-- vigente no es un dato impreciso: es un hecho que no pasó. Se va, con su
-- movimiento de puntos si lo tuviera.
--
-- `promocion_eventos` es append-only para `authenticated` (20260826161000);
-- el rol que corre migraciones no está en ese `revoke`.

with org as (select id from organizations where slug = 'omni')
delete from promocion_eventos pe
using promociones pr
where pr.id = pe.promocion_id
  and pe.org_id = (select id from org)
  and pe.tipo in ('canje', 'canje_rechazado')
  and pe.member_id is not null
  and not exists (
    select 1 from pedidos p
    where p.member_id = pe.member_id
      and p.estado <> 'cancelado'
      and p.creado_en::date >= pr.vigente_desde
      and (pr.vigente_hasta is null or p.creado_en::date <= pr.vigente_hasta)
  );

-- ── 5 · Expiraciones que ninguna acumulación sostiene ──────────────────
--
-- Los puntos vencen a los 365 días. Una expiración fechada antes de que
-- venciera la primera acumulación del socio restaba puntos que estaban
-- vivos. Mismo criterio que en Camilo, ahora para todos.

with org as (select id from organizations where slug = 'omni'),
primer_vencimiento as (
  select member_id, min(expira_en) as fecha
  from points_ledger
  where tipo = 'acumulacion' and expira_en is not null
  group by member_id
)
delete from points_ledger l
using primer_vencimiento pv
where l.org_id = (select id from org)
  and l.tipo = 'expiracion'
  and pv.member_id = l.member_id
  and l.creado_en < pv.fecha;

-- Y las de un socio que no tiene ni una acumulación con vencimiento: no hay
-- nada que pudiera haber expirado.
with org as (select id from organizations where slug = 'omni')
delete from points_ledger l
where l.org_id = (select id from org)
  and l.tipo = 'expiracion'
  and not exists (
    select 1 from points_ledger a
    where a.member_id = l.member_id
      and a.tipo = 'acumulacion'
      and a.expira_en is not null
  );

-- ── 6 · El ledger, en español ──────────────────────────────────────────
--
-- `promocion:CODIGO` y un UUID entre paréntesis son formatos de máquina en
-- una tabla que el socio ve en su ficha.

update points_ledger l
set origen = 'Reversión por anulación del cupón ' || c.code
from coupon c
where l.origen = 'Devolución por anulación de cupón (' || c.id::text || ')';

update points_ledger l
set origen = 'Bono de ' || lower(p.nombre) || ' · ' || p.codigo
from promociones p
where l.origen = 'promocion:' || p.codigo;

-- ── 7 · El ciclo de vida de cada regla del builder ─────────────────────
--
-- `workflow_status_events` tenía 2 filas para 17 reglas, así que el módulo
-- «Loyalty Builder» de la bitácora estaba prácticamente vacío: una regla
-- publicada no dejaba rastro de cuándo se publicó. Se derivan de las
-- fechas de la propia regla, que es el único dato real disponible.

with org as (select id from organizations where slug = 'omni')
insert into workflow_status_events (
  workflow_id, estado_anterior, estado_nuevo, codigo_motivo, nota, ocurrido_en
)
select
  w.id, 'borrador', 'activa', 'decision_comercial',
  'Publicación registrada a partir de la fecha de activación de la regla.',
  coalesce(w.actualizado_en, w.creado_en)
from workflows w
where w.org_id = (select id from org)
  and w.estado = 'activa'
  and not exists (
    select 1 from workflow_status_events e
    where e.workflow_id = w.id and e.estado_nuevo = 'activa'
  );

-- ── 8 · La fecha de alta, antes del primer movimiento ──────────────────
--
-- Se mueve el alta y no el histórico: las compras tienen líneas, totales y
-- puntos detrás; la fecha de alta no tiene nada que la sostenga. Cuatro días
-- antes de la primera compra, que es un plazo verosímil entre inscribirse y
-- volver a comprar.

with org as (select id from organizations where slug = 'omni'),
primera as (
  select
    m.id as member_id,
    least(
      coalesce((select min(p.creado_en) from pedidos p where p.member_id = m.id), 'infinity'),
      coalesce((select min(l.creado_en) from points_ledger l where l.member_id = m.id), 'infinity')
    ) as fecha
  from members m
  where m.org_id = (select id from org)
)
update members m
set creado_en = primera.fecha - interval '4 days'
from primera
where primera.member_id = m.id
  and primera.fecha <> 'infinity'
  and m.creado_en > primera.fecha;

-- ── 9 · El saldo, recalculado desde el ledger ──────────────────────────
--
-- Último bloque a propósito: el trigger `apply_points_ledger_entry` solo
-- suma en INSERT, así que después de cualquier DELETE o UPDATE de puntos el
-- saldo almacenado se queda con el número viejo.

with org as (select id from organizations where slug = 'omni')
update members m
set saldo_puntos = coalesce((
  select sum(l.puntos) from points_ledger l where l.member_id = m.id
), 0)
where m.org_id = (select id from org)
  and m.saldo_puntos <> coalesce((
    select sum(l.puntos) from points_ledger l where l.member_id = m.id
  ), 0);

-- ── 10 · Verificación, en voz alta ─────────────────────────────────────
--
-- Un seed de este tamaño no debería exigir escribir cinco consultas para
-- saber si funcionó. Esto lo dice al aplicarlo.

do $$
declare
  v_org uuid := (select id from organizations where slug = 'omni');
  v_pedidos_sin_puntos integer;
  v_saldos_descuadrados integer;
  v_altas_tardias integer;
  v_canjes_sin_carrito integer;
  v_negativos integer;
begin
  select count(*) into v_pedidos_sin_puntos
  from pedidos p
  where p.org_id = v_org and p.estado <> 'cancelado' and p.total > 0
    and not exists (
      select 1 from points_ledger l
      where l.member_id = p.member_id and l.origen = 'Compra ' || p.numero_pedido
    );

  select count(*) into v_saldos_descuadrados
  from members m
  where m.org_id = v_org
    and m.saldo_puntos <> coalesce(
      (select sum(l.puntos) from points_ledger l where l.member_id = m.id), 0
    );

  select count(*) into v_altas_tardias
  from members m
  where m.org_id = v_org
    and m.creado_en > coalesce(
      (select min(p.creado_en) from pedidos p where p.member_id = m.id), m.creado_en
    );

  select count(*) into v_canjes_sin_carrito
  from promocion_eventos pe
  where pe.org_id = v_org and pe.tipo in ('canje', 'canje_rechazado')
    and pe.member_id is not null
    and pe.metadatos ->> 'monto_carrito' is null;

  select count(*) into v_negativos
  from members m
  where m.org_id = v_org and m.saldo_puntos < 0;

  raise notice 'Coherencia del sistema:';
  raise notice '  pedidos sin puntos:        % (esperado 0)', v_pedidos_sin_puntos;
  raise notice '  saldos descuadrados:       % (esperado 0)', v_saldos_descuadrados;
  raise notice '  altas tras primera compra: % (esperado 0)', v_altas_tardias;
  raise notice '  canjes sin carrito:        % (esperado 0)', v_canjes_sin_carrito;
  raise notice '  saldos negativos:          % (esperado 0)', v_negativos;
end
$$;
