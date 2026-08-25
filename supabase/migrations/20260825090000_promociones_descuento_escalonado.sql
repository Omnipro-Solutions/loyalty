-- Nueva mecánica `descuento_escalonado` (docs/promociones.md §7.1a),
-- versión TRANSACCIONAL únicamente: los escalones se evalúan contra un
-- solo carrito (unidades o monto alcanzados en una compra). La variante
-- "acumulado en el tiempo" (§7.1b) es un programa de niveles de lealtad y
-- extiende `cambio_nivel` del Loyalty Builder — no se modela aquí.
--
-- `tipo_beneficio` se creó con un check en línea sin nombre en
-- 20260823120000_promociones.sql, así que Postgres lo nombró
-- `promociones_tipo_beneficio_check` (mismo patrón que otros checks
-- inline de este proyecto). Verificar antes de aplicar si hay duda:
--   select conname from pg_constraint
--   where conrelid = 'promociones'::regclass and contype = 'c';
alter table promociones drop constraint promociones_tipo_beneficio_check;
alter table promociones add constraint promociones_tipo_beneficio_check check (
  tipo_beneficio in (
    'descuento_porcentual',
    'descuento_monto_fijo',
    'envio_gratis',
    'producto_gratis',
    'precio_fijo_bundle',
    'descuento_escalonado'
  )
);

-- Cada elemento: { umbral: number, beneficio_valor: number }, donde
-- `beneficio_valor` es un porcentaje (1-100). Null cuando la mecánica no
-- es escalonada — mismo criterio de "no aplica" que `usos_periodo`.
alter table promociones add column escalones jsonb;

-- `unidades` | `monto`: qué se mide en el carrito para decidir el escalón.
-- Es un toggle de toda la regla, no de cada escalón individual.
alter table promociones add column umbral_tipo text check (
  umbral_tipo is null or umbral_tipo in ('unidades', 'monto')
);

-- `escalon_unico`: el escalón más alto alcanzado aplica a todo el pedido.
-- `progresivo`: cada tramo se descuenta por separado y se suman (tramos de
-- impuesto). Decisión de producto por promoción, no de plataforma.
alter table promociones add column modo_calculo text check (
  modo_calculo is null or modo_calculo in ('escalon_unico', 'progresivo')
);

-- Espejo en SQL del `superRefine` de features/promotions/schemas.ts: una
-- promoción escalonada sin al menos 2 escalones no es interpretable por
-- ningún motor de evaluación.
alter table promociones add constraint promociones_escalones_requeridos check (
  tipo_beneficio <> 'descuento_escalonado'
  or (
    escalones is not null
    and jsonb_typeof(escalones) = 'array'
    and jsonb_array_length(escalones) >= 2
  )
);
