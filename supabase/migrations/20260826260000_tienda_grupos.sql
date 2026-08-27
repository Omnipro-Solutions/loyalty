-- Grupo de tienda: agrupación editable por el usuario (a diferencia de
-- `tiendas.formato`/`region`, que son atributos fijos de la tienda) para
-- reportes, campañas y como atributo de condición en Promociones/Builder.
-- Tabla relacionada (no un `check` fijo) porque el usuario debe poder crear
-- grupos nuevos sin una migración.

create table tienda_grupos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  descripcion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (org_id, nombre)
);

create index tienda_grupos_org_id_idx on tienda_grupos (org_id);

create trigger tienda_grupos_set_actualizado_en
  before update on tienda_grupos
  for each row execute function set_actualizado_en();

alter table tienda_grupos enable row level security;

create policy tienda_grupos_org on tienda_grupos
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant select, insert, update, delete on tienda_grupos to authenticated;

-- Nullable en este paso: no se puede exigir NOT NULL antes del backfill de
-- abajo. `on delete restrict` (comportamiento default de una FK sin
-- cláusula) a propósito: un grupo con tiendas asignadas no debe poder
-- borrarse en silencio, el usuario tiene que reasignar esas tiendas primero
-- (ver mensaje de error de `deleteStoreGroupAction`).
alter table tiendas add column grupo_id uuid references tienda_grupos (id);

-- Backfill de las tiendas YA sembradas en el proyecto remoto — mismo espíritu
-- que `20260826151500_fix_provincia_socios_mexico.sql` (subquery escalar
-- contra `organizations where slug = 'omni'`). A diferencia de ese archivo
-- (solo `update`, una fila sin `org_id` inexistente no puede violar nada),
-- aquí sí hace falta el `where exists (select 1 from org)`: es un `insert`
-- con `org_id not null`, y sin el guard, correr esta migración en un `db
-- reset` local (donde `seed.sql` todavía no creó la org) rompería con una
-- violación de NOT NULL en vez de insertar cero filas. En un `db reset`
-- local este bloque es un no-op — `supabase/seed.sql` siembra
-- `tienda_grupos` y el `grupo_id` de cada tienda por su cuenta, sin depender
-- de esta migración (mismo criterio documentado en
-- `20260823170000_dashboard_datos_demo.sql`).
with org as (select id from organizations where slug = 'omni')
insert into tienda_grupos (org_id, nombre, descripcion)
select (select id from org), g.nombre, g.descripcion
from (
  values
    ('Zona Centro', 'CDMX, Puebla y Querétaro.'),
    ('Zona Occidente', 'Jalisco.'),
    ('Zona Norte', 'Nuevo León.'),
    ('Zona Sureste', 'Quintana Roo y Yucatán.')
) as g (nombre, descripcion)
where exists (select 1 from org);

with org as (select id from organizations where slug = 'omni'),
grupo as (
  select id, nombre from tienda_grupos where org_id = (select id from org)
)
update tiendas
set grupo_id = (
  select grupo.id from grupo
  where grupo.nombre = case tiendas.codigo_tienda
    when 'ST-0142' then 'Zona Centro'
    when 'ST-0143' then 'Zona Centro'
    when 'ST-0174' then 'Zona Centro'
    when 'ST-0181' then 'Zona Centro'
    when 'ST-0151' then 'Zona Occidente'
    when 'ST-0158' then 'Zona Norte'
    when 'ST-0163' then 'Zona Sureste'
    when 'ST-0170' then 'Zona Sureste'
  end
)
where tiendas.org_id = (select id from org)
  and tiendas.codigo_tienda in (
    'ST-0142', 'ST-0143', 'ST-0174', 'ST-0181',
    'ST-0151', 'ST-0158', 'ST-0163', 'ST-0170'
  );

alter table tiendas alter column grupo_id set not null;
