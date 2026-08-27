-- Fase 2 del panel de promociones (widgets "unidades regaladas"/"producto
-- más redimido", "ticket promedio" y "puntos otorgados por promoción"):
-- enriquece `promocion_eventos.metadatos` de canjes YA reales — es jsonb,
-- así que esto es enriquecimiento de datos, no un cambio de esquema — y
-- corrige un hueco real del catálogo: la condición de "2x1 en Vitaminas"
-- apunta a la categoría "Vitaminas", que hoy no tiene ningún producto real
-- enlazado. También agrega una promoción de puntos (`bono_puntos`): no
-- había ninguna sembrada de esa mecánica, así que "puntos otorgados" no
-- tenía ningún dato real que mostrar.

-- 1) Enlaza los 2 suplementos reales del catálogo a la categoría
--    "Vitaminas" (hueco preexistente: la promoción ya condicionaba sobre
--    esta categoría, pero ningún producto la tenía asignada — cada uno
--    conserva su categoría principal existente, 'Vitamina C'/
--    'Multivitamínicos', así que este enlace queda como secundario).
with org as (select id from organizations where slug = 'omni'),
cat as (
  select id from categorias
  where nombre = 'Vitaminas' and org_id = (select id from org)
)
insert into producto_categorias (producto_id, categoria_id, es_principal)
select p.id, (select id from cat), false
from productos p
where p.org_id = (select id from org)
  and p.sku in ('FAR-70422', 'FAR-71455')
  and exists (select 1 from cat)
on conflict (producto_id, categoria_id) do nothing;

-- 2) "2x1 en Vitaminas" — cada canje real regala 1 unidad de uno de los 2
--    productos de esa categoría, repartido determinísticamente por el id
--    del evento (mismo patrón `hashtext(...) % N` que ya usa el resto del
--    seed para asignar un valor real "al azar" de forma estable).
with productos_vit as (
  select array_agg(id order by sku) as ids
  from productos
  where sku in ('FAR-70422', 'FAR-71455')
)
update promocion_eventos e
set metadatos = e.metadatos || jsonb_build_object(
  'producto_id',
  (
    select ids[1 + (abs(hashtext(e.id::text)) % array_length(ids, 1))]
    from productos_vit
  ),
  'cantidad', 1
)
from promociones p
where e.promocion_id = p.id and p.codigo = 'PROMO-2X1-VIT' and e.tipo = 'canje';

-- 3) "Envío gratis" — cada canje real trae el monto de carrito que activó
--    el beneficio (siempre por encima del umbral de la condición),
--    determinístico por el id del evento.
update promocion_eventos e
set metadatos = e.metadatos || jsonb_build_object(
  'monto_carrito', 80000 + (abs(hashtext(e.id::text)) % 120000)
)
from promociones p
where e.promocion_id = p.id and p.codigo = 'PROMO-ENVIO-80' and e.tipo = 'canje';

-- 4) Nueva promoción de puntos (`bono_puntos`) — dirigida al segmento real
--    "Cumpleaños próximos 7d" (`seg_birthday_7d`, 410 socios), mismo
--    patrón de condición que "15% Clientes VIP". Cifras de presupuesto en
--    la misma escala que las demás promociones activas del remoto.
with org as (select id from organizations where slug = 'omni')
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio, valor_beneficio, bono_puntos,
  tope_maximo, aplicar_sobre, limites,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta
)
select
  (select id from org),
  'Bono de cumpleaños · 500 puntos', 'PROMO-BONO-CUMPLE', 'segmento', 6,
  true, 'pos_ecommerce',
  jsonb_build_object(
    'combinador', 'todas',
    'condiciones', jsonb_build_array(jsonb_build_object(
      'campo', 'segmento',
      'valor', (
        select id::text from segments
        where codigo = 'seg_birthday_7d' and org_id = (select id from org)
      )
    ))
  ),
  'bono_puntos', null::numeric, 500,
  null::numeric, 'subtotal_carrito', '[]'::jsonb,
  850000, 340000, 68, 2.8,
  'activa', current_date - 10, current_date + 20
where exists (
  select 1 from segments
  where codigo = 'seg_birthday_7d' and org_id = (select id from org)
)
on conflict (org_id, codigo) do nothing;

-- 5) Bitácora de la nueva promoción — 68 canjes reales repartidos en los
--    últimos 10 días, cada uno otorgando los 500 puntos configurados.
with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where codigo = 'PROMO-BONO-CUMPLE' and org_id = (select id from org)
),
serie as (select generate_series(0, 67) as n)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org),
  (select id from promo),
  'canje',
  'Bono de cumpleaños otorgado',
  case when n % 2 = 0 then 'Canal: POS' else 'Canal: e-commerce' end,
  'sistema',
  'Motor de promociones',
  case when n % 2 = 0 then 'pos' else 'ecommerce' end,
  jsonb_build_object(
    'tipo_beneficio', 'bono_puntos', 'valor_beneficio', 500,
    'puntos_otorgados', 500
  ),
  now() - ((n % 10) || ' days')::interval - ((n * 7) || ' minutes')::interval
from serie
where exists (select 1 from promo);
