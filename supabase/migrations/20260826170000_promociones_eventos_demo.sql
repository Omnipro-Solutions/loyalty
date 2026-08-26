-- Datos demo de `promocion_eventos` — mismo criterio que
-- 20260824130000_cupones_datos_demo.sql: una muestra representativa de
-- actividad reciente por promoción, no un ledger que reconcilie con
-- `canjes`/`presupuesto_consumido` (ver comentario de
-- 20260826160000_promociones_eventos.sql). Referenciadas por `codigo`
-- (estable), no por `nombre` (alguna se renombró en migraciones posteriores
-- a como quedó sembrada en `seed.sql`).

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-ENVIO-80'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  codigo_motivo, nota_motivo, ocurrido_en
)
select (select id from org), (select id from promo), v.*
from (
  values
    ('creada', 'Promoción creada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, now() - interval '19 days'),
    ('activada', 'Promoción activada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, now() - interval '19 days' + interval '5 minutes'),
    ('canje', 'Envío exonerado en checkout', 'Canal: e-commerce', 'sistema', 'Motor de promociones', null::text, null::text, now() - interval '2 days'),
    ('canje', 'Envío exonerado en checkout', 'Canal: e-commerce', 'sistema', 'Motor de promociones', null::text, null::text, now() - interval '1 day'),
    ('canje_rechazado', 'Canje rechazado', 'Canal: e-commerce', 'sistema', 'Motor de promociones', 'monto_carrito_insuficiente', 'El carrito no alcanzó el mínimo de $20 requerido', now() - interval '12 hours')
) as v (
  tipo, titulo, detalle, actor_tipo, actor_etiqueta, codigo_motivo,
  nota_motivo, ocurrido_en
)
where exists (select 1 from promo);

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-CUPON-BDV'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  codigo_motivo, nota_motivo, ocurrido_en
)
select (select id from org), (select id from promo), v.*
from (
  values
    ('creada', 'Promoción creada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, now() - interval '40 days'),
    ('activada', 'Promoción activada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, now() - interval '40 days' + interval '10 minutes'),
    ('presupuesto_incrementado', 'Presupuesto ampliado', 'De $ 700,00 a $ 875,00', 'usuario', 'Carlos Granados', null::text, null::text, now() - interval '10 days'),
    ('canje', 'Cupón de bienvenida canjeado', 'Canal: POS + e-commerce', 'sistema', 'Motor de promociones', null::text, null::text, now() - interval '3 days'),
    ('canje', 'Cupón de bienvenida canjeado', 'Canal: POS + e-commerce', 'sistema', 'Motor de promociones', null::text, null::text, now() - interval '1 day')
) as v (
  tipo, titulo, detalle, actor_tipo, actor_etiqueta, codigo_motivo,
  nota_motivo, ocurrido_en
)
where exists (select 1 from promo);

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-VIP-15'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  codigo_motivo, nota_motivo, ocurrido_en
)
select (select id from org), (select id from promo), v.*
from (
  values
    ('creada', 'Promoción creada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, now() - interval '5 days'),
    ('activada', 'Promoción activada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, now() - interval '5 days' + interval '5 minutes'),
    ('canje', '15% aplicado a socio VIP', 'Canal: POS + e-commerce', 'sistema', 'Motor de promociones', null::text, null::text, now() - interval '2 days'),
    ('canje_rechazado', 'Canje rechazado', 'Canal: e-commerce', 'sistema', 'Motor de promociones', 'limite_por_socio_alcanzado', 'El socio ya alcanzó 2 canjes este mes calendario', now() - interval '1 day')
) as v (
  tipo, titulo, detalle, actor_tipo, actor_etiqueta, codigo_motivo,
  nota_motivo, ocurrido_en
)
where exists (select 1 from promo);

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-2X1-VIT'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  codigo_motivo, nota_motivo, ocurrido_en
)
select (select id from org), (select id from promo), v.*
from (
  values
    ('creada', 'Promoción creada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, now() - interval '13 days'),
    ('activada', 'Promoción activada', null::text, 'usuario', 'Carlos Granados', null::text, null::text, now() - interval '13 days' + interval '5 minutes'),
    ('canje', 'Unidad gratis entregada (2x1)', 'Canal: POS + e-commerce', 'sistema', 'Motor de promociones', null::text, null::text, now() - interval '4 days')
) as v (
  tipo, titulo, detalle, actor_tipo, actor_etiqueta, codigo_motivo,
  nota_motivo, ocurrido_en
)
where exists (select 1 from promo);

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-BUNDLE-BIENESTAR'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  ocurrido_en
)
select (select id from org), (select id from promo), v.*
from (
  values
    ('creada', 'Promoción creada', 'Programada, todavía no entra en vigencia', 'usuario', 'Carlos Granados', now() - interval '2 days')
) as v (tipo, titulo, detalle, actor_tipo, actor_etiqueta, ocurrido_en)
where exists (select 1 from promo);

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-RESP-BORRADOR'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  ocurrido_en
)
select (select id from org), (select id from promo), v.*
from (
  values
    ('creada', 'Promoción guardada como borrador', null::text, 'usuario', 'Carlos Granados', now() - interval '1 day')
) as v (tipo, titulo, detalle, actor_tipo, actor_etiqueta, ocurrido_en)
where exists (select 1 from promo);
