-- `handle_new_user()` (20260823100000_equipo_roles_permisos.sql) exigía que
-- el dominio del correo coincidiera con `organizations.dominio_correo` para
-- CUALQUIER alta en `auth.users`, incluidas las invitaciones admin
-- (`inviteUserByEmail` en src/features/team/actions/invitations.ts inserta
-- en `auth.users` igual que un signup). Eso bloqueaba invitar a alguien con
-- un correo fuera del dominio de la organización, aunque quien invita ya
-- decidió explícitamente a qué organización pertenece (la fila en
-- `invitaciones` se inserta antes, a propósito, para que este trigger la
-- encuentre).
--
-- Ahora: si existe una invitación pendiente para ese correo, se usa su
-- `org_id` directamente y el chequeo de dominio se salta por completo — el
-- gate por dominio solo sigue aplicando al signup orgánico (sin invitación),
-- que es el caso que el comentario original ("signup es solo para dominios
-- ya dados de alta") de verdad quería cubrir.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_dominio text;
  v_role_id uuid;
  v_tienda_id uuid;
  v_invitacion_id uuid;
begin
  select id, org_id, role_id, tienda_id
    into v_invitacion_id, v_org_id, v_role_id, v_tienda_id
  from invitaciones
  where email = new.email and estado = 'pendiente'
  order by creado_en desc
  limit 1;

  if v_org_id is null then
    v_dominio := split_part(new.email, '@', 2);

    select id into v_org_id from organizations where dominio_correo = v_dominio;

    if v_org_id is null then
      raise exception 'No existe una organización para el dominio %', v_dominio;
    end if;
  end if;

  if v_role_id is null then
    select id into v_role_id from roles
    where org_id = v_org_id and rol_base = 'lector' and tipo = 'sistema'
    limit 1;
  end if;

  insert into profiles (id, org_id, nombre, email, role_id, tienda_id)
  values (
    new.id, v_org_id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), new.email,
    v_role_id, v_tienda_id
  );

  if v_invitacion_id is not null then
    update invitaciones set estado = 'aceptada', aceptada_en = now() where id = v_invitacion_id;
  end if;

  return new;
end;
$$;
