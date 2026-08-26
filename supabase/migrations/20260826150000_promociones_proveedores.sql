-- Catálogo mínimo de proveedores (nombre + RFC), para que el campo
-- "Proveedor" del paso Economía de Promociones sea un select en vez de
-- texto libre. Deliberadamente sin relación con `productos.proveedor`
-- (sigue siendo texto libre, condición "Proveedor / laboratorio" de
-- Catálogo) — son dos conceptos distintos: aquí es "quién cofinancia esta
-- promoción", no "quién fabrica este SKU". Los datos demo (México, RFC
-- ilustrativos) van en `seed.sql`, igual que `categorias`/`productos`.
create table proveedores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  rfc text,
  creado_en timestamptz not null default now(),
  unique (org_id, nombre)
);

create index proveedores_org_id_idx on proveedores (org_id);

alter table proveedores enable row level security;

create policy proveedores_org on proveedores
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

-- GRANT explícito requerido — ver comentario extenso en
-- 20260822205859_rls.sql sobre `auto_expose_new_tables`.
grant select, insert, update, delete on proveedores to authenticated;

-- `promociones.proveedor` (texto libre, 20260826120000_promociones_economia.sql)
-- pasa a ser una referencia real — ninguna promoción sembrada hoy usa
-- `financiador <> 'retailer'`, así que no hay datos que migrar.
alter table promociones add column proveedor_id uuid references proveedores (id) on delete set null;
alter table promociones drop column proveedor;
