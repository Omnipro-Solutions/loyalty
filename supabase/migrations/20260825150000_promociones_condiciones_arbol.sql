-- Rediseño de `promociones.condiciones`: de array plano (un solo
-- combinador `combinador_condiciones` para toda la regla) a un árbol real
-- de grupos Y/O anidados sin límite de profundidad, para que "Condiciones"
-- se comporte como el Figma "07.2 · Paso 2 · Condiciones · árbol"
-- (1395:6). Una hoja sigue siendo `{campo, valor}` sin cambios; lo nuevo es
-- el grupo `{combinador, condiciones: [...]}`, distinguido de una hoja
-- estructuralmente (tiene `condiciones`), sin campo discriminante nuevo —
-- ver `src/features/promotions/lib/condition-tree.ts`.
--
-- Alcance elegido explícitamente por el usuario: árbol Y/O anidado, SIN
-- conteo "cumplen X" en vivo por nodo ni panel de embudo (esa es una capa
-- de analítica que no existe hoy en ningún lado del motor).

-- 1. Migrar datos existentes: envolver cada fila en el nuevo grupo raíz,
--    usando su propio `combinador_condiciones` de hoy. Verificado contra
--    `supabase/seed.sql` (todas las filas de demo son `combinador_condiciones
--    = 'todas'` y `condiciones` es `'[]'::jsonb` o un array de 1 objeto
--    `{campo,valor}` — este `update` cubre ambos casos sin casos
--    especiales).
update promociones
set condiciones = jsonb_build_object(
  'combinador', combinador_condiciones,
  'condiciones', coalesce(
    (select jsonb_agg(c) from jsonb_array_elements(condiciones) c),
    '[]'::jsonb
  )
);

-- 2. Nuevo default (para promociones nuevas) + guarda de forma: la raíz
--    ahora es un objeto, nunca un array.
alter table promociones alter column condiciones
  set default '{"combinador":"todas","condiciones":[]}'::jsonb;
alter table promociones add constraint promociones_condiciones_es_objeto check (
  jsonb_typeof(condiciones) = 'object'
);

-- 3. `combinador_condiciones` queda redundante (su valor ya vive dentro
--    del árbol, en la clave `combinador` de la raíz) — se elimina en vez
--    de dejarla como columna muerta. `drop column` también elimina su
--    propio check constraint (`in ('todas','alguna')`), no hace falta un
--    `drop constraint` aparte.
alter table promociones drop column combinador_condiciones;

-- 4. El trigger `promociones_registrar_vinculacion` (única versión activa
--    hoy, reemplazada por `create or replace` en
--    20260823161000_bitacora_simplify.sql) recorría `condiciones` con
--    `jsonb_array_elements`, que asume un array plano — ahora es un
--    objeto, así que necesita un recorrido recursivo. Se aísla en una
--    función aparte, reutilizable, en vez de reescribir el trigger entero.
create or replace function promociones_flatten_condiciones(p_nodo jsonb)
returns setof jsonb
language plpgsql
as $$
declare
  v_hijo jsonb;
begin
  if p_nodo is null then
    return;
  elsif p_nodo ? 'condiciones' then
    for v_hijo in select * from jsonb_array_elements(p_nodo -> 'condiciones') loop
      return query select * from promociones_flatten_condiciones(v_hijo);
    end loop;
  else
    return query select p_nodo;
  end if;
end;
$$;

-- Mismo cuerpo que la versión anterior (20260823161000_bitacora_simplify.sql:91-140)
-- salvo la fuente del loop: `promociones_flatten_condiciones(new.condiciones)`
-- en vez de `jsonb_array_elements(new.condiciones)`.
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

  for v_condicion in select * from promociones_flatten_condiciones(new.condiciones) loop
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
