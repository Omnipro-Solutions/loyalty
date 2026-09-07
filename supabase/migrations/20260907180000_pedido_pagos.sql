-- Cómo se pagó una compra.
--
-- `pedidos` guarda el total y `pedido_items` el desglose de qué se llevó,
-- pero no había ni una columna que dijera CON QUÉ se pagó. El log de
-- Compras/Devoluciones puede responder «qué», «cuándo», «quién» y «cuánto»,
-- y se queda callado justo en la pregunta que llega al mostrador cuando hay
-- que hacer una devolución: «¿esto se pagó en efectivo o con tarjeta?»,
-- porque el reembolso vuelve por el mismo medio.
--
-- Por qué una tabla y no una columna `pedidos.metodo_pago`: un pago partido
-- es lo normal, no la excepción —parte con puntos y el resto con tarjeta,
-- efectivo más un vale— y una sola columna obliga a inventar el valor
-- 'mixto', que es exactamente el que no dice nada. Con una fila por medio,
-- «mixto» deja de ser un caso especial: son dos filas.
--
-- No hay constraint que fuerce `sum(importe) = pedidos.total`. Se pensó y se
-- descartó: `pedidos.total` lo mantiene un trigger a partir de
-- `pedido_items`, así que el orden de escritura (líneas primero o pagos
-- primero) decidiría si la inserción pasa o revienta, y un import de datos
-- históricos quedaría bloqueado por descuadres que justamente hay que poder
-- VER. El modal suma los pagos y avisa cuando no cuadran con el total, que
-- es lo que sirve para auditar.

create table pedido_pagos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  pedido_id uuid not null references pedidos (id) on delete cascade,
  -- Espejo de `PAYMENT_METHODS` en `src/types/domain.ts`. Lista cerrada:
  -- son los medios que la caja acepta, no texto libre de un integrador.
  metodo text not null check (
    metodo in (
      'efectivo',
      'tarjeta_credito',
      'tarjeta_debito',
      'transferencia',
      'puntos'
    )
  ),
  importe numeric(12, 2) not null check (importe > 0),
  /**
   * Con qué se identifica ese pago en el estado de cuenta: los cuatro
   * últimos dígitos de la tarjeta, el número de autorización, el
   * comprobante de la transferencia. Nulo en efectivo, que no tiene rastro.
   */
  referencia text,
  /**
   * Cuántos puntos se quemaron. Va aparte de `importe` porque son dos
   * unidades distintas y las dos hacen falta: el importe cuadra la caja, los
   * puntos cuadran el saldo del socio. La conversión de un momento dado
   * (`programa_parametros.valor_punto`) no se puede recalcular después.
   */
  puntos integer check (puntos is null or puntos > 0),
  creado_en timestamptz not null default now(),
  -- Los puntos y solo los puntos llevan `puntos`. Sin esto, una fila de
  -- efectivo con 500 puntos sería aceptable y no significaría nada.
  --
  -- El nombre NO puede ser `pedido_pagos_puntos_check`: ese ya lo ocupa el
  -- `check` inline de la columna `puntos` de arriba, que Postgres auto-nombra
  -- `<tabla>_<columna>_check`.
  constraint pedido_pagos_metodo_puntos_check check ((metodo = 'puntos') = (puntos is not null)),
  -- Un medio aparece una sola vez por pedido: pagar dos veces en efectivo
  -- sube `importe`, no agrega otra fila. Mismo criterio que
  -- `pedido_items.unique (pedido_id, producto_id)` — y es lo que hace
  -- idempotente el sembrado de abajo.
  unique (pedido_id, metodo)
);

create index pedido_pagos_pedido_id_idx on pedido_pagos (pedido_id);
create index pedido_pagos_org_id_idx on pedido_pagos (org_id);

alter table pedido_pagos enable row level security;

-- Cuelga del pedido, así que se aísla por el pedido — igual que
-- `pedido_items`, reusando el helper que ya existe para eso.
create policy pedido_pagos_org on pedido_pagos
  for all to authenticated
  using (pedido_owned_by_current_org(pedido_id))
  with check (pedido_owned_by_current_org(pedido_id));

-- El GRANT explícito no es opcional en tablas nuevas (ver
-- `auto_expose_new_tables` en config.toml): sin él, Postgres rechaza el
-- acceso antes de evaluar la política.
grant usage on schema public to authenticated;
grant select, insert, update, delete on pedido_pagos to authenticated;

-- ── Datos de demo ───────────────────────────────────────────────────────
--
-- Sin esto la sección "Cómo se pagó" del modal nace vacía en las ~620
-- compras que ya existen, y una sección vacía se lee como una pantalla rota,
-- no como un dato que falta.
--
-- Mismo criterio que `20260907100000_demo_compras_devoluciones.sql`: sin
-- `random()` ni `hashtext`, todo derivado de columnas reales para que el
-- resultado sea el mismo en cualquier entorno y aplicarla dos veces no
-- duplique nada.

-- 1 · Los pagos partidos, escritos a mano sobre tres casos del seed de
--     acumulaciones. Van PRIMERO para que la regla general de abajo los
--     respete. El segundo tramo se calcula como `total - primer tramo` (no
--     como el otro porcentaje) para que la suma cuadre exacto al céntimo.
insert into pedido_pagos (org_id, pedido_id, metodo, importe, referencia)
select p.org_id, p.id, 'efectivo', round(p.total * 0.40, 2), null
from pedidos p
where p.numero_pedido in ('PED-ACUM-03', 'PED-DEV-01') and p.total > 0
on conflict (pedido_id, metodo) do nothing;

insert into pedido_pagos (org_id, pedido_id, metodo, importe, referencia)
select p.org_id, p.id, 'tarjeta_credito', p.total - round(p.total * 0.40, 2), '**** 4417'
from pedidos p
where p.numero_pedido in ('PED-ACUM-03', 'PED-DEV-01') and p.total > 0
on conflict (pedido_id, metodo) do nothing;

-- El caso que justifica la columna `puntos`: parte de la compra quemada
-- contra el saldo del socio, a la conversión vigente de la organización.
insert into pedido_pagos (org_id, pedido_id, metodo, importe, puntos, referencia)
select
  p.org_id,
  p.id,
  'puntos',
  round(p.total * 0.25, 2),
  greatest(1, round(round(p.total * 0.25, 2) / nullif(par.valor_punto, 0))::int),
  null
from pedidos p
join programa_parametros par on par.org_id = p.org_id
where p.numero_pedido = 'PED-ACUM-06' and p.total > 0
on conflict (pedido_id, metodo) do nothing;

insert into pedido_pagos (org_id, pedido_id, metodo, importe, referencia)
select p.org_id, p.id, 'tarjeta_debito', p.total - round(p.total * 0.25, 2), '**** 8032'
from pedidos p
where p.numero_pedido = 'PED-ACUM-06' and p.total > 0
on conflict (pedido_id, metodo) do nothing;

-- 2 · El resto: un solo medio por el total, elegido por el canal —donde se
--     compró determina con qué se puede pagar, y es el único dato real que
--     hay para decidirlo. `not exists` en vez de `on conflict` para que un
--     pedido con pago partido no reciba además una fila por el total
--     completo, que descuadraría la suma.
insert into pedido_pagos (org_id, pedido_id, metodo, importe)
select
  p.org_id,
  p.id,
  case p.canal
    when 'pos' then 'efectivo'
    when 'ecommerce' then 'tarjeta_credito'
    else 'tarjeta_debito'
  end,
  p.total
from pedidos p
where p.total > 0
  and not exists (select 1 from pedido_pagos g where g.pedido_id = p.id);

comment on table pedido_pagos is
  'Con qué se pagó cada compra, una fila por medio. Un pago partido son varias filas: por eso no existe el método «mixto».';
