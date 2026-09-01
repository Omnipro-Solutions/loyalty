-- Los módulos que escribían sin ningún permiso, y los exports que salían
-- sin gate.
--
-- Síntoma reportado: un usuario con el rol Analista —solo lectura en toda
-- la matriz— podía crear tiendas, editar clientes, guardar credenciales de
-- integraciones, publicar reglas y descargar cualquier CSV. No era un fallo
-- de la comprobación: era que NO HABÍA comprobación. De las 90 celdas que
-- pinta la matriz de 09.2, solo 14 combinaciones llegaban a un
-- `hasPermission()` en una Server Action; el resto de la rejilla se podía
-- marcar y desmarcar sin que gobernara ninguna escritura.
--
-- El código añade los gates que faltaban. Esta migración añade las filas
-- que esos gates necesitan encontrar.
--
--   · `integraciones` — el módulo entero no existía como recurso. Su
--     `action-client.ts` lo decía: «"integraciones" todavía no está en
--     RESOURCES […] por ahora cualquier usuario autenticado de la
--     organización puede configurar una conexión».
--   · `programa` — tomaba prestado `equipo:editar`, atando recalcular los
--     niveles y la caducidad de puntos a poder gestionar el equipo.
--   · `exportar` sobre catálogo, promociones, tiendas y journeys — los
--     cuatro exports tenían el gate escrito en un comentario, esperando una
--     celda que la matriz no podía expresar.

-- ── 1. Recursos y acciones nuevos para los roles de sistema ──────────────
--
-- `role_permissions.recurso` es `text` sin `check` (ver
-- `20260823100000_equipo_roles_permisos.sql`), así que no hay constraint que
-- ampliar: basta con sembrar las filas.
--
-- Administrador: acceso total, así que recibe todo lo nuevo. Es lo mismo que
-- hará `ensureFullPermissionMatrix` en el primer guardado del rol
-- (`20260901090000_roles_sistema_blindaje.sql`), adelantado aquí para que no
-- dependa de que alguien entre a la pantalla.
insert into role_permissions (role_id, recurso, accion)
select r.id, recurso, accion
from roles r
cross join unnest(array['integraciones', 'programa']) as recurso
cross join unnest(array['ver', 'crear', 'editar', 'eliminar']) as accion
where r.tipo = 'sistema' and r.rol_base = 'admin'
on conflict (role_id, recurso, accion) do nothing;

insert into role_permissions (role_id, recurso, accion)
select r.id, recurso, 'exportar'
from roles r
cross join unnest(array['catalogo', 'promociones', 'tiendas', 'journeys']) as recurso
where r.tipo = 'sistema' and r.rol_base = 'admin'
on conflict (role_id, recurso, accion) do nothing;

-- Gerente comercial: ve qué hay conectado y con qué parámetros corre el
-- programa —le hace falta para entender por qué una regla se comporta como
-- se comporta— pero no toca credenciales ni recalcula saldos.
insert into role_permissions (role_id, recurso, accion)
select r.id, recurso, 'ver'
from roles r
cross join unnest(array['integraciones', 'programa']) as recurso
where r.tipo = 'sistema' and r.rol_base = 'gestor'
on conflict (role_id, recurso, accion) do nothing;

insert into role_permissions (role_id, recurso, accion)
select r.id, recurso, 'exportar'
from roles r
cross join unnest(array['catalogo', 'promociones', 'tiendas', 'journeys']) as recurso
where r.tipo = 'sistema' and r.rol_base = 'gestor'
on conflict (role_id, recurso, accion) do nothing;

-- Analista: NADA nuevo, a propósito. Es el rol del reporte del usuario y el
-- que motivó todo esto: solo lectura de lo operativo, sin exportar (sacar un
-- CSV es extraer datos, no leer un informe — mismo criterio que ya negaba
-- `cupones:exportar` y `clientes:exportar` a este rol) y sin los módulos de
-- Configuración, donde `ver` ya muestra credenciales.

-- ── 2. Que las organizaciones nuevas nazcan igual ────────────────────────

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
    (v_gestor_id, 'programa', 'ver')
  on conflict (role_id, recurso, accion) do nothing;

  -- Analista: solo lectura de lo operativo. Sin `exportar` en ningún
  -- recurso y sin los módulos de Configuración.
  insert into role_permissions (role_id, recurso, accion)
  select v_lector_id, recurso, 'ver'
  from unnest(array[
    'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas',
    'journeys', 'cupones'
  ]) as recurso
  on conflict (role_id, recurso, accion) do nothing;
end;
$$;
