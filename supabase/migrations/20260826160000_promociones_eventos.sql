-- Bitácora de promociones ("Panel de promociones · Logs", sin nodo Figma —
-- nueva a pedido del usuario). Mismo criterio estructural que `coupon_event`
-- (20260824110000_cupones_esquema.sql): evento append-only con actor/motivo/
-- metadatos, no el modelo de cambio-de-campo de `producto_eventos`
-- (categoria/campo/valor_anterior/valor_nuevo) — lo que necesitamos
-- registrar aquí son eventos de dominio (ciclo de vida + canjes), no ediciones
-- de fila. Nombres de columna en español: a diferencia de `coupon_event`,
-- `promocion_eventos` no es parte del módulo de cupones (la excepción de
-- inglés del CLAUDE.md §3 es explícita y no se generaliza).
--
-- Importante — esto NO resuelve el hueco de "no hay motor de transacciones"
-- que documenta `20260823120000_promociones.sql`: `promociones.canjes` y
-- `presupuesto_consumido` siguen siendo contadores de fila, no la suma de
-- filas `tipo = 'canje'` de esta tabla. Los eventos sembrados aquí son una
-- muestra representativa de actividad reciente para la vista de Logs, no un
-- ledger reconciliado — sembrar un evento por cada uno de los miles de
-- `canjes` ya contados sería ruido, no una demo legible.
create table promocion_eventos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  promocion_id uuid not null references promociones (id) on delete cascade,
  tipo text not null check (
    tipo in (
      'creada',
      'activada',
      'pausada',
      'presupuesto_incrementado',
      'presupuesto_agotado',
      'vencida',
      'cancelada',
      'canje',
      'canje_rechazado'
    )
  ),
  titulo text not null,
  detalle text,
  actor_tipo text not null check (
    actor_tipo in ('usuario', 'sistema', 'regla', 'tienda')
  ),
  actor_id uuid,
  actor_etiqueta text not null,
  codigo_motivo text,
  nota_motivo text,
  metadatos jsonb not null default '{}'::jsonb,
  ip inet,
  ocurrido_en timestamptz not null default now()
);

create index promocion_eventos_promocion_id_idx on promocion_eventos (
  promocion_id, ocurrido_en desc
);
create index promocion_eventos_org_id_idx on promocion_eventos (
  org_id, ocurrido_en desc
);

alter table promocion_eventos enable row level security;

create policy promocion_eventos_org on promocion_eventos
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

-- Solo select+insert aquí — el siguiente archivo revoca update/delete
-- explícitamente (ver su comentario: los privilegios por defecto de
-- Supabase ya conceden CRUD completo a `authenticated` sobre toda tabla
-- nueva, sin importar lo que se otorgue aquí).
grant select, insert on promocion_eventos to authenticated;
