-- RPCs de agregación para los selectores de condición del builder de
-- promociones (07.1: ciudad/provincia/región/marca/proveedor) y los chips
-- de estado de 13.1 (cupones). Antes se traía la tabla completa
-- (`tiendas.select("ciudad")`, `productos.select("marca")`, etc.) y se
-- deduplicaba/contaba en JS — invisible a escala demo, pero un full table
-- scan en cada apertura del panel que no escala con `members`/`productos`.
-- `language sql` (no `plpgsql`) y sin `security definer`: corren como
-- SECURITY INVOKER por defecto, así que las políticas RLS por `org_id` de
-- cada tabla siguen aplicando fila por fila antes del `group by` — el
-- aislamiento multi-tenant no cambia.

create or replace function condition_cities()
returns table (ciudad text, total_stores int)
language sql
stable
as $$
  select ciudad, count(*)::int as total_stores
  from tiendas
  group by ciudad
  order by ciudad
$$;

create or replace function condition_provinces()
returns table (provincia text)
language sql
stable
as $$
  select distinct provincia
  from members
  where provincia is not null and provincia <> ''
  order by provincia
$$;

create or replace function condition_store_regions()
returns table (region text)
language sql
stable
as $$
  select distinct region
  from tiendas
  order by region
$$;

create or replace function condition_brands()
returns table (marca text)
language sql
stable
as $$
  select distinct marca
  from productos
  where marca is not null and marca <> ''
  order by marca
$$;

create or replace function condition_suppliers()
returns table (proveedor text)
language sql
stable
as $$
  select distinct proveedor
  from productos
  where proveedor is not null and proveedor <> ''
  order by proveedor
$$;

-- Chips de estado de 13.1 sobre el universo completo de emisiones. El
-- llamador sigue inicializando los 6 estados en 0 y solo sobreescribe los
-- que la función devuelve (un estado sin ninguna emisión no aparece en el
-- `group by`).
create or replace function coupon_batch_status_counts()
returns table (status text, total int)
language sql
stable
as $$
  select status, count(*)::int as total
  from coupon_batch
  group by status
$$;

grant execute on function condition_cities() to authenticated;
grant execute on function condition_provinces() to authenticated;
grant execute on function condition_store_regions() to authenticated;
grant execute on function condition_brands() to authenticated;
grant execute on function condition_suppliers() to authenticated;
grant execute on function coupon_batch_status_counts() to authenticated;
