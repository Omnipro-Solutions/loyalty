-- Tenencia multi-org, perfiles y control de acceso.
-- Convención: sin `enum` de Postgres — conjuntos cerrados se modelan como
-- `text` + `check`, con valores en snake_case español (misma regla que el
-- union type `as const` del lado TypeScript, ver src/types/domain.ts).

create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  dominio_correo text not null unique,
  -- proveedor de identidad SSO detectado por dominio de correo (01.3-01.5).
  -- 'microsoft_entra_id' funciona hoy vía OAuth (plan free). 'saml_okta' /
  -- 'saml_ping' / 'saml_google_workspace' quedan modelados para cuando el
  -- proyecto suba a Supabase Pro; hasta entonces el descubrimiento de IdP
  -- los muestra pero el flag SSO_SAML_ENABLED bloquea el redirect real.
  tenant_idp text check (
    tenant_idp is null
    or tenant_idp in ('microsoft_entra_id', 'saml_okta', 'saml_ping', 'saml_google_workspace')
  ),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on column organizations.dominio_correo is
  'Dominio de correo corporativo usado para el descubrimiento de IdP en el login SSO (01.3).';

-- Conjunto cerrado de roles del MVP. Espejo TS en src/lib/permissions.ts
-- (tupla `as const` ROLES) — mantener ambos en sync.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  email text not null,
  color_avatar text,
  rol text not null default 'lector' check (rol in ('admin', 'gestor', 'aprobador', 'lector')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index profiles_org_id_idx on profiles (org_id);

-- Matriz rol → permiso, para la pantalla 09.2 "Equipo · roles y permisos".
-- Fuente de verdad para la UI; la autorización real en código corre por la
-- función pura `can(rol, accion, recurso)` en src/lib/permissions.ts, que
-- debe mantenerse equivalente a esta tabla.
create table role_permissions (
  rol text not null check (rol in ('admin', 'gestor', 'aprobador', 'lector')),
  recurso text not null,
  accion text not null,
  permitido boolean not null default true,
  primary key (rol, recurso, accion)
);

-- "Recordar este dispositivo por 30 días" (01.1) / "No volver a pedir código
-- en este dispositivo" (01.2). Supabase Auth no trae esto de fábrica.
create table trusted_devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  token_hash text not null,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  unique (profile_id, token_hash)
);

create index trusted_devices_profile_id_idx on trusted_devices (profile_id);

-- Códigos de respaldo de MFA (sustituyen el método "SMS al •••• 4821" de
-- 01.2: Advanced MFA - Phone es un add-on de pago; los backup codes son
-- gratis y auditables). Cada código se guarda hasheado y se consume una vez.
create table mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  code_hash text not null,
  usado_en timestamptz,
  creado_en timestamptz not null default now()
);

create index mfa_backup_codes_profile_id_idx on mfa_backup_codes (profile_id);

create function set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger organizations_set_actualizado_en
  before update on organizations
  for each row execute function set_actualizado_en();

create trigger profiles_set_actualizado_en
  before update on profiles
  for each row execute function set_actualizado_en();
