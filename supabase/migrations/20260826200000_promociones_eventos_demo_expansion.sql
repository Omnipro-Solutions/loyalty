-- Amplía la muestra de actividad real a 2 promociones más que ya estaban
-- activas y vigentes pero seguían en 0 canjes desde el seed base (mismo
-- criterio que el resto de esta serie de migraciones — ver comentario de
-- 20260826160000_promociones_eventos.sql). Se excluyen deliberadamente:
-- CONTROL/SUPER99 (`vigente_desde` = hoy, cero canjes es lo correcto para
-- algo que apenas entró en vigencia), PROMO-DERMO-20 (`vigente_desde` en el
-- futuro, todavía programada) y toda promoción `borrador` (nunca se publicó,
-- nadie pudo canjearla) — a esas no se les toca ni `promociones` ni
-- `promocion_eventos`.
--
-- SUPER44 ("Descuento por %", vigente desde hace 7 días) queda con ROI < 1
-- a propósito: hoy no había ningún ejemplo real que disparara la alerta de
-- "ROI por debajo de 1×" en el panel — con esto la hay.

with org as (select id from organizations where slug = 'omni')
update promociones
set canjes = 45, presupuesto_consumido = 1850, roi = 0.8
where org_id = (select id from org) and codigo = 'SUPER44';

with org as (select id from organizations where slug = 'omni')
update promociones
set canjes = 6, presupuesto_consumido = 42000, roi = 4.1
where org_id = (select id from org) and codigo = 'PROMO-BUNDLE-BIENESTAR';

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id, tipo_beneficio, valor_beneficio from promociones
  where org_id = (select id from org) and codigo = 'SUPER44'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, codigo_motivo, nota_motivo, metadatos, ocurrido_en
)
select (select id from org), promo.id, v.tipo, v.titulo, v.detalle, v.actor_tipo,
  v.actor_etiqueta, v.canal, v.codigo_motivo, v.nota_motivo,
  jsonb_build_object(
    'tipo_beneficio', promo.tipo_beneficio, 'valor_beneficio', promo.valor_beneficio
  ),
  v.ocurrido_en
from promo, (
  values
    ('creada', 'Promoción creada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, null::text, now() - interval '9 days'),
    ('activada', 'Promoción activada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, null::text, now() - interval '7 days'),
    ('canje', 'Descuento aplicado', 'Canal: e-commerce', 'sistema', 'Motor de promociones', 'ecommerce', null::text, null::text, now() - interval '6 days'),
    ('canje', 'Descuento aplicado', 'Canal: POS', 'sistema', 'Motor de promociones', 'pos', null::text, null::text, now() - interval '4 days'),
    ('canje', 'Descuento aplicado', 'Canal: e-commerce', 'sistema', 'Motor de promociones', 'ecommerce', null::text, null::text, now() - interval '2 days'),
    ('canje_rechazado', 'Canje rechazado', 'Canal: POS', 'sistema', 'Motor de promociones', 'pos', 'presupuesto_agotado_periodo', 'El presupuesto del periodo ya se había agotado', now() - interval '1 day')
) as v (
  tipo, titulo, detalle, actor_tipo, actor_etiqueta, canal, codigo_motivo,
  nota_motivo, ocurrido_en
);

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id, tipo_beneficio, valor_beneficio from promociones
  where org_id = (select id from org) and codigo = 'PROMO-BUNDLE-BIENESTAR'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select (select id from org), promo.id, v.tipo, v.titulo, v.detalle, v.actor_tipo,
  v.actor_etiqueta, v.canal,
  jsonb_build_object(
    'tipo_beneficio', promo.tipo_beneficio, 'valor_beneficio', promo.valor_beneficio
  ),
  v.ocurrido_en
from promo, (
  values
    ('creada', 'Promoción creada', null::text, 'usuario', 'Carlos Granados', null::text, now() - interval '2 days'),
    ('activada', 'Promoción activada', null::text, 'usuario', 'Carlos Granados', null::text, now() - interval '1 day'),
    ('canje', 'Combo entregado en tienda', 'Canal: POS', 'sistema', 'Motor de promociones', 'pos', now() - interval '20 hours'),
    ('canje', 'Combo entregado en tienda', 'Canal: POS', 'sistema', 'Motor de promociones', 'pos', now() - interval '5 hours')
) as v (tipo, titulo, detalle, actor_tipo, actor_etiqueta, canal, ocurrido_en);
