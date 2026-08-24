-- Datos de ejemplo para "02 · Dashboard" (`/resumen`, `/analitica`) como
-- migración (no solo `seed.sql`), mismo motivo que
-- 20260823152000_audiencias_datos_demo.sql: `supabase db push --include-seed`
-- contra este proyecto remoto no deja las filas de `seed.sql` insertadas —
-- el camino fiable es `db push` de migraciones. `seed.sql` conserva este
-- bloque igual, palabra por palabra, para que `supabase db reset` (entorno
-- local) siga sembrando lo mismo sin depender de esta migración.

-- El seed de 05.3g solo tenía 4 canjes puntuales (dos por socio Diamante,
-- para las cards de perfil) y 31 pedidos en ~200 días — insuficiente para
-- series de 12 meses en un dashboard ("Canjes por mes", "Atribución de
-- canjes", "Tasa de canje por canal"). Este bloque añade canjes reales
-- (`points_ledger.tipo = 'canje'`) repartidos en los últimos 12 meses entre
-- los 7 socios con actividad de 05.3g (Felipe se deja sin canjes a
-- propósito, sigue "suspendido" en el seed original). Cifras y fechas fijas
-- (no `generate_series`/`random()`) para que el resultado sea inspeccionable
-- a simple vista y estable entre corridas del seed.
with org as (select id from organizations where slug = 'omni'),
socio as (select email, id from members where org_id = (select id from org))
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, creado_en)
select
  (select id from org),
  (select id from socio where socio.email = c.email),
  'canje',
  c.puntos,
  c.origen,
  c.canal,
  now() - (c.dias_atras || ' days')::interval
from (
  values
    ('daniela.cardenas@example.com', 'pos', -622, 'Canje 2x1 categoría #01', 14),
    ('sofia.ramirez@example.com', 'app', -2533, 'Canje 2x1 categoría #02', 17),
    ('daniela.cardenas@example.com', 'app', -2290, 'Canje 2x1 categoría #03', 34),
    ('valentina.rios@example.com', 'pos', -1233, 'Canje producto gratis #01', 40),
    ('sofia.ramirez@example.com', 'app', -2028, 'Canje cupón bienvenida #01', 57),
    ('sofia.ramirez@example.com', 'pos', -683, 'Canje descuento VIP #01', 62),
    ('julian.restrepo@example.com', 'ecommerce', -2080, 'Canje envío gratis #01', 62),
    ('daniela.cardenas@example.com', 'app', -815, 'Canje envío gratis #02', 62),
    ('julian.restrepo@example.com', 'ecommerce', -313, 'Canje producto gratis #02', 63),
    ('sofia.ramirez@example.com', 'pos', -2369, 'Canje cupón bienvenida #02', 76),
    ('camilo.torres@example.com', 'ecommerce', -718, 'Canje 2x1 categoría #04', 84),
    ('andres.gomez@example.com', 'app', -1199, 'Canje puntos por premio #01', 88),
    ('valentina.rios@example.com', 'pos', -1253, 'Canje 2x1 categoría #05', 103),
    ('camilo.torres@example.com', 'ecommerce', -696, 'Canje puntos por premio #02', 115),
    ('sofia.ramirez@example.com', 'app', -1114, 'Canje recompra #01', 119),
    ('daniela.cardenas@example.com', 'app', -2246, 'Canje recompra #02', 127),
    ('sofia.ramirez@example.com', 'ecommerce', -1202, 'Canje referido #01', 130),
    ('andres.gomez@example.com', 'pos', -1238, 'Canje cupón bienvenida #03', 130),
    ('mariana.ocampo@example.com', 'ecommerce', -1198, 'Canje envío gratis #03', 139),
    ('julian.restrepo@example.com', 'app', -1031, 'Canje recompra #03', 141),
    ('andres.gomez@example.com', 'ecommerce', -1943, 'Canje producto gratis #03', 143),
    ('sofia.ramirez@example.com', 'app', -1439, 'Canje cupón bienvenida #04', 145),
    ('camilo.torres@example.com', 'ecommerce', -1383, 'Canje cupón bienvenida #05', 147),
    ('valentina.rios@example.com', 'ecommerce', -1438, 'Canje referido #02', 155),
    ('daniela.cardenas@example.com', 'pos', -1385, 'Canje recompra #04', 162),
    ('camilo.torres@example.com', 'app', -2181, 'Canje recompra #05', 179),
    ('julian.restrepo@example.com', 'pos', -1522, 'Canje recompra #06', 179),
    ('valentina.rios@example.com', 'app', -1794, 'Canje envío gratis #04', 190),
    ('daniela.cardenas@example.com', 'app', -2033, 'Canje descuento VIP #02', 190),
    ('andres.gomez@example.com', 'pos', -1164, 'Canje puntos por premio #04', 199),
    ('mariana.ocampo@example.com', 'app', -2321, 'Canje 2x1 categoría #06', 209),
    ('camilo.torres@example.com', 'pos', -1850, 'Canje 2x1 categoría #07', 221),
    ('mariana.ocampo@example.com', 'pos', -749, 'Canje envío gratis #05', 224),
    ('andres.gomez@example.com', 'pos', -2344, 'Canje cumpleaños #01', 241),
    ('julian.restrepo@example.com', 'app', -1114, 'Canje envío gratis #06', 279),
    ('mariana.ocampo@example.com', 'app', -955, 'Canje cumpleaños #02', 280),
    ('mariana.ocampo@example.com', 'app', -560, 'Canje cumpleaños #03', 292),
    ('valentina.rios@example.com', 'ecommerce', -1755, 'Canje descuento VIP #03', 300),
    ('mariana.ocampo@example.com', 'ecommerce', -2217, 'Canje recompra #07', 303),
    ('mariana.ocampo@example.com', 'ecommerce', -2566, 'Canje cupón bienvenida #06', 304),
    ('valentina.rios@example.com', 'app', -1393, 'Canje 2x1 categoría #08', 321),
    ('valentina.rios@example.com', 'app', -1000, 'Canje recompra #08', 326),
    ('andres.gomez@example.com', 'app', -2179, 'Canje envío gratis #07', 332),
    ('julian.restrepo@example.com', 'ecommerce', -961, 'Canje recompra #09', 333),
    ('julian.restrepo@example.com', 'app', -302, 'Canje puntos por premio #05', 354),
    ('andres.gomez@example.com', 'ecommerce', -871, 'Canje descuento VIP #04', 357)
) as c (email, canal, puntos, origen, dias_atras)
where exists (select 1 from socio where socio.email = c.email)
  and not exists (
    select 1 from points_ledger pl
    where pl.member_id = (select id from socio where socio.email = c.email)
      and pl.origen = c.origen
  );

-- Más pedidos (05.3g solo cubría ~200 días) para extender "Miembros activos
-- y ventas" (Resumen) a los 12 meses completos.
with org as (select id from organizations where slug = 'omni'),
miembro_ids as (select email, id from members where org_id = (select id from org)),
tienda_ids as (select codigo_tienda, id from tiendas where org_id = (select id from org))
insert into pedidos (org_id, member_id, tienda_id, canal, numero_pedido, estado, creado_en)
select
  (select id from org),
  (select id from miembro_ids where miembro_ids.email = p.email),
  (select id from tienda_ids where tienda_ids.codigo_tienda = p.tienda_codigo),
  p.canal, p.numero_pedido, 'completado', now() - (p.dias_atras || ' days')::interval
from (
  values
    ('camilo.torres@example.com', 'ST-0142', 'pos', 'PED-DEMO-005', 219),
    ('mariana.ocampo@example.com', 'ST-0158', 'pos', 'PED-DEMO-014', 221),
    ('sofia.ramirez@example.com', 'ST-0142', 'app', 'PED-DEMO-001', 222),
    ('andres.gomez@example.com', 'ST-0151', 'app', 'PED-DEMO-011', 225),
    ('sofia.ramirez@example.com', 'ST-0142', 'pos', 'PED-DEMO-002', 228),
    ('valentina.rios@example.com', 'ST-0143', 'ecommerce', 'PED-DEMO-008', 233),
    ('daniela.cardenas@example.com', 'ST-0142', 'app', 'PED-DEMO-020', 236),
    ('julian.restrepo@example.com', 'ST-0163', 'ecommerce', 'PED-DEMO-017', 240),
    ('sofia.ramirez@example.com', 'ST-0142', 'ecommerce', 'PED-DEMO-003', 248),
    ('camilo.torres@example.com', 'ST-0142', 'ecommerce', 'PED-DEMO-006', 264),
    ('mariana.ocampo@example.com', 'ST-0158', 'ecommerce', 'PED-DEMO-015', 266),
    ('andres.gomez@example.com', 'ST-0151', 'app', 'PED-DEMO-012', 267),
    ('valentina.rios@example.com', 'ST-0143', 'pos', 'PED-DEMO-009', 271),
    ('sofia.ramirez@example.com', 'ST-0142', 'app', 'PED-DEMO-004', 311),
    ('camilo.torres@example.com', 'ST-0142', 'ecommerce', 'PED-DEMO-007', 339),
    ('julian.restrepo@example.com', 'ST-0163', 'app', 'PED-DEMO-018', 348),
    ('valentina.rios@example.com', 'ST-0143', 'app', 'PED-DEMO-010', 351),
    ('mariana.ocampo@example.com', 'ST-0158', 'ecommerce', 'PED-DEMO-016', 352),
    ('julian.restrepo@example.com', 'ST-0163', 'app', 'PED-DEMO-019', 356),
    ('daniela.cardenas@example.com', 'ST-0142', 'pos', 'PED-DEMO-021', 356),
    ('daniela.cardenas@example.com', 'ST-0142', 'ecommerce', 'PED-DEMO-022', 358),
    ('andres.gomez@example.com', 'ST-0151', 'ecommerce', 'PED-DEMO-013', 359)
) as p (email, tienda_codigo, canal, numero_pedido, dias_atras)
on conflict (org_id, numero_pedido) do nothing;

with org as (select id from organizations where slug = 'omni'),
pedido_ids as (select numero_pedido, id from pedidos where org_id = (select id from org)),
producto_ids as (
  select sku, id, precio, costo_unitario from productos where org_id = (select id from org)
)
insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, costo_unitario)
select
  (select id from pedido_ids where pedido_ids.numero_pedido = i.numero_pedido),
  (select id from producto_ids where producto_ids.sku = i.sku),
  i.cantidad,
  (select precio from producto_ids where producto_ids.sku = i.sku),
  coalesce((select costo_unitario from producto_ids where producto_ids.sku = i.sku), 0)
from (
  values
    ('PED-DEMO-001', 'FAR-71600', 2),
    ('PED-DEMO-002', 'FAR-70933', 2),
    ('PED-DEMO-002', 'FAR-70422', 1),
    ('PED-DEMO-003', 'FAR-71600', 1),
    ('PED-DEMO-004', 'FAR-70422', 1),
    ('PED-DEMO-005', 'FAR-71455', 1),
    ('PED-DEMO-005', 'FAR-71042', 1),
    ('PED-DEMO-006', 'FAR-70422', 1),
    ('PED-DEMO-006', 'FAR-70241', 1),
    ('PED-DEMO-007', 'FAR-70241', 2),
    ('PED-DEMO-008', 'FAR-71600', 1),
    ('PED-DEMO-009', 'FAR-71042', 1),
    ('PED-DEMO-009', 'FAR-71305', 2),
    ('PED-DEMO-010', 'FAR-70422', 2),
    ('PED-DEMO-011', 'FAR-71105', 1),
    ('PED-DEMO-011', 'FAR-70933', 1),
    ('PED-DEMO-012', 'FAR-71042', 1),
    ('PED-DEMO-013', 'FAR-70422', 1),
    ('PED-DEMO-014', 'FAR-70517', 1),
    ('PED-DEMO-015', 'FAR-70422', 1),
    ('PED-DEMO-016', 'FAR-70241', 1),
    ('PED-DEMO-016', 'FAR-70517', 1),
    ('PED-DEMO-017', 'FAR-71455', 2),
    ('PED-DEMO-018', 'FAR-70422', 1),
    ('PED-DEMO-019', 'FAR-71105', 1),
    ('PED-DEMO-019', 'FAR-70819', 1),
    ('PED-DEMO-020', 'FAR-70241', 2),
    ('PED-DEMO-021', 'FAR-70602', 1),
    ('PED-DEMO-022', 'FAR-70517', 1),
    ('PED-DEMO-022', 'FAR-70241', 2)
) as i (numero_pedido, sku, cantidad)
on conflict (pedido_id, producto_id) do nothing;
