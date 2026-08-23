-- "11 · Audiencias" (listado + detalle). `segments` ya existía desde Fase 1
-- (solo guardaba la definición); esto agrega los campos reales que pinta la
-- UI: código corto, estado de publicación, nivel dominante entre sus
-- miembros y el estado de sincronización con Adobe Journey Optimizer.
alter table segments add column codigo text;
alter table segments add column estado text not null default 'activa' check (estado in ('activa', 'pausada'));
alter table segments add column nivel_dominante text check (nivel_dominante is null or nivel_dominante in ('diamante', 'oro', 'plata', 'bronce'));
alter table segments add column sincronizado_con_ajo boolean not null default false;
alter table segments add column ultima_sincronizacion_en timestamptz;

update segments set codigo = 'seg_' || substr(id::text, 1, 8) where codigo is null;
alter table segments alter column codigo set not null;
alter table segments add constraint segments_codigo_unique unique (org_id, codigo);

-- Serie diaria de tamaño (11.2 "Tamaño de audiencia": sparkline + nuevos/
-- salieron/últimos 30 días, y la flecha de TENDENCIA en 11.1). Sin motor de
-- evaluación en tiempo real (ver `ClienteAudienciasCard`), esta tabla es la
-- única fuente de cómo varió el tamaño estimado día a día — se llena por
-- sincronización (aquí, seed), no por trigger.
create table segment_size_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  segment_id uuid not null references segments (id) on delete cascade,
  fecha date not null,
  tamano integer not null,
  unique (segment_id, fecha)
);

create index segment_size_history_segment_id_idx on segment_size_history (segment_id);

-- Muestra real de socios que hoy cumplen la condición del segmento (11.2,
-- tabla de miembros). No es el universo completo — `segments.conteo_estimado`
-- sigue siendo la única fuente para el tamaño real de la audiencia; esto es
-- una muestra curada para el detalle, mismo espíritu que "Card · Muestra de
-- la audiencia" del constructor (11.3, oculto en Figma, no implementado).
create table segment_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  segment_id uuid not null references segments (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  agregado_en timestamptz not null default now(),
  unique (segment_id, member_id)
);

create index segment_members_segment_id_idx on segment_members (segment_id);
create index segment_members_member_id_idx on segment_members (member_id);

alter table segment_size_history enable row level security;
alter table segment_members enable row level security;

create policy segment_size_history_org on segment_size_history
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy segment_members_org on segment_members
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant select, insert, update, delete on segment_size_history, segment_members to authenticated;
