-- Más volumen de `canje` para que "Canjes por semana" y "Atribución de
-- canjes por canal" (Panel de promociones · Resumen) tengan suficientes
-- puntos reales que graficar — los ~19 eventos de
-- 20260826170000_promociones_eventos_demo.sql alcanzan para la bitácora,
-- pero son muy pocos para una serie semanal legible. Sigue siendo una
-- muestra curada (no un ledger reconciliado con `canjes`, ver comentario de
-- 20260826160000_promociones_eventos.sql) — solo más densa. `metadatos` sale
-- de las columnas reales de la promoción (tipo_beneficio/valor_beneficio),
-- no de un valor inventado.

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id, tipo_beneficio, valor_beneficio from promociones
  where org_id = (select id from org) and codigo = 'PROMO-ENVIO-80'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), promo.id, 'canje', 'Envío exonerado en checkout',
  'Canal: ' || (case when g % 2 = 0 then 'e-commerce' else 'POS' end),
  'sistema', 'Motor de promociones',
  case when g % 2 = 0 then 'ecommerce' else 'pos' end,
  jsonb_build_object(
    'tipo_beneficio', promo.tipo_beneficio, 'valor_beneficio', promo.valor_beneficio
  ),
  now() - (g || ' weeks')::interval - interval '2 days'
from promo, generate_series(1, 8) as g;

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id, tipo_beneficio, valor_beneficio from promociones
  where org_id = (select id from org) and codigo = 'PROMO-CUPON-BDV'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), promo.id, 'canje', 'Cupón de bienvenida canjeado',
  'Canal: ' || (case when g % 2 = 1 then 'e-commerce' else 'POS' end),
  'sistema', 'Motor de promociones',
  case when g % 2 = 1 then 'ecommerce' else 'pos' end,
  jsonb_build_object(
    'tipo_beneficio', promo.tipo_beneficio, 'valor_beneficio', promo.valor_beneficio
  ),
  now() - (g || ' weeks')::interval - interval '3 days'
from promo, generate_series(1, 8) as g;

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id, tipo_beneficio, valor_beneficio from promociones
  where org_id = (select id from org) and codigo = 'PROMO-VIP-15'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), promo.id, 'canje', '15% aplicado a socio VIP',
  'Canal: ' || (case when g % 2 = 0 then 'e-commerce' else 'POS' end),
  'sistema', 'Motor de promociones',
  case when g % 2 = 0 then 'ecommerce' else 'pos' end,
  jsonb_build_object(
    'tipo_beneficio', promo.tipo_beneficio, 'valor_beneficio', promo.valor_beneficio
  ),
  now() - (g || ' weeks')::interval - interval '1 day'
from promo, generate_series(1, 6) as g;

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id, tipo_beneficio, valor_beneficio from promociones
  where org_id = (select id from org) and codigo = 'PROMO-2X1-VIT'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), promo.id, 'canje', 'Unidad gratis entregada (2x1)',
  'Canal: ' || (case when g % 2 = 1 then 'e-commerce' else 'POS' end),
  'sistema', 'Motor de promociones',
  case when g % 2 = 1 then 'ecommerce' else 'pos' end,
  jsonb_build_object(
    'tipo_beneficio', promo.tipo_beneficio, 'valor_beneficio', promo.valor_beneficio
  ),
  now() - (g || ' weeks')::interval - interval '4 days'
from promo, generate_series(1, 6) as g;

-- Backfill del `canal` en los eventos de canje/canje_rechazado ya sembrados
-- por 20260826170000_promociones_eventos_demo.sql, para que la atribución
-- por canal no los deje afuera.
update promocion_eventos
set canal = case
  when detalle ilike '%e-commerce%' then 'ecommerce'
  when detalle ilike '%pos%' then 'pos'
  else canal
end
where tipo in ('canje', 'canje_rechazado') and canal is null;
