-- Datos demo del módulo de cupones — un batch por cada uno de los 6
-- orígenes (docs/cupones.md §3), ligados a socios/audiencias/promociones
-- reales del seed existente. Igual que 20260823170000_dashboard_datos_demo.sql:
-- va como migración (no solo `seed.sql`) porque `supabase db push
-- --include-seed` contra el proyecto remoto no deja las filas de
-- `seed.sql` insertadas — `seed.sql` conserva este mismo bloque, palabra
-- por palabra, para que `supabase db reset` (entorno local) siembre lo
-- mismo sin depender de esta migración.
--
-- Códigos y `reference` fijos (no `render_coupon_code`, que tiene un token
-- aleatorio) para que el resultado sea inspeccionable a simple vista y
-- estable entre corridas — mismo criterio que el resto de bloques demo de
-- este proyecto.
--
-- No se generan `created_by`/`authorized_by`/`assigned_by`/`requested_by`:
-- este seed no crea usuarios de `auth.users` (el staff se registra por el
-- flujo real de signup, ver cabecera de seed.sql), así que no hay ningún
-- `profiles.id` real y estable al que referenciar.

-- === 1. Manual · cliente identificado ===
with org as (select id from organizations where slug = 'omni'),
socio as (select id from members where org_id = (select id from org) and email = 'sofia.ramirez@example.com'),
promo as (select id from promociones where org_id = (select id from org) and codigo = 'PROMO-CUPON-BDV')
insert into coupon_batch (
  org_id, reference, name, origin, status, discount_type, discount_value,
  currency, requested_quantity, valid_from, valid_to, promotion_id,
  issue_reason, internal_reference
)
select
  (select id from org), 'EMI-DEMO-0001', 'Bienvenida nueva socia · Sofía Ramírez',
  'manual_customer', 'issued', 'percentage', 15, 'USD', 1,
  now() - interval '10 days', now() + interval '20 days', (select id from promo),
  'Bienvenida a nueva socia Diamante', 'TCK-DEMO-001'
where exists (select 1 from socio)
on conflict (org_id, reference) do nothing;

with org as (select id from organizations where slug = 'omni'),
batch as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0001'),
socio as (select id from members where org_id = (select id from org) and email = 'sofia.ramirez@example.com')
insert into coupon (
  org_id, batch_id, code, sequence, status, member_id, discount_type,
  discount_value, currency, valid_from, valid_to, issued_at, assigned_at, qr_value
)
select
  (select id from org), (select id from batch), 'CUP-BDV-0001', 1, 'assigned',
  (select id from socio), 'percentage', 15, 'USD',
  now() - interval '10 days', now() + interval '20 days',
  now() - interval '10 days', now() - interval '10 days', 'CUP-BDV-0001'
where exists (select 1 from batch)
on conflict (org_id, code) do nothing;

with org as (select id from organizations where slug = 'omni'),
c as (select id from coupon where org_id = (select id from org) and code = 'CUP-BDV-0001'),
socio as (select id from members where org_id = (select id from org) and email = 'sofia.ramirez@example.com')
insert into coupon_assignment (org_id, coupon_id, member_id, role, source, assigned_at)
select (select id from org), (select id from c), (select id from socio), 'holder', 'manual', now() - interval '10 days'
where exists (select 1 from c)
on conflict do nothing;

with org as (select id from organizations where slug = 'omni'),
b as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0001'),
c as (select id from coupon where org_id = (select id from org) and code = 'CUP-BDV-0001')
insert into coupon_event (org_id, coupon_id, batch_id, type, title, actor_type, actor_label, occurred_at)
select * from (
  values
    ((select id from org), null::uuid, (select id from b), 'batch_created', 'Emisión creada', 'user', 'Carlos Granados', now() - interval '10 days'),
    ((select id from org), null::uuid, (select id from b), 'authorization_signed', 'Autorización firmada', 'user', 'Carlos Granados', now() - interval '10 days'),
    ((select id from org), (select id from c), (select id from b), 'issued', 'Cupón emitido', 'system', 'Sistema de cupones', now() - interval '10 days'),
    ((select id from org), (select id from c), (select id from b), 'assigned', 'Asignado a Sofía Ramírez', 'user', 'Carlos Granados', now() - interval '10 days')
) as v (org_id, coupon_id, batch_id, type, title, actor_type, actor_label, occurred_at)
where exists (select 1 from b);

-- === 2. Manual · al portador ===
with org as (select id from organizations where slug = 'omni')
insert into coupon_batch (
  org_id, reference, name, origin, status, discount_type, discount_value,
  currency, requested_quantity, valid_from, valid_to, issue_reason
)
values (
  (select id from org), 'EMI-DEMO-0002', 'Cupón mostrador · ST-0142',
  'manual_bearer', 'issued', 'fixed_amount', 5, 'USD', 1,
  now() - interval '6 days', now() + interval '24 days',
  'Cortesía por incidente en caja'
)
on conflict (org_id, reference) do nothing;

with org as (select id from organizations where slug = 'omni'),
batch as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0002')
insert into coupon (
  org_id, batch_id, code, sequence, status, bearer, discount_type,
  discount_value, currency, valid_from, valid_to, issued_at, qr_value
)
select
  (select id from org), (select id from batch), 'CUP-MSTR-0001', 1, 'issued', true,
  'fixed_amount', 5, 'USD', now() - interval '6 days', now() + interval '24 days',
  now() - interval '6 days', 'CUP-MSTR-0001'
where exists (select 1 from batch)
on conflict (org_id, code) do nothing;

with org as (select id from organizations where slug = 'omni'),
b as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0002')
insert into coupon_event (org_id, batch_id, type, title, actor_type, actor_label, occurred_at)
select (select id from org), (select id from b), 'batch_created', 'Emisión creada', 'user', 'Carlos Granados', now() - interval '6 days'
where exists (select 1 from b);

-- === 3. Canje de puntos ===
with org as (select id from organizations where slug = 'omni'),
socio as (select id from members where org_id = (select id from org) and email = 'camilo.torres@example.com')
insert into coupon_batch (
  org_id, reference, name, origin, status, discount_type, discount_value,
  currency, requested_quantity, points_cost, points_charge_timing, points_rate,
  valid_from, valid_to, issue_reason
)
select
  (select id from org), 'EMI-DEMO-0003', 'Canje de puntos · Camilo Torres',
  'points_redemption', 'issued', 'fixed_amount', 2.04, 'USD', 1,
  1200, 'on_create', 0.0017, now() - interval '3 days', now() + interval '27 days',
  'Canje de puntos solicitado por el socio en tienda'
where exists (select 1 from socio)
on conflict (org_id, reference) do nothing;

with org as (select id from organizations where slug = 'omni'),
batch as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0003'),
socio as (select id from members where org_id = (select id from org) and email = 'camilo.torres@example.com')
insert into coupon (
  org_id, batch_id, code, sequence, status, member_id, discount_type,
  discount_value, currency, points_cost, points_charged_at, valid_from, valid_to,
  issued_at, assigned_at, qr_value
)
select
  (select id from org), (select id from batch), 'CUP-PTS-0001', 1, 'assigned',
  (select id from socio), 'fixed_amount', 2.04, 'USD', 1200, now() - interval '3 days',
  now() - interval '3 days', now() + interval '27 days',
  now() - interval '3 days', now() - interval '3 days', 'CUP-PTS-0001'
where exists (select 1 from batch)
on conflict (org_id, code) do nothing;

with org as (select id from organizations where slug = 'omni'),
c as (select id from coupon where org_id = (select id from org) and code = 'CUP-PTS-0001'),
socio as (select id from members where org_id = (select id from org) and email = 'camilo.torres@example.com')
insert into coupon_assignment (org_id, coupon_id, member_id, role, source, assigned_at)
select (select id from org), (select id from c), (select id from socio), 'holder', 'manual', now() - interval '3 days'
where exists (select 1 from c)
on conflict do nothing;

-- === 4. Batch · audiencia CDP ===
-- `seg_vip_gold` tiene conteo_estimado 3.482 pero solo 3 filas de muestra
-- en `segment_members` (segments.lib: la muestra es curada, no el universo
-- completo) — este batch demuestra exactamente esa limitación real en vez
-- de fingir 3.482 cupones: se solicitan 3.482, se generan 3 (los únicos
-- resolubles hoy) y la emisión se cierra igual, como haría
-- generate_coupon_batch_chunk() en producción.
with org as (select id from organizations where slug = 'omni'),
seg as (select id, conteo_estimado from segments where org_id = (select id from org) and codigo = 'seg_vip_gold')
insert into coupon_batch (
  org_id, reference, name, origin, status, discount_type, discount_value,
  currency, requested_quantity, audience_segment_id, audience_name,
  audience_mode, audience_resolved_at, audience_size_at_issue,
  valid_from, valid_to, issue_reason, generation_started_at, generation_completed_at
)
select
  (select id from org), 'EMI-DEMO-0004', 'Reactivación VIP · nivel Oro',
  'batch_audience', 'issued', 'percentage', 20, 'USD', seg.conteo_estimado,
  seg.id, 'Alto valor · VIP', 'frozen', now() - interval '5 days', seg.conteo_estimado,
  now() - interval '5 days', now() + interval '25 days',
  'Campaña de reactivación para el segmento de mayor valor',
  now() - interval '5 days', now() - interval '5 days' + interval '2 minutes'
from seg
on conflict (org_id, reference) do nothing;

with org as (select id from organizations where slug = 'omni'),
batch as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0004'),
mem as (select email, id from members where org_id = (select id from org))
insert into coupon (
  org_id, batch_id, code, sequence, status, member_id, discount_type,
  discount_value, currency, valid_from, valid_to, issued_at, assigned_at, qr_value
)
select
  (select id from org), (select id from batch), v.code, v.seq, 'assigned',
  (select id from mem where mem.email = v.email), 'percentage', 20, 'USD',
  now() - interval '5 days', now() + interval '25 days',
  now() - interval '5 days', now() - interval '5 days', v.code
from (
  values
    ('CUP-VIP-0001', 1, 'maria.gonzalez@mail.com'),
    ('CUP-VIP-0002', 2, 'sofia.ramirez@example.com'),
    ('CUP-VIP-0003', 3, 'andres.gomez@example.com')
) as v (code, seq, email)
where exists (select 1 from batch)
on conflict (org_id, code) do nothing;

with org as (select id from organizations where slug = 'omni'),
mem as (select email, id from members where org_id = (select id from org)),
c as (select code, id from coupon where org_id = (select id from org) and code like 'CUP-VIP-%')
insert into coupon_assignment (org_id, coupon_id, member_id, role, source, assigned_at)
select (select id from org), c.id, mem.id, 'holder', 'manual', now() - interval '5 days'
from (
  values ('CUP-VIP-0001', 'maria.gonzalez@mail.com'), ('CUP-VIP-0002', 'sofia.ramirez@example.com'), ('CUP-VIP-0003', 'andres.gomez@example.com')
) as v (code, email)
join c on c.code = v.code
join mem on mem.email = v.email
on conflict do nothing;

with org as (select id from organizations where slug = 'omni'),
b as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0004')
insert into coupon_event (org_id, batch_id, type, title, detail, actor_type, actor_label, occurred_at)
select * from (
  values
    ((select id from org), (select id from b), 'batch_created', 'Emisión creada', null, 'user', 'Carlos Granados', now() - interval '5 days'),
    ((select id from org), (select id from b), 'generation_started', 'Generación iniciada', null, 'system', 'Sistema de cupones', now() - interval '5 days'),
    ((select id from org), (select id from b), 'generation_completed', 'Generación completada', 'Muestra agotada: 3 de 3.482 estimados resueltos hoy.', 'system', 'Sistema de cupones', now() - interval '5 days' + interval '2 minutes')
) as v (org_id, batch_id, type, title, detail, actor_type, actor_label, occurred_at)
where exists (select 1 from b);

-- Uno de los cupones VIP ya se canjeó en tienda — ilustra "Uso y redención" del detalle.
with org as (select id from organizations where slug = 'omni')
update coupon
set status = 'redeemed', redeemed_at = now() - interval '1 day', uses_count = 1
where org_id = (select id from org) and code = 'CUP-VIP-0003' and status = 'assigned';

with org as (select id from organizations where slug = 'omni'),
c as (select id from coupon where org_id = (select id from org) and code = 'CUP-VIP-0003'),
tienda as (select id from tiendas where org_id = (select id from org) and codigo_tienda = 'ST-0151'),
mem as (select id from members where org_id = (select id from org) and email = 'andres.gomez@example.com')
insert into coupon_redemption (org_id, coupon_id, member_id, tienda_id, order_amount, discount_applied, result, channel, occurred_at)
select (select id from org), (select id from c), (select id from mem), (select id from tienda), 42.90, 8.58, 'applied', 'pos', now() - interval '1 day'
where exists (select 1 from c)
on conflict do nothing;

with org as (select id from organizations where slug = 'omni'),
b as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0004'),
c as (select id from coupon where org_id = (select id from org) and code = 'CUP-VIP-0003')
insert into coupon_event (org_id, coupon_id, batch_id, type, title, actor_type, actor_label, occurred_at)
select (select id from org), (select id from c), (select id from b), 'redeemed', 'Cupón canjeado en tienda', 'store', 'POS · ST-0151', now() - interval '1 day'
where exists (select 1 from c);

-- === 5. Batch · lote anónimo ===
with org as (select id from organizations where slug = 'omni'),
tienda as (select id from tiendas where org_id = (select id from org) and codigo_tienda = 'ST-0142')
insert into coupon_batch (
  org_id, reference, name, origin, status, discount_type, discount_value,
  currency, requested_quantity, store_ids, delivery_channels,
  valid_from, valid_to, issue_reason, generation_started_at, generation_completed_at
)
select
  (select id from org), 'EMI-DEMO-0005', 'Lote impreso · feria comercial',
  'batch_anonymous', 'issued', 'fixed_amount', 3, 'USD', 20,
  array[tienda.id], array['print'], now() - interval '15 days', now() + interval '15 days',
  'Material impreso para la feria comercial de agosto',
  now() - interval '15 days', now() - interval '15 days' + interval '1 minute'
from tienda
on conflict (org_id, reference) do nothing;

with org as (select id from organizations where slug = 'omni'),
batch as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0005')
insert into coupon (
  org_id, batch_id, code, sequence, status, bearer, discount_type,
  discount_value, currency, valid_from, valid_to, issued_at, printed_at, print_count, qr_value
)
select
  (select id from org), (select id from batch),
  'CUP-FERIA-' || lpad(g::text, 4, '0'), g, 'issued', true,
  'fixed_amount', 3, 'USD', now() - interval '15 days', now() + interval '15 days',
  now() - interval '15 days',
  case when g <= 10 then now() - interval '14 days' else null end,
  case when g <= 10 then 1 else 0 end,
  'CUP-FERIA-' || lpad(g::text, 4, '0')
from generate_series(1, 20) as g
where exists (select 1 from batch)
on conflict (org_id, code) do nothing;

with org as (select id from organizations where slug = 'omni'),
b as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0005')
insert into coupon_print_job (org_id, batch_id, sequence_from, sequence_to, layout, page_count, status, created_at)
select (select id from org), (select id from b), 1, 10, 'grid_8', 2, 'ready', now() - interval '14 days'
where exists (select 1 from b);

with org as (select id from organizations where slug = 'omni'),
b as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0005')
insert into coupon_event (org_id, batch_id, type, title, actor_type, actor_label, occurred_at)
select * from (
  values
    ((select id from org), (select id from b), 'batch_created', 'Emisión creada', 'user', 'Carlos Granados', now() - interval '15 days'),
    ((select id from org), (select id from b), 'generation_completed', 'Generación completada: 20 códigos', 'system', 'Sistema de cupones', now() - interval '15 days' + interval '1 minute'),
    ((select id from org), (select id from b), 'printed', 'Impresos códigos 1-10 (cuadrícula 8)', 'user', 'Carlos Granados', now() - interval '14 days')
) as v (org_id, batch_id, type, title, actor_type, actor_label, occurred_at)
where exists (select 1 from b);

-- === 6. Importar CSV ===
with org as (select id from organizations where slug = 'omni')
insert into coupon_import_file (org_id, filename, row_count, matched_count, unmatched_count, column_mapping, uploaded_at)
values (
  (select id from org), 'campana_aniversario.csv', 4, 3, 1,
  '{"email": 0}'::jsonb, now() - interval '2 days'
)
on conflict do nothing;

with org as (select id from organizations where slug = 'omni'),
file as (select id from coupon_import_file where org_id = (select id from org) and filename = 'campana_aniversario.csv')
insert into coupon_batch (
  org_id, reference, name, origin, status, discount_type, discount_value,
  currency, requested_quantity, csv_file_id, valid_from, valid_to, issue_reason
)
select
  (select id from org), 'EMI-DEMO-0006', 'Importación campaña aniversario',
  'csv_import', 'issued', 'percentage', 10, 'USD', 4, file.id,
  now() - interval '2 days', now() + interval '28 days',
  'Campaña de aniversario — lista de clientes frecuentes'
from file
on conflict (org_id, reference) do nothing;

with org as (select id from organizations where slug = 'omni'),
batch as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0006'),
mem as (select email, id from members where org_id = (select id from org))
insert into coupon (
  org_id, batch_id, code, sequence, status, member_id, bearer, discount_type,
  discount_value, currency, valid_from, valid_to, issued_at, assigned_at, qr_value
)
select
  (select id from org), (select id from batch), v.code, v.seq,
  case when v.email is null then 'issued' else 'assigned' end,
  (select id from mem where mem.email = v.email), v.email is null,
  'percentage', 10, 'USD', now() - interval '2 days', now() + interval '28 days',
  now() - interval '2 days',
  case when v.email is not null then now() - interval '2 days' end,
  v.code
from (
  values
    ('CUP-ANIV-0001', 1, 'valentina.rios@example.com'),
    ('CUP-ANIV-0002', 2, 'mariana.ocampo@example.com'),
    ('CUP-ANIV-0003', 3, 'julian.restrepo@example.com'),
    ('CUP-ANIV-0004', 4, null)
) as v (code, seq, email)
where exists (select 1 from batch)
on conflict (org_id, code) do nothing;

with org as (select id from organizations where slug = 'omni'),
mem as (select email, id from members where org_id = (select id from org)),
c as (select code, id from coupon where org_id = (select id from org) and code like 'CUP-ANIV-%')
insert into coupon_assignment (org_id, coupon_id, member_id, role, source, assigned_at)
select (select id from org), c.id, mem.id, 'holder', 'csv', now() - interval '2 days'
from (
  values ('CUP-ANIV-0001', 'valentina.rios@example.com'), ('CUP-ANIV-0002', 'mariana.ocampo@example.com'), ('CUP-ANIV-0003', 'julian.restrepo@example.com')
) as v (code, email)
join c on c.code = v.code
join mem on mem.email = v.email
on conflict do nothing;

with org as (select id from organizations where slug = 'omni'),
b as (select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-DEMO-0006')
insert into coupon_event (org_id, batch_id, type, title, actor_type, actor_label, occurred_at)
select * from (
  values
    ((select id from org), (select id from b), 'batch_created', 'Emisión creada', 'user', 'Carlos Granados', now() - interval '2 days'),
    ((select id from org), (select id from b), 'generation_completed', 'Generación completada: 3 coincidencias, 1 al portador', 'system', 'Sistema de cupones', now() - interval '2 days')
) as v (org_id, batch_id, type, title, actor_type, actor_label, occurred_at)
where exists (select 1 from b);
