-- Mecánicas restantes del catálogo de Promociones (docs/promociones.md
-- §6/§7): `por_piezas` (BxGy), `producto_gratis` y `precio_fijo_bundle`
-- (que hasta ahora solo usaban el `valor_beneficio` genérico, sin campos
-- propios), `multiplicador_puntos`, `bono_puntos` y `emitir_cupon`
-- (nuevas por completo). Versión transaccional únicamente — evaluada
-- contra un solo carrito, igual que `descuento_escalonado`
-- (20260825090000_promociones_descuento_escalonado.sql). La variante
-- acumulada en el tiempo y el resto del catálogo de 23 modalidades de
-- docs/modalidades-promocion-contexto.md quedan para una fase posterior.
--
-- El constraint de `tipo_beneficio` ya se recreó una vez en la migración
-- de escalonado (quedó con 6 valores) — se vuelve a recrear aquí con los
-- 10 valores completos.
alter table promociones drop constraint promociones_tipo_beneficio_check;
alter table promociones add constraint promociones_tipo_beneficio_check check (
  tipo_beneficio in (
    'descuento_porcentual',
    'descuento_monto_fijo',
    'envio_gratis',
    'producto_gratis',
    'precio_fijo_bundle',
    'descuento_escalonado',
    'por_piezas',
    'multiplicador_puntos',
    'bono_puntos',
    'emitir_cupon'
  )
);

-- === por_piezas (BxGy) ===
alter table promociones add column compra_cantidad int;
alter table promociones add column paga_cantidad int;
alter table promociones add column alcance_piezas text check (
  alcance_piezas is null or alcance_piezas in ('mismo_producto', 'misma_categoria', 'producto_especifico')
);
alter table promociones add column descuento_unidad_extra_pct numeric;

-- Compartida entre `por_piezas` (alcance_piezas = 'producto_especifico':
-- la unidad gratis es el mismo SKU comprado) y `producto_gratis` (el
-- producto cuya compra dispara el regalo) — nunca dos mecánicas activas a
-- la vez en la misma fila. `on delete set null`, no un check de
-- "requerido": borrar un producto no debe hacer fallar el borrado con
-- 23514, solo desvincularlo (mismo criterio que `coupon_batch.free_product_id`,
-- 20260824110000_cupones_esquema.sql:83).
alter table promociones add column producto_comprado_id uuid references productos (id) on delete set null;

-- === producto_gratis ===
alter table promociones add column producto_regalo_id uuid references productos (id) on delete set null;
alter table promociones add column cantidad_regalo int;

-- === precio_fijo_bundle ===
alter table promociones add column productos_bundle_ids uuid[];

-- === multiplicador_puntos ===
-- Se aplica sobre el resultado del nivel de lealtad (`tiers.multiplicador`),
-- no lo reemplaza — ambos se multiplican en cadena cuando el motor de
-- puntos real exista.
alter table promociones add column multiplicador_puntos numeric(4, 2);
alter table promociones add column niveles_requeridos text[];

-- === bono_puntos ===
alter table promociones add column bono_puntos int;

-- Compartida entre `envio_gratis`, `bono_puntos` y `emitir_cupon`: las 3
-- son "monto mínimo del carrito que activa el beneficio" — mismo
-- significado, nunca dos mecánicas activas a la vez.
alter table promociones add column monto_minimo_disparo numeric;

-- === emitir_cupon ===
alter table promociones add column coupon_batch_id uuid references coupon_batch (id) on delete set null;
alter table promociones add column motivo_emision text;

-- Checks que mirroran una regla real de negocio (mismo criterio que
-- `promociones_escalones_requeridos` de la migración anterior) — sin
-- mirror de "requerido" para los FK, por la misma razón del comentario de
-- arriba.
alter table promociones add constraint promociones_bxgy_paga_menor check (
  tipo_beneficio <> 'por_piezas'
  or paga_cantidad is null
  or compra_cantidad is null
  or paga_cantidad < compra_cantidad
);
alter table promociones add constraint promociones_niveles_validos check (
  niveles_requeridos is null
  or niveles_requeridos <@ array['diamante', 'oro', 'plata', 'bronce']::text[]
);
