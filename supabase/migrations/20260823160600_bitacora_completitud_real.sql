-- Fix: `calcular_completitud_producto` (20260823160000) inventó su propia
-- fórmula (8 campos incl. imagen_url/costo_unitario/precio). Ya existía una
-- fórmula real y en uso — `calcularCompletitud()` en
-- src/features/catalogo/lib/completitud.ts, que alimenta "Salud del
-- inventario" (03.1) — 5 campos (codigo_barras, marca, proveedor,
-- presentacion, tipo_producto) + si tiene al menos una `producto_categorias`.
-- Tener dos fórmulas de completitud distintas para el mismo producto es
-- justo la clase de inconsistencia que el proyecto busca evitar. Se
-- realinea la bitácora a la fórmula real, incluyendo un trigger nuevo en
-- `producto_categorias` (clasificar/declasificar también cambia completitud,
-- y esa tabla no tiene columnas propias de producto para engancharse).
-- Distinta firma de parámetros (6 vs. 8) → `create or replace` no pisa la
-- versión anterior, la sobrecarga. Se elimina explícitamente para no dejar
-- dos fórmulas de completitud coexistiendo en el esquema.
drop function if exists calcular_completitud_producto(text, text, text, text, text, text, numeric, numeric);

create function calcular_completitud_producto(
  p_codigo_barras text, p_marca text, p_proveedor text,
  p_presentacion text, p_tipo_producto text, p_tiene_clasificacion boolean
) returns integer
language sql
immutable
as $$
  select round(100.0 * (
    (p_codigo_barras is not null and p_codigo_barras <> '')::int +
    (p_marca is not null and p_marca <> '')::int +
    (p_proveedor is not null and p_proveedor <> '')::int +
    (p_presentacion is not null and p_presentacion <> '')::int +
    (p_tipo_producto is not null and p_tipo_producto <> '')::int +
    p_tiene_clasificacion::int
  ) / 6)::integer
$$;

create or replace function productos_set_completitud()
returns trigger
language plpgsql
as $$
begin
  new.completitud_pct := calcular_completitud_producto(
    new.codigo_barras, new.marca, new.proveedor, new.presentacion, new.tipo_producto,
    exists (select 1 from producto_categorias where producto_id = new.id)
  );
  return new;
end;
$$;

-- `producto_categorias` no tiene un `updated_en` propio para enganchar un
-- trigger BEFORE UPDATE — se recalcula completitud del producto afectado
-- directamente tras cada alta/baja de clasificación.
create or replace function producto_categorias_recalcular_completitud()
returns trigger
language plpgsql
as $$
declare
  v_producto_id uuid := coalesce(new.producto_id, old.producto_id);
begin
  update productos
  set completitud_pct = calcular_completitud_producto(
    codigo_barras, marca, proveedor, presentacion, tipo_producto,
    exists (select 1 from producto_categorias where producto_id = v_producto_id)
  )
  where id = v_producto_id;
  return null;
end;
$$;

create trigger producto_categorias_recalcular_completitud
  after insert or delete on producto_categorias
  for each row execute function producto_categorias_recalcular_completitud();

-- Recalcula todo con la fórmula correcta sin generar eventos de bitácora
-- por esta corrección (no es un cambio real del catálogo, es un arreglo).
alter table productos disable trigger productos_registrar_eventos;

update productos p
set completitud_pct = calcular_completitud_producto(
  p.codigo_barras, p.marca, p.proveedor, p.presentacion, p.tipo_producto,
  exists (select 1 from producto_categorias pc where pc.producto_id = p.id)
);

alter table productos enable trigger productos_registrar_eventos;

grant execute on function calcular_completitud_producto(text, text, text, text, text, boolean) to authenticated;
