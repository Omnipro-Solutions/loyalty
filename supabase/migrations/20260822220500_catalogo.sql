-- Catálogo de productos (Fase 5, Figma "03 · Catálogo"). Modelo a nivel de
-- SKU: cada fila es una presentación vendible individual (ver KPIs
-- "SKU activos" / "Total de SKU" en 03.1), no un producto agregado con
-- variantes. La clasificación multi-ruta de 03.3 ("5 rutas", una principal)
-- queda fuera del MVP — `categoria_id` es una única categoría por producto;
-- ampliar a taxonomía cuando el módulo de clasificación se construya.

create table categorias (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  creado_en timestamptz not null default now(),
  unique (org_id, nombre)
);

create index categorias_org_id_idx on categorias (org_id);

create table productos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  categoria_id uuid references categorias (id) on delete set null,
  -- Código de referencia externo/proveedor (03.1 "SKU", ej. "FAR-70241").
  sku text not null,
  -- Identificador propio legible (03.3 "ID DEL PRODUCTO", ej. "PRD-004821"),
  -- distinto del sku: sobrevive si el proveedor cambia su propia referencia.
  codigo_producto text not null,
  codigo_barras text,
  nombre text not null,
  presentacion text,
  marca text,
  proveedor text,
  tipo_producto text,
  imagen_url text,
  precio numeric(12, 2) not null default 0,
  puntos integer not null default 0,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (org_id, sku),
  unique (org_id, codigo_producto)
);

create index productos_org_id_idx on productos (org_id);
create index productos_categoria_id_idx on productos (categoria_id);

create trigger productos_set_actualizado_en
  before update on productos
  for each row execute function set_actualizado_en();

alter table categorias enable row level security;
alter table productos enable row level security;

create policy categorias_org on categorias
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy productos_org on productos
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

-- GRANT explícito requerido — ver comentario extenso en
-- 20260822205859_rls.sql sobre `auto_expose_new_tables`.
grant select, insert, update, delete on categorias, productos to authenticated;
