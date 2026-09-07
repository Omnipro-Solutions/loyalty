-- Devoluciones: la otra mitad de una compra.
--
-- Qué falta hoy: `pedidos.estado` ya admite `'devuelto'` desde
-- `20260823150000_pedidos.sql`, y `getCommercialValue` (05.3g, "VALOR
-- COMERCIAL") ya lee ese estado para pintar el KPI de devoluciones. Pero no
-- hay ni una fila con ese estado, y sobre todo no hay forma de registrar la
-- devolución que de verdad ocurre en una farmacia: **la parcial**. Un socio
-- compró tres cajas y trajo una de vuelta. `estado` no sabe decir "1 de 3":
-- o miente marcando el pedido entero como devuelto, o miente dejándolo
-- completado.
--
-- Por qué eso no es un detalle contable: la mecánica de pieza gratis (3x2,
-- 2x1) cuenta PIEZAS COMPRADAS. Si una de las tres se devolvió, el ciclo no
-- está cumplido y la promoción no debe regalar nada — pero
-- `listAccumulations` contaba las tres, porque no había ninguna fila que le
-- dijera lo contrario. Una devolución parcial es justo el dato que rompe un
-- ciclo, así que necesita existir a nivel de línea.
--
-- Por qué NO un `points_ledger.tipo` nuevo: la consolidación del builder
-- (20260827130000) eliminó ocho tipos de entrada —entre ellos
-- `devolucion`— para que el hecho fuera DATO y no tipo. La reversión de
-- puntos de una devolución entra como `ajuste` con el `origen` nombrando la
-- devolución, igual que hace el bloque `revertir_beneficios`
-- (20260831120000). Un tipo nuevo obligaría a tocar el check, los cuatro
-- mapas de etiquetas y la bitácora, para no decir nada que el `origen` no
-- diga ya.
--
-- Por qué no hay `estado` en `devoluciones`: una devolución con flujo de
-- aprobación (registrada → aprobada → rechazada) es una pantalla que no
-- existe en este portal. Estas filas son hechos ya aceptados en el
-- mostrador. Cuando exista la pantalla, el estado se añade aquí.
--
-- Qué NO se toca: `pedidos.total`. Lo vendido fue lo vendido; la devolución
-- es un hecho posterior y separado. Restarlo del pedido borraría la venta
-- del histórico y con ella la razón por la que el socio acumuló puntos ese
-- día. Quien necesite el neto lo calcula (ver `getCommercialValue`).

-- ── 1 · Las dos tablas ──────────────────────────────────────────────────

create table devoluciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  pedido_id uuid not null references pedidos (id) on delete cascade,
  -- Redundante con `pedidos.member_id` a propósito: el log y el filtro por
  -- socio consultan esta tabla directamente, y sin la columna cada lectura
  -- pagaría un join solo para saber de quién es la devolución.
  member_id uuid not null references members (id) on delete cascade,
  numero_devolucion text not null,
  motivo text not null check (
    motivo in (
      'producto_defectuoso',
      'producto_vencido',
      'no_era_lo_esperado',
      'error_en_pedido',
      'reaccion_adversa',
      'arrepentimiento'
    )
  ),
  nota text,
  -- Dónde se devolvió, que no siempre es dónde se compró: comprar en
  -- e-commerce y devolver en tienda es el caso más común de los tres.
  canal text not null check (canal in ('pos', 'ecommerce', 'app')),
  tienda_id uuid references tiendas (id) on delete set null,
  -- Mantenidos por el trigger de abajo a partir de `devolucion_items`, mismo
  -- criterio que `pedidos.total`: no se escriben a mano.
  total_devuelto numeric(12, 2) not null default 0,
  costo_devuelto numeric(12, 2) not null default 0,
  registrado_por uuid references profiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  unique (org_id, numero_devolucion)
);

create index devoluciones_pedido_id_idx on devoluciones (pedido_id);
create index devoluciones_member_id_idx on devoluciones (member_id);
create index devoluciones_org_id_idx on devoluciones (org_id);
create index devoluciones_creado_en_idx on devoluciones (creado_en desc);

create table devolucion_items (
  id uuid primary key default gen_random_uuid(),
  devolucion_id uuid not null references devoluciones (id) on delete cascade,
  -- La línea comprada, no solo el producto: es lo que permite validar que no
  -- se devuelva más de lo que se llevó, y lo que ata el precio devuelto al
  -- precio de esa venta y no al de hoy.
  pedido_item_id uuid not null references pedido_items (id) on delete cascade,
  producto_id uuid not null references productos (id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null,
  costo_unitario numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) generated always as (cantidad * precio_unitario) stored,
  -- Una línea de la compra aparece una sola vez por devolución; devolver más
  -- unidades de la misma línea sube `cantidad`. Dos devoluciones distintas
  -- del mismo pedido sí pueden tocar la misma línea (dos visitas al
  -- mostrador), y el guard de abajo es el que suma las dos.
  unique (devolucion_id, pedido_item_id)
);

create index devolucion_items_devolucion_id_idx on devolucion_items (devolucion_id);
create index devolucion_items_pedido_item_id_idx on devolucion_items (pedido_item_id);
create index devolucion_items_producto_id_idx on devolucion_items (producto_id);

-- ── 2 · No se puede devolver más de lo que se compró ────────────────────
--
-- Un check no alcanza: el tope vive en otra tabla (`pedido_items.cantidad`)
-- y hay que sumar todas las devoluciones de esa línea, no solo la que se
-- está insertando.

create or replace function validar_cantidad_devuelta()
returns trigger
language plpgsql
as $$
declare
  v_comprado integer;
  v_devuelto integer;
begin
  select cantidad into v_comprado
  from pedido_items where id = new.pedido_item_id;

  select coalesce(sum(cantidad), 0) into v_devuelto
  from devolucion_items
  where pedido_item_id = new.pedido_item_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_devuelto + new.cantidad > v_comprado then
    raise exception
      'La devolución excede lo comprado: la línea tiene % unidades, ya se devolvieron % y se intentan devolver % más',
      v_comprado, v_devuelto, new.cantidad;
  end if;

  return new;
end;
$$;

create trigger devolucion_items_validar
  before insert or update on devolucion_items
  for each row execute function validar_cantidad_devuelta();

-- ── 3 · Totales de la devolución y estado del pedido ───────────────────
--
-- `pedidos.estado` pasa a `'devuelto'` solo cuando TODAS las líneas
-- volvieron completas. Una devolución parcial deja el pedido `'completado'`:
-- la venta sigue en pie, y quien quiera el neto resta las devoluciones.
-- `'cancelado'` no se toca — un pedido cancelado nunca se entregó, así que
-- no hay nada que devolver y su estado no lo decide esta tabla.

create or replace function recalcular_devolucion_y_pedido()
returns trigger
language plpgsql
as $$
declare
  v_devolucion_id uuid := coalesce(new.devolucion_id, old.devolucion_id);
  v_pedido_id uuid;
  v_todo_devuelto boolean;
begin
  update devoluciones
  set
    total_devuelto = (
      select coalesce(sum(subtotal), 0) from devolucion_items
      where devolucion_id = v_devolucion_id
    ),
    costo_devuelto = (
      select coalesce(sum(costo_unitario * cantidad), 0) from devolucion_items
      where devolucion_id = v_devolucion_id
    )
  where id = v_devolucion_id
  returning pedido_id into v_pedido_id;

  if v_pedido_id is null then
    return null;
  end if;

  -- Todo devuelto = no queda ninguna línea del pedido con unidades en manos
  -- del socio, sumando todas las devoluciones de ese pedido.
  select not exists (
    select 1
    from pedido_items pi
    left join (
      select di.pedido_item_id, sum(di.cantidad) as devuelto
      from devolucion_items di
      join devoluciones d on d.id = di.devolucion_id
      where d.pedido_id = v_pedido_id
      group by di.pedido_item_id
    ) dev on dev.pedido_item_id = pi.id
    where pi.pedido_id = v_pedido_id
      and pi.cantidad > coalesce(dev.devuelto, 0)
  )
  into v_todo_devuelto;

  update pedidos
  set estado = case when v_todo_devuelto then 'devuelto' else 'completado' end
  where id = v_pedido_id and estado <> 'cancelado';

  return null;
end;
$$;

create trigger devolucion_items_recalcular
  after insert or update or delete on devolucion_items
  for each row execute function recalcular_devolucion_y_pedido();

-- ── 4 · RLS y GRANTs ───────────────────────────────────────────────────
--
-- El GRANT explícito no es opcional: las tablas nuevas ya no se auto-exponen
-- a los roles de la Data API (ver `auto_expose_new_tables` en config.toml).
-- Sin él, Postgres rechaza el acceso antes de evaluar las políticas.

create or replace function devolucion_owned_by_current_org(target_devolucion_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from devoluciones d
    where d.id = target_devolucion_id and d.org_id = (select current_org_id())
  )
$$;

alter table devoluciones enable row level security;
alter table devolucion_items enable row level security;

create policy devoluciones_org on devoluciones
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy devolucion_items_org on devolucion_items
  for all to authenticated
  using (devolucion_owned_by_current_org(devolucion_id))
  with check (devolucion_owned_by_current_org(devolucion_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on devoluciones, devolucion_items to authenticated;
grant execute on function devolucion_owned_by_current_org(uuid) to authenticated;

comment on table devoluciones is
  'Devoluciones de pedidos, totales o parciales. El detalle por línea vive en devolucion_items: es lo que permite descontar piezas de un ciclo de promoción por_piezas sin borrar la venta.';

comment on column devoluciones.canal is
  'Dónde se devolvió, no dónde se compró: comprar en e-commerce y devolver en tienda es un caso normal.';
