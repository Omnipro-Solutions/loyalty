-- Precios por producto (Figma 03.3 "Card · Precios"), solo para visualizar
-- en la ficha — sin pantalla ni tabla de "listas de precio" administrable
-- (decisión de producto: no hay UI de gestión todavía). La fila de
-- promoción del mock ("Promo 2x1 Semana Salud") queda fuera: depende del
-- módulo de Promociones, que no existe.

create table producto_precios (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos (id) on delete cascade,
  nombre_lista text not null,
  -- Alcance en texto libre (ej. "Todos los canales", "Convenios EPS") — no
  -- hay un catálogo de canales/tiendas normalizado para esto todavía.
  canal text not null,
  precio numeric(12, 2) not null,
  es_base boolean not null default false,
  vigente_desde timestamptz not null default now(),
  vigente_hasta timestamptz,
  creado_en timestamptz not null default now(),
  unique (producto_id, nombre_lista)
);

create index producto_precios_producto_id_idx on producto_precios (producto_id);

-- A lo sumo un precio base por producto (mismo patrón que
-- producto_categorias_principal_unico).
create unique index producto_precios_base_unico
  on producto_precios (producto_id)
  where es_base;

alter table producto_precios enable row level security;

-- Reusa `producto_owned_by_current_org`, ya definida en
-- 20260823080000_clasificacion_productos.sql para producto_categorias.
create policy producto_precios_org on producto_precios
  for all to authenticated
  using (producto_owned_by_current_org(producto_id))
  with check (producto_owned_by_current_org(producto_id));

grant select, insert, update, delete on producto_precios to authenticated;
