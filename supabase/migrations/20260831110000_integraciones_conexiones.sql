  -- Persistencia real para "12 · Integraciones": hasta ahora el módulo era
  -- 100% catálogo estático (`src/config/integrations-catalog.ts`) sin ninguna
  -- tabla detrás — ni `ACTIVE_CONNECTIONS` (mock en TS) ni el botón
  -- "Configurar" (deshabilitado a propósito, "Disponible en una próxima
  -- fase") tenían contraparte en Supabase.
  --
  -- Esta migración agrega la conexión real por organización a una integración
  -- del catálogo, sus credenciales y sus mapeos de campo. El catálogo en sí
  -- (`integration_id`, nombre, logo, método de auth sugerido) sigue viviendo
  -- en TS — no se duplica en tablas, igual que el catálogo de bloques del
  -- Loyalty Builder no vive en base de datos.
  --
  -- `tipo_auth` cubre el rango real de métodos que ya describe el campo
  -- `method` de cada integración del catálogo (oauth2: AJO/CJO/Shopify/Square;
  -- api_key: Braze; app_key_token: VTEX; token_integracion: Magento;
  -- token_personal: Tableau; certificado: Oracle MICROS; usuario_tecnico: SAP).
  -- La forma exacta de `datos` (qué claves trae el JSON) varía por
  -- `tipo_auth` y se valida en la capa de aplicación (zod), no en Postgres.

  create table integracion_conexiones (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references organizations (id) on delete cascade,
    integration_id text not null,
    direccion text not null check (direccion in ('origen', 'destino')),
    estado text not null default 'pausada' check (
      estado in ('activa', 'con_error', 'pausada')
    ),
    frecuencia text,
    ultima_sincronizacion timestamptz,
    detalle text,
    creado_por uuid references profiles (id) on delete set null,
    creado_en timestamptz not null default now(),
    actualizado_en timestamptz not null default now(),
    unique (org_id, integration_id, direccion)
  );

  create index integracion_conexiones_org_id_idx on integracion_conexiones (org_id);

  create trigger integracion_conexiones_set_actualizado_en
    before update on integracion_conexiones
    for each row execute function set_actualizado_en();

  create table integracion_credenciales (
    id uuid primary key default gen_random_uuid(),
    conexion_id uuid not null references integracion_conexiones (id) on delete cascade,
    tipo_auth text not null check (
      tipo_auth in (
        'oauth2',
        'api_key',
        'app_key_token',
        'token_personal',
        'token_integracion',
        'certificado',
        'usuario_tecnico'
      )
    ),
    -- Estructura libre por `tipo_auth` (ver comentario de cabecera). En un
    -- entorno real esto se cifraría a nivel de columna (pgsodium) — el plan
    -- Free de Supabase no lo trae; queda anotado como deuda conocida, no
    -- resuelto en esta migración.
    datos jsonb not null default '{}'::jsonb,
    expira_en timestamptz,
    rotado_en timestamptz not null default now(),
    creado_en timestamptz not null default now(),
    unique (conexion_id)
  );

  create table integracion_mapeos_campos (
    id uuid primary key default gen_random_uuid(),
    conexion_id uuid not null references integracion_conexiones (id) on delete cascade,
    campo_origen text not null,
    campo_destino text not null,
    transformacion text,
    orden integer not null default 0,
    creado_en timestamptz not null default now()
  );

  create index integracion_mapeos_campos_conexion_id_idx on integracion_mapeos_campos (conexion_id);

  create or replace function integracion_conexion_owned_by_current_org(target_conexion_id uuid)
  returns boolean
  language sql
  stable
  as $$
    select exists (
      select 1 from integracion_conexiones c
      where c.id = target_conexion_id and c.org_id = (select current_org_id())
    )
  $$;

  alter table integracion_conexiones enable row level security;
  alter table integracion_credenciales enable row level security;
  alter table integracion_mapeos_campos enable row level security;

  create policy integracion_conexiones_org on integracion_conexiones
    for all to authenticated
    using (org_scoped(org_id))
    with check (org_scoped(org_id));

  create policy integracion_credenciales_org on integracion_credenciales
    for all to authenticated
    using (integracion_conexion_owned_by_current_org(conexion_id))
    with check (integracion_conexion_owned_by_current_org(conexion_id));

  create policy integracion_mapeos_campos_org on integracion_mapeos_campos
    for all to authenticated
    using (integracion_conexion_owned_by_current_org(conexion_id))
    with check (integracion_conexion_owned_by_current_org(conexion_id));

  grant usage on schema public to authenticated;
  grant select, insert, update, delete on integracion_conexiones, integracion_credenciales, integracion_mapeos_campos to authenticated;
  grant execute on function integracion_conexion_owned_by_current_org(uuid) to authenticated;
