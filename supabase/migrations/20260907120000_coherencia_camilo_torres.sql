-- Camilo Torres (CLI-000002): que su ficha aguante que alguien la lea línea
-- por línea.
--
-- Es el socio que se usa para mostrar el portal, así que su historia tiene
-- que cuadrar con las reglas del propio sistema. Hoy no cuadra, y no por
-- poco. Lo que encontré al auditarla contra el esquema:
--
--   1. Cinco «Bono de cumpleaños otorgado» en ocho días (19, 22×3 y 26 de
--      agosto), +500 puntos cada uno. `PROMO-BONO-CUMPLE` exige el segmento
--      «Cumpleaños próximos 7d» y Camilo cumple el **3 de noviembre**: no
--      está en ese segmento ni puede estarlo hoy. El sistema tiene razón
--      —esa promoción NO aparece en sus promociones activas, porque la
--      consulta sí filtra por segmento— y son los datos los que mienten.
--   2. Un canje de `PROMO-CASHBACK-SOLAR`, que pide categoría
--      Dermocosmética y carrito ≥ $45.000. Camilo nunca compró nada de esa
--      categoría (de hecho hoy no tiene ni un producto asignado) y su
--      carrito más grande de ese mes fue de $26.400.
--   3. Dos canjes ANTERIORES a la vigencia de su promoción:
--      `PROMO-ESC-VIT2` el 6 de julio (vigente desde el 8) y
--      `PROMO-CUPON-BDV` el 28 de junio (vigente desde el 13 de julio).
--   4. Cuatro acumulaciones de puntos que citan compras que **no existen**
--      (`Compra #PED-77210`, `#PED-78455`, `#PED-79800`, `#PED-80200`),
--      mientras sus **diez** compras reales no otorgaron ni un punto. La
--      ficha mostraba puntos por compras que no están en sus compras.
--   5. `creado_en` en agosto de 2026, con compras desde septiembre de 2025:
--      un socio con un año de histórico anterior a su propia inscripción.
--   6. `origen` con formato de máquina: `promocion:PROMO-BONO-CUMPLE` y un
--      UUID crudo dentro de «Devolución por anulación de cupón (…)».
--   7. Una expiración de −1.000 puntos en agosto de 2026 cuando su
--      acumulación más antigua no vence hasta septiembre: restaba puntos
--      que todavía estaban vivos.
--
-- Lo que NO era un problema, y por eso no se toca:
--
--   · Su cupón `PTS-A113-0061` está en `assigned` con `valid_to` vencido.
--     Es correcto: 'expired' no se almacena, se DERIVA cruzando el estado
--     con la fecha (ver `COUPON_DISPLAY_STATUSES` en types/domain.ts).
--   · El ajuste de +1.200 «por anulación de cupón» coincide exactamente con
--     el `points_cost` de `CUP-PTS-0001`, que está `cancelled`. Cuadra.
--   · Su nivel diamante con saldo por debajo del umbral (15.000): el sistema
--     ya lo marca «en riesgo de bajar de nivel»
--     (`isAtRiskOfTierDowngrade`). Es una lectura legítima, y con la
--     reconstrucción de abajo su saldo pasa a sostener el nivel.
--
-- ── La regla de puntos, que era el nudo ────────────────────────────────
--
-- Había dos reglas conviviendo. El ledger histórico otorga ~1 punto por cada
-- $10 del pedido (5.000 puntos ↔ un pedido de ~$50.000), y mi seed de
-- compras usó `productos.puntos` (46 puntos por un pedido de $27.400, ~1 por
-- $600). No pueden ser las dos.
--
-- Gana la del ledger, y no por antigüedad: **los umbrales de nivel la
-- confirman**. `tiers.umbral_puntos` es 2.000 / 6.000 / 15.000; a 46 puntos
-- por compra, llegar a diamante pediría trescientas compras. A 1 punto por
-- cada $10, una docena de compras al año lo explica. `productos.puntos` es
-- un dato de catálogo (lo que "vale" un producto en la vitrina), no la tasa
-- de acumulación del programa.
--
-- Así que el bloque 0 corrige los movimientos que sembró
-- `20260907100000_demo_compras_devoluciones.sql` —donde apliqué la regla
-- equivocada— y el resto de la migración reconstruye a Camilo con la buena.
-- Ese seed también quedó corregido en su fichero, para que una base nueva
-- salga igual sin pasar por aquí.

-- ── 0 · La tasa correcta en los movimientos del seed de compras ─────────
--
-- Aplica a los doce pedidos `PED-ACUM-*`/`PED-DEV-*` de todos los socios del
-- seed, no solo a Camilo: la regla es del programa, no de una persona.

update points_ledger l
set puntos = floor(p.total / 10)::integer
from pedidos p
where p.org_id = l.org_id
  and l.origen = 'Compra ' || p.numero_pedido
  and (p.numero_pedido like 'PED-ACUM-%' or p.numero_pedido like 'PED-DEV-%')
  and l.tipo = 'acumulacion'
  and l.puntos <> floor(p.total / 10)::integer;

-- Y la reversión de una devolución, con la misma tasa sobre lo devuelto.
update points_ledger l
set puntos = -floor(d.total_devuelto / 10)::integer
from devoluciones d
where d.org_id = l.org_id
  and l.origen = 'Reversión por devolución ' || d.numero_devolucion
  and l.tipo = 'ajuste'
  and l.puntos <> -floor(d.total_devuelto / 10)::integer;

-- ── 1 · Los canjes imposibles se van ───────────────────────────────────
--
-- Se borran el evento Y su movimiento de puntos: dejar el movimiento sin el
-- evento solo cambiaría un dato incoherente por otro. El saldo se recalcula
-- al final (el trigger de `points_ledger` solo suma en INSERT, así que un
-- DELETE no lo toca).
--
-- `promocion_eventos` es append-only para `authenticated`
-- (20260826161000); el rol que corre migraciones no está en ese `revoke`,
-- que es la excepción por la que esta limpieza puede existir.
--
-- Nota: `promociones.canjes` es un contador denormalizado que no se toca
-- aquí. Ya venía descuadrado con el número de eventos en toda la base
-- (PROMO-3X2-ANALG dice 412 con 265 eventos), y arreglar ese contador es
-- otra conversación, no un efecto colateral de esta.

with org as (select id from organizations where slug = 'omni'),
socio as (
  select id from members
  where org_id = (select id from org) and email = 'camilo.torres@example.com'
)
delete from promocion_eventos pe
using promociones p
where p.id = pe.promocion_id
  and pe.member_id = (select id from socio)
  and pe.tipo = 'canje'
  and (
    -- Bono de cumpleaños sin cumpleaños.
    p.codigo = 'PROMO-BONO-CUMPLE'
    -- Cashback de dermocosmética sin dermocosmética.
    or p.codigo = 'PROMO-CASHBACK-SOLAR'
    -- Canjeada antes de existir su vigencia.
    or pe.ocurrido_en::date < p.vigente_desde
  );

with org as (select id from organizations where slug = 'omni'),
socio as (
  select id from members
  where org_id = (select id from org) and email = 'camilo.torres@example.com'
)
delete from points_ledger
where member_id = (select id from socio)
  and origen = 'promocion:PROMO-BONO-CUMPLE';

-- ── 2 · Las acumulaciones que citaban compras inexistentes ─────────────

with org as (select id from organizations where slug = 'omni'),
socio as (
  select id from members
  where org_id = (select id from org) and email = 'camilo.torres@example.com'
)
delete from points_ledger l
where l.member_id = (select id from socio)
  and l.tipo = 'acumulacion'
  and l.origen like 'Compra #PED-%'
  and not exists (
    -- El `#` del texto viejo no está en `numero_pedido`: se compara sin él.
    select 1 from pedidos p
    where p.org_id = l.org_id
      and 'Compra #' || p.numero_pedido = l.origen
  );

-- ── 3 · Un movimiento por cada compra real ─────────────────────────────
--
-- La tasa del programa sobre el total del pedido, fechado el día de la
-- compra y con la vigencia de 365 días de
-- `programa_parametros.vigencia_puntos_dias`. Con esto sus doce compras
-- tienen puntos y sus puntos tienen compra — que es lo que el módulo
-- «Compras» del log deja ver de un vistazo.

with org as (select id from organizations where slug = 'omni'),
socio as (
  select id from members
  where org_id = (select id from org) and email = 'camilo.torres@example.com'
)
insert into points_ledger (
  org_id, member_id, tipo, puntos, origen, canal, expira_en, creado_en
)
select
  p.org_id, p.member_id, 'acumulacion',
  floor(p.total / 10)::integer,
  'Compra ' || p.numero_pedido,
  p.canal,
  p.creado_en + interval '365 days',
  p.creado_en
from pedidos p
where p.member_id = (select id from socio)
  and p.estado <> 'cancelado'
  and p.total > 0
  and not exists (
    select 1 from points_ledger l
    where l.origen = 'Compra ' || p.numero_pedido
      and l.member_id = p.member_id
  );

-- ── 3b · La expiración que ninguna acumulación sostiene ────────────────
--
-- Tenía una expiración de −1.000 puntos el 18 de agosto de 2026. Los puntos
-- expiran a los 365 días (`programa_parametros.vigencia_puntos_dias`), y
-- después de reconstruir sus acumulaciones la más antigua es del 19 de
-- septiembre de 2025 — vence el 19 de septiembre de 2026, dentro de doce
-- días. En agosto no había nada vencido: esa fila restaba puntos que
-- todavía estaban vivos.
--
-- Se borra en vez de re-fecharse porque la fecha correcta está en el FUTURO,
-- y en esta demo nada ocurre en el futuro. Efecto secundario que sí es
-- deseable: la ficha empieza a mostrar puntos «por vencer» de verdad, los
-- que caducan el 19 de septiembre.

with org as (select id from organizations where slug = 'omni'),
socio as (
  select id from members
  where org_id = (select id from org) and email = 'camilo.torres@example.com'
),
primer_vencimiento as (
  select min(expira_en) as fecha
  from points_ledger
  where member_id = (select id from socio)
    and tipo = 'acumulacion'
    and expira_en is not null
)
delete from points_ledger l
where l.member_id = (select id from socio)
  and l.tipo = 'expiracion'
  and (
    (select fecha from primer_vencimiento) is null
    or l.creado_en < (select fecha from primer_vencimiento)
  );

-- ── 4 · Los dos canjes que sí pudieron pasar, anclados a su compra ─────
--
-- Un canje ocurre EN una compra: si el evento dice un carrito de $63.409 y
-- ese pedido no existe, no hay forma de auditarlo. Cada uno se mueve a la
-- fecha y el monto de un pedido real, y el descuento se recalcula con los
-- escalones de la promoción: `escalones` de `PROMO-ESC-VIT2` es
-- [1 → 10 %, 2 → 15 %] por unidades y `modo_calculo = 'escalon_unico'`, así
-- que tres piezas caen en el escalón 2 → 15 %.

with org as (select id from organizations where slug = 'omni'),
socio as (
  select id from members
  where org_id = (select id from org) and email = 'camilo.torres@example.com'
),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-ESC-VIT2'
),
eventos as (
  select id, row_number() over (order by ocurrido_en) as rn
  from promocion_eventos
  where member_id = (select id from socio)
    and promocion_id = (select id from promo)
    and tipo = 'canje'
),
pedidos_ancla as (
  select
    numero_pedido, total, creado_en,
    (select coalesce(sum(cantidad), 0) from pedido_items i where i.pedido_id = p.id) as piezas,
    row_number() over (order by creado_en) as rn
  from pedidos p
  where p.member_id = (select id from socio)
    and p.numero_pedido in ('PED-77850', 'PED-77980')
)
update promocion_eventos pe
set
  ocurrido_en = a.creado_en + interval '35 minutes',
  canal = 'pos',
  metadatos = pe.metadatos || jsonb_build_object(
    'ticket', 'TCK-0142-' || right(a.numero_pedido, 5),
    'monto_carrito', a.total,
    'piezas_carrito', a.piezas,
    'unidades', a.piezas,
    'escalon_alcanzado', 2,
    'descuento_pct', 15,
    'descuento_otorgado', round(a.total * 0.15),
    'candidatas', jsonb_build_array(
      jsonb_build_object('codigo', 'PROMO-ESC-VIT2', 'aplicada', true),
      -- En PED-77850 llevaba dos acetaminofén: la 3x2 se evaluó y no
      -- alcanzaba. Es la misma historia que cuenta su tarjeta de
      -- acumulaciones («En curso · lleva 2»).
      jsonb_build_object(
        'codigo', 'PROMO-3X2-ANALG', 'aplicada', false,
        'motivo', 'ciclo_incompleto'
      )
    )
  )
from eventos e
join pedidos_ancla a on a.rn = e.rn
where pe.id = e.id;

-- El cupón de bienvenida, sobre su pedido del 14 de julio (la promoción
-- rige desde el 13, así que este sí cabe). 10 % de $9.800 = $980.
with org as (select id from organizations where slug = 'omni'),
socio as (
  select id from members
  where org_id = (select id from org) and email = 'camilo.torres@example.com'
),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-CUPON-BDV'
),
ancla as (
  select numero_pedido, total, creado_en
  from pedidos
  where member_id = (select id from socio) and numero_pedido = 'PED-77700'
)
update promocion_eventos pe
set
  ocurrido_en = (select creado_en from ancla) + interval '20 minutes',
  canal = 'pos',
  metadatos = pe.metadatos || jsonb_build_object(
    'ticket', 'TCK-0142-' || right((select numero_pedido from ancla), 5),
    'monto_carrito', (select total from ancla),
    'piezas_carrito', 1,
    'descuento_pct', 10,
    'descuento_otorgado', round((select total from ancla) * 0.10),
    'candidatas', jsonb_build_array(
      jsonb_build_object('codigo', 'PROMO-CUPON-BDV', 'aplicada', true)
    )
  )
where pe.member_id = (select id from socio)
  and pe.promocion_id = (select id from promo)
  and pe.tipo = 'canje'
  and (select numero_pedido from ancla) is not null;

-- ── 5 · La devolución de Camilo ────────────────────────────────────────
--
-- Sobre `PED-77980` (curitas), que no participa en ninguna mecánica por
-- piezas: así su ficha tiene una devolución sin que se le mueva ninguna de
-- las dos acumulaciones que se están usando para mostrar la pantalla.

with org as (select id from organizations where slug = 'omni'),
ped as (
  select p.id, p.member_id, p.tienda_id, p.creado_en
  from pedidos p
  join members m on m.id = p.member_id
  where p.org_id = (select id from org)
    and p.numero_pedido = 'PED-77980'
    and m.email = 'camilo.torres@example.com'
)
insert into devoluciones (
  org_id, pedido_id, member_id, numero_devolucion, motivo, nota,
  canal, tienda_id, creado_en
)
select
  (select id from org), ped.id, ped.member_id,
  'DEV-2026-006', 'no_era_lo_esperado',
  'Se llevó dos cajas de curitas y trajo una: la caja grande no le servía para el vendaje.',
  'pos', ped.tienda_id,
  ped.creado_en + interval '5 days'
from ped
on conflict (org_id, numero_devolucion) do nothing;

with org as (select id from organizations where slug = 'omni'),
dev as (
  select id from devoluciones
  where org_id = (select id from org) and numero_devolucion = 'DEV-2026-006'
),
linea as (
  select i.id, i.producto_id, i.precio_unitario, i.costo_unitario
  from pedido_items i
  join pedidos p on p.id = i.pedido_id
  join productos pr on pr.id = i.producto_id
  where p.org_id = (select id from org)
    and p.numero_pedido = 'PED-77980'
    and pr.sku = 'FAR-71305'
)
insert into devolucion_items (
  devolucion_id, pedido_item_id, producto_id, cantidad,
  precio_unitario, costo_unitario
)
select
  (select id from dev), linea.id, linea.producto_id, 1,
  linea.precio_unitario, linea.costo_unitario
from linea
where (select id from dev) is not null
on conflict (devolucion_id, pedido_item_id) do nothing;

with org as (select id from organizations where slug = 'omni')
insert into points_ledger (
  org_id, member_id, tipo, puntos, origen, canal, creado_en
)
select
  d.org_id, d.member_id, 'ajuste',
  -floor(d.total_devuelto / 10)::integer,
  'Reversión por devolución ' || d.numero_devolucion,
  d.canal, d.creado_en
from devoluciones d
where d.org_id = (select id from org)
  and d.numero_devolucion = 'DEV-2026-006'
  and d.total_devuelto > 0
  and not exists (
    select 1 from points_ledger l
    where l.origen = 'Reversión por devolución ' || d.numero_devolucion
  );

-- ── 6 · Que el ledger se lea en español y no en clave ──────────────────
--
-- `promocion:CODIGO` y un UUID entre paréntesis son formatos de máquina en
-- una tabla que el socio ve. El cupón se nombra por su código, que es lo que
-- el socio tiene en la mano.

update points_ledger l
set origen = 'Reversión por anulación del cupón ' || c.code
from coupon c
where l.origen = 'Devolución por anulación de cupón (' || c.id::text || ')';

update points_ledger l
set origen = 'Bono de ' || lower(p.nombre) || ' · ' || p.codigo
from promociones p
where l.origen = 'promocion:' || p.codigo;

-- ── 7 · Su inscripción, antes de su primera compra ─────────────────────
--
-- Su primera compra es del 19 de septiembre de 2025 y su alta decía agosto
-- de 2026. Se mueve el alta, no el histórico: las compras tienen líneas,
-- totales y puntos detrás; la fecha de alta no tiene nada que la sostenga.
-- Efecto secundario correcto: deja de contar como «nuevo este mes» y su
-- antigüedad pasa a ~12 meses, que es lo que su histórico dice.

with org as (select id from organizations where slug = 'omni'),
primera as (
  select min(p.creado_en) as fecha
  from pedidos p
  join members m on m.id = p.member_id
  where p.org_id = (select id from org)
    and m.email = 'camilo.torres@example.com'
)
update members m
set creado_en = (select fecha from primera) - interval '4 days'
where m.org_id = (select id from org)
  and m.email = 'camilo.torres@example.com'
  and (select fecha from primera) is not null
  and m.creado_en > (select fecha from primera);

-- ── 8 · El saldo, recalculado desde el ledger ──────────────────────────
--
-- Obligatorio después de cualquier DELETE o UPDATE de puntos: el trigger
-- `apply_points_ledger_entry` solo corre en INSERT, así que
-- `members.saldo_puntos` se queda con el número viejo. Es el único sitio de
-- esta migración donde el orden importa: tiene que ser el último bloque.

with org as (select id from organizations where slug = 'omni')
update members m
set saldo_puntos = coalesce((
  select sum(l.puntos) from points_ledger l where l.member_id = m.id
), 0)
where m.org_id = (select id from org)
  and m.email = 'camilo.torres@example.com';
