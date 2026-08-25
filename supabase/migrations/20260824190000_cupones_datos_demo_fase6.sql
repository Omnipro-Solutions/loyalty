-- Datos demo adicionales para la Fase 6 del módulo de cupones (generación
-- por chunks + timeline completo de 13.4). Va como migración nueva, no como
-- edición de 20260824130000_cupones_datos_demo.sql: esa ya está aplicada en
-- el remoto y el CLI no reaplica un archivo de migración ya marcado como
-- aplicado aunque su contenido cambie (mismo motivo documentado en
-- 20260822220100_reparar_rls.sql). `seed.sql` conserva este mismo bloque,
-- palabra por palabra, para `supabase db reset` en un entorno local.

-- === 7. Batch · lote anónimo, generación en curso ===
-- 22 de 50 códigos generados — el mismo estado en el que quedaría un batch
-- grande si la pestaña se cerró a medias (sin worker/cola en este proyecto,
-- la generación depende de una pestaña abierta). `/cupones/emisiones/[id]`
-- la retoma.
with org as (select id from organizations where slug = 'omni')
insert into coupon_batch (
  org_id, reference, name, origin, status, discount_type, discount_value,
  currency, requested_quantity, valid_from, valid_to, issue_reason,
  generation_started_at
)
values (
  (select id from org), 'EMI-DEMO-0007', 'Lote de bienvenida · otoño',
  'batch_anonymous', 'generating', 'percentage', 12, 'USD', 50,
  now() - interval '1 day', now() + interval '29 days',
  'Material impreso para activación de otoño',
  now() - interval '50 minutes'
)
on conflict (org_id, reference) do nothing;

with org as (select id from organizations where slug = 'omni'),
batch as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0007')
insert into coupon (
  org_id, batch_id, code, sequence, status, bearer, discount_type,
  discount_value, currency, valid_from, valid_to, issued_at, qr_value
)
select
  (select id from org), (select id from batch),
  'CUP-OTO-' || lpad(g::text, 4, '0'), g, 'issued', true,
  'percentage', 12, 'USD', now() - interval '1 day', now() + interval '29 days',
  now() - interval '50 minutes', 'CUP-OTO-' || lpad(g::text, 4, '0')
from generate_series(1, 22) as g
where exists (select 1 from batch)
on conflict (org_id, code) do nothing;

with org as (select id from organizations where slug = 'omni'),
b as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0007')
insert into coupon_event (org_id, batch_id, type, title, actor_type, actor_label, occurred_at)
select * from (
  values
    ((select id from org), (select id from b), 'batch_created', 'Emisión creada', 'user', 'Carlos Granados', now() - interval '1 day'),
    ((select id from org), (select id from b), 'authorization_signed', 'Autorización firmada', 'user', 'Carlos Granados', now() - interval '1 day'),
    ((select id from org), (select id from b), 'generation_started', 'Generación iniciada', 'system', 'Sistema de cupones', now() - interval '50 minutes')
) as v (org_id, batch_id, type, title, actor_type, actor_label, occurred_at)
where exists (select 1 from b);

-- Timeline completo de 13.4 sobre CUP-BDV-0001 (delivered/viewed no llegan
-- de un sender real — se siembran como datos demo, ver COUPON_EVENT_TYPES
-- en src/types/domain.ts).
with org as (select id from organizations where slug = 'omni'),
b as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0001'),
c as (select id from coupon where org_id = (select id from org) and code = 'CUP-BDV-0001')
insert into coupon_event (org_id, coupon_id, batch_id, type, title, detail, actor_type, actor_label, occurred_at)
select * from (
  values
    ((select id from org), (select id from c), (select id from b), 'delivered', 'Enviado por email', 'Proveedor externo (simulado)', 'system', 'Sistema de cupones', now() - interval '9 days' - interval '23 hours'),
    ((select id from org), (select id from c), (select id from b), 'viewed', 'Cupón visualizado', 'Abierto desde el email', 'system', 'Sistema de cupones', now() - interval '9 days' - interval '20 hours')
) as v (org_id, coupon_id, batch_id, type, title, detail, actor_type, actor_label, occurred_at)
where exists (select 1 from c);
