-- Recurso `cupones` en la matriz de permisos (docs/cupones.md, módulo de
-- cupones que llega en migraciones posteriores). Amplía ACTIONS con 4
-- acciones propias del módulo (`emitir`, `anular`, `imprimir`, `exportar`,
-- ver src/lib/permissions.ts) y reemplaza `create_system_roles_for_org()`
-- (20260823100000_equipo_roles_permisos.sql) para sembrarlas en los 3 roles
-- de sistema. Se vuelve a ejecutar sobre las organizaciones existentes —
-- todos sus inserts llevan `on conflict ... do nothing`, así que repetirla
-- solo AÑADE las filas de `cupones`, igual que hace esa misma migración
-- para reparar drift en un proyecto remoto ya sembrado.
--
-- De paso corrige un bug latente: los 3 `select id into v_*_id` buscaban el
-- rol por `nombre = 'Administrador'` — una organización que renombró su rol
-- de sistema hacía el backfill silenciosamente no-op para ella.
-- `handle_new_user()` ya usa el criterio correcto (`rol_base` + `tipo`), así
-- que aquí se alinea a ese mismo criterio.
--
-- Los roles PERSONALIZADOS ("Jefe de tienda", "Operador de caja" del seed, o
-- cualquiera creado desde 09.2) no se tocan aquí a propósito: verán el
-- módulo de cupones bloqueado hasta que un admin les conceda permisos desde
-- la matriz — no se ensancha en silencio un rol hecho a mano.
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
    'Puede crear y activar reglas, promociones y journeys. No accede a facturación ni al equipo.',
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

  -- Administrador: todo permitido (aprobar solo existe en los 7 recursos
  -- operativos; emitir/anular/imprimir/exportar solo en cupones). Admin
  -- lleva `cupones:aprobar` para que toda organización nazca con al menos
  -- un aprobador — sin esto, la primera solicitud de doble aprobación
  -- quedaría bloqueada por falta de un segundo actor (ver
  -- countOtherApprovers en el módulo de cupones).
  insert into role_permissions (role_id, recurso, accion)
  select v_admin_id, recurso, accion
  from unnest(array[
    'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas',
    'journeys', 'equipo', 'facturacion', 'cupones'
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
  from unnest(array['emitir', 'anular', 'imprimir', 'exportar']) as accion
  on conflict (role_id, recurso, accion) do nothing;

  -- Gerente comercial: lectura de reportes, gestión amplia del catálogo y
  -- control total sobre promociones/reglas/journeys (incluye aprobar). En
  -- cupones es el "maker": puede crear y emitir, pero NUNCA aprobar — es
  -- quien solicita la doble aprobación, dársela recrearía el agujero que
  -- esa regla cierra.
  insert into role_permissions (role_id, recurso, accion)
  values
    (v_gestor_id, 'resumen', 'ver'),
    (v_gestor_id, 'catalogo', 'ver'), (v_gestor_id, 'catalogo', 'crear'), (v_gestor_id, 'catalogo', 'editar'),
    (v_gestor_id, 'tiendas', 'ver'), (v_gestor_id, 'tiendas', 'editar'),
    (v_gestor_id, 'clientes', 'ver'), (v_gestor_id, 'clientes', 'crear'), (v_gestor_id, 'clientes', 'editar'),
    (v_gestor_id, 'promociones', 'ver'), (v_gestor_id, 'promociones', 'crear'), (v_gestor_id, 'promociones', 'editar'),
      (v_gestor_id, 'promociones', 'eliminar'), (v_gestor_id, 'promociones', 'aprobar'),
    (v_gestor_id, 'reglas', 'ver'), (v_gestor_id, 'reglas', 'crear'), (v_gestor_id, 'reglas', 'editar'),
      (v_gestor_id, 'reglas', 'aprobar'),
    (v_gestor_id, 'journeys', 'ver'), (v_gestor_id, 'journeys', 'crear'), (v_gestor_id, 'journeys', 'editar'),
      (v_gestor_id, 'journeys', 'aprobar'),
    (v_gestor_id, 'cupones', 'ver'), (v_gestor_id, 'cupones', 'crear'), (v_gestor_id, 'cupones', 'editar'),
      (v_gestor_id, 'cupones', 'emitir'), (v_gestor_id, 'cupones', 'imprimir'), (v_gestor_id, 'cupones', 'exportar')
  on conflict (role_id, recurso, accion) do nothing;

  -- Analista: solo lectura, incluso de reportes. Sin `cupones:exportar`:
  -- exportar cupones saca códigos ligados a personas (PII), y este rol es
  -- de lectura de reportes, no de extracción de datos de cliente.
  insert into role_permissions (role_id, recurso, accion)
  select v_lector_id, recurso, 'ver'
  from unnest(array[
    'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas',
    'journeys', 'cupones'
  ]) as recurso
  on conflict (role_id, recurso, accion) do nothing;
end;
$$;

-- Backfill idempotente de todas las organizaciones ya existentes — mismo
-- mecanismo que 20260823100000_equipo_roles_permisos.sql (todos los
-- inserts de la función llevan `on conflict ... do nothing`).
select create_system_roles_for_org(id) from organizations;
