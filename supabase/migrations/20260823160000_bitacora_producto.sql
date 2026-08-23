-- Bitácora de cambios del producto (Figma "Card · Bitácora de cambios",
-- 1218:4026, en "03.3 · Catálogo · detalle de producto · v2"). Append-only,
-- mismo espíritu que `points_ledger`: nunca se actualiza ni se borra una
-- fila, cada evento es un hecho auditable generado por trigger, nunca
-- escrito a mano desde la app.
--
-- Decisión de producto (confirmada con el usuario): los productos de este
-- catálogo llegan por integración externa (POS/ERP) — el portal no tiene ni
-- tendrá un formulario para crear/editar productos. Por eso los triggers
-- resuelven el autor dinámicamente: si la escritura viene con una sesión
-- autenticada real (`auth.uid()`), se atribuye a esa persona (por si algún
-- día existe edición manual); si no (rol de servicio, igual que como llega
-- hoy cualquier sincronización), se atribuye a "Sincronización de catálogo"
-- y se marca `es_automatico`. No se inventan nombres de personas — el mock
-- del Figma muestra autores humanos, pero sin una vía real de edición en
-- este proyecto eso sería dato fabricado.
create table producto_eventos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  producto_id uuid not null references productos (id) on delete cascade,
  categoria text not null check (categoria in ('precio', 'datos', 'promocion', 'estado')),
  titulo text not null,
  campo text,
  valor_anterior text,
  valor_nuevo text,
  descripcion text,
  autor_nombre text not null,
  es_automatico boolean not null default false,
  creado_en timestamptz not null default now()
);

create index producto_eventos_producto_id_idx on producto_eventos (producto_id, creado_en desc);
create index producto_eventos_org_id_idx on producto_eventos (org_id);

-- Completitud (Figma "Completitud recalculada", 74 % → 82 %, Tag · DATOS):
-- % de campos descriptivos reales poblados en la fila. Deliberadamente
-- acotado a columnas propias de `productos` (no cruza a `producto_categorias`/
-- `producto_precios`) para poder recalcularse en un solo trigger BEFORE, sin
-- depender de qué tabla se tocó.
create or replace function calcular_completitud_producto(
  p_codigo_barras text, p_presentacion text, p_marca text, p_proveedor text,
  p_tipo_producto text, p_imagen_url text, p_costo_unitario numeric, p_precio numeric
) returns integer
language sql
immutable
as $$
  select round(100.0 * (
    (p_codigo_barras is not null)::int +
    (p_presentacion is not null)::int +
    (p_marca is not null)::int +
    (p_proveedor is not null)::int +
    (p_tipo_producto is not null)::int +
    (p_imagen_url is not null)::int +
    (p_costo_unitario is not null)::int +
    (p_precio > 0)::int
  ) / 8)::integer
$$;

alter table productos add column completitud_pct integer;

create or replace function productos_set_completitud()
returns trigger
language plpgsql
as $$
begin
  new.completitud_pct := calcular_completitud_producto(
    new.codigo_barras, new.presentacion, new.marca, new.proveedor,
    new.tipo_producto, new.imagen_url, new.costo_unitario, new.precio
  );
  return new;
end;
$$;

create trigger productos_calcular_completitud
  before insert or update on productos
  for each row execute function productos_set_completitud();

update productos set completitud_pct = calcular_completitud_producto(
  codigo_barras, presentacion, marca, proveedor, tipo_producto, imagen_url, costo_unitario, precio
);

alter table productos alter column completitud_pct set not null;

-- Resuelve el autor real de la escritura en curso — ver nota de cabecera.
create or replace function producto_evento_autor(out nombre text, out es_automatico boolean)
language sql
stable
as $$
  select coalesce(p.nombre, 'Sincronización de catálogo'), (auth.uid() is null)
  from (select auth.uid() as uid) u
  left join profiles p on p.id = u.uid
$$;

-- "Precio actualizado" / "Estado cambiado" / "Campo editado" / "Completitud
-- recalculada" (Figma): un evento por cada campo real que cambió en la
-- misma escritura, generado por diff de OLD vs NEW — nunca fabricado.
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
    insert into producto_eventos (org_id, producto_id, categoria, titulo, campo, valor_anterior, valor_nuevo, autor_nombre, es_automatico)
    values (new.org_id, new.id, 'estado', 'Estado cambiado', 'estado', old.estado, new.estado, v_autor.nombre, v_autor.es_automatico);
  end if;

  if old.precio is distinct from new.precio then
    insert into producto_eventos (org_id, producto_id, categoria, titulo, campo, valor_anterior, valor_nuevo, autor_nombre, es_automatico)
    values (new.org_id, new.id, 'precio', 'Precio base actualizado', 'precio', old.precio::text, new.precio::text, v_autor.nombre, v_autor.es_automatico);
  end if;

  if old.imagen_url is distinct from new.imagen_url then
    insert into producto_eventos (org_id, producto_id, categoria, titulo, campo, valor_anterior, valor_nuevo, autor_nombre, es_automatico)
    values (new.org_id, new.id, 'datos', 'Imagen actualizada', 'imagen_url', old.imagen_url, new.imagen_url, v_autor.nombre, v_autor.es_automatico);
  end if;

  foreach v_campo in array v_campos loop
    if v_old ->> v_campo is distinct from v_new ->> v_campo then
      insert into producto_eventos (org_id, producto_id, categoria, titulo, campo, valor_anterior, valor_nuevo, autor_nombre, es_automatico)
      values (new.org_id, new.id, 'datos', 'Campo editado', v_campo, v_old ->> v_campo, v_new ->> v_campo, v_autor.nombre, v_autor.es_automatico);
    end if;
  end loop;

  if old.completitud_pct is distinct from new.completitud_pct then
    insert into producto_eventos (org_id, producto_id, categoria, titulo, campo, valor_anterior, valor_nuevo, autor_nombre, es_automatico)
    values (new.org_id, new.id, 'datos', 'Completitud recalculada', 'completitud_pct', old.completitud_pct::text || ' %', new.completitud_pct::text || ' %', 'Sistema', true);
  end if;

  return null;
end;
$$;

create trigger productos_registrar_eventos
  after update on productos
  for each row execute function productos_registrar_eventos();

-- Precio por lista (Figma: "Lista base nacional · $ 6.750 → $ 6.900").
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
    insert into producto_eventos (org_id, producto_id, categoria, titulo, campo, valor_anterior, valor_nuevo, descripcion, autor_nombre, es_automatico)
    values (
      v_org_id, new.producto_id, 'precio', 'Precio actualizado', 'precio',
      old.precio::text, new.precio::text,
      'Lista "' || new.nombre_lista || '" · ' || new.canal,
      v_autor.nombre, v_autor.es_automatico
    );
  end if;
  return null;
end;
$$;

create trigger producto_precios_registrar_evento
  after update on producto_precios
  for each row execute function producto_precios_registrar_evento();

-- "Promoción vinculada" (Figma): sin FK producto↔promoción en este proyecto
-- (`promociones.condiciones` es jsonb abierto — ver 20260823120000), el
-- vínculo se infiere por coincidencia real de categoría cuando una promoción
-- pasa a 'activa': todo producto de esa categoría recibe el evento. Es una
-- heurística documentada, no una relación garantizada por la promoción —
-- pero cada campo del evento (producto, categoría, promoción) es real.
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
        where pc.categoria_id = v_categoria_id and p.org_id = new.org_id
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

create trigger promociones_registrar_vinculacion
  after insert or update on promociones
  for each row execute function promociones_registrar_vinculacion();

alter table producto_eventos enable row level security;

create policy producto_eventos_org on producto_eventos
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on producto_eventos to authenticated;
grant execute on function calcular_completitud_producto(text, text, text, text, text, text, numeric, numeric) to authenticated;
grant execute on function producto_evento_autor() to authenticated;
