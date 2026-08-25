-- Fase 0 del plan "llevar el configurador de promociones al 90%" (ver
-- docs/promociones.md — se actualiza al cierre de cada fase). Tres piezas
-- de infraestructura que las fases 1-4 necesitan y que no dependen entre
-- sí:
--   1. `programa_parametros` — parámetros de organización (valor del
--      punto, breakage, techo de descuento apilado, exclusiones del
--      reglamento) que hoy no existen en ningún lado: `valor del punto`
--      está hardcodeado en `features/members/lib/queries.ts`
--      (`POINT_VALUE_USD = 0.0017`), y el resto no existe.
--   2. `categorias.taxonomia` — sin esto, S11/S23 (nunca segmentar por
--      dato de salud; usar taxonomía comercial) no son declarables: hoy
--      solo hay un árbol de categorías, sin distinguir comercial de
--      terapéutica.
--   3. `productos.precio_minimo_legal` — lo pide T03 (precio especial por
--      SKU): "Sin tope por cliente, un precio especial es canal de abasto
--      para terceros" es el otro control de T03, ya cubierto por límites
--      (Fase 1); este es el control de precio.

create table programa_parametros (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  valor_punto numeric(10, 4) not null default 0.0017,
  breakage_estimado_pct numeric(5, 2) not null default 0,
  redencion_cashback_pct numeric(5, 2) not null default 0,
  techo_descuento_apilado_pct numeric(5, 2) not null default 50,
  vigencia_puntos_dias int,
  -- Las 5 exclusiones que el documento nombra explícitamente (línea 229):
  -- "tabaco, pago de servicios, tarjetas prepago, recargas, productos
  -- Herbalife". Lista cerrada porque son categorías reglamentarias, no
  -- libres — igual criterio que cualquier check de dominio en este repo.
  exclusiones_reglamento text[] not null default '{}',
  -- Los techos de catálogo que ninguna promoción puede superar
  -- (invariante 2 de límites, Fase 1: "el catálogo pone el techo, la
  -- promoción solo puede bajarlo"). Se tipa fuerte del lado de TS cuando
  -- la Fase 1 declara `LIMIT_UNITS` — aquí solo se persiste la forma.
  topes_catalogo jsonb not null default '[]',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (org_id)
);

alter table programa_parametros add constraint programa_parametros_exclusiones_validas check (
  exclusiones_reglamento <@ array[
    'tabaco', 'pago_servicios', 'tarjetas_prepago', 'recargas', 'herbalife'
  ]::text[]
);

alter table programa_parametros add constraint programa_parametros_topes_catalogo_es_array check (
  jsonb_typeof(topes_catalogo) = 'array'
);

create trigger programa_parametros_set_actualizado_en
  before update on programa_parametros
  for each row execute function set_actualizado_en();

alter table programa_parametros enable row level security;

create policy programa_parametros_org on programa_parametros
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant select, insert, update, delete on programa_parametros to authenticated;

alter table categorias add column taxonomia text not null default 'comercial';
alter table categorias add constraint categorias_taxonomia_check check (
  taxonomia in ('comercial', 'terapeutica')
);

alter table productos add column precio_minimo_legal numeric(12, 2);
