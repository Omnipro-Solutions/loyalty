-- Datos de demo. Se ejecuta después de las migraciones en `supabase db reset`
-- (ver [db.seed] en supabase/config.toml). No crea usuarios de `auth.users`:
-- el staff de Etteer (Elena Martínez y compañía) se registra por el flujo
-- real de signup — `handle_new_user()` les asigna la organización según el
-- dominio de su correo. Lo que sí se siembra aquí son los SOCIOS del
-- programa de lealtad (`members`), que son clientes finales de Etteer, no
-- usuarios del portal.

insert into organizations (nombre, slug, dominio_correo, tenant_idp)
values ('Etteer · Omni Retail Group', 'etteer', 'etteer.com', 'microsoft_entra_id');

insert into tiers (org_id, nombre, multiplicador, umbral_puntos, orden)
select o.id, t.nombre, t.multiplicador, t.umbral_puntos, t.orden
from organizations o
cross join (
  values
    ('bronce', 1.0, 0, 1),
    ('plata', 1.2, 2000, 2),
    ('oro', 1.5, 6000, 3),
    ('diamante', 2.0, 15000, 4)
) as t (nombre, multiplicador, umbral_puntos, orden)
where o.slug = 'etteer';

-- Matriz rol → permiso (09.2 "Equipo · roles y permisos"). Cada lista de
-- recursos se declara una sola vez (antes se repetía por cada rol que la usaba).
with recursos_todos (recurso) as (
  values
    ('catalogo'), ('tiendas'), ('clientes'), ('promociones'), ('reglas'),
    ('journeys'), ('audiencias'), ('equipo'), ('integraciones')
)
insert into role_permissions (rol, recurso, accion)
select 'admin', recurso, accion
from recursos_todos
cross join unnest(array['ver', 'crear', 'editar', 'eliminar', 'publicar']) as accion
union all
select 'aprobador', recurso, 'ver'
from recursos_todos
union all
select 'aprobador', recurso, 'publicar'
from recursos_todos
where recurso in ('promociones', 'journeys');

with recursos_operativos (recurso) as (
  values
    ('catalogo'), ('tiendas'), ('clientes'), ('promociones'), ('reglas'),
    ('journeys'), ('audiencias')
)
insert into role_permissions (rol, recurso, accion)
select 'gestor', recurso, accion
from recursos_operativos
cross join unnest(array['ver', 'crear', 'editar']) as accion
union all
select 'gestor', recurso, 'publicar'
from recursos_operativos
where recurso in ('promociones', 'journeys')
union all
select 'lector', recurso, 'ver'
from recursos_operativos;

-- Socios de muestra, repartidos entre niveles.
with org as (select id from organizations where slug = 'etteer'),
tier_ids as (
  select nombre, id from tiers where org_id = (select id from org)
)
insert into members (org_id, nombre, email, tier_id, saldo_puntos, fecha_alta)
select
  (select id from org),
  m.nombre,
  m.email,
  (select id from tier_ids where tier_ids.nombre = m.tier),
  m.saldo_puntos,
  now() - (m.dias_antiguedad || ' days')::interval
from (
  values
    ('Sofía Ramírez', 'sofia.ramirez@example.com', 'diamante', 18420, 620),
    ('Camilo Torres', 'camilo.torres@example.com', 'diamante', 16210, 540),
    ('Valentina Ríos', 'valentina.rios@example.com', 'oro', 8760, 410),
    ('Andrés Gómez', 'andres.gomez@example.com', 'oro', 7230, 300),
    ('Mariana Ocampo', 'mariana.ocampo@example.com', 'plata', 3450, 210),
    ('Julián Restrepo', 'julian.restrepo@example.com', 'plata', 2680, 150),
    ('Daniela Cárdenas', 'daniela.cardenas@example.com', 'bronce', 890, 60),
    ('Felipe Herrera', 'felipe.herrera@example.com', 'bronce', 320, 20)
) as m (nombre, email, tier, saldo_puntos, dias_antiguedad);
