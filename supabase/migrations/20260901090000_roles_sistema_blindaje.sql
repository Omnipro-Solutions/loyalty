-- Blindaje del rol de sistema "Administrador" y restitución de su matriz.
--
-- Qué pasó: `role_permissions` tiene una única policy (`role_permissions_org`,
-- `20260823100000_equipo_roles_permisos.sql`) que es `for all` con solo el
-- aislamiento por organización, y `updateRoleAction` reemplaza la matriz
-- entera en cada guardado. Entre las dos cosas, un "Nada" en 09.2 —o un
-- DELETE directo a la Data API desde cualquier miembro de la org— deja al
-- Administrador sin `aprobar` y a la organización sin nadie que pueda
-- decidir una solicitud pendiente. Ninguna migración hizo eso: el único
-- `delete from role_permissions` del repo
-- (`20260831090000_promociones_journeys_doble_aprobacion.sql`) apunta solo a
-- `rol_base = 'gestor'`.
--
-- Ojo con la confusión fácil: publicar directo NO depende de estas filas,
-- depende de `rol_base = 'admin'` (ver `guard_promotion_publication_transition`
-- y `canPublishDirectly`). Lo que se pierde al recortar la matriz es DECIDIR
-- aprobaciones — y con la regla de cuatro ojos, eso deja sin salida a todo lo
-- que ya esté en `pendiente_aprobacion` salvo retirar la solicitud.

-- ── 1. Restituir la matriz completa del Administrador ────────────────────
--
-- Dirigido al rol de sistema `admin` y solo a él: llamar a
-- `create_system_roles_for_org()` habría re-sembrado también Gerente
-- comercial y Analista, pisando cualquier ajuste deliberado sobre ellos.
-- Espeja `applicablePermissions()` de `src/lib/permissions.ts` — las mismas
-- combinaciones que la matriz de 09.2 pinta sin candado.

insert into role_permissions (role_id, recurso, accion)
select r.id, recurso, accion
from roles r
cross join unnest(array[
  'resumen', 'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas',
  'journeys', 'equipo', 'facturacion', 'cupones'
]) as recurso
cross join unnest(array['ver', 'crear', 'editar', 'eliminar']) as accion
where r.tipo = 'sistema' and r.rol_base = 'admin'
on conflict (role_id, recurso, accion) do nothing;

insert into role_permissions (role_id, recurso, accion)
select r.id, recurso, 'aprobar'
from roles r
cross join unnest(array[
  'catalogo', 'tiendas', 'clientes', 'promociones', 'reglas', 'journeys', 'cupones'
]) as recurso
where r.tipo = 'sistema' and r.rol_base = 'admin'
on conflict (role_id, recurso, accion) do nothing;

insert into role_permissions (role_id, recurso, accion)
select r.id, 'cupones', accion
from roles r
cross join unnest(array['emitir', 'anular', 'imprimir', 'exportar']) as accion
where r.tipo = 'sistema' and r.rol_base = 'admin'
on conflict (role_id, recurso, accion) do nothing;

insert into role_permissions (role_id, recurso, accion)
select r.id, 'clientes', 'exportar'
from roles r
where r.tipo = 'sistema' and r.rol_base = 'admin'
on conflict (role_id, recurso, accion) do nothing;

-- ── 2. Que no se pueda volver a vaciar ───────────────────────────────────
--
-- Mismo patrón que los guards de la doble aprobación: el gate no vive en una
-- policy sino en un trigger, y no aplica sin sesión de usuario
-- (`auth.uid() is null` — migraciones, seeds, service role), o ningún script
-- podría reorganizar nada.
--
-- `updateRoleAction` normalmente borra y reinserta la matriz entera, cosa
-- que aquí moriría en el DELETE aunque el resultado final fuera idéntico.
-- Por eso, sobre este rol, la Server Action cambia a un camino puramente
-- aditivo (`ensureFullPermissionMatrix`): nunca borra, solo completa.
create or replace function guard_full_access_role_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return old;
  end if;

  if exists (
    select 1 from roles
    where id = old.role_id and tipo = 'sistema' and rol_base = 'admin'
  ) then
    raise exception
      'El rol Administrador del sistema tiene acceso total por definición: no se le pueden quitar permisos.'
      using errcode = 'insufficient_privilege';
  end if;

  return old;
end;
$$;

create trigger role_permissions_full_access_guard
  before delete on role_permissions
  for each row execute function guard_full_access_role_permissions();

-- El rodeo obvio al trigger de arriba: cambiarle `rol_base` o `tipo` al rol
-- para que deje de ser "de sistema", vaciarlo, y devolverlo. O borrar el rol
-- entero y recrearlo. Las dos puertas se cierran aquí.
create or replace function guard_system_role_identity()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if old.tipo = 'sistema' then
      raise exception 'Los roles de sistema no se pueden eliminar.'
        using errcode = 'insufficient_privilege';
    end if;
    return old;
  end if;

  if old.tipo = 'sistema'
     and (new.tipo is distinct from old.tipo
          or new.rol_base is distinct from old.rol_base) then
    raise exception 'No se puede cambiar el tipo ni el archetype de un rol de sistema.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger roles_system_identity_guard
  before update or delete on roles
  for each row execute function guard_system_role_identity();
