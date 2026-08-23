-- Clasificación multi-ruta de producto (Figma 03.3 "Clasificación"): un
-- producto puede estar en varias categorías/subcategorías, una marcada
-- principal. Reemplaza el modelo anterior (una `productos.categoria_id`
-- plana) por:
--   1. `categorias` jerárquica (categoría raíz → subcategoría) vía `parent_id`.
--   2. `producto_categorias`, tabla puente muchos-a-muchos con `es_principal`.

alter table categorias
  add column parent_id uuid references categorias (id) on delete cascade;

create index categorias_parent_id_idx on categorias (parent_id);

create table producto_categorias (
  producto_id uuid not null references productos (id) on delete cascade,
  categoria_id uuid not null references categorias (id) on delete cascade,
  es_principal boolean not null default false,
  primary key (producto_id, categoria_id)
);

create index producto_categorias_categoria_id_idx on producto_categorias (categoria_id);

-- A lo sumo una ruta principal por producto.
create unique index producto_categorias_principal_unico
  on producto_categorias (producto_id)
  where es_principal;

-- Migra la asignación existente: la categoria_id actual de cada producto
-- pasa a ser su única ruta, marcada principal.
insert into producto_categorias (producto_id, categoria_id, es_principal)
select id, categoria_id, true
from productos
where categoria_id is not null;

alter table productos drop column categoria_id;

alter table producto_categorias enable row level security;

create or replace function producto_owned_by_current_org(target_producto_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from productos p
    where p.id = target_producto_id and p.org_id = (select current_org_id())
  )
$$;

create policy producto_categorias_org on producto_categorias
  for all to authenticated
  using (producto_owned_by_current_org(producto_id))
  with check (producto_owned_by_current_org(producto_id));

grant select, insert, update, delete on producto_categorias to authenticated;
grant execute on function producto_owned_by_current_org(uuid) to authenticated;
