-- KPI por mecánica del Panel de promociones. Dos cosas, en este orden:
--
--   1. Sembrar las mecánicas que no tenían NINGUNA fila (escalonado,
--      cashback, precio especial, por piezas, multiplicador de puntos,
--      continuidad). Sin esto, la mitad del panel por mecánica no se puede
--      demostrar: no es que el widget esté vacío, es que no existe la
--      promoción que lo llenaría.
--   2. Enriquecer `metadatos` de TODOS los canjes con el payload de su
--      mecánica. Mismo criterio y misma receta que
--      20260826290000_promociones_metadatos_enriquecidos.sql: `metadatos`
--      es jsonb, así que esto es dato, no esquema.
--
-- Sobre el reparto "aleatorio": siempre `hashtext(e.id::text) % N`, el
-- patrón que ya usa el resto del seed. Es determinista — dos corridas de
-- esta migración producen exactamente los mismos números, que es lo que
-- hace que una demo sea repetible.
--
-- Economía: varias de estas promociones llevan `financiador <> 'retailer'`
-- a propósito. Hoy NINGUNA promoción sembrada lo hacía, así que el paso
-- Economía del formulario estaba construido pero el panel no tenía nada
-- que consolidar. El consolidado por proveedor (dinero + piezas) necesita
-- `porcentaje_costo_proveedor` y `periodo_liquidacion` con valores reales.

-- ── 1. Economía de las promociones que YA existen ────────────────────────
-- Se eligen por mecánica, no al azar: el costo de un 2x1 es producto
-- físico (lo repone el laboratorio), el de un envío gratis es servicio
-- (lo paga el retailer, nadie lo cofinancia) y el de un bundle es margen
-- compartido con la marca.

with org as (select id from organizations where slug = 'omni')
update promociones p
set financiador = 'laboratorio_proveedor',
    naturaleza_costo = 'costo_producto',
    porcentaje_costo_proveedor = 70,
    periodo_liquidacion = 'mensual',
    contrato_id = 'CTR-2026-BAYER-VIT',
    umbral_alerta_presupuesto_pct = 80,
    proveedor_id = (
      select id from proveedores
      where org_id = p.org_id and nombre like 'Bayer%'
    )
where p.org_id = (select id from org) and p.codigo = 'PROMO-2X1-VIT';

with org as (select id from organizations where slug = 'omni')
update promociones p
set financiador = 'compartido',
    naturaleza_costo = 'margen_sacrificado',
    porcentaje_costo_proveedor = 40,
    periodo_liquidacion = 'trimestral',
    contrato_id = 'CTR-2026-PG-BUNDLE',
    umbral_alerta_presupuesto_pct = 75,
    proveedor_id = (
      select id from proveedores
      where org_id = p.org_id and nombre like 'Procter%'
    )
where p.org_id = (select id from org) and p.codigo = 'PROMO-BUNDLE-BIENESTAR';

with org as (select id from organizations where slug = 'omni')
update promociones
set naturaleza_costo = 'costo_servicio', umbral_alerta_presupuesto_pct = 90
where org_id = (select id from org) and codigo = 'PROMO-ENVIO-80';

with org as (select id from organizations where slug = 'omni')
update promociones
set naturaleza_costo = 'ingreso_diferido', umbral_alerta_presupuesto_pct = 85
where org_id = (select id from org) and codigo = 'PROMO-BONO-CUMPLE';

-- ── 2. Las 6 mecánicas que no tenían ninguna promoción ───────────────────
-- Cada una lleva su condición real (categoría o segmento de `segments`),
-- porque el panel corta las gráficas por esos atributos: una promoción sin
-- condición no aporta nada al eje "por segmento" ni "por categoría".

with org as (select id from organizations where slug = 'omni')
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio, valor_beneficio, tope_maximo, aplicar_sobre,
  escalones, umbral_tipo, modo_calculo, limites,
  financiador, naturaleza_costo, proveedor_id, porcentaje_costo_proveedor,
  periodo_liquidacion, contrato_id, umbral_alerta_presupuesto_pct,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  'Escalera por volumen · Analgésicos', 'PROMO-ESCALERA-ANALG', 'cantidad', 7,
  false, 'pos_ecommerce',
  jsonb_build_object('combinador', 'todas', 'condiciones', jsonb_build_array(
    jsonb_build_object('campo', 'categoria', 'valor', jsonb_build_array(
      (select id::text from categorias
       where nombre = 'Analgésicos' and org_id = (select id from org) limit 1)))
  )),
  'descuento_escalonado', null::numeric, 25, 'subtotal_carrito',
  jsonb_build_array(
    jsonb_build_object('umbral', 3, 'beneficio_valor', 5),
    jsonb_build_object('umbral', 6, 'beneficio_valor', 10),
    jsonb_build_object('umbral', 12, 'beneficio_valor', 18)
  ),
  'unidades', 'escalon_unico', '[]'::jsonb,
  'compartido', 'margen_sacrificado',
  (select id from proveedores where org_id = (select id from org) and nombre like 'Genomma%'),
  50, 'mensual', 'CTR-2026-GENOMMA-VOL', 80,
  1600, 1104, 318, 2.4, 'activa', current_date - 24, current_date + 6, now() - interval '25 days'
on conflict (org_id, codigo) do nothing;

with org as (select id from organizations where slug = 'omni')
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio, valor_beneficio, tope_maximo, aplicar_sobre,
  tipo_monedero, tipo_saldo, vigencia_saldo_dias, momento_acreditacion, limites,
  financiador, naturaleza_costo, umbral_alerta_presupuesto_pct,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  'Cashback 8 % · Alto valor', 'PROMO-CASHBACK-VIP', 'segmento', 8,
  false, 'pos_ecommerce',
  jsonb_build_object('combinador', 'todas', 'condiciones', jsonb_build_array(
    jsonb_build_object('campo', 'segmento', 'valor', jsonb_build_array(
      (select id::text from segments
       where codigo = 'seg_vip_gold' and org_id = (select id from org))))
  )),
  'cashback', 8, 40, 'subtotal_carrito',
  'porcentaje', 'canjeable', 60, 'diferido', '[]'::jsonb,
  'retailer', 'saldo_efectivo', 75,
  2200, 1518, 264, 3.1, 'activa', current_date - 21, current_date + 9, now() - interval '22 days'
on conflict (org_id, codigo) do nothing;

with org as (select id from organizations where slug = 'omni')
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio, valor_beneficio, aplicar_sobre,
  producto_comprado_id, precio_promocional, precio_referencia,
  aplica_sobre_precio, respeta_precio_minimo_legal, limites,
  financiador, naturaleza_costo, proveedor_id, porcentaje_costo_proveedor,
  periodo_liquidacion, contrato_id, umbral_alerta_presupuesto_pct,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  'Precio especial · Protector solar', 'PROMO-PRECIO-ESP-FPS', 'categoria', 6,
  false, 'pos_ecommerce',
  jsonb_build_object('combinador', 'todas', 'condiciones', jsonb_build_array(
    jsonb_build_object('campo', 'producto', 'valor', jsonb_build_array(
      (select id::text from productos where sku = 'FAR-70819' and org_id = (select id from org))))
  )),
  'precio_especial', null::numeric, 'producto',
  (select id from productos where sku = 'FAR-70819' and org_id = (select id from org)),
  39900, 54300, 'lista', true, '[]'::jsonb,
  'laboratorio_proveedor', 'costo_tercero',
  (select id from proveedores where org_id = (select id from org) and nombre like 'Genomma%'),
  100, 'trimestral', 'CTR-2026-DERMO-FPS', 70,
  1400, 892, 62, 2.9, 'activa', current_date - 16, current_date + 14, now() - interval '17 days'
on conflict (org_id, codigo) do nothing;

with org as (select id from organizations where slug = 'omni')
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio, valor_beneficio, aplicar_sobre,
  compra_cantidad, paga_cantidad, alcance_piezas, criterio_seleccion_piezas,
  producto_comprado_id, limites,
  financiador, naturaleza_costo, proveedor_id, porcentaje_costo_proveedor,
  periodo_liquidacion, contrato_id, umbral_alerta_presupuesto_pct,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  '3x2 en Acetaminofén', 'PROMO-3X2-ANALG', 'cantidad', 7,
  false, 'pos', 
  jsonb_build_object('combinador', 'todas', 'condiciones', jsonb_build_array(
    jsonb_build_object('campo', 'producto', 'valor', jsonb_build_array(
      (select id::text from productos where sku = 'FAR-70241' and org_id = (select id from org))))
  )),
  'por_piezas', null::numeric, 'producto',
  3, 2, 'mismo_producto', 'menor_precio',
  (select id from productos where sku = 'FAR-70241' and org_id = (select id from org)), '[]'::jsonb,
  'laboratorio_proveedor', 'costo_producto',
  (select id from proveedores where org_id = (select id from org) and nombre like 'Laboratorios Liomont%'),
  85, 'mensual', 'CTR-2026-LIOMONT-3X2', 80,
  980, 764, 412, 3.4, 'activa', current_date - 27, current_date + 3, now() - interval '28 days'
on conflict (org_id, codigo) do nothing;

with org as (select id from organizations where slug = 'omni')
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio, valor_beneficio, tope_maximo, aplicar_sobre,
  multiplicador_puntos, niveles_requeridos, modo_resolucion_multiplicador,
  tipo_saldo, momento_acreditacion, limites,
  financiador, naturaleza_costo, umbral_alerta_presupuesto_pct,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  'Doble puntos · Compradores frecuentes', 'PROMO-2X-PUNTOS', 'segmento', 9,
  true, 'pos_ecommerce',
  jsonb_build_object('combinador', 'todas', 'condiciones', jsonb_build_array(
    jsonb_build_object('campo', 'segmento', 'valor', jsonb_build_array(
      (select id::text from segments
       where codigo = 'seg_freq_2026' and org_id = (select id from org)))),
    jsonb_build_object('campo', 'socio_nivel', 'valor', jsonb_build_array('oro', 'diamante'))
  )),
  'multiplicador_puntos', null::numeric, 2000, 'subtotal_carrito',
  2.0, array['oro', 'diamante'], 'gana_mayor',
  'canjeable', 'inmediato', '[]'::jsonb,
  'retailer', 'ingreso_diferido', 85,
  1750, 1102, 496, 2.2, 'activa', current_date - 18, current_date + 12, now() - interval '19 days'
on conflict (org_id, codigo) do nothing;

with org as (select id from organizations where slug = 'omni')
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio, valor_beneficio, tope_maximo, aplicar_sobre,
  escalones, ventana_continuidad_cantidad, ventana_continuidad_unidad,
  al_romper_continuidad,
  acumula_retroactivo, efecto_devolucion, limites,
  financiador, naturaleza_costo, umbral_alerta_presupuesto_pct,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  'Continuidad · Tratamiento crónico', 'PROMO-CONTINUIDAD-CRON', 'categoria', 8,
  false, 'pos_ecommerce',
  jsonb_build_object('combinador', 'todas', 'condiciones', jsonb_build_array(
    jsonb_build_object('campo', 'segmento', 'valor', jsonb_build_array(
      (select id::text from segments
       where codigo = 'seg_alta_frecuencia_farmacia' and org_id = (select id from org))))
  )),
  'descuento_continuidad', null::numeric, 35, 'subtotal_carrito',
  jsonb_build_array(
    jsonb_build_object('umbral', 1, 'beneficio_valor', 20),
    jsonb_build_object('umbral', 2, 'beneficio_valor', 25),
    jsonb_build_object('umbral', 3, 'beneficio_valor', 30),
    jsonb_build_object('umbral', 4, 'beneficio_valor', 35)
  ),
  35, 'dias', 'reiniciar', false, 'no_afecta', '[]'::jsonb,
  'retailer', 'margen_sacrificado', 80,
  1900, 1235, 287, 2.6, 'activa', current_date - 30, current_date + 30, now() - interval '31 days'
on conflict (org_id, codigo) do nothing;

-- ── 3. Bitácora de canjes de las 6 mecánicas nuevas ──────────────────────
-- La muestra es deliberadamente menor que el contador `canjes` de la fila
-- (mismo criterio que 20260826160000: los eventos son actividad reciente
-- legible, no un ledger reconciliado). Cada canje trae el payload que su
-- KPI especializado necesita — un escalonado sin `escalon_alcanzado` no
-- puede contestar "¿sirven los escalones altos?", que es toda la pregunta.

-- Escalonado: la distribución por escalón es el KPI. 3 unidades es el
-- escalón que casi todos alcanzan; 12 lo alcanza una minoría — esa forma
-- de cola es exactamente lo que hay que poder ver.
with org as (select id from organizations where slug = 'omni'),
promo as (select id from promociones where org_id = (select id from org) and codigo = 'PROMO-ESCALERA-ANALG'),
serie as (select generate_series(0, 89) as n)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), (select id from promo), 'canje',
  'Descuento por volumen aplicado',
  case when n % 3 = 0 then 'Canal: POS' else 'Canal: e-commerce' end,
  'sistema', 'Motor de promociones',
  case when n % 3 = 0 then 'pos' else 'ecommerce' end,
  jsonb_build_object(
    'tipo_beneficio', 'descuento_escalonado',
    'escalon_alcanzado', case when n % 10 < 6 then 3 when n % 10 < 9 then 6 else 12 end,
    'descuento_pct', case when n % 10 < 6 then 5 when n % 10 < 9 then 10 else 18 end,
    'unidades', case when n % 10 < 6 then 3 + (n % 3) when n % 10 < 9 then 6 + (n % 4) else 12 + (n % 6) end,
    'monto_carrito', 42000 + (abs(hashtext('esc' || n::text)) % 90000),
    'descuento_otorgado', 2100 + (abs(hashtext('escd' || n::text)) % 9800),
    'tope_alcanzado', (n % 17 = 0)
  ),
  now() - ((n % 24) || ' days')::interval - ((n * 11) || ' minutes')::interval
from serie where exists (select 1 from promo);

-- Cashback: emitido vs. redimido. El saldo que se emite y nunca se usa es
-- breakage — dinero que se presupuestó y no costó, y es el número que más
-- cambia la lectura de rentabilidad de esta mecánica.
with org as (select id from organizations where slug = 'omni'),
promo as (select id from promociones where org_id = (select id from org) and codigo = 'PROMO-CASHBACK-VIP'),
serie as (select generate_series(0, 79) as n)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), (select id from promo), 'canje',
  'Cashback acreditado',
  case when n % 2 = 0 then 'Canal: e-commerce' else 'Canal: POS' end,
  'sistema', 'Motor de promociones',
  case when n % 2 = 0 then 'ecommerce' else 'pos' end,
  jsonb_build_object(
    'tipo_beneficio', 'cashback',
    'monto_carrito', 55000 + (abs(hashtext('cb' || n::text)) % 140000),
    'saldo_emitido', 4400 + (abs(hashtext('cbe' || n::text)) % 11200),
    'saldo_redimido', case when n % 10 < 6 then 4400 + (abs(hashtext('cbe' || n::text)) % 11200) else 0 end,
    'vigencia_saldo_dias', 60
  ),
  now() - ((n % 21) || ' days')::interval - ((n * 13) || ' minutes')::interval
from serie where exists (select 1 from promo);

-- Precio especial: unidades a precio promocional y el delta contra el
-- precio de lista. El delta por unidad × unidades ES el costo de la
-- mecánica, y aquí lo carga el proveedor al 100 %.
with org as (select id from organizations where slug = 'omni'),
promo as (select id, producto_comprado_id, precio_promocional, precio_referencia
          from promociones where org_id = (select id from org) and codigo = 'PROMO-PRECIO-ESP-FPS'),
serie as (select generate_series(0, 43) as n)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), promo.id, 'canje',
  'Precio especial aplicado',
  case when n % 4 = 0 then 'Canal: POS' else 'Canal: e-commerce' end,
  'sistema', 'Motor de promociones',
  case when n % 4 = 0 then 'pos' else 'ecommerce' end,
  jsonb_build_object(
    'tipo_beneficio', 'precio_especial',
    'producto_id', promo.producto_comprado_id,
    'cantidad', 1 + (abs(hashtext('pe' || n::text)) % 2),
    'precio_promocional', promo.precio_promocional,
    'precio_referencia', promo.precio_referencia,
    'delta_unitario', promo.precio_referencia - promo.precio_promocional,
    'monto_carrito', 48000 + (abs(hashtext('pec' || n::text)) % 110000)
  ),
  now() - ((n % 16) || ' days')::interval - ((n * 17) || ' minutes')::interval
from promo, serie;

-- Por piezas (3x2): las piezas regaladas son el KPI, y son justo lo que se
-- le factura al laboratorio. Sin `cantidad` por SKU no hay consolidado de
-- piezas que enviar a liquidación.
with org as (select id from organizations where slug = 'omni'),
promo as (select id, producto_comprado_id from promociones
          where org_id = (select id from org) and codigo = 'PROMO-3X2-ANALG'),
serie as (select generate_series(0, 109) as n)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), promo.id, 'canje',
  'Pieza gratis entregada', 'Canal: POS',
  'sistema', 'Motor de promociones', 'pos',
  jsonb_build_object(
    'tipo_beneficio', 'por_piezas',
    'producto_id', promo.producto_comprado_id,
    'cantidad', 1 + (abs(hashtext('px' || n::text)) % 2),
    'piezas_compradas', 3 * (1 + (abs(hashtext('px' || n::text)) % 2)),
    'monto_carrito', 20700 + (abs(hashtext('pxc' || n::text)) % 62000)
  ),
  now() - ((n % 27) || ' days')::interval - ((n * 7) || ' minutes')::interval
from promo, serie;

-- Multiplicador de puntos: puntos otorgados y el pasivo que generan. El
-- multiplicador efectivo no siempre es el configurado — el tope lo recorta,
-- y ver cuántas veces lo recorta es lo que dice si el tope está bien puesto.
with org as (select id from organizations where slug = 'omni'),
promo as (select id from promociones where org_id = (select id from org) and codigo = 'PROMO-2X-PUNTOS'),
serie as (select generate_series(0, 99) as n)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), (select id from promo), 'canje',
  'Puntos multiplicados',
  case when n % 2 = 0 then 'Canal: POS' else 'Canal: e-commerce' end,
  'sistema', 'Motor de promociones',
  case when n % 2 = 0 then 'pos' else 'ecommerce' end,
  jsonb_build_object(
    'tipo_beneficio', 'multiplicador_puntos',
    'multiplicador_aplicado', case when n % 9 = 0 then 1.5 else 2.0 end,
    'puntos_base', 380 + (abs(hashtext('mp' || n::text)) % 900),
    'puntos_otorgados', case
      when n % 11 = 0 then 2000
      else least(2000, (380 + (abs(hashtext('mp' || n::text)) % 900)) * 2) end,
    'tope_alcanzado', (n % 11 = 0),
    'nivel_socio', case when n % 3 = 0 then 'diamante' else 'oro' end,
    'monto_carrito', 38000 + (abs(hashtext('mpc' || n::text)) % 95000)
  ),
  now() - ((n % 18) || ' days')::interval - ((n * 19) || ' minutes')::interval
from serie where exists (select 1 from promo);

-- Continuidad: la tasa de avance entre escalones es todo el KPI. Que el
-- 4.º escalón lo alcancen pocos no es un fallo del sembrado — es la forma
-- real de una escalera de adherencia, y es lo que hay que poder ver.
with org as (select id from organizations where slug = 'omni'),
promo as (select id from promociones where org_id = (select id from org) and codigo = 'PROMO-CONTINUIDAD-CRON'),
serie as (select generate_series(0, 84) as n)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle, actor_tipo, actor_etiqueta,
  canal, metadatos, ocurrido_en
)
select
  (select id from org), (select id from promo), 'canje',
  'Escalón de continuidad aplicado',
  case when n % 5 = 0 then 'Canal: e-commerce' else 'Canal: POS' end,
  'sistema', 'Motor de promociones',
  case when n % 5 = 0 then 'ecommerce' else 'pos' end,
  jsonb_build_object(
    'tipo_beneficio', 'descuento_continuidad',
    'escalon_alcanzado', case
      when n % 100 < 45 then 1 when n % 100 < 73 then 2
      when n % 100 < 91 then 3 else 4 end,
    'descuento_pct', case
      when n % 100 < 45 then 20 when n % 100 < 73 then 25
      when n % 100 < 91 then 30 else 35 end,
    'racha_rota', (n % 13 = 0),
    'monto_carrito', 31000 + (abs(hashtext('ct' || n::text)) % 78000),
    'descuento_otorgado', 6200 + (abs(hashtext('ctd' || n::text)) % 15000)
  ),
  now() - ((n % 30) || ' days')::interval - ((n * 23) || ' minutes')::interval
from serie where exists (select 1 from promo);

-- ── 4. Enriquecimiento de los canjes que ya existían ─────────────────────
-- Se agrupa por `tipo_beneficio` de la promoción padre, no por código: así
-- cualquier promoción futura de la misma mecánica entra sin tocar esta
-- migración.
--
-- El orden del `||` importa: `nuevas || e.metadatos` deja ganar a las
-- claves que YA estaban (las que sembró 20260826290000). Al revés, esta
-- migración pisaría el `producto_id` real de "2x1 en Vitaminas" con uno
-- calculado, y la única forma de notarlo sería que las unidades regaladas
-- cambiaran de SKU sin motivo.

-- Descuento porcentual y de monto fijo: cuánto se descontó de verdad y si
-- el tope recortó. Un descuento configurado al 15 % que en promedio otorga
-- el 9 % está topado la mayor parte del tiempo — sin estas dos claves eso
-- es invisible.
-- `tope_alcanzado` se DERIVA del carrito y del tope, no se sortea aparte:
-- si se sorteara, habría canjes marcados como topados cuyo descuento no
-- llega al tope, y el KPI "descuento efectivo" contradiría al de "canjes
-- que tocaron el tope" en la misma tarjeta.
-- El calculo va en un CTE y no en un `cross join lateral` del propio
-- `update`: un LATERAL del `from` no puede referenciar la tabla que se esta
-- actualizando (42P10), y `carrito` depende de `e.id`. Dentro del CTE, `e`
-- es una entrada normal del `from` y el LATERAL si la ve.
with calc as (
  select
    e.id,
    jsonb_build_object(
      'tipo_beneficio', p.tipo_beneficio,
      'descuento_pct', p.valor_beneficio,
      'monto_carrito', base.carrito,
      'descuento_otorgado', case
        when p.tope_maximo is not null
         and base.carrito * coalesce(p.valor_beneficio, 10) / 100 > base.tope
        then base.tope
        else round(base.carrito * coalesce(p.valor_beneficio, 10) / 100)
      end,
      'tope_alcanzado',
        p.tope_maximo is not null
        and base.carrito * coalesce(p.valor_beneficio, 10) / 100 > base.tope
    ) as payload
  from promocion_eventos e
  join promociones p on p.id = e.promocion_id
  cross join lateral (
    select
      34000 + (abs(hashtext('dp' || e.id::text)) % 128000) as carrito,
      coalesce(p.tope_maximo, 0) * 1000 as tope
  ) base
  where e.tipo = 'canje'
    and p.tipo_beneficio in ('descuento_porcentual', 'descuento_monto_fijo')
)
update promocion_eventos e
set metadatos = calc.payload || e.metadatos
from calc
where calc.id = e.id;

-- Envío gratis: el costo del envío asumido es el costo real de la mecánica
-- (naturaleza `costo_servicio`), y el ticket contra el umbral dice si el
-- umbral está bien puesto — si casi todos compran justo por encima, el
-- umbral está capturando compras que ya iban a ocurrir.
-- El umbral vivía solo en la condición (`monto_carrito`, valor 20) y en el
-- código de la promoción (PROMO-ENVIO-80), que no coincidían entre sí ni
-- con los carritos ya sembrados (80 000-200 000). Se fija en la columna que
-- la mecánica tiene para eso: sin un umbral en la misma escala que el
-- carrito, la holgura da un múltiplo absurdo y el KPI no se puede leer.
with org as (select id from organizations where slug = 'omni')
update promociones
set monto_minimo_disparo = 80
where org_id = (select id from org)
  and tipo_beneficio = 'envio_gratis'
  and monto_minimo_disparo is null;

update promocion_eventos e
set metadatos = jsonb_build_object(
  'tipo_beneficio', 'envio_gratis',
  'costo_envio', 5900 + (abs(hashtext('ev' || e.id::text)) % 4200),
  'umbral_disparo', coalesce(p.monto_minimo_disparo, 80) * 1000
) || e.metadatos
from promociones p
where e.promocion_id = p.id and e.tipo = 'canje' and p.tipo_beneficio = 'envio_gratis';

-- Producto gratis: `producto_id`/`cantidad` ya los puso 20260826290000
-- para "2x1 en Vitaminas"; esto solo agrega el carrito que los acompañó y
-- cubre cualquier otra promoción de la misma mecánica.
update promocion_eventos e
set metadatos = jsonb_build_object(
  'tipo_beneficio', 'producto_gratis',
  'cantidad', 1,
  'monto_carrito', 29000 + (abs(hashtext('pg' || e.id::text)) % 84000)
) || e.metadatos
from promociones p
where e.promocion_id = p.id and e.tipo = 'canje' and p.tipo_beneficio = 'producto_gratis';

-- Bundle: unidades por bundle y margen sacrificado. El bundle se vende a
-- precio fijo, así que el "descuento" no es un porcentaje configurado sino
-- la diferencia contra la suma de los precios sueltos.
update promocion_eventos e
set metadatos = jsonb_build_object(
  'tipo_beneficio', 'precio_fijo_bundle',
  'precio_bundle', coalesce(p.valor_beneficio, 0) * 1000,
  'bundles', 1 + (abs(hashtext('bd' || e.id::text)) % 2),
  'margen_sacrificado', 3800 + (abs(hashtext('bm' || e.id::text)) % 5600),
  'monto_carrito', 46000 + (abs(hashtext('bc' || e.id::text)) % 72000)
) || e.metadatos
from promociones p
where e.promocion_id = p.id and e.tipo = 'canje' and p.tipo_beneficio = 'precio_fijo_bundle';

-- Bono de puntos: `puntos_otorgados` ya venía de 20260826290000; falta el
-- carrito para que esta promoción entre en el ticket promedio como el resto.
update promocion_eventos e
set metadatos = jsonb_build_object(
  'monto_carrito', 26000 + (abs(hashtext('bp' || e.id::text)) % 71000)
) || e.metadatos
from promociones p
where e.promocion_id = p.id and e.tipo = 'canje' and p.tipo_beneficio = 'bono_puntos';

-- Índice para el corte por mecánica del panel: todas las consultas nuevas
-- filtran `tipo = 'canje'` y agrupan por promoción, y el índice existente
-- (`promocion_id, ocurrido_en desc`) no descarta los eventos de ciclo de
-- vida, que son la mayoría de las filas en las promociones con poca
-- actividad.
create index if not exists promocion_eventos_canjes_idx
  on promocion_eventos (promocion_id, ocurrido_en desc)
  where tipo = 'canje';
