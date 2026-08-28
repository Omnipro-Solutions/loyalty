-- Cierra tres huecos que dejan medio portal sin nada que enseñar:
--
--   1. Cuatro de las trece mecánicas no tienen NI UNA promoción
--      (`descuento_monto_fijo`, `multiplicador_puntos`, `emitir_cupon`,
--      `cashback`), así que sus KPI de mecánica no es que salgan vacíos: es
--      que no existe la fila que los llenaría. Y no había ningún 2x3 sobre
--      SKU concretos del catálogo, que es la mecánica que más se demuestra.
--   2. Los flujos del builder existentes no cubren los tres escenarios que
--      cruzan módulos —cupón, promoción y puntos— con vigencias y variables
--      distintas, así que la analítica del builder no tiene recorridos que
--      comparar.
--   3. Faltaban los LOGS que relacionan todo eso: sin canjes con metadatos
--      por mecánica, sin movimientos de puntos y sin corridas, los paneles
--      calculan sobre la nada y muestran "—" en todo.
--
-- Determinismo: siempre `hashtext(<prefijo> || id) % N`, el patrón del resto
-- del seed. Dos corridas producen exactamente los mismos números, que es lo
-- que hace repetible una demo.
--
-- Idempotencia: cada bloque va guardado por `not exists` sobre su clave
-- natural (código de promoción, referencia de emisión, nombre de flujo), así
-- que aplicarla dos veces no duplica nada.
--
-- Fechas: creación y actividad entre el 1 de julio y el 27 de agosto de
-- 2026 — el rango que los filtros de período del panel usan por defecto.
-- Las únicas fechas futuras son `vigente_hasta` y `valid_to`: el fin de
-- vigencia de algo que sigue activo. Nada OCURRE en el futuro.
--
-- Antes de sembrar, el bloque 0 repara justo eso en los datos que ya
-- existen.

-- ── 0. Reparación: redenciones fechadas en el futuro ────────────────────
--
-- `20260827230000_bitacora_transaccional_sistema.sql` calculaba la fecha de
-- redención como `greatest(valid_from, now() - 25 días) + hasta 17 días`.
-- Para los cupones cuyo `valid_from` es reciente —los lotes de aniversario y
-- VIP se emitieron esta semana— ese `greatest` devuelve `valid_from`, y
-- sumarle hasta 17 días aterriza DESPUÉS de hoy: tres cupones quedaron
-- "redimidos" con fecha de septiembre.
--
-- El origen ya está corregido en aquella migración (un `least(..., now() -
-- 2 horas)`), pero eso solo protege a las bases nuevas. Esto arregla las que
-- ya la aplicaron.
--
-- `coupon_event` es append-only para `authenticated` (ver
-- `20260824120000_cupones_evento_append_only.sql`), pero ese `revoke` no
-- alcanza al rol que ejecuta las migraciones — que es justo la excepción por
-- la que una corrección como esta puede existir.
update coupon_event ce
set occurred_at = now() - ((abs(hashtext('fixfecha' || ce.id::text)) % 72) || ' hours')::interval
where ce.type = 'redeemed' and ce.occurred_at > now();

-- El estado sigue al evento, no al revés: si la fila del cupón se quedara
-- con la fecha futura y su bitácora con la corregida, las dos pantallas
-- dirían cosas distintas del mismo cupón.
update coupon c
set redeemed_at = (
  select min(ce.occurred_at) from coupon_event ce
  where ce.coupon_id = c.id and ce.type = 'redeemed'
)
where c.redeemed_at > now()
  and exists (
    select 1 from coupon_event ce
    where ce.coupon_id = c.id and ce.type = 'redeemed'
  );

-- Red de seguridad para cualquier otro cupón fechado en el futuro sin evento
-- que lo respalde (no debería haberlos hoy, pero un dato imposible que se
-- cuela una vez se cuela dos).
update coupon
set redeemed_at = now() - interval '3 hours'
where redeemed_at > now();

-- ── 1. Promociones de las mecánicas que faltaban ─────────────────────────

-- 1.1 · 2x3 sobre analgésicos (lleva 3, paga 2) — acotado a DOS SKU reales
-- del catálogo por condición de producto, no a una categoría entera: es lo
-- que distingue un 2x3 negociado con el laboratorio de una promoción de
-- catálogo abierto.
--
-- OJO con el código: `20260827220000_promociones_kpi_mecanicas.sql` —que en
-- este momento NO está aplicada en el remoto— crea una promoción con el
-- MISMO código `PROMO-3X2-ANALG`, pero sobre un solo SKU, sin límite de
-- piezas y con vigencia relativa a `current_date`. Las dos usan guardas, así
-- que la segunda en correr no duplica ni falla; pero eso significa que el
-- resultado dependería del orden de aplicación. Por eso aquí hay INSERT
-- **y** UPDATE: la fila queda con esta forma exacta corra la que corra
-- primero.
--
-- `alcance_piezas` va en 'mismo_producto' y no en 'producto_especifico': el
-- universo son dos SKU y el 3x2 se cumple dentro de cada uno, sin mezclar
-- entre ellos (de ahí también `mezcla_en_universo = false`).
--
-- Lleva límite de piezas por socio a propósito: entregar producto físico sin
-- tope es un canal de abasto para terceros (regla S03 del documento de
-- modalidades, que el formulario exige y el seed no debería saltarse).
with org as (select id from organizations where slug = 'omni'),
skus as (
  select array_agg(id::text order by sku) as ids
  from productos
  where org_id = (select id from org) and sku in ('FAR-70241', 'FAR-70388')
)
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio,
  compra_cantidad, paga_cantidad, alcance_piezas, descuento_unidad_extra_pct,
  mezcla_en_universo, criterio_seleccion_piezas,
  aplicar_sobre, limites,
  naturaleza_costo, financiador, porcentaje_costo_proveedor,
  periodo_liquidacion, contrato_id, umbral_alerta_presupuesto_pct,
  proveedor_id,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  '2x3 en analgésicos', 'PROMO-3X2-ANALG', 'cantidad', 4, false, 'pos_ecommerce',
  jsonb_build_object(
    'combinador', 'todas',
    'condiciones', jsonb_build_array(
      jsonb_build_object('campo', 'producto', 'valor', to_jsonb((select ids from skus)))
    )
  ),
  'por_piezas',
  3, 2, 'mismo_producto', 100,
  false, 'menor_precio',
  'subtotal_carrito',
  jsonb_build_array(jsonb_build_object(
    'unidad', 'piezas', 'sujeto', 'socio', 'ventana', 'mes_calendario',
    'tope', 6, 'alExceder', 'descartar'
  )),
  'costo_producto', 'laboratorio_proveedor', 65,
  'mensual', 'CTR-2026-LIOMONT-3X2', 80,
  (select id from proveedores where org_id = (select id from org) and nombre like 'Laboratorios Liomont%' limit 1),
  9800000, 6140000, 412, 3.42,
  'activa', date '2026-07-05', date '2026-09-30', timestamptz '2026-07-03 09:20:00-05'
where (select ids from skus) is not null
on conflict (org_id, codigo) do nothing;

-- Normaliza la fila a la forma pedida, exista de antes o la acabemos de
-- crear: dos SKU, tope de piezas y fechas de julio/agosto.
with org as (select id from organizations where slug = 'omni'),
skus as (
  select array_agg(id::text order by sku) as ids
  from productos
  where org_id = (select id from org) and sku in ('FAR-70241', 'FAR-70388')
)
update promociones set
  nombre = '2x3 en analgésicos',
  tipo = 'cantidad',
  canal_aplicacion = 'pos_ecommerce',
  condiciones = jsonb_build_object(
    'combinador', 'todas',
    'condiciones', jsonb_build_array(
      jsonb_build_object('campo', 'producto', 'valor', to_jsonb((select ids from skus)))
    )
  ),
  compra_cantidad = 3,
  paga_cantidad = 2,
  alcance_piezas = 'mismo_producto',
  producto_comprado_id = null,
  descuento_unidad_extra_pct = 100,
  mezcla_en_universo = false,
  criterio_seleccion_piezas = 'menor_precio',
  limites = jsonb_build_array(jsonb_build_object(
    'unidad', 'piezas', 'sujeto', 'socio', 'ventana', 'mes_calendario',
    'tope', 6, 'alExceder', 'descartar'
  )),
  estado_publicacion = 'activa',
  vigente_desde = date '2026-07-05',
  vigente_hasta = date '2026-09-30',
  creado_en = timestamptz '2026-07-03 09:20:00-05'
where org_id = (select id from org)
  and codigo = 'PROMO-3X2-ANALG'
  and (select ids from skus) is not null;

-- 1.2 · Descuento de monto fijo — la única de las tres mecánicas de
-- descuento que no tenía ninguna fila.
with org as (select id from organizations where slug = 'omni'),
cat as (
  select id from categorias where org_id = (select id from org) and nombre = 'Dermocosmética' limit 1
)
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio, valor_beneficio, tope_maximo, aplicar_sobre,
  limites, naturaleza_costo, financiador, umbral_alerta_presupuesto_pct,
  nivel_aplicacion, aplica_sobre_precio,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  '$8.000 de descuento en dermocosmética', 'PROMO-FIJO-DERMO', 'categoria', 5, true, 'pos_ecommerce',
  jsonb_build_object(
    'combinador', 'todas',
    'condiciones', jsonb_build_array(
      jsonb_build_object('campo', 'categoria', 'valor', jsonb_build_array((select id from cat))),
      jsonb_build_object('campo', 'monto_carrito', 'valor', 60000)
    )
  ),
  'descuento_monto_fijo', 8000, 8000, 'subtotal_carrito',
  jsonb_build_array(jsonb_build_object(
    'unidad', 'veces', 'sujeto', 'socio', 'ventana', 'semana',
    'tope', 1, 'alExceder', 'descartar'
  )),
  'margen_sacrificado', 'retailer', 75,
  'ticket', 'vigente',
  6500000, 3120000, 389, 2.18,
  'activa', date '2026-07-12', date '2026-10-15', timestamptz '2026-07-10 15:40:00-05'
where not exists (
  select 1 from promociones where org_id = (select id from org) and codigo = 'PROMO-FIJO-DERMO'
) and (select id from cat) is not null;

-- 1.3 · Multiplicador de puntos por nivel. `modo_resolucion_multiplicador`
-- va en 'gana_mayor' y no en 'exponencial' a propósito: el documento de
-- modalidades marca el modo exponencial como la opción de mayor riesgo del
-- catálogo, así que nunca es el default de una demo.
with org as (select id from organizations where slug = 'omni')
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio,
  multiplicador_puntos, niveles_requeridos, modo_resolucion_multiplicador,
  tipo_saldo, momento_acreditacion, estado_inicial, tope_maximo,
  aplicar_sobre, limites, naturaleza_costo, financiador,
  umbral_alerta_presupuesto_pct, descuento_acumula_puntos,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  'Puntos x3 para Oro y Diamante', 'PROMO-MULTI-X3', 'segmento', 3, true, 'pos_ecommerce',
  jsonb_build_object(
    'combinador', 'todas',
    'condiciones', jsonb_build_array(
      jsonb_build_object(
        'campo', 'socio_nivel',
        'valor', (
          select to_jsonb(array_agg(id order by nombre))
          from tiers where org_id = (select id from org) and nombre in ('oro', 'diamante')
        )
      )
    )
  ),
  'multiplicador_puntos',
  3, array['oro', 'diamante']::text[], 'gana_mayor',
  'canjeable', 'inmediato', 'disponible', 4000,
  'subtotal_carrito',
  jsonb_build_array(jsonb_build_object(
    'unidad', 'puntos', 'sujeto', 'socio', 'ventana', 'mes_calendario',
    'tope', 12000, 'alExceder', 'degradar'
  )),
  'ingreso_diferido', 'retailer', 85, true,
  7200000, 4980000, 623, 4.06,
  'activa', date '2026-07-20', date '2026-09-20', timestamptz '2026-07-18 11:05:00-05'
where not exists (
  select 1 from promociones where org_id = (select id from org) and codigo = 'PROMO-MULTI-X3'
);

-- 1.4 · Cashback. Es la única mecánica con BREAKAGE —saldo emitido que
-- vence sin usarse—, y sin una fila sembrada ese KPI no se podía enseñar.
with org as (select id from organizations where slug = 'omni'),
cat as (
  select id from categorias where org_id = (select id from org) and nombre = 'Dermocosmética' limit 1
)
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio, valor_beneficio, tipo_monedero,
  disponibilidad_dias, vigencia_saldo_dias, monto_minimo_canje,
  aplicar_sobre, limites, naturaleza_costo, financiador,
  umbral_alerta_presupuesto_pct,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  'Cashback 12 % en protección solar', 'PROMO-CASHBACK-SOLAR', 'carrito', 6, false, 'ecommerce',
  jsonb_build_object(
    'combinador', 'todas',
    'condiciones', jsonb_build_array(
      jsonb_build_object('campo', 'categoria', 'valor', jsonb_build_array((select id from cat))),
      jsonb_build_object('campo', 'monto_carrito', 'valor', 45000)
    )
  ),
  'cashback', 12, 'porcentaje',
  2, 60, 10000,
  'subtotal_carrito',
  jsonb_build_array(jsonb_build_object(
    'unidad', 'monto', 'sujeto', 'socio', 'ventana', 'campana',
    'tope', 40000, 'alExceder', 'aplicar_parcial'
  )),
  'saldo_efectivo', 'compartido', 70,
  5400000, 2260000, 271, 1.86,
  'activa', date '2026-08-01', date '2026-10-31', timestamptz '2026-07-29 16:15:00-05'
where not exists (
  select 1 from promociones where org_id = (select id from org) and codigo = 'PROMO-CASHBACK-SOLAR'
) and (select id from cat) is not null;

-- El escalonado existía en borrador: sin publicar no entra en ningún panel,
-- y su distribución por escalón es de los desgloses más ilustrativos.
update promociones
set estado_publicacion = 'activa',
    -- El borrador se creo a mano el 25 de agosto; al publicarlo con vigencia
    -- del 8 de julio, su alta tiene que moverse con el, o sus canjes quedan
    -- antes de que la promocion existiera.
    creado_en = timestamptz '2026-07-06 10:00:00-05',
    vigente_desde = date '2026-07-08',
    vigente_hasta = date '2026-09-30',
    presupuesto_asignado = greatest(presupuesto_asignado, 4200000),
    presupuesto_consumido = greatest(presupuesto_consumido, 2510000),
    roi = coalesce(roi, 2.64)
where codigo = 'PROMO-ESC-VIT2' and estado_publicacion = 'borrador';

-- ── 2. Emisión de cupones + la promoción que la dispara ──────────────────
--
-- El orden importa: `emitir_cupon` referencia una `coupon_batch` existente
-- (es su "plantilla"), así que la emisión se crea primero. Sin este par, el
-- embudo de cupones del panel no tiene ninguna emisión enlazada a una
-- promoción y el bloque entero no se pinta.

with org as (select id from organizations where slug = 'omni')
insert into coupon_batch (
  org_id, reference, name, origin, status,
  discount_type, discount_value, discount_cap, min_purchase_amount,
  max_uses_per_coupon, max_coupons_per_person,
  code_prefix, code_pattern, valid_from, valid_to,
  requested_quantity, delivery_channels,
  issue_reason, internal_reference, requires_approval,
  generation_started_at, generation_completed_at, created_at
)
select
  (select id from org),
  'EMI-2026-0900', 'Cupón $15.000 por umbral de puntos', 'points_redemption', 'issued',
  'fixed_amount', 15000, null, 50000,
  1, 2,
  'PTS', 'PTS-AAAA-NNNN', timestamptz '2026-07-15 00:00:00-05', timestamptz '2026-10-15 23:59:59-05',
  180, array['email']::text[],
  'Canje automático del umbral de 2.000 puntos del programa de lealtad.',
  'REQ-2026-PTS-15K', false,
  timestamptz '2026-07-15 06:00:00-05', timestamptz '2026-07-15 06:04:00-05',
  timestamptz '2026-07-14 17:30:00-05'
where not exists (
  select 1 from coupon_batch where org_id = (select id from org) and reference = 'EMI-2026-0900'
);

with org as (select id from organizations where slug = 'omni'),
lote as (
  select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-2026-0900'
)
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio,
  coupon_batch_id, motivo_emision, umbral_puntos, duracion_cupon_dias,
  momento_debito_puntos, devolucion_si_vence,
  evento_gatillo, momento_resolucion, frecuencia_disparo,
  aplicar_sobre, limites, naturaleza_costo, financiador,
  umbral_alerta_presupuesto_pct,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  'Cupón $15.000 al cruzar 2.000 puntos', 'PROMO-CUPON-PTS', 'cupon', 5, false, 'pos_ecommerce',
  jsonb_build_object('combinador', 'todas', 'condiciones', jsonb_build_array()),
  'emitir_cupon',
  (select id from lote),
  'Canje automático del umbral de puntos declarado en el reglamento del programa.',
  2000, 90,
  -- El cupón se financia con puntos del socio: declarar cuándo se debitan es
  -- obligatorio (S09/S18). 'al_emitir' es el que deja el saldo cuadrado
  -- desde el primer día.
  'al_emitir', true,
  'redencion_cupon', 'al_ocurrir', 'cada_vez',
  'subtotal_carrito',
  jsonb_build_array(jsonb_build_object(
    'unidad', 'cupones', 'sujeto', 'socio', 'ventana', 'mes_calendario',
    'tope', 2, 'alExceder', 'descartar'
  )),
  'ingreso_diferido', 'retailer', 80,
  4800000, 2700000, 180, 2.95,
  'activa', date '2026-07-15', date '2026-10-15', timestamptz '2026-07-14 18:00:00-05'
where not exists (
  select 1 from promociones where org_id = (select id from org) and codigo = 'PROMO-CUPON-PTS'
) and (select id from lote) is not null;

-- 180 cupones con una mezcla realista de estados. El reparto sale del
-- `hashtext` de la secuencia, así que es estable entre corridas.
--
-- Ojo con `vencido`: NO es un estado almacenable (`coupon.status` solo
-- admite draft/issued/assigned/redeemed/cancelled). Un cupón vencido es uno
-- vivo cuya `valid_to` ya pasó — la app lo deriva al leerlo. Por eso el
-- reparto calcula primero una "intención" y de ahí saca el estado real y la
-- fecha de vigencia, en vez de intentar guardar la palabra.
with org as (select id from organizations where slug = 'omni'),
lote as (
  select id, valid_from, valid_to, discount_type, discount_value, min_purchase_amount
  from coupon_batch where org_id = (select id from org) and reference = 'EMI-2026-0900'
),
socios as (
  select id, row_number() over (order by id) - 1 as idx, count(*) over () as total
  from members where org_id = (select id from org)
),
serie as (
  select
    n,
    case
      when abs(hashtext('st' || n::text)) % 100 < 40 then 'redimido'
      when abs(hashtext('st' || n::text)) % 100 < 58 then 'vencido'
      when abs(hashtext('st' || n::text)) % 100 < 62 then 'anulado'
      when abs(hashtext('st' || n::text)) % 100 < 74 then 'sin_asignar'
      else 'asignado'
    end as intencion
  from generate_series(1, 180) as n
),
plan as (
  select
    serie.n,
    serie.intencion,
    case serie.intencion
      when 'redimido' then 'redeemed'
      when 'anulado' then 'cancelled'
      when 'sin_asignar' then 'issued'
      else 'assigned'
    end as estado
  from serie
)
insert into coupon (
  org_id, batch_id, code, sequence, status, member_id, bearer,
  discount_type, discount_value, min_purchase_amount,
  max_uses, uses_count, points_cost, points_charged_at,
  valid_from, valid_to, issued_at, assigned_at, redeemed_at, cancelled_at,
  cancel_reason_code, cancel_reason_note, qr_value, created_at
)
select
  (select id from org),
  (select id from lote),
  'PTS-' || upper(substr(md5('pts' || plan.n::text), 1, 4)) || '-' || lpad(plan.n::text, 4, '0'),
  plan.n,
  plan.estado,
  case when plan.estado = 'issued' then null
       else (select id from socios where idx = abs(hashtext('cm' || plan.n::text)) % (select total from socios limit 1)) end,
  false,
  (select discount_type from lote), (select discount_value from lote), (select min_purchase_amount from lote),
  1,
  case when plan.estado = 'redeemed' then 1 else 0 end,
  2000,
  case when plan.estado = 'issued' then null else timestamptz '2026-07-15 06:04:00-05' end,
  (select valid_from from lote),
  case when plan.intencion = 'vencido'
       then timestamptz '2026-08-10 23:59:59-05'
       else (select valid_to from lote) end,
  timestamptz '2026-07-15 06:04:00-05',
  case when plan.estado = 'issued' then null else timestamptz '2026-07-15 06:05:00-05' end,
  case when plan.estado = 'redeemed'
       then timestamptz '2026-07-16 00:00:00-05' + ((abs(hashtext('cr' || plan.n::text)) % 40) || ' days')::interval
       else null end,
  case when plan.estado = 'cancelled' then timestamptz '2026-08-02 10:00:00-05' else null end,
  case when plan.estado = 'cancelled' then 'issued_in_error' else null end,
  case when plan.estado = 'cancelled' then 'Emisión duplicada detectada en la conciliación de julio.' else null end,
  'https://loyalty.omni.pro/c/' || md5('qr' || plan.n::text),
  timestamptz '2026-07-15 06:04:00-05'
from plan
where exists (select 1 from lote)
  and exists (select 1 from socios)
  and not exists (select 1 from coupon c where c.batch_id = (select id from lote));

-- ── 3. Flujos del builder ────────────────────────────────────────────────
--
-- Tres escenarios que cruzan módulos distintos, con vigencias, prioridades y
-- exclusividades DIFERENTES a propósito: dos reglas que escuchan el mismo
-- evento con la misma prioridad dentro del mismo grupo de exclusión dejan el
-- desempate al orden de evaluación del POS (regla S13), y una demo donde
-- todas las reglas se parecen no deja ver ese problema.
--
--   · Cupón    — alta de socio → condición → emitir cupón → email
--   · Promoción— carrito abandonado → espera → aplicar promoción → email
--   · Puntos   — compra pagada → acumular puntos → cambio de nivel
--
-- El grafo se inserta nodo a nodo con `etiqueta` estable: es la clave por la
-- que las aristas y los pasos de la corrida lo vuelven a encontrar sin
-- necesidad de generar los UUID por fuera.

with org as (select id from organizations where slug = 'omni'),
nuevos (nombre, descripcion, prioridad, exclusividad, grupo, desde, hasta, creado) as (
  values
    ('Cupón de bienvenida por alta',
     'Emite un cupón de $15.000 al socio nuevo que completa su perfil.',
     3, 'exclusiva', 'bienvenida', date '2026-07-06', date '2026-09-30', timestamptz '2026-07-04 10:00:00-05'),
    ('Rescate de carrito abandonado',
     'Espera 2 días y aplica la promoción de dermocosmética a quien dejó el carrito.',
     6, 'acumulable', null, date '2026-07-22', date '2026-10-22', timestamptz '2026-07-21 12:30:00-05'),
    ('Puntos x3 y ascenso de nivel',
     'Multiplica los puntos de la compra y evalúa el ascenso de nivel del socio.',
     3, 'exclusiva', 'bienvenida', date '2026-08-03', null, timestamptz '2026-08-01 09:15:00-05')
)
insert into workflows (
  org_id, nombre, descripcion, estado, version_actual,
  prioridad, exclusividad, grupo_exclusividad,
  vigente_desde, vigente_hasta, creado_en, actualizado_en
)
select
  (select id from org), n.nombre, n.descripcion, 'activa', 1,
  n.prioridad, n.exclusividad, n.grupo,
  n.desde, n.hasta, n.creado, n.creado
from nuevos n
where not exists (
  select 1 from workflows w
  where w.org_id = (select id from org) and w.nombre = n.nombre
);

-- Nodos. `posicion_x` va en saltos de 260 porque es lo que el canvas usa
-- entre bloques encadenados; la analítica los ordena por topología real
-- (`workflow_edges`), no por posición, pero abrir el flujo en el builder y
-- verlo amontonado sería un mal primer contacto.
with org as (select id from organizations where slug = 'omni'),
wf as (
  select id, nombre from workflows
  where org_id = (select id from org)
    and nombre in ('Cupón de bienvenida por alta', 'Rescate de carrito abandonado', 'Puntos x3 y ascenso de nivel')
),
lote as (
  select id from coupon_batch where org_id = (select id from org) and reference = 'EMI-2026-0900'
),
promo_dermo as (
  select id from promociones where org_id = (select id from org) and codigo = 'PROMO-FIJO-DERMO'
),
defs (flujo, orden, tipo, etiqueta, config) as (
  values
    -- Escenario cupón
    ('Cupón de bienvenida por alta', 0, 'evento', 'Alta de socio',
     '{"dominio":"cliente","evento_id":"member.enrolled","modo_disparo":"al_ocurrir"}'::jsonb),
    ('Cupón de bienvenida por alta', 1, 'condicion_multiple', 'Perfil completo',
     '{"condiciones":{"combinator":"and","rules":[{"id":"r1","field":"consentimiento_marketing","operator":"=","value":"true"}]},"porcentaje_cumple_estimado":68}'::jsonb),
    ('Cupón de bienvenida por alta', 2, 'emitir_cupon', 'Emitir cupón $15.000', null),
    ('Cupón de bienvenida por alta', 3, 'email', 'Email de bienvenida',
     '{"tasa_fallo_estimada":4}'::jsonb),
    ('Cupón de bienvenida por alta', 4, 'fin_workflow', 'Fin',
     '{"resultado":"completado","registrar_analitica":true}'::jsonb),
    -- Escenario promoción
    ('Rescate de carrito abandonado', 0, 'evento', 'Carrito abandonado',
     '{"dominio":"carrito","evento_id":"cart.abandoned","modo_disparo":"al_ocurrir"}'::jsonb),
    ('Rescate de carrito abandonado', 1, 'esperar', 'Esperar 2 días',
     '{"modo":"duracion","duracion_dias":2}'::jsonb),
    ('Rescate de carrito abandonado', 2, 'aplicar_promocion', 'Aplicar promoción', null),
    ('Rescate de carrito abandonado', 3, 'email', 'Email de recordatorio',
     '{"tasa_fallo_estimada":6}'::jsonb),
    ('Rescate de carrito abandonado', 4, 'fin_workflow', 'Fin',
     '{"resultado":"completado","registrar_analitica":true}'::jsonb),
    -- Escenario puntos
    ('Puntos x3 y ascenso de nivel', 0, 'evento', 'Compra pagada',
     '{"dominio":"compra","evento_id":"order.paid","modo_disparo":"al_ocurrir"}'::jsonb),
    ('Puntos x3 y ascenso de nivel', 1, 'acumular_puntos', 'Acumular puntos x3',
     '{"multiplierOverride":3,"amountUnit":0.25,"exampleAmount":45000,"exampleTierName":"oro","exampleQuantity":1,"capPerTransaction":4000,"tasa_tope_estimada":11,"tasa_sin_puntos_estimada":4}'::jsonb),
    ('Puntos x3 y ascenso de nivel', 2, 'cambio_nivel', 'Evaluar ascenso',
     '{"accion":"recalcular","ventana_calculo_meses":12,"permitir_descenso":false,"notificar_socio":true}'::jsonb),
    ('Puntos x3 y ascenso de nivel', 3, 'fin_workflow', 'Fin',
     '{"resultado":"completado","registrar_analitica":true}'::jsonb)
)
insert into workflow_nodes (workflow_id, tipo, etiqueta, posicion_x, posicion_y, config)
select
  wf.id, d.tipo, d.etiqueta, 120 + d.orden * 260, 180,
  coalesce(
    d.config,
    case d.tipo
      when 'emitir_cupon' then jsonb_build_object(
        'modo', 'emitir',
        'coupon_batch_id', (select id from lote),
        'titular', 'socio_flujo',
        'vigencia_dias', 90,
        'costo_puntos', 0,
        'entrega', 'email'
      )
      when 'aplicar_promocion' then jsonb_build_object(
        'promocion_id', (select id from promo_dermo),
        'si_colisiona', 'gana_mayor_prioridad',
        'acumulable', true
      )
    end,
    '{}'::jsonb
  )
from defs d
join wf on wf.nombre = d.flujo
where not exists (
  select 1 from workflow_nodes n where n.workflow_id = wf.id and n.etiqueta = d.etiqueta
);

-- Aristas: cada nodo enlaza con el siguiente por `posicion_x`. El puerto de
-- salida no siempre es 'out' — una condición sale por 'cumple' y un email
-- por 'entregado' (ver `OUTPUT_HANDLES`), y usar 'out' en todos dejaría los
-- puertos reales sin conectar y el grafo con advertencias.
with org as (select id from organizations where slug = 'omni'),
wf as (
  select id from workflows
  where org_id = (select id from org)
    and nombre in ('Cupón de bienvenida por alta', 'Rescate de carrito abandonado', 'Puntos x3 y ascenso de nivel')
),
ordenados as (
  select
    n.workflow_id, n.id, n.tipo, n.posicion_x,
    lead(n.id) over (partition by n.workflow_id order by n.posicion_x) as siguiente
  from workflow_nodes n
  join wf on wf.id = n.workflow_id
)
insert into workflow_edges (workflow_id, source_node_id, source_port, target_node_id)
select
  o.workflow_id, o.id,
  case o.tipo
    when 'condicion_multiple' then 'cumple'
    when 'email' then 'entregado'
    when 'acumular_puntos' then 'out'
    else 'out'
  end,
  o.siguiente
from ordenados o
where o.siguiente is not null
  and not exists (
    select 1 from workflow_edges e
    where e.source_node_id = o.id and e.target_node_id = o.siguiente
  );

-- ── 4. Corridas de los flujos nuevos ─────────────────────────────────────
--
-- Sin una corrida con sus pasos, la analítica del builder no tiene embudo
-- que dibujar. La cohorte decae por paso con un factor propio de cada tipo
-- de bloque: una condición filtra fuerte, un email casi no pierde a nadie.
with org as (select id from organizations where slug = 'omni'),
wf as (
  select w.id, w.nombre, w.version_actual
  from workflows w
  where w.org_id = (select id from org)
    and w.nombre in ('Cupón de bienvenida por alta', 'Rescate de carrito abandonado', 'Puntos x3 y ascenso de nivel')
)
insert into workflow_runs (workflow_id, workflow_version, tipo, estado, resumen, iniciado_en, finalizado_en)
select
  wf.id, greatest(wf.version_actual, 1), 'publicacion', 'completado',
  jsonb_build_object('origen', 'seed_demo_mecanicas', 'nota', 'Corrida de la versión publicada — alimenta el embudo del panel.'),
  timestamptz '2026-08-20 06:00:00-05', timestamptz '2026-08-20 06:02:00-05'
from wf
where not exists (
  select 1 from workflow_runs r
  where r.workflow_id = wf.id and (r.resumen ->> 'origen') = 'seed_demo_mecanicas'
);

with org as (select id from organizations where slug = 'omni'),
runs as (
  select r.id as run_id, r.workflow_id
  from workflow_runs r
  join workflows w on w.id = r.workflow_id
  where w.org_id = (select id from org) and (r.resumen ->> 'origen') = 'seed_demo_mecanicas'
),
pasos as (
  select
    runs.run_id,
    n.id as node_id,
    n.tipo,
    row_number() over (partition by runs.run_id order by n.posicion_x) - 1 as paso
  from runs
  join workflow_nodes n on n.workflow_id = runs.workflow_id
)
insert into workflow_run_steps (workflow_run_id, node_id, port, conteo_entrada, conteo_salida)
select
  pasos.run_id, pasos.node_id, 'out',
  round(2400 * power(0.78, pasos.paso)),
  round(2400 * power(0.78, pasos.paso + 1))
from pasos
where not exists (
  select 1 from workflow_run_steps s
  where s.workflow_run_id = pasos.run_id and s.node_id = pasos.node_id
);

-- ── 5. Bitácora de canjes, con los metadatos que cada mecánica mide ──────
--
-- Este es el bloque que hace que los paneles dejen de mostrar "—". Cada
-- canje lleva EXACTAMENTE las claves que `mechanic-kpis.ts` lee para su
-- mecánica: sin `descuento_otorgado` no hay "descuento efectivo", sin
-- `escalon_alcanzado` no hay distribución por escalón y sin `saldo_redimido`
-- no hay breakage.
--
-- 45 canjes por promoción repartidos entre el 5 de julio y el 27 de agosto.
-- Es una MUESTRA, no el ledger completo: el contador `promociones.canjes`
-- sigue siendo mucho mayor, y el panel dice en voz alta sobre cuántos
-- eventos calculó cada KPI.
with org as (select id from organizations where slug = 'omni'),
socios as (
  select m.id, t.nombre as nivel,
         row_number() over (order by m.id) - 1 as idx,
         count(*) over () as total
  from members m
  left join tiers t on t.id = m.tier_id
  where m.org_id = (select id from org)
),
promos as (
  select
    id, codigo, tipo_beneficio,
    -- `promocion_eventos_canje_posterior_a_creacion` (20260826240000) rechaza
    -- un canje anterior al alta de su promocion, y estas se crearon entre el 3
    -- y el 29 de julio. La ventana de cada una arranca en SU creacion.
    greatest(timestamptz '2026-07-05 09:00:00-05', creado_en + interval '2 hours') as desde
  from promociones
  where org_id = (select id from org)
    and codigo in (
      'PROMO-3X2-ANALG', 'PROMO-FIJO-DERMO', 'PROMO-MULTI-X3',
      'PROMO-CASHBACK-SOLAR', 'PROMO-CUPON-PTS', 'PROMO-ESC-VIT2'
    )
),
analgesicos as (
  select array_agg(id order by sku) as ids
  from productos where org_id = (select id from org) and sku in ('FAR-70241', 'FAR-70388')
),
serie as (select generate_series(1, 45) as n),
eventos as (
  select
    p.id as promocion_id,
    p.codigo,
    p.tipo_beneficio,
    s.n,
    'ev' || p.codigo || s.n::text as semilla,
    -- Repartidos entre el alta de la promocion y hoy. El ancho de la ventana
    -- se calcula por promocion en vez de fijarse en 54 dias: con una constante,
    -- las creadas a finales de julio proyectarian canjes a septiembre, y este
    -- seed no hace ocurrir nada en el futuro.
    p.desde
      + ((abs(hashtext('d' || p.codigo || s.n::text))
          % greatest(1, floor(extract(epoch from (now() - interval '3 hours' - p.desde)) / 86400)::int)
         ) || ' days')::interval
      + ((abs(hashtext('h' || p.codigo || s.n::text)) % 11) || ' hours')::interval as ocurrido
  from promos p cross join serie s
)
insert into promocion_eventos (
  org_id, promocion_id, member_id, tipo, titulo, detalle,
  actor_tipo, actor_etiqueta, canal, metadatos, ocurrido_en
)
select
  (select id from org),
  e.promocion_id,
  (select id from socios where idx = abs(hashtext('m' || e.semilla)) % (select total from socios limit 1)),
  'canje',
  'Canje aplicado',
  'Registrado por el motor de promociones.',
  'sistema', 'Motor de promociones',
  case when abs(hashtext('c' || e.semilla)) % 10 < 6 then 'pos' else 'ecommerce' end,
  jsonb_build_object('tipo_beneficio', e.tipo_beneficio)
  || case e.tipo_beneficio
       -- 2x3: se compran 3 y se regala 1. `piezas_compradas` es lo que hace
       -- calculable "regaladas sobre vendidas".
       when 'por_piezas' then jsonb_build_object(
         'cantidad', 1 + (abs(hashtext('q' || e.semilla)) % 2),
         'piezas_compradas', 3 + (abs(hashtext('q' || e.semilla)) % 2) * 3,
         'producto_id', (select ids[1 + (abs(hashtext('p' || e.semilla)) % 2)] from analgesicos),
         'monto_carrito', 18000 + (abs(hashtext('mc' || e.semilla)) % 42000),
         'descuento_otorgado', 6900 + (abs(hashtext('do' || e.semilla)) % 4500)
       )
       when 'descuento_monto_fijo' then jsonb_build_object(
         'monto_carrito', 60000 + (abs(hashtext('mc' || e.semilla)) % 90000),
         'descuento_otorgado', 8000,
         'tope_alcanzado', abs(hashtext('t' || e.semilla)) % 100 < 34
       )
       when 'multiplicador_puntos' then jsonb_build_object(
         'puntos_otorgados', 240 + (abs(hashtext('pt' || e.semilla)) % 3600),
         'multiplicador_aplicado', 3,
         'nivel_socio', case when abs(hashtext('nv' || e.semilla)) % 100 < 62 then 'oro' else 'diamante' end,
         'tope_alcanzado', abs(hashtext('t' || e.semilla)) % 100 < 11,
         'monto_carrito', 32000 + (abs(hashtext('mc' || e.semilla)) % 120000)
       )
       -- Cashback: lo emitido y lo redimido son dos cifras distintas, y su
       -- diferencia ES el breakage. Redimir siempre el 100 % lo dejaría en 0
       -- y borraría el único KPI propio de la mecánica.
       when 'cashback' then jsonb_build_object(
         'saldo_emitido', 5400 + (abs(hashtext('se' || e.semilla)) % 12000),
         'saldo_redimido', case when abs(hashtext('sr' || e.semilla)) % 100 < 71
                                then 3200 + (abs(hashtext('sr2' || e.semilla)) % 8000)
                                else 0 end,
         'monto_carrito', 45000 + (abs(hashtext('mc' || e.semilla)) % 95000)
       )
       when 'emitir_cupon' then jsonb_build_object(
         'monto_carrito', 50000 + (abs(hashtext('mc' || e.semilla)) % 80000),
         'puntos_debitados', 2000
       )
       -- Escalonado: la distribución por escalón es su desglose, y el
       -- reparto se sesga al primero a propósito — que casi nadie llegue al
       -- escalón alto es justo el hallazgo que el panel debe poder mostrar.
       when 'descuento_escalonado' then jsonb_build_object(
         'escalon_alcanzado', case when abs(hashtext('es' || e.semilla)) % 100 < 64 then 1 else 2 end,
         'unidades', 1 + (abs(hashtext('un' || e.semilla)) % 4),
         'monto_carrito', 29200 + (abs(hashtext('mc' || e.semilla)) % 60000),
         'descuento_otorgado', 2900 + (abs(hashtext('do' || e.semilla)) % 5800)
       )
       else '{}'::jsonb
     end,
  e.ocurrido
from eventos e
where exists (select 1 from socios)
  and not exists (
    select 1 from promocion_eventos pe
    where pe.promocion_id = e.promocion_id
      and pe.tipo = 'canje'
      and pe.metadatos ? 'tipo_beneficio'
      and pe.ocurrido_en = e.ocurrido
  );

-- Alta y activación de las promociones nuevas, para que la bitácora del
-- sistema (`/ajustes/logs-sistema`) no las muestre apareciendo de la nada.
with org as (select id from organizations where slug = 'omni'),
nuevas as (
  select id, nombre, creado_en
  from promociones
  where org_id = (select id from org)
    and codigo in ('PROMO-3X2-ANALG', 'PROMO-FIJO-DERMO', 'PROMO-MULTI-X3', 'PROMO-CASHBACK-SOLAR', 'PROMO-CUPON-PTS')
),
hitos (tipo, titulo) as (values ('creada', 'Promoción creada'), ('activada', 'Promoción activada'))
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  codigo_motivo, metadatos, ocurrido_en
)
select
  (select id from org), n.id, h.tipo, h.titulo,
  n.nombre,
  'usuario', 'Ana Valdés',
  case when h.tipo = 'activada' then 'decision_comercial' else null end,
  '{}'::jsonb,
  n.creado_en + case when h.tipo = 'activada' then interval '2 hours' else interval '0' end
from nuevas n cross join hitos h
where not exists (
  select 1 from promocion_eventos pe where pe.promocion_id = n.id and pe.tipo = h.tipo
);

-- ── 6. Puntos: el saldo del socio tiene que cuadrar con lo que se otorgó ──
--
-- OJO: `points_ledger` tiene un trigger (`points_ledger_apply_after_insert`)
-- que suma a `members.saldo_puntos`. Es lo que se busca —que el saldo
-- refleje lo que el panel dice haber otorgado— pero significa que este
-- bloque MUEVE saldos reales, no solo escribe bitácora.
--
-- La mitad de los movimientos se atribuye a la corrida del flujo de puntos:
-- es lo que da contenido a "Alcance" en la analítica del builder, que sin
-- ninguna fila vinculada devuelve null para todas las reglas.
with org as (select id from organizations where slug = 'omni'),
corrida as (
  select r.id
  from workflow_runs r
  join workflows w on w.id = r.workflow_id
  where w.org_id = (select id from org)
    and w.nombre = 'Puntos x3 y ascenso de nivel'
    and (r.resumen ->> 'origen') = 'seed_demo_mecanicas'
  limit 1
)
insert into points_ledger (org_id, member_id, tipo, puntos, origen, workflow_run_id, expira_en, creado_en)
select
  (select id from org),
  e.member_id,
  'acumulacion',
  (e.metadatos ->> 'puntos_otorgados')::int,
  'promocion:PROMO-MULTI-X3',
  case when abs(hashtext('wr' || e.id::text)) % 2 = 0 then (select id from corrida) else null end,
  e.ocurrido_en + interval '12 months',
  e.ocurrido_en
from promocion_eventos e
join promociones p on p.id = e.promocion_id
where p.codigo = 'PROMO-MULTI-X3'
  and e.tipo = 'canje'
  and e.member_id is not null
  and (e.metadatos ->> 'puntos_otorgados') ~ '^[0-9]+$'
  and not exists (
    select 1 from points_ledger l
    where l.member_id = e.member_id
      and l.creado_en = e.ocurrido_en
      and l.origen = 'promocion:PROMO-MULTI-X3'
  );
