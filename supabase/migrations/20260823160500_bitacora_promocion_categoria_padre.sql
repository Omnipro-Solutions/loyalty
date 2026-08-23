-- Fix: los productos se clasifican en subcategorías hoja (`producto_categorias`,
-- ej. "Vitamina C"), pero las condiciones de una promoción suelen referenciar
-- la categoría raíz (ej. "Vitaminas", ver 20260823080000_clasificacion_productos
-- para la jerarquía `parent_id`). El match exacto de
-- `promociones_registrar_vinculacion` no encontraba ningún producto para una
-- condición de categoría raíz — se agrega el fallback por `parent_id`.
create or replace function promociones_registrar_vinculacion()
returns trigger
language plpgsql
as $$
declare
  v_condicion jsonb;
  v_categoria_id uuid;
  v_categoria_nombre text;
  v_producto_id uuid;
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

      for v_producto_id in
        select p.id from productos p
        join producto_categorias pc on pc.producto_id = p.id
        join categorias c on c.id = pc.categoria_id
        where p.org_id = new.org_id
          and (pc.categoria_id = v_categoria_id or c.parent_id = v_categoria_id)
      loop
        insert into producto_eventos (org_id, producto_id, categoria, titulo, descripcion, autor_nombre, es_automatico)
        values (
          new.org_id, v_producto_id, 'promocion', 'Promoción vinculada',
          '"' || new.nombre || '" aplicada a la categoría "' || coalesce(v_categoria_nombre, '—') || '"',
          'Motor de promociones', true
        );
      end loop;
    end loop;
  end loop;

  return null;
exception
  when invalid_text_representation then
    return null;
end;
$$;
