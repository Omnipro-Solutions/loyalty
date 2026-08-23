-- Limpieza de `/simplify` sobre la bitácora de producto (20260823160000 y
-- sus dos fixes): sin cambiar el comportamiento observable.
--
-- 1. `registrar_evento_producto()` — las tres funciones de trigger repetían
--    el mismo INSERT de 9-10 columnas contra `producto_eventos` (7 veces en
--    total). Un solo punto de escritura: si `producto_eventos` gana una
--    columna obligatoria, se edita una vez.
-- 2. `promociones_registrar_vinculacion()` — insertaba una fila por
--    producto coincidente dentro de un loop (`for v_producto_id in select
--    ... loop insert ... end loop`). Para una condición de categoría que
--    matchea muchos productos eso es un INSERT por fila; se reemplaza por
--    un único `insert ... select` por (condición, categoría) — set-based,
--    no fila por fila. No usa `registrar_evento_producto()` a propósito:
--    ese helper es para escribir una fila desde plpgsql (`perform`), y
--    forzar el loop por-fila de vuelta para poder llamarlo habría revertido
--    justo la optimización que se busca aquí.
create or replace function registrar_evento_producto(
  p_org_id uuid, p_producto_id uuid, p_categoria text, p_titulo text,
  p_autor_nombre text, p_es_automatico boolean,
  p_campo text default null, p_valor_anterior text default null,
  p_valor_nuevo text default null, p_descripcion text default null
) returns void
language sql
as $$
  insert into producto_eventos
    (org_id, producto_id, categoria, titulo, campo, valor_anterior, valor_nuevo, descripcion, autor_nombre, es_automatico)
  values
    (p_org_id, p_producto_id, p_categoria, p_titulo, p_campo, p_valor_anterior, p_valor_nuevo, p_descripcion, p_autor_nombre, p_es_automatico)
$$;

create or replace function productos_registrar_eventos()
returns trigger
language plpgsql
as $$
declare
  v_autor record;
  v_campo text;
  v_campos text[] := array['proveedor', 'marca', 'presentacion', 'tipo_producto', 'codigo_barras', 'nombre'];
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
begin
  select * into v_autor from producto_evento_autor();

  if old.estado is distinct from new.estado then
    perform registrar_evento_producto(new.org_id, new.id, 'estado', 'Estado cambiado', v_autor.nombre, v_autor.es_automatico, 'estado', old.estado, new.estado);
  end if;

  if old.precio is distinct from new.precio then
    perform registrar_evento_producto(new.org_id, new.id, 'precio', 'Precio base actualizado', v_autor.nombre, v_autor.es_automatico, 'precio', old.precio::text, new.precio::text);
  end if;

  if old.imagen_url is distinct from new.imagen_url then
    perform registrar_evento_producto(new.org_id, new.id, 'datos', 'Imagen actualizada', v_autor.nombre, v_autor.es_automatico, 'imagen_url', old.imagen_url, new.imagen_url);
  end if;

  foreach v_campo in array v_campos loop
    if v_old ->> v_campo is distinct from v_new ->> v_campo then
      perform registrar_evento_producto(new.org_id, new.id, 'datos', 'Campo editado', v_autor.nombre, v_autor.es_automatico, v_campo, v_old ->> v_campo, v_new ->> v_campo);
    end if;
  end loop;

  if old.completitud_pct is distinct from new.completitud_pct then
    perform registrar_evento_producto(new.org_id, new.id, 'datos', 'Completitud recalculada', 'Sistema', true, 'completitud_pct', old.completitud_pct::text || ' %', new.completitud_pct::text || ' %');
  end if;

  return null;
end;
$$;

create or replace function producto_precios_registrar_evento()
returns trigger
language plpgsql
as $$
declare
  v_autor record;
  v_org_id uuid;
begin
  if old.precio is distinct from new.precio then
    select org_id into v_org_id from productos where id = new.producto_id;
    select * into v_autor from producto_evento_autor();
    perform registrar_evento_producto(
      v_org_id, new.producto_id, 'precio', 'Precio actualizado', v_autor.nombre, v_autor.es_automatico,
      'precio', old.precio::text, new.precio::text,
      'Lista "' || new.nombre_lista || '" · ' || new.canal
    );
  end if;
  return null;
end;
$$;

create or replace function promociones_registrar_vinculacion()
returns trigger
language plpgsql
as $$
declare
  v_condicion jsonb;
  v_categoria_id uuid;
  v_categoria_nombre text;
begin
  if new.estado_publicacion <> 'activa' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.estado_publicacion = 'activa' then
    return null;
  end if;

  for v_condicion in select * from jsonb_array_elements(new.condiciones) loop
    if v_condicion ->> 'campo' <> 'categoria' then
      continue;
    end if;

    for v_categoria_id in
      select (jsonb_array_elements_text(
        case jsonb_typeof(v_condicion -> 'valor')
          when 'array' then v_condicion -> 'valor'
          else jsonb_build_array(v_condicion -> 'valor')
        end
      ))::uuid
    loop
      select nombre into v_categoria_nombre from categorias where id = v_categoria_id;

      insert into producto_eventos (org_id, producto_id, categoria, titulo, descripcion, autor_nombre, es_automatico)
      select
        new.org_id, p.id, 'promocion', 'Promoción vinculada',
        '"' || new.nombre || '" aplicada a la categoría "' || coalesce(v_categoria_nombre, '—') || '"',
        'Motor de promociones', true
      from productos p
      join producto_categorias pc on pc.producto_id = p.id
      join categorias c on c.id = pc.categoria_id
      where p.org_id = new.org_id
        and (pc.categoria_id = v_categoria_id or c.parent_id = v_categoria_id);
    end loop;
  end loop;

  return null;
exception
  when invalid_text_representation then
    return null;
end;
$$;

grant execute on function registrar_evento_producto(uuid, uuid, text, text, text, boolean, text, text, text, text) to authenticated;
