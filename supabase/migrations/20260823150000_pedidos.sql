-- Pedidos (Figma 05.3g "Card · Comportamiento de compra" + "Sección ·
-- VALOR COMERCIAL"): hasta ahora no existía ningún historial de compras —
-- `points_ledger.origen` era solo texto libre ("Compra #PED-88210"), sin
-- una fila real detrás. Esta migración es la pieza que faltaba para poder
-- calcular tienda/canal habitual, frecuencia, ticket promedio, categoría
-- dominante, LTV y margen — todo real, sin inventar números por socio.
--
-- "Valor previsto 12m" y "Riesgo de fuga" siguen siendo heurísticas (no
-- hay pipeline de ML en este proyecto) calculadas en TypeScript a partir
-- de esta tabla — ver `features/clientes/lib/queries.ts`.

alter table productos add column costo_unitario numeric(12, 2);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  tienda_id uuid references tiendas (id) on delete set null,
  canal text not null check (canal in ('pos', 'ecommerce', 'app')),
  numero_pedido text not null,
  estado text not null default 'completado' check (
    estado in ('completado', 'cancelado', 'devuelto')
  ),
  -- Mantenidos por el trigger de abajo a partir de `pedido_items` — igual
  -- que `members.saldo_puntos` con `points_ledger`, no se escriben a mano.
  total numeric(12, 2) not null default 0,
  costo_total numeric(12, 2) not null default 0,
  creado_en timestamptz not null default now(),
  unique (org_id, numero_pedido)
);

create index pedidos_member_id_idx on pedidos (member_id);
create index pedidos_org_id_idx on pedidos (org_id);
create index pedidos_tienda_id_idx on pedidos (tienda_id);

create table pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos (id) on delete cascade,
  producto_id uuid not null references productos (id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  -- Precio y costo se copian del producto al momento de la venta (no se
  -- referencian en vivo): el precio de un pedido de hace 6 meses no debe
  -- cambiar si hoy se actualiza `productos.precio`.
  precio_unitario numeric(12, 2) not null,
  costo_unitario numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) generated always as (cantidad * precio_unitario) stored,
  -- Una fila por producto dentro del pedido — para más cantidad del mismo
  -- producto se sube `cantidad`, no se agrega otra fila.
  unique (pedido_id, producto_id)
);

create index pedido_items_pedido_id_idx on pedido_items (pedido_id);
create index pedido_items_producto_id_idx on pedido_items (producto_id);

create or replace function recalcular_totales_pedido()
returns trigger
language plpgsql
as $$
declare
  v_pedido_id uuid := coalesce(new.pedido_id, old.pedido_id);
begin
  update pedidos
  set
    total = (select coalesce(sum(subtotal), 0) from pedido_items where pedido_id = v_pedido_id),
    costo_total = (
      select coalesce(sum(costo_unitario * cantidad), 0) from pedido_items where pedido_id = v_pedido_id
    )
  where id = v_pedido_id;
  return null;
end;
$$;

create trigger pedido_items_recalcular
  after insert or update or delete on pedido_items
  for each row execute function recalcular_totales_pedido();

create or replace function pedido_owned_by_current_org(target_pedido_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from pedidos p
    where p.id = target_pedido_id and p.org_id = (select current_org_id())
  )
$$;

alter table pedidos enable row level security;
alter table pedido_items enable row level security;

create policy pedidos_org on pedidos
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy pedido_items_org on pedido_items
  for all to authenticated
  using (pedido_owned_by_current_org(pedido_id))
  with check (pedido_owned_by_current_org(pedido_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on pedidos, pedido_items to authenticated;
grant execute on function pedido_owned_by_current_org(uuid) to authenticated;
