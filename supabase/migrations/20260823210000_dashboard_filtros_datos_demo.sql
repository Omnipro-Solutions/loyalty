-- Datos de demo para que los filtros de "/analitica" (rango de fechas,
-- comparación, segmento) tengan algo real que mostrar en cualquier
-- combinación — mismo motivo de las migraciones `*_demo.sql` anteriores:
-- `supabase db push --include-seed` contra el proyecto remoto no deja
-- sembrado `seed.sql`, así que este bloque se replica ahí palabra por
-- palabra al final del archivo.
--
-- Tres problemas que resuelve, en orden:
--
-- 1. `productos.costo_unitario` sólo se rellenaba en `seed.sql` (línea
--    ~731), ninguna migración lo hacía — `20260823150000_pedidos.sql` sólo
--    añade la columna (default null). Cualquier proyecto provisto sólo con
--    `db push` de migraciones (el camino que las propias migraciones de este
--    dashboard llaman "el fiable") tenía `costo_total` en 0 para TODOS los
--    pedidos, y el nuevo KPI "Ticket promedio" (que reporta ventas reales,
--    no margen) no lo necesita, pero cualquier cálculo de margen futuro sí
--    — se corrige de una vez, con el mismo `where costo_unitario is null`
--    que ya usa `seed.sql`, así que no pisa nada si `seed.sql` ya corrió.
--
-- 2. El rango "7D" del filtro de Analítica siempre salía vacío: el pedido y
--    el canje más antiguos eran de hace 8 y 6 días. Se añade actividad
--    reciente (1-6 días atrás) para un grupo de socios.
--
-- 3. De los 24 segmentos de audiencias, 17 no tenían ninguna fila en
--    `segment_members`, y 2 de los 7 que sí tenían (`seg_freq_2026`,
--    `seg_new_30d`) sólo incluían al cohorte `@mail.com`, que no tiene ni un
--    pedido ni un canje — seleccionar cualquiera de esos 19 segmentos en el
--    filtro dejaba las 3 gráficas y los 5 KPIs reales completamente vacíos.
--    Se resuelve sembrando un "cohorte activo" (~38 de los 100 socios de
--    `20260823190000_clientes_lote_demo.sql`, elegido de forma determinista
--    con `hashtext`, nunca `random()`) con pedidos y canjes reales
--    repartidos en los últimos 12 meses, y asignando ese cohorte a los 19
--    segmentos que lo necesitaban.
--
-- El cohorte activo recibe primero un `acumulacion` de 6.000 puntos fechado
-- 370 días atrás (antes que cualquier canje nuevo) para que los canjes no
-- manden a nadie a saldo negativo — la migración anterior
-- (`20260823200000_corrige_saldo_negativo.sql`) tuvo que arreglar
-- exactamente ese error para otro lote de canjes, no se repite aquí: el
-- trigger `points_ledger_apply_after_insert` aplica cada fila en el orden en
-- que se inserta (no por `creado_en`), así que basta con que el `insert` de
-- la acumulación esté antes que el de los canjes en este archivo.

-- === 1. costo_unitario de los 16 SKUs usados por pedido_items de demo ===
with org as (select id from organizations where slug = 'omni')
update productos p
set costo_unitario = c.costo
from (
  values
    ('FAR-70241', 3800), ('FAR-70388', 6300), ('FAR-70422', 15700),
    ('FAR-70517', 9800), ('FAR-70602', 18100), ('FAR-70819', 29900),
    ('FAR-70933', 5250), ('FAR-71042', 2860), ('FAR-71105', 5390),
    ('FAR-71230', 7810), ('FAR-71305', 3660), ('FAR-71390', 5340),
    ('FAR-71455', 21945), ('FAR-71520', 11715), ('FAR-71600', 14880),
    ('FAR-71675', 6930)
) as c (sku, costo)
where p.org_id = (select id from org) and p.sku = c.sku and p.costo_unitario is null;

-- === 2. Acumulación base del cohorte activo (~38 de los 100 socios del lote demo) ===
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, email from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
)
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, creado_en)
select
  (select id from org), a.id, 'acumulacion', 6000,
  'Saldo base — actividad demo filtros de Analítica', 'pos',
  now() - interval '370 days'
from activos a
where not exists (
  select 1 from points_ledger pl
  where pl.member_id = a.id
    and pl.origen = 'Saldo base — actividad demo filtros de Analítica'
);

-- === 3. Canjes del cohorte activo: 3 por socio, uno de ellos en 1-6 días (cubre 7D) ===
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, email, row_number() over (order by email) as rn
  from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
),
canales as (select array['pos', 'ecommerce', 'app'] as arr),
slots as (select generate_series(0, 2) as k)
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, creado_en)
select
  (select id from org),
  a.id,
  'canje',
  -(100 + (abs(hashtext(a.email || 'pts' || s.k)) % 400)),
  'Canje demo filtros Analítica #' || a.rn || '-' || s.k,
  (select arr from canales)[1 + (abs(hashtext(a.email || 'canal' || s.k)) % 3)],
  now() - (
    case s.k
      when 0 then 1 + abs(hashtext(a.email || 'd0')) % 6
      when 1 then 20 + abs(hashtext(a.email || 'd1')) % 60
      else 90 + abs(hashtext(a.email || 'd2')) % 260
    end || ' days'
  )::interval
from activos a
cross join slots s
where not exists (
  select 1 from points_ledger pl
  where pl.member_id = a.id
    and pl.origen = 'Canje demo filtros Analítica #' || a.rn || '-' || s.k
);

-- === 4. Pedidos del cohorte activo: 2 por socio, uno de ellos en 1-6 días ===
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, email, row_number() over (order by email) as rn
  from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
),
tiendas_arr as (
  select array_agg(id order by codigo_tienda) as arr
  from tiendas where org_id = (select id from org)
),
canales as (select array['pos', 'ecommerce', 'app'] as arr),
slots as (select generate_series(0, 1) as k)
insert into pedidos (org_id, member_id, tienda_id, canal, numero_pedido, estado, creado_en)
select
  (select id from org),
  a.id,
  (select arr from tiendas_arr)[1 + (abs(hashtext(a.email || 'tienda')) % 8)],
  (select arr from canales)[1 + (abs(hashtext(a.email || 'canalp' || s.k)) % 3)],
  'PED-FILTROS-' || lpad(a.rn::text, 3, '0') || '-' || s.k,
  'completado',
  now() - (
    case s.k
      when 0 then 1 + abs(hashtext(a.email || 'pd0')) % 6
      else 30 + abs(hashtext(a.email || 'pd1')) % 300
    end || ' days'
  )::interval
from activos a
cross join slots s
on conflict (org_id, numero_pedido) do nothing;

-- === 5. Un ítem por pedido nuevo, de los mismos 16 SKUs de arriba (con costo ya poblado) ===
with org as (select id from organizations where slug = 'omni'),
pedido_ids as (
  select id, numero_pedido from pedidos
  where org_id = (select id from org) and numero_pedido like 'PED-FILTROS-%'
),
producto_ids as (
  select sku, id, precio, costo_unitario from productos
  where org_id = (select id from org)
    and sku in (
      'FAR-70241', 'FAR-70388', 'FAR-70422', 'FAR-70517', 'FAR-70602', 'FAR-70819',
      'FAR-70933', 'FAR-71042', 'FAR-71105', 'FAR-71230', 'FAR-71305', 'FAR-71390',
      'FAR-71455', 'FAR-71520', 'FAR-71600', 'FAR-71675'
    )
),
sku_arr as (select array_agg(sku order by sku) as arr from producto_ids)
insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, costo_unitario)
select
  p.id,
  prod.id,
  1 + abs(hashtext(p.numero_pedido || 'qty')) % 2,
  prod.precio,
  coalesce(prod.costo_unitario, 0)
from pedido_ids p
join producto_ids prod
  on prod.sku = (select arr from sku_arr)[1 + (abs(hashtext(p.numero_pedido)) % 16)]
on conflict (pedido_id, producto_id) do nothing;

-- === 6. Cohorte activo → los 17 segmentos sin ningún miembro ===
-- `((rn + srn) % 17) < 3` reparte cada socio activo en ~3 de los 17
-- segmentos y garantiza mínimo 6-9 socios por segmento (40 valores de `rn`
-- repartidos en 17 residuos, cada uno con 2-3 ocurrencias) — determinista,
-- sin `random()`.
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, email, row_number() over (order by email) as rn
  from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
),
segmentos_vacios as (
  select id, codigo, row_number() over (order by codigo) as srn
  from segments
  where org_id = (select id from org)
    and codigo in (
      'seg_cart_abandon_7d', 'seg_multi_categoria', 'seg_solo_app', 'seg_solo_pos',
      'seg_sin_compra_6m', 'seg_alta_frecuencia_farmacia', 'seg_birthday_7d', 'seg_referidos',
      'seg_consent_marketing', 'seg_sin_consent', 'seg_dermo', 'seg_vitaminas',
      'seg_region_antioquia', 'seg_region_cdmx', 'seg_alto_ticket', 'seg_riesgo_bajar_nivel',
      'seg_canal_campana'
    )
)
insert into segment_members (org_id, segment_id, member_id)
select (select id from org), sv.id, a.id
from segmentos_vacios sv
cross join activos a
where (a.rn + sv.srn) % 17 < 3
on conflict (segment_id, member_id) do nothing;

-- === 7. Refuerzo de los 2 segmentos que ya tenían miembros, pero ninguno con actividad real ===
with org as (select id from organizations where slug = 'omni'),
activos as (
  select id, row_number() over (order by email) as rn
  from members m
  where m.org_id = (select id from org)
    and m.numero_documento is not null
    and m.numero_documento::bigint between 2000000001 and 2000000100
    and abs(hashtext(m.email)) % 5 < 2
),
segmentos_reforzar as (
  select id from segments
  where org_id = (select id from org)
    and codigo in ('seg_freq_2026', 'seg_new_30d')
)
insert into segment_members (org_id, segment_id, member_id)
select (select id from org), sr.id, a.id
from segmentos_reforzar sr
cross join activos a
where a.rn % 10 < 3
on conflict (segment_id, member_id) do nothing;
