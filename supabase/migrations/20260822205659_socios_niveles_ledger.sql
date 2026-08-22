-- Dominio de lealtad: niveles, socios, ledger de puntos, cupones, retos y
-- segmentos de audiencia. Revelado por el catálogo de bloques del builder
-- (Figma 08.4: "Operan sobre el ledger de puntos, niveles y beneficios del
-- socio") — el producto es más que un motor de promociones.

-- Niveles fijos del MVP (Diamante/Oro/Plata/Bronce, ver 08.5 "Multiplicador
-- por nivel"). Se modela como tabla (no `check`) porque cada organización
-- puede ajustar multiplicador y umbral sin tocar código.
create table tiers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null check (nombre in ('diamante', 'oro', 'plata', 'bronce')),
  multiplicador numeric(4, 2) not null default 1.0,
  umbral_puntos integer not null default 0,
  orden smallint not null,
  unique (org_id, nombre)
);

create table members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  email text not null,
  tier_id uuid references tiers (id) on delete set null,
  saldo_puntos integer not null default 0,
  fecha_alta timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (org_id, email)
);

create index members_org_id_idx on members (org_id);
create index members_tier_id_idx on members (tier_id);

-- Extracto de puntos del socio. Append-only por diseño: nunca se actualiza
-- ni se borra una fila, cada movimiento es un hecho auditable (ver
-- "Registrar en ledger" en 08.5). `members.saldo_puntos` es una proyección
-- mantenida por trigger para lectura rápida en UI.
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  tipo text not null check (tipo in ('acumulacion', 'canje', 'expiracion', 'ajuste')),
  puntos integer not null,
  origen text,
  workflow_run_id uuid,
  expira_en timestamptz,
  creado_en timestamptz not null default now()
);

create index points_ledger_member_id_idx on points_ledger (member_id);
create index points_ledger_org_id_idx on points_ledger (org_id);

create function apply_points_ledger_entry()
returns trigger
language plpgsql
as $$
begin
  update members
  set saldo_puntos = saldo_puntos + new.puntos,
      actualizado_en = now()
  where id = new.member_id;
  return new;
end;
$$;

create trigger points_ledger_apply_after_insert
  after insert on points_ledger
  for each row execute function apply_points_ledger_entry();

create table coupons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  member_id uuid references members (id) on delete set null,
  codigo text not null,
  tipo text not null check (tipo in ('descuento_porcentaje', 'descuento_monto', 'envio_gratis', '2x1')),
  valor numeric(10, 2),
  vigente_desde timestamptz not null default now(),
  vigente_hasta timestamptz,
  estado text not null default 'activo' check (estado in ('activo', 'canjeado', 'expirado', 'anulado')),
  workflow_run_id uuid,
  creado_en timestamptz not null default now(),
  unique (org_id, codigo)
);

create index coupons_member_id_idx on coupons (member_id);
create index coupons_org_id_idx on coupons (org_id);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  nombre text not null,
  definicion jsonb not null default '{}'::jsonb,
  progreso integer not null default 0,
  meta integer not null,
  premio jsonb not null default '{}'::jsonb,
  estado text not null default 'en_progreso' check (estado in ('en_progreso', 'cumplido', 'expirado')),
  workflow_run_id uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index challenges_member_id_idx on challenges (member_id);

-- Definición de audiencia (sección 11 y bloque "Entra al segmento" / "Condición
-- múltiple" del builder). El árbol de condiciones se guarda como JSONB con la
-- misma forma que produce el inspector de react-querybuilder en el cliente.
create table segments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  descripcion text,
  condiciones jsonb not null default '{}'::jsonb,
  conteo_estimado integer,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index segments_org_id_idx on segments (org_id);

create trigger members_set_actualizado_en
  before update on members
  for each row execute function set_actualizado_en();

create trigger challenges_set_actualizado_en
  before update on challenges
  for each row execute function set_actualizado_en();

create trigger segments_set_actualizado_en
  before update on segments
  for each row execute function set_actualizado_en();
