-- `puntos:ajustar` y `promociones:asignar` — dos escrituras que tomaban
-- prestada la casilla más cercana porque no tenían la suya.
--
--   · Acreditar o debitar el saldo de un socio pedía `reglas:crear`
--     (`features/members/actions/points-adjustments.ts`). Mover algo
--     equivalente a dinero lo autorizaba el permiso de crear reglas de
--     descuento, y quien debía poder ajustar puntos heredaba de paso el
--     motor de reglas entero.
--   · Habilitar una promoción a un socio puntual, saltándose su segmento,
--     pedía `promociones:crear` (`.../promotion-grants.ts`). Es una
--     excepción individual, no diseño de campaña: el call center la
--     necesita y no necesita crear campañas.
--
-- `puntos` no admite `crear` ni `eliminar` (ver `RESOURCE_ONLY_ACTIONS` en
-- `src/lib/permissions.ts`): un saldo no se crea ni se borra, se consulta y
-- se ajusta. La matriz de 09.2 solo pinta esas dos celdas para esta fila.

-- ── 1. Backfill de los roles de sistema ya existentes ────────────────────

insert into role_permissions (role_id, recurso, accion)
select r.id, 'puntos', accion
from roles r
cross join unnest(array['ver', 'ajustar']) as accion
where r.tipo = 'sistema' and r.rol_base = 'admin'
on conflict (role_id, recurso, accion) do nothing;

insert into role_permissions (role_id, recurso, accion)
select r.id, 'promociones', 'asignar'
from roles r
where r.tipo = 'sistema' and r.rol_base = 'admin'
on conflict (role_id, recurso, accion) do nothing;

-- Gerente comercial: ajusta saldo y asigna promociones puntuales — son
-- parte de resolver un caso comercial, no de configurar el programa.
insert into role_permissions (role_id, recurso, accion)
select r.id, recurso, accion
from roles r
cross join (
  values ('puntos', 'ver'), ('puntos', 'ajustar'), ('promociones', 'asignar')
) as t(recurso, accion)
where r.tipo = 'sistema' and r.rol_base = 'gestor'
on conflict (role_id, recurso, accion) do nothing;

-- Analista: ve el saldo, no lo toca.
insert into role_permissions (role_id, recurso, accion)
select r.id, 'puntos', 'ver'
from roles r
where r.tipo = 'sistema' and r.rol_base = 'lector'
on conflict (role_id, recurso, accion) do nothing;

-- ── 2. Se retira el permiso prestado donde ya no significa nada ──────────
--
-- No se toca `reglas:crear` ni `promociones:crear`: siguen siendo permisos
-- legítimos para lo suyo (crear una regla, crear una campaña). Lo que
-- cambia es que ya no autorizan de refilón mover saldo ni asignar a mano
-- — eso lo hace el código, no una fila.

-- ── 3. Que las organizaciones nuevas nazcan igual ────────────────────────

create or replace function create_system_roles_for_org(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid;
  v_gestor_id uuid;
  v_lector_id uuid;
begin
  insert into roles (org_id, nombre, descripcion, tipo, rol_base)
  values (
    target_org_id, 'Administrador',
    'Acceso total a todos los módulos y a la configuración de la organización.',
    'sistema', 'admin'
  )
  on conflict (org_id, nombre) do nothing;

  select id into v_admin_id from roles
  where org_id = target_org_id and rol_base = 'admin' and tipo = 'sistema' limit 1;

  insert into roles (org_id, nombre, descripcion, tipo, rol_base, descuento_maximo_pct)
  values (
    target_org_id, 'Gerente comercial',
    'Puede crear y solicitar la publicación de reglas, promociones y journeys. No accede a facturación ni al equipo.',
    'sistema', 'gestor', 25
  )
  on conflict (org_id, nombre) do nothing;

  select id into v_gestor_id from roles
  where org_id = target_org_id and rol_base = 'gestor' and tipo = 'sistema' limit 1;

  insert into roles (org_id, nombre, descripcion, tipo, rol_base)
  values (
    target_org_id, 'Analista',
    'Acceso de solo lectura a reportes y operación, sin permisos de edición.',
    'sistema', 'lector'
  )
  on conflict (org_id, nombre) do nothing;

  select id into v_lector_id from roles
  where org_id = target_org_id and rol_base = 'lector' and tipo = 'sistema' limit 1;

  -- Administrador: los 12 recursos × las 4 acciones universales.
  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, recurso, accion
  from unnest(array[
    'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas',
    'journeys', 'equipo', 'facturacion', 'cupones', 'integraciones', 'programa'
  ]) as recurso
  cross join unnest(array['ver', 'crear', 'editar', 'eliminar']) as accion
  on conflict (role_id, recurso, accion) do nothing;

  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, recurso, 'aprobar'
  from unnest(array[
    'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas', 'journeys', 'cupones'
  ]) as recurso
  on conflict (role_id, recurso, accion) do nothing;

  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, 'cupones', accion
  from unnest(array['emitir', 'anular', 'imprimir']) as accion
  on conflict (role_id, recurso, accion) do nothing;

  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, recurso, 'exportar'
  from unnest(array[
    'cupones', 'clientes', 'catalogo', 'promociones', 'tiendas', 'journeys'
  ]) as recurso
  on conflict (role_id, recurso, accion) do nothing;

  -- `puntos` solo admite `ver` y `ajustar` (no se crea ni se elimina un
  -- saldo), así que queda fuera del bloque de las cuatro universales.
  insert into role_permissions (role_id, recurso, accion)
  values
    (v_admin_id, 'puntos', 'ver'), (v_admin_id, 'puntos', 'ajustar'),
    (v_admin_id, 'promociones', 'asignar')
  on conflict (role_id, recurso, accion) do nothing;

  -- Gerente comercial: "maker" en los recursos con doble aprobación — crea y
  -- solicita, pero NUNCA aprueba.
  insert into role_permissions (role_id, recurso, accion)
  values
    (v_gestor_id, 'resumen', 'ver'),
    (v_gestor_id, 'catalogo', 'ver'), (v_gestor_id, 'catalogo', 'crear'),
      (v_gestor_id, 'catalogo', 'editar'), (v_gestor_id, 'catalogo', 'exportar'),
    (v_gestor_id, 'tiendas', 'ver'), (v_gestor_id, 'tiendas', 'editar'),
      (v_gestor_id, 'tiendas', 'exportar'),
    (v_gestor_id, 'clientes', 'ver'), (v_gestor_id, 'clientes', 'crear'),
      (v_gestor_id, 'clientes', 'editar'), (v_gestor_id, 'clientes', 'exportar'),
    (v_gestor_id, 'promociones', 'ver'), (v_gestor_id, 'promociones', 'crear'),
      (v_gestor_id, 'promociones', 'editar'), (v_gestor_id, 'promociones', 'eliminar'),
      (v_gestor_id, 'promociones', 'exportar'),
    (v_gestor_id, 'reglas', 'ver'), (v_gestor_id, 'reglas', 'crear'),
      (v_gestor_id, 'reglas', 'editar'),
    (v_gestor_id, 'journeys', 'ver'), (v_gestor_id, 'journeys', 'crear'),
      (v_gestor_id, 'journeys', 'editar'), (v_gestor_id, 'journeys', 'exportar'),
    (v_gestor_id, 'cupones', 'ver'), (v_gestor_id, 'cupones', 'crear'),
      (v_gestor_id, 'cupones', 'editar'), (v_gestor_id, 'cupones', 'emitir'),
      (v_gestor_id, 'cupones', 'imprimir'), (v_gestor_id, 'cupones', 'exportar'),
    (v_gestor_id, 'integraciones', 'ver'),
    (v_gestor_id, 'programa', 'ver'),
    (v_gestor_id, 'puntos', 'ver'), (v_gestor_id, 'puntos', 'ajustar'),
    (v_gestor_id, 'promociones', 'asignar')
  on conflict (role_id, recurso, accion) do nothing;

  -- Analista: solo lectura de lo operativo. Sin `exportar` en ningún
  -- recurso y sin los módulos de Configuración.
  insert into role_permissions (role_id, recurso, accion)
  select v_lector_id, recurso, 'ver'
  from unnest(array[
    'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas',
    'journeys', 'cupones', 'puntos'
  ]) as recurso
  on conflict (role_id, recurso, accion) do nothing;
end;
$$;
