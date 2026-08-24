-- Asignación manual de una promoción a un socio ("Enviar promoción" en el
-- Hero de 05.3g). No existe tabla de canjes por socio en este proyecto
-- (ver comentario en `20260823120000_promociones.sql` y en
-- `member-promotions-card.tsx`) — esta tabla tampoco lo es: es un override
-- de elegibilidad (un gestor habilita una promoción para un socio puntual,
-- salteando la condición de segmento/categoría), no un canje real en caja.
-- Por eso no toca `promociones.canjes` / `presupuesto_consumido`: esos
-- contadores representan eventos de checkout que no existen todavía.
create table member_promociones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  promocion_id uuid not null references promociones (id) on delete cascade,
  asignado_por uuid references profiles (id) on delete set null,
  nota text,
  asignado_en timestamptz not null default now(),
  unique (member_id, promocion_id)
);

create index member_promociones_member_id_idx on member_promociones (member_id);
create index member_promociones_promocion_id_idx on member_promociones (promocion_id);

alter table member_promociones enable row level security;

create policy member_promociones_org on member_promociones
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant select, insert, update, delete on member_promociones to authenticated;
