-- Módulo de Tiendas (Fase 5, Figma "04 · Tiendas"). A diferencia de
-- Catálogo, el Figma no define una pantalla de detalle de solo lectura —
-- define listado (04.1) y el formulario de creación (04.2). El mismo
-- formulario se reutiliza para editar (decisión de producto, no está en
-- el Figma).

create table tiendas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  -- Código con el que la tienda se sincroniza con el POS (04.2 "ID de tienda").
  codigo_tienda text not null,
  formato text not null check (formato in ('flagship', 'express', 'mall')),
  -- 'en_apertura' es el estado inicial hasta la primera transacción del POS
  -- (nota de 04.2) — no hay integración real de POS todavía, así que en este
  -- MVP el estado se gestiona a mano desde el formulario.
  estado text not null default 'en_apertura' check (
    estado in ('operando', 'bajo_meta', 'en_apertura', 'cerrada_temporal')
  ),
  pais text not null,
  region text not null,
  ciudad text not null,
  colonia text not null,
  direccion text not null,
  codigo_postal text not null,
  referencia text,
  telefono text not null,
  email text not null,
  responsable text,
  zona_horaria text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (org_id, codigo_tienda)
);

create index tiendas_org_id_idx on tiendas (org_id);

create trigger tiendas_set_actualizado_en
  before update on tiendas
  for each row execute function set_actualizado_en();

alter table tiendas enable row level security;

create policy tiendas_org on tiendas
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant select, insert, update, delete on tiendas to authenticated;
