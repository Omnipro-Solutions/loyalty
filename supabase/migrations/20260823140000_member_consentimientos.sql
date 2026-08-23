-- Consentimiento de marketing por canal (Figma 05.3g "Card ·
-- Consentimientos", "Solo lectura · Ley 1581"). A diferencia de las demás
-- cards que le faltan a 05.3g, esta SÍ se puede construir de verdad — no
-- depende de pedidos ni de un motor de scoring, solo de un modelo de
-- datos que `members.consentimiento_marketing` (un solo booleano) no
-- alcanza a expresar. La tarjeta es de solo lectura en el propio Figma,
-- así que no hay Server Action de edición todavía.
create table member_consentimientos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  canal text not null check (
    canal in ('email', 'sms', 'push', 'whatsapp', 'personalizacion', 'socios_comerciales')
  ),
  otorgado boolean not null default false,
  fuente text check (fuente is null or fuente in ('web', 'app', 'tienda', 'formulario')),
  actualizado_en timestamptz not null default now(),
  unique (member_id, canal)
);

create index member_consentimientos_member_id_idx on member_consentimientos (member_id);

alter table member_consentimientos enable row level security;

create policy member_consentimientos_org on member_consentimientos
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant select, insert, update, delete on member_consentimientos to authenticated;
