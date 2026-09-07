-- Datos de demo: las compras que explican una acumulación, y las
-- devoluciones que la deshacen.
--
-- Qué estaba pasando: `pedidos`/`pedido_items` alimentan las acumulaciones,
-- el comportamiento de compra, el valor comercial, el RFM y media analítica,
-- pero ninguna pantalla mostraba esas filas y NADIE podía verificar de dónde
-- salía un número. Y `devoluciones` (20260907090000) nacía vacía: los 613
-- pedidos existentes estaban todos en `completado`, así que el KPI de
-- devoluciones de "Valor comercial" mostraba $0 desde el día uno.
--
-- Por qué no basta con sembrar sobre lo que ya hay: las dos promociones
-- `por_piezas` vigentes (`PROMO-3X2-ANALG`, `STATE`) acumulan sobre SKU que
-- 293 combinaciones socio-producto ya compraron en los últimos 360 días. Con
-- ese ruido de fondo, añadir "tres cajas para Camilo" no produce un caso
-- explicable: produce un número que hay que recalcular a mano para saber si
-- está bien. Así que este seed trae **su propio universo cerrado** —dos SKU
-- nuevos y una promoción nueva sobre ellos— y ahí sí cada socio es un caso
-- con una sola lectura posible.
--
-- Los ocho casos, y qué demuestra cada uno:
--
--   · Camilo Torres      3 piezas, sin reclamar  → «Por reclamar» (completa)
--   · Sofía Ramírez      3 piezas, ya entregada  → «Completada»
--   · Daniela Cárdenas   6 piezas, 1 de 2 cobrada→ «Por reclamar» con
--                                                   histórico de dos ciclos
--   · Valentina Ríos     2 de 3                  → «En curso», falta 1
--   · Andrés Gómez       1 de 3                  → «En curso», faltan 2
--   · Adriana Muñoz      3 piezas y devuelve 1   → vuelve a «En curso»
--   · Lucía Pérez        pedido devuelto entero  → `pedidos.estado` devuelto
--   · Diego Salinas      devolución sanitaria    → severidad alta en la
--                                                   bitácora
--
-- Determinismo: sin `hashtext` ni `random()`. Cada fila está escrita a mano
-- porque el valor de este seed es justamente que los números se puedan
-- comprobar de cabeza (3 piezas × $27.400 = $82.200).
--
-- Idempotencia: cada bloque va guardado por su clave natural (SKU, código de
-- promoción, número de pedido, número de devolución, `origen` del
-- movimiento de puntos). Aplicarla dos veces no duplica nada.
--
-- Fechas: todo entre hace 20 días y hace 2. Nada ocurre en el futuro; las
-- únicas fechas futuras son la vigencia de la promoción y la expiración de
-- los puntos.

-- ── 1 · Dos SKU nuevos: el universo cerrado de la promoción ─────────────
--
-- Suplementos, y de una marca que ya existe en el catálogo: un SKU nuevo con
-- un proveedor inventado ensuciaría los filtros de Catálogo.

with org as (select id from organizations where slug = 'omni')
insert into productos (
  org_id, sku, codigo_producto, codigo_barras, nombre, presentacion,
  marca, proveedor, tipo_producto, imagen_url, precio, costo_unitario,
  puntos, estado, completitud_pct, requiere_receta
)
select (select id from org), v.*
from (
  values
    (
      'FAR-71710', 'PRD-004841', '7702057012801',
      'Vitamina D3 2000 UI', 'Caja x 60 cápsulas',
      'Centrum', 'Pfizer S.A.S.', 'Suplemento', '/catalogo/vitaminas.jpg',
      27400.00, 15070.00, 46, 'activo', 100, false
    ),
    (
      'FAR-71725', 'PRD-004842', '7702057012802',
      'Colágeno hidrolizado', 'Caja x 30 sobres',
      'Centrum', 'Pfizer S.A.S.', 'Suplemento', '/catalogo/vitaminas.jpg',
      46800.00, 25740.00, 79, 'activo', 100, false
    )
) as v (
  sku, codigo_producto, codigo_barras, nombre, presentacion,
  marca, proveedor, tipo_producto, imagen_url, precio, costo_unitario,
  puntos, estado, completitud_pct, requiere_receta
)
on conflict (org_id, sku) do nothing;

-- Sin categoría, un producto nuevo desaparece de los filtros de Catálogo.
with org as (select id from organizations where slug = 'omni'),
cat as (select id from categorias where nombre = 'Vitaminas' limit 1)
insert into producto_categorias (producto_id, categoria_id, es_principal)
select p.id, (select id from cat), true
from productos p
where p.org_id = (select id from org)
  and p.sku in ('FAR-71710', 'FAR-71725')
  and (select id from cat) is not null
on conflict (producto_id, categoria_id) do nothing;

-- ── 2 · La promoción de pieza gratis sobre ese universo ────────────────
--
-- `mismo_producto`: el ciclo se cumple con tres piezas DEL MISMO SKU, no
-- mezclando D3 con colágeno. Es lo que hace que la tarjeta de la ficha tenga
-- una fila por producto y no una sola bolsa.
--
-- **No se puede insertar `activa` y no es un descuido del seed:**
-- `promociones_insert_guard` (20260831090000) obliga a que TODA promoción
-- nueva nazca en `borrador`, y a diferencia del gate de publicación ese
-- trigger no tiene excepción para migraciones ni para el service role. Su
-- razón: cerrar la puerta de atrás: si un INSERT pudiera nacer publicado, el
-- trigger de UPDATE —que es donde vive la regla de las dos firmas— sería
-- decorativo.
--
-- Así que la promoción se publica por donde se publica de verdad:
-- `borrador` → `pendiente_aprobacion` → `activa`, con una solicitud aprobada
-- por alguien distinto de quien la pidió. Sale más largo y vale la pena por
-- dos motivos: pasa el gate con sesión o sin ella, y deja la primera fila de
-- `promotion_approval` de toda la demo, que estaba vacía — así la bandeja de
-- Aprobaciones tiene por fin un histórico que mostrar.

with org as (select id from organizations where slug = 'omni'),
skus as (
  select jsonb_agg(id::text order by sku) as ids
  from productos
  where org_id = (select id from org) and sku in ('FAR-71710', 'FAR-71725')
)
insert into promociones (
  org_id, nombre, codigo, tipo, prioridad, acumulable, canal_aplicacion,
  condiciones, tipo_beneficio,
  compra_cantidad, paga_cantidad, alcance_piezas, descuento_unidad_extra_pct,
  mezcla_en_universo, criterio_seleccion_piezas,
  aplicar_sobre, limites,
  naturaleza_costo, financiador, porcentaje_costo_proveedor,
  periodo_liquidacion, contrato_id, umbral_alerta_presupuesto_pct,
  presupuesto_asignado, presupuesto_consumido, canjes, roi,
  estado_publicacion, vigente_desde, vigente_hasta, creado_en
)
select
  (select id from org),
  '3x2 en vitaminas y suplementos', 'PROMO-3X2-VITAM', 'cantidad', 6, false,
  'pos_ecommerce',
  jsonb_build_object(
    'combinador', 'todas',
    'condiciones', jsonb_build_array(
      jsonb_build_object('campo', 'producto', 'valor', (select ids from skus))
    )
  ),
  'por_piezas',
  3, 2, 'mismo_producto', 100,
  false, 'menor_precio',
  'producto',
  jsonb_build_array(jsonb_build_object(
    'unidad', 'piezas', 'sujeto', 'socio', 'ventana', 'mes_calendario',
    'tope', 9, 'alExceder', 'descartar'
  )),
  'costo_producto', 'laboratorio_proveedor', 80,
  'mensual', 'CTR-2026-PFIZER-3X2', 80,
  900000, 214000, 3, 2.6,
  -- Nace en borrador porque es lo único que el trigger de INSERT admite; los
  -- tres pasos de abajo la llevan hasta `activa`.
  'borrador', current_date - 20, current_date + 25, now() - interval '22 days'
where not exists (
  select 1 from promociones
  where org_id = (select id from org) and codigo = 'PROMO-3X2-VITAM'
);

-- 2b · La solicitud, y su firma. Dos personas distintas: la regla de cuatro
-- ojos vive en `decide_promotion_approvals`, y una fila que se apruebe a sí
-- misma dejaría en la bandeja un histórico que el propio portal rechazaría.
with org as (select id from organizations where slug = 'omni'),
promo as (
  select id, creado_en from promociones
  where org_id = (select id from org) and codigo = 'PROMO-3X2-VITAM'
),
solicitante as (
  select id from profiles
  where org_id = (select id from org) and email = 'carlos.granados@omni.pro'
),
aprobador as (
  select id from profiles
  where org_id = (select id from org) and email = 'admin@omni.pro'
)
insert into promotion_approval (
  org_id, promocion_id, requested_by, requested_at, codigo_motivo, nota_motivo,
  approver_id, status, codigo_decision, note, decided_at
)
select
  (select id from org), (select id from promo),
  (select id from solicitante),
  (select creado_en from promo) + interval '2 hours',
  'decision_comercial',
  'Campaña del laboratorio para el trimestre: 3x2 sobre D3 y colágeno.',
  (select id from aprobador), 'approved',
  'cumple_politica',
  'Presupuesto y tope por socio dentro de política. Aprobada.',
  (select creado_en from promo) + interval '25 hours'
where (select id from promo) is not null
  and not exists (
    select 1 from promotion_approval
    where promocion_id = (select id from promo)
  );

-- 2c · borrador → pendiente_aprobacion. El gate de publicación solo mira las
-- transiciones HACIA `activa`, así que este paso no pide nada.
update promociones
set estado_publicacion = 'pendiente_aprobacion'
where org_id = (select id from organizations where slug = 'omni')
  and codigo = 'PROMO-3X2-VITAM'
  and estado_publicacion = 'borrador';

-- 2d · pendiente_aprobacion → activa. Pasa el gate por las dos vías: sin
-- sesión de usuario está exento, y con sesión encuentra la última solicitud
-- de esa promoción en `approved`, que es justo lo que exige.
update promociones
set estado_publicacion = 'activa'
where org_id = (select id from organizations where slug = 'omni')
  and codigo = 'PROMO-3X2-VITAM'
  and estado_publicacion = 'pendiente_aprobacion';

-- ── 3 · Las compras ────────────────────────────────────────────────────
--
-- Dos grupos: `PED-ACUM-*` son las que construyen cada estado de
-- acumulación; `PED-DEV-*` existen para poder devolverlas (bloque 5) y no
-- tocan la promoción, para que una devolución sanitaria no mueva de paso el
-- ciclo de nadie.

with org as (select id from organizations where slug = 'omni'),
socios as (select id, email from members where org_id = (select id from org)),
tiendas_org as (
  select id, codigo_tienda from tiendas where org_id = (select id from org)
)
insert into pedidos (
  org_id, member_id, tienda_id, canal, numero_pedido, estado, creado_en
)
select
  (select id from org),
  (select id from socios where socios.email = v.email),
  (select id from tiendas_org where tiendas_org.codigo_tienda = v.tienda),
  v.canal, v.numero_pedido, 'completado',
  now() - (v.dias_atras || ' days')::interval
from (
  values
    -- Camilo: dos visitas para la misma acumulación. Es el caso realista y
    -- el que prueba que el ciclo se cuenta por piezas, no por pedidos.
    ('PED-ACUM-01', 'camilo.torres@example.com',    'ST-0142', 'pos',        14),
    ('PED-ACUM-02', 'camilo.torres@example.com',    'ST-0142', 'app',         6),
    ('PED-ACUM-03', 'sofia.ramirez@example.com',    'ST-0142', 'pos',        16),
    ('PED-ACUM-04', 'valentina.rios@example.com',   'ST-0143', 'ecommerce',   9),
    ('PED-ACUM-05', 'andres.gomez@example.com',     'ST-0151', 'app',         4),
    ('PED-ACUM-06', 'adriana.munoz15@example.com', 'ST-0151', 'pos',        11),
    ('PED-ACUM-07', 'daniela.cardenas@example.com', 'ST-0142', 'pos',        18),
    ('PED-ACUM-08', 'daniela.cardenas@example.com', 'ST-0142', 'ecommerce',   7),
    ('PED-DEV-01',  'lucia.perez@mail.com',         'ST-0158', 'ecommerce',   9),
    ('PED-DEV-02',  'diego.salinas@mail.com',       'ST-0143', 'pos',        13),
    ('PED-DEV-03',  'maria.gonzalez@mail.com',      'ST-0170', 'app',        16),
    ('PED-DEV-04',  'luis.moreno2@example.com',     'ST-0158', 'pos',         6)
) as v (numero_pedido, email, tienda, canal, dias_atras)
where (select id from socios where socios.email = v.email) is not null
on conflict (org_id, numero_pedido) do nothing;

-- ── 4 · Las líneas, con el precio de la venta ──────────────────────────
--
-- `precio_unitario` y `costo_unitario` se copian del catálogo AHORA porque
-- la venta es de ahora. En un pedido histórico serían los de entonces — por
-- eso la columna existe en vez de leerse en vivo de `productos`.

with org as (select id from organizations where slug = 'omni'),
pedido_ids as (
  select id, numero_pedido from pedidos where org_id = (select id from org)
),
producto_ids as (
  select id, sku, precio, costo_unitario
  from productos where org_id = (select id from org)
)
insert into pedido_items (
  pedido_id, producto_id, cantidad, precio_unitario, costo_unitario
)
select
  (select id from pedido_ids where pedido_ids.numero_pedido = v.numero_pedido),
  p.id, v.cantidad, p.precio, coalesce(p.costo_unitario, 0)
from (
  values
    -- Acumulaciones sobre el universo cerrado de PROMO-3X2-VITAM
    ('PED-ACUM-01', 'FAR-71710', 2),  -- Camilo: 2 + 1 = 3 → por reclamar
    ('PED-ACUM-02', 'FAR-71710', 1),
    ('PED-ACUM-03', 'FAR-71710', 3),  -- Sofía: 3 y ya se la llevó
    ('PED-ACUM-04', 'FAR-71725', 2),  -- Valentina: 2 de 3
    ('PED-ACUM-05', 'FAR-71725', 1),  -- Andrés: 1 de 3
    ('PED-ACUM-06', 'FAR-71710', 3),  -- Adriana: 3, y devuelve una
    ('PED-ACUM-07', 'FAR-71725', 4),  -- Daniela: 4 + 2 = 6 → dos ciclos
    ('PED-ACUM-08', 'FAR-71725', 2),
    -- Compras que existen para ser devueltas. Sin SKU de la promoción a
    -- propósito: así una devolución sanitaria no altera ninguna acumulación.
    ('PED-DEV-01',  'FAR-71600', 1),  -- Lucía: termómetro + enjuague,
    ('PED-DEV-01',  'FAR-71230', 1),  --        se devuelve el pedido entero
    ('PED-DEV-02',  'FAR-71105', 2),  -- Diego: devuelve 1 de 2
    ('PED-DEV-03',  'FAR-70517', 1),  -- María: jarabe vencido
    ('PED-DEV-04',  'FAR-71520', 1),  -- Luis: devuelve el shampoo,
    ('PED-DEV-04',  'FAR-71675', 1)   --       se queda el gel
) as v (numero_pedido, sku, cantidad)
join producto_ids p on p.sku = v.sku
where (select id from pedido_ids where pedido_ids.numero_pedido = v.numero_pedido) is not null
on conflict (pedido_id, producto_id) do nothing;

-- ── 5 · Los puntos que esas compras otorgaron ──────────────────────────
--
-- Un punto por cada $10 del pedido, que es la tasa que el programa ya venía
-- usando en `points_ledger` (5.000 puntos ↔ un pedido de ~$50.000) y la
-- única compatible con los umbrales de nivel: `tiers.umbral_puntos` es
-- 2.000 / 6.000 / 15.000, y a puñados de puntos por compra llegar a
-- diamante pediría trescientas compras.
--
-- NO se usa `productos.puntos`: esa columna es un dato de catálogo (lo que
-- "vale" un producto en la vitrina), no la tasa de acumulación. Confundirlas
-- fue el primer intento de este seed y dejó a un socio con 46 puntos por una
-- compra de $27.400 al lado de otro con 5.000 por una de $50.000 — ver
-- `20260907120000_coherencia_camilo_torres.sql`.
--
-- Sin este bloque el log mostraría la compra y no el movimiento de puntos
-- que produjo, que es justo el hilo que hace legible la bitácora.

with org as (select id from organizations where slug = 'omni')
insert into points_ledger (
  org_id, member_id, tipo, puntos, origen, canal, expira_en, creado_en
)
select
  p.org_id, p.member_id, 'acumulacion',
  floor(p.total / 10)::integer,
  'Compra ' || p.numero_pedido,
  p.canal,
  -- 365 días: `programa_parametros.vigencia_puntos_dias`.
  p.creado_en + interval '365 days',
  p.creado_en
from pedidos p
where p.org_id = (select id from org)
  and (p.numero_pedido like 'PED-ACUM-%' or p.numero_pedido like 'PED-DEV-%')
  and exists (select 1 from pedido_items i where i.pedido_id = p.id)
  and not exists (
    select 1 from points_ledger l where l.origen = 'Compra ' || p.numero_pedido
  );

-- ── 6 · Las devoluciones ───────────────────────────────────────────────
--
-- `registrado_por` queda en null: estas devoluciones son del mostrador, y no
-- hay una pantalla desde la que un usuario del portal las registre todavía.
-- El log resuelve el actor con la tienda, que es lo cierto.
--
-- Los canales no espejan siempre el de la compra: Lucía compró en
-- e-commerce y devolvió en tienda, que es el caso más común de los tres.

with org as (select id from organizations where slug = 'omni'),
pedido_ids as (
  select id, numero_pedido, member_id, tienda_id
  from pedidos where org_id = (select id from org)
)
insert into devoluciones (
  org_id, pedido_id, member_id, numero_devolucion, motivo, nota,
  canal, tienda_id, creado_en
)
select
  (select id from org), ped.id, ped.member_id,
  v.numero_devolucion, v.motivo, v.nota, v.canal, ped.tienda_id,
  now() - (v.dias_atras || ' days')::interval
from (
  values
    (
      'DEV-2026-001', 'PED-ACUM-06', 'no_era_lo_esperado',
      'Trajo una de las tres cajas sin abrir: la compró pensando que era el multivitamínico.',
      'pos', 3
    ),
    (
      'DEV-2026-002', 'PED-DEV-01', 'error_en_pedido',
      'Le llegó un pedido que no era el suyo. Devuelve las dos líneas y se rehace la compra.',
      'pos', 5
    ),
    (
      'DEV-2026-003', 'PED-DEV-02', 'reaccion_adversa',
      'Reportó ardor gástrico desde la primera toma. Se retira una caja y se avisa al regente.',
      'pos', 8
    ),
    (
      'DEV-2026-004', 'PED-DEV-03', 'producto_vencido',
      'El frasco salió con fecha de vencimiento del mes pasado. Revisar el lote en bodega.',
      'pos', 12
    ),
    (
      'DEV-2026-005', 'PED-DEV-04', 'arrepentimiento',
      'Cambió de decisión con el shampoo; se queda con el gel antibacterial.',
      'app', 2
    )
) as v (numero_devolucion, numero_pedido, motivo, nota, canal, dias_atras)
join pedido_ids ped on ped.numero_pedido = v.numero_pedido
on conflict (org_id, numero_devolucion) do nothing;

-- ── 7 · Qué volvió de cada pedido ──────────────────────────────────────
--
-- El precio devuelto sale de la línea comprada, no del catálogo de hoy: si
-- el producto subió de precio entre la venta y la devolución, se devuelve lo
-- que se pagó. El trigger de `devolucion_items` recalcula los totales y, si
-- todo volvió, pone el pedido en `devuelto`.

with org as (select id from organizations where slug = 'omni'),
devolucion_ids as (
  select id, numero_devolucion from devoluciones where org_id = (select id from org)
),
pedido_ids as (
  select id, numero_pedido from pedidos where org_id = (select id from org)
),
producto_ids as (
  select id, sku from productos where org_id = (select id from org)
)
insert into devolucion_items (
  devolucion_id, pedido_item_id, producto_id, cantidad,
  precio_unitario, costo_unitario
)
select
  d.id, i.id, i.producto_id, v.cantidad, i.precio_unitario, i.costo_unitario
from (
  values
    ('DEV-2026-001', 'PED-ACUM-06', 'FAR-71710', 1),  -- rompe el ciclo: 3 → 2
    ('DEV-2026-002', 'PED-DEV-01',  'FAR-71600', 1),  -- pedido completo:
    ('DEV-2026-002', 'PED-DEV-01',  'FAR-71230', 1),  -- pasa a `devuelto`
    ('DEV-2026-003', 'PED-DEV-02',  'FAR-71105', 1),  -- parcial: 1 de 2
    ('DEV-2026-004', 'PED-DEV-03',  'FAR-70517', 1),  -- única línea → devuelto
    ('DEV-2026-005', 'PED-DEV-04',  'FAR-71520', 1)   -- parcial: se queda el gel
) as v (numero_devolucion, numero_pedido, sku, cantidad)
join devolucion_ids d on d.numero_devolucion = v.numero_devolucion
join pedido_ids ped on ped.numero_pedido = v.numero_pedido
join producto_ids pr on pr.sku = v.sku
join pedido_items i on i.pedido_id = ped.id and i.producto_id = pr.id
on conflict (devolucion_id, pedido_item_id) do nothing;

-- ── 8 · La reversión de puntos de cada devolución ──────────────────────
--
-- Entra como `ajuste` con el `origen` nombrando la devolución, no como un
-- tipo nuevo: ver el encabezado de `20260907090000_devoluciones.sql`. Y solo
-- revierte lo que volvió —la misma tasa sobre `total_devuelto`—, no el
-- pedido entero: una devolución parcial no borra la compra.

with org as (select id from organizations where slug = 'omni')
insert into points_ledger (
  org_id, member_id, tipo, puntos, origen, canal, creado_en
)
select
  d.org_id, d.member_id, 'ajuste',
  -floor(d.total_devuelto / 10)::integer,
  'Reversión por devolución ' || d.numero_devolucion,
  d.canal,
  d.creado_en
from devoluciones d
where d.org_id = (select id from org)
  and d.numero_devolucion like 'DEV-2026-%'
  and exists (select 1 from devolucion_items di where di.devolucion_id = d.id)
  and not exists (
    select 1 from points_ledger l
    where l.origen = 'Reversión por devolución ' || d.numero_devolucion
  );

-- ── 9 · Los dos ciclos que YA se cobraron ──────────────────────────────
--
-- Sin un canje registrado, un ciclo cumplido se lee como «por reclamar» —y
-- con razón: es lo que distingue "se la debemos" de "ya se la llevó". Sofía
-- cobró su única pieza; Daniela cobró la primera de sus dos y la segunda
-- sigue pendiente.
--
-- `metadatos.piezas_compradas` es lo que el panel de la bitácora usa para
-- explicar qué se evaluó en esa compra (ver `evaluationLabel` en
-- `promotion-log-detail.tsx`).

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-3X2-VITAM'
),
socios as (select id, email from members where org_id = (select id from org))
insert into promocion_eventos (
  org_id, promocion_id, member_id, tipo, titulo, detalle,
  actor_tipo, actor_etiqueta, canal, metadatos, ocurrido_en
)
select
  (select id from org), (select id from promo),
  (select id from socios where socios.email = v.email),
  'canje', v.titulo, v.detalle,
  'sistema', 'Motor de promociones', v.canal,
  jsonb_build_object(
    'piezas_compradas', v.piezas,
    'tipo_beneficio', 'por_piezas',
    'unidades_gratis', 1
  ),
  now() - (v.dias_atras || ' days')::interval
from (
  values
    (
      'sofia.ramirez@example.com',
      'Pieza gratis entregada', 'Vitamina D3 2000 UI · 3x2', 'pos', 3, 15
    ),
    (
      'daniela.cardenas@example.com',
      'Pieza gratis entregada', 'Colágeno hidrolizado · 3x2', 'pos', 3, 17
    )
) as v (email, titulo, detalle, canal, piezas, dias_atras)
where (select id from promo) is not null
  and (select id from socios where socios.email = v.email) is not null
  and not exists (
    select 1 from promocion_eventos pe
    where pe.promocion_id = (select id from promo)
      and pe.member_id = (select id from socios where socios.email = v.email)
      and pe.tipo = 'canje'
  );

-- ── 10 · El ciclo de vida de la promoción nueva ────────────────────────
--
-- Sin estos dos eventos la promoción aparecería en la bitácora solo por sus
-- canjes: existiría desde el día en que alguien cobró una pieza, sin que
-- nada dijera cuándo se creó ni cuándo se publicó. El log es un hilo, y un
-- hilo que empieza por el final no se puede leer.

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id, creado_en from promociones
  where org_id = (select id from org) and codigo = 'PROMO-3X2-VITAM'
)
insert into promocion_eventos (
  org_id, promocion_id, tipo, titulo, detalle,
  actor_tipo, actor_etiqueta, metadatos, ocurrido_en
)
select
  (select id from org), (select id from promo), v.tipo, v.titulo, v.detalle,
  'usuario', 'Carlos Granados', '{}'::jsonb,
  (select creado_en from promo) + (v.horas_despues || ' hours')::interval
from (
  values
    (
      'creada', 'Promoción creada',
      '3x2 sobre Vitamina D3 y Colágeno, financiada por el laboratorio al 80 %',
      0
    ),
    (
      'activada', 'Promoción activada',
      'Aprobada por Admin · vigencia de 45 días con tope de 9 piezas por socio al mes',
      26
    )
) as v (tipo, titulo, detalle, horas_despues)
where (select id from promo) is not null
  and not exists (
    select 1 from promocion_eventos pe
    where pe.promocion_id = (select id from promo) and pe.tipo = v.tipo
  );
