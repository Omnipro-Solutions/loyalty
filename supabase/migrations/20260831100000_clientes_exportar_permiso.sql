-- `clientes:exportar` — el export de clientes pasa a ser server-side y trae
-- el universo filtrado completo (antes exportaba solo la página en pantalla,
-- sin ningún control de permiso). `clientes` contiene PII (email, teléfono,
-- número de documento), mismo tipo de dato que ya justificaba negar
-- `cupones:exportar` a Analista/lector — ver el comentario de
-- `20260831090000_promociones_journeys_doble_aprobacion.sql` sobre esa
-- decisión. Se extiende ese mismo criterio a `clientes`: admin y gestor sí,
-- Analista no.

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

  -- Administrador: todo permitido. Además de publicar directo (por
  -- `rol_base = 'admin'`, ver `guard_promotion_publication_transition`),
  -- lleva `aprobar` en los 7 recursos operativos para que toda organización
  -- nazca con al menos un aprobador — mismo motivo que ya documentaba
  -- `cupones:aprobar` aquí.
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

  insert into role_permissions (role_id, recurso, accion)
  values (v_admin_id, 'clientes', 'exportar')
  on conflict (role_id, recurso, accion) do nothing;

  -- Gerente comercial: "maker" en los tres recursos con doble aprobación
  -- (promociones, reglas, journeys) igual que ya lo era en cupones — crea y
  -- solicita, pero NUNCA aprueba: dárselo recrearía el agujero que
  -- `20260831090000_promociones_journeys_doble_aprobacion.sql` cierra.
  insert into role_permissions (role_id, recurso, accion)
  values
    (v_gestor_id, 'resumen', 'ver'),
    (v_gestor_id, 'catalogo', 'ver'), (v_gestor_id, 'catalogo', 'crear'), (v_gestor_id, 'catalogo', 'editar'),
    (v_gestor_id, 'tiendas', 'ver'), (v_gestor_id, 'tiendas', 'editar'),
    (v_gestor_id, 'clientes', 'ver'), (v_gestor_id, 'clientes', 'crear'), (v_gestor_id, 'clientes', 'editar'),
      (v_gestor_id, 'clientes', 'exportar'),
    (v_gestor_id, 'promociones', 'ver'), (v_gestor_id, 'promociones', 'crear'), (v_gestor_id, 'promociones', 'editar'),
      (v_gestor_id, 'promociones', 'eliminar'),
    (v_gestor_id, 'reglas', 'ver'), (v_gestor_id, 'reglas', 'crear'), (v_gestor_id, 'reglas', 'editar'),
    (v_gestor_id, 'journeys', 'ver'), (v_gestor_id, 'journeys', 'crear'), (v_gestor_id, 'journeys', 'editar'),
    (v_gestor_id, 'cupones', 'ver'), (v_gestor_id, 'cupones', 'crear'), (v_gestor_id, 'cupones', 'editar'),
      (v_gestor_id, 'cupones', 'emitir'), (v_gestor_id, 'cupones', 'imprimir'), (v_gestor_id, 'cupones', 'exportar')
  on conflict (role_id, recurso, accion) do nothing;

  -- Analista: solo lectura, incluso de reportes. Sin `clientes:exportar` ni
  -- `cupones:exportar` — exportar cualquiera de los dos saca datos ligados a
  -- personas (PII), y este rol es de lectura de reportes, no de extracción
  -- de datos de cliente.
  insert into role_permissions (role_id, recurso, accion)
  select v_lector_id, recurso, 'ver'
  from unnest(array[
    'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas',
    'journeys', 'cupones'
  ]) as recurso
  on conflict (role_id, recurso, accion) do nothing;
end;
$$;

-- Backfill: `create or replace function` solo cambia lo que se sembrará en
-- organizaciones NUEVAS — las ya creadas (incluida la demo, Omni Retail
-- Group) se quedan sin `clientes:exportar` hasta que se sembre a mano aquí.
insert into role_permissions (role_id, recurso, accion)
select id, 'clientes', 'exportar'
from roles
where tipo = 'sistema' and rol_base in ('admin', 'gestor')
on conflict (role_id, recurso, accion) do nothing;
