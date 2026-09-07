-- El desglose comercial de una compra: qué promoción tocó cada SKU, qué
-- cupón se presentó, cuánto se descontó y cuánto IVA lleva dentro.
--
-- Qué faltaba. `pedido_items` guardaba cantidad y precio, y nada más. Con
-- eso el modal de una compra puede decir «tres cajas a $27.400» y se queda
-- callado en todo lo que el sistema de verdad usa en sus flujos:
--
--   · Devolver una línea → hay que saber si venía descontada, porque el
--     reembolso es lo que se COBRÓ, no el precio de lista.
--   · Auditar una promoción → «se aplicó» vive en `promocion_eventos`, pero
--     no había forma de ver sobre qué SKU cayó ni cuánto quitó.
--   · Cuadrar un cupón → `coupon_redemption` ya tenía `pedido_id`
--     (20260824110000) y nadie lo llenaba nunca: el canje quedaba flotando
--     sin la compra que lo justificó.
--   · Facturar → sin tasa ni impuesto por línea no se puede emitir nada, y
--     en una farmacia la tasa NO es una sola: los medicamentos están
--     excluidos de IVA y la dermocosmética no.
--
-- ── El modelo del dinero, y por qué `pedidos.total` no se toca ──────────
--
-- `pedidos.total` lo mantiene un trigger como `sum(pedido_items.subtotal)`,
-- y de ahí cuelgan LTV, ticket promedio, RFM, valor comercial y media
-- analítica. Cambiarle el significado para restarle los descuentos movería
-- todos esos números de golpe y dejaría `devoluciones.total_devuelto` (que
-- se sembró contra el total viejo) diciendo que una devolución parcial es
-- total. Así que `total` se queda siendo lo mismo que ya era: el BRUTO a
-- precio de lista.
--
-- Lo que se cobró se lee restando, y esa resta es justo lo que la tarjeta
-- muestra como cascada:
--
--     total (bruto)  −  descuento_total  =  total cobrado
--     del cual, IVA incluido:  impuesto_total
--
-- El IVA va INCLUIDO en el precio, no sumado encima: es como se marca el
-- precio al público en Colombia, y es lo que hace que `total` siga siendo
-- comparable con lo que el socio pagó.
--
-- ── Qué NO hace esta migración ─────────────────────────────────────────
--
-- No inventa descuentos. Solo llevan `promocion_id` y `descuento` las
-- líneas de los carritos donde el motor YA dejó registrado un canje
-- (`promocion_eventos.tipo = 'canje'` con su `monto_carrito`), y solo
-- llevan cupón los pedidos de socios que YA tienen un cupón en estado
-- `redeemed`. Repartir un descuento sobre las ~620 compras restantes sería
-- fabricar dinero que ninguna promoción respalda, y el log dejaría de ser
-- auditable — que es lo único para lo que sirve.
--
-- El impuesto sí es universal, porque sí es universal: toda venta lo lleva,
-- y la tasa se deriva de `productos.tipo_producto`, que es un dato real.

-- ── Volver a aplicarla no hace daño ────────────────────────────────────
--
-- Se aplica a mano sobre la base viva, así que una segunda pasada tenía que
-- ser un no-op y no un descuadre: cada `alter` lleva `if not exists` y cada
-- `update` de datos se guarda contra su propio efecto —la tasa solo se
-- escribe donde vale 0, el cupón solo donde no hay `pedido_id`, y los pagos
-- solo donde todavía suman el bruto—.

-- ── 1 · Las columnas de línea ──────────────────────────────────────────

alter table pedido_items
  -- Qué promoción tocó ESTE SKU. `set null` y no `cascade`: borrar una
  -- promoción no puede borrar la venta que la aplicó.
  add column if not exists promocion_id uuid references promociones (id) on delete set null,
  -- Lo que la promoción quitó de esta línea, en dinero. Columna propia y no
  -- un porcentaje: el descuento de un 3x2 es una pieza gratis, el de un
  -- escalonado es un tramo, y los dos terminan en pesos. Se guarda el
  -- resultado porque es lo que se devuelve.
  add column if not exists descuento numeric(12, 2) not null default 0
    check (descuento >= 0),
  /**
   * La tasa de IVA de la línea, copiada al vender igual que
   * `precio_unitario` y `costo_unitario`: si mañana cambia la tarifa, la
   * factura de hace seis meses no puede cambiar con ella.
   *
   * No es una constante del sistema porque en una farmacia conviven tres:
   * medicamentos y servicios de salud están excluidos (0 %), y el resto
   * —suplementos, dermocosmética, cuidado personal— va al 19 %.
   */
  add column if not exists impuesto_tasa numeric(5, 4) not null default 0
    check (impuesto_tasa >= 0 and impuesto_tasa < 1);

-- `add constraint` no admite `if not exists`, así que se retira y se vuelve
-- a poner: es la misma regla, y sin el `drop` una segunda pasada moriría
-- aquí.
alter table pedido_items
  drop constraint if exists pedido_items_descuento_max;

alter table pedido_items
  add constraint pedido_items_descuento_max
    check (descuento <= cantidad * precio_unitario);

alter table pedido_items
  /**
   * El IVA CONTENIDO en lo que se cobró, no un cargo encima: por eso se
   * divide entre (1 + tasa) en vez de multiplicar. Generada y no sembrada
   * porque no hay ninguna decisión que tomar —es aritmética sobre tres
   * columnas de la misma fila— y una copia a mano se desincroniza el día
   * que alguien corrija una cantidad.
   */
  add column if not exists impuesto numeric(12, 2)
    generated always as (
      round(
        (cantidad * precio_unitario - descuento) * impuesto_tasa / (1 + impuesto_tasa),
        2
      )
    ) stored;

comment on column pedido_items.impuesto is
  'IVA incluido en el importe cobrado de la línea (base = subtotal − descuento). No suma al total: lo desglosa.';

-- ── 2 · Los agregados del pedido ───────────────────────────────────────
--
-- Derivables de las líneas, pero materializados por el mismo trigger que ya
-- mantiene `total` y `costo_total`: quien lista 300 pedidos en la bitácora
-- no puede pagar un `sum()` por fila, y es exactamente el criterio con el
-- que esas dos columnas existen desde 20260823150000.

alter table pedidos
  add column if not exists descuento_total numeric(12, 2) not null default 0,
  add column if not exists impuesto_total numeric(12, 2) not null default 0;

comment on column pedidos.total is
  'Bruto a precio de lista (suma de subtotales). Lo cobrado es total − descuento_total.';
comment on column pedidos.descuento_total is
  'Descuentos de línea (promociones) + cupones aplicados sobre el pedido.';

-- ── 3 · La tasa de IVA de cada línea ya vendida ────────────────────────
--
-- Derivada de `productos.tipo_producto`, que el catálogo Benavides ya trae
-- poblado ('Medicamento con receta', 'Medicamento OTC', 'Suplemento',
-- 'Servicio'). Sin `random()`: la misma línea da la misma tasa en cualquier
-- entorno, y volver a aplicar la migración no la cambia.

update pedido_items pi
set impuesto_tasa = case
  -- Art. 424 ET: los medicamentos están excluidos de IVA.
  when pr.tipo_producto ilike 'Medicamento%' then 0.0000
  -- Art. 476 ET: los servicios de salud, también.
  when pr.tipo_producto ilike 'Servicio%' then 0.0000
  else 0.1900
end
from productos pr
where pr.id = pi.producto_id
  and pi.impuesto_tasa = 0
  and case
    when pr.tipo_producto ilike 'Medicamento%' then 0.0000
    when pr.tipo_producto ilike 'Servicio%' then 0.0000
    else 0.1900
  end <> 0;

-- ── 4 · Los descuentos que sí ocurrieron ───────────────────────────────
--
-- `PROMO-3X2-VITAM` es la única promoción del seed con canjes escritos a
-- mano y comprobables (20260907110000): el motor registró que ganó en el
-- carrito de Sofía (3 piezas, $82.200) y en el de Daniela (4 piezas,
-- $187.200). Aquí eso deja de ser un `metadatos` suelto y pasa a estar en
-- la línea que descontó.
--
-- La pieza gratis se calcula con la mecánica, no a ojo: `floor(cantidad/3)`
-- piezas al precio de esa venta. 3 piezas → 1 gratis; 4 → 1; 6 → 2. Se puede
-- verificar de cabeza, que es para lo que se escribió así.

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-3X2-VITAM'
),
-- Solo los pedidos cuyo canje el motor ya dejó registrado. `numero_pedido`
-- explícito y no una regla sobre todo el universo: fuera de estos dos, la
-- promoción está en curso (piezas acumuladas sin reclamar), y descontarla
-- diría que ya se entregó.
objetivo as (
  select pi.id, pi.cantidad, pi.precio_unitario
  from pedido_items pi
  join pedidos p on p.id = pi.pedido_id
  join productos pr on pr.id = pi.producto_id
  where p.org_id = (select id from org)
    and p.numero_pedido in ('PED-ACUM-03', 'PED-ACUM-07')
    and pr.sku in ('FAR-71710', 'FAR-71725')
    and pi.cantidad >= 3
)
update pedido_items pi
set
  promocion_id = (select id from promo),
  descuento = floor(o.cantidad / 3) * o.precio_unitario
from objetivo o
where pi.id = o.id
  and exists (select 1 from promo);

-- ── 5 · Los cupones, contra la compra que los justificó ────────────────
--
-- `coupon_redemption.pedido_id` existe desde 20260824110000 y nunca se
-- llenó: el canje decía cuánto descontó pero no sobre qué compra, así que
-- ni el modal ni una auditoría podían cerrar el círculo.
--
-- El emparejamiento va por `row_number()` y no por «la compra más reciente»
-- a secas: dos canjes del mismo socio elegirían la MISMA compra —el
-- `not exists` se evalúa contra la foto anterior a la sentencia, no contra
-- lo que la propia sentencia va escribiendo— y ese pedido acabaría con dos
-- cupones encima y un descuento mayor que su total. Con el ranking, el
-- n-ésimo cupón cae en la n-ésima compra sin dueño.
--
-- Determinista (orden por fecha y número de pedido, sin desempates al azar)
-- e idempotente: en la segunda pasada ya no quedan canjes sin `pedido_id`.

-- El descuento que un cupón deja sobre un total, con su tope. Repetido en
-- los dos bloques de abajo porque es la misma regla dicha dos veces, no dos
-- reglas: `percentage` sobre el total, `fixed_amount` tal cual, y nunca por
-- encima de `discount_cap` ni de la compra.
create or replace function cupon_descuento_sobre(
  p_tipo text,
  p_valor numeric,
  p_tope numeric,
  p_total numeric
)
returns numeric
language sql
immutable
as $$
  select least(
    round(
      case p_tipo
        when 'percentage' then p_total * p_valor / 100
        when 'fixed_amount' then p_valor
        else 0
      end,
      2
    ),
    coalesce(p_tope, p_total),
    p_total
  )
$$;

with org as (select id from organizations where slug = 'omni'),
canjes as (
  select
    r.id as redencion_id,
    r.member_id,
    cu.discount_type,
    cu.discount_value,
    cu.discount_cap,
    row_number() over (
      partition by r.member_id order by r.occurred_at, r.id
    ) as rn
  from coupon_redemption r
  join coupon cu on cu.id = r.coupon_id
  where r.org_id = (select id from org)
    and r.result = 'applied'
    and r.pedido_id is null
    and r.member_id is not null
),
compras as (
  select
    p.id as pedido_id,
    p.member_id,
    p.total,
    row_number() over (
      partition by p.member_id order by p.creado_en desc, p.numero_pedido
    ) as rn
  from pedidos p
  where p.org_id = (select id from org)
    and p.estado = 'completado'
    and p.total > 0
    and not exists (
      select 1 from coupon_redemption otro where otro.pedido_id = p.id
    )
),
pareja as (
  select c.redencion_id, v.pedido_id, v.total, c.discount_type,
         c.discount_value, c.discount_cap
  from canjes c
  join compras v on v.member_id = c.member_id and v.rn = c.rn
  -- Estrictamente mayor: un cupón que se llevara la compra entera dejaría
  -- lo cobrado en 0 y no habría nada que repartir entre los medios de pago.
  where v.total > cupon_descuento_sobre(
    c.discount_type, c.discount_value, c.discount_cap, v.total
  )
)
update coupon_redemption r
set
  pedido_id = j.pedido_id,
  -- Las cifras del canje se alinean con la compra real. Venían de un seed
  -- de ejemplo ($42,90 de carrito) que no correspondía a ningún pedido:
  -- dejarlas contradiría el total que la tarjeta muestra al lado.
  order_amount = j.total,
  discount_applied = cupon_descuento_sobre(
    j.discount_type, j.discount_value, j.discount_cap, j.total
  )
from pareja j
where r.id = j.redencion_id;

-- Un cupón en `redeemed` sin fila de canje es un cupón que la tabla dice
-- usado y que ninguna compra respalda. La bitácora (20260827230000) dejó
-- varios así al alinear el estado con el evento, y sin la fila el modal de
-- esas compras nace sin la sección de cupones aunque el socio sí usó uno.

with org as (select id from organizations where slug = 'omni'),
cupones as (
  select
    cu.id as coupon_id,
    cu.org_id,
    cu.member_id,
    cu.discount_type,
    cu.discount_value,
    cu.discount_cap,
    cu.redeemed_at,
    row_number() over (
      partition by cu.member_id order by cu.redeemed_at, cu.id
    ) as rn
  from coupon cu
  where cu.org_id = (select id from org)
    and cu.status = 'redeemed'
    and cu.member_id is not null
    and not exists (
      select 1 from coupon_redemption r where r.coupon_id = cu.id
    )
),
compras as (
  select
    p.id as pedido_id,
    p.member_id,
    p.canal,
    p.tienda_id,
    p.total,
    row_number() over (
      partition by p.member_id order by p.creado_en desc, p.numero_pedido
    ) as rn
  from pedidos p
  where p.org_id = (select id from org)
    and p.estado = 'completado'
    and p.total > 0
    and not exists (
      select 1 from coupon_redemption r where r.pedido_id = p.id
    )
)
insert into coupon_redemption (
  org_id, coupon_id, member_id, tienda_id, pedido_id,
  order_amount, discount_applied, result, channel, occurred_at
)
select
  c.org_id,
  c.coupon_id,
  c.member_id,
  v.tienda_id,
  v.pedido_id,
  v.total,
  cupon_descuento_sobre(
    c.discount_type, c.discount_value, c.discount_cap, v.total
  ),
  'applied',
  -- El canal es el de la compra, no el del cupón: es donde de verdad se
  -- presentó, y `coupon_redemption.channel` comparte el check con
  -- `pedidos.canal` justamente para que no puedan decir cosas distintas.
  v.canal,
  coalesce(c.redeemed_at, now())
from cupones c
join compras v on v.member_id = c.member_id and v.rn = c.rn
where v.total > cupon_descuento_sobre(
  c.discount_type, c.discount_value, c.discount_cap, v.total
);

-- ── 6 · El trigger, ampliado ───────────────────────────────────────────
--
-- Misma función de 20260823150000, ahora con las dos columnas nuevas. El
-- cupón entra en `descuento_total` desde `coupon_redemption`, así que la
-- función también se cuelga de esa tabla: si no, canjear un cupón dejaría
-- el agregado del pedido diciendo un número viejo.

create or replace function recalcular_totales_pedido()
returns trigger
language plpgsql
as $$
declare
  v_pedido_id uuid := coalesce(new.pedido_id, old.pedido_id);
begin
  -- `coupon_redemption.pedido_id` es opcional: un canje validado en caja
  -- sin pedido detrás no tiene nada que recalcular.
  if v_pedido_id is null then
    return null;
  end if;

  update pedidos
  set
    total = (select coalesce(sum(subtotal), 0) from pedido_items where pedido_id = v_pedido_id),
    costo_total = (
      select coalesce(sum(costo_unitario * cantidad), 0) from pedido_items where pedido_id = v_pedido_id
    ),
    descuento_total =
      (select coalesce(sum(descuento), 0) from pedido_items where pedido_id = v_pedido_id)
      + (
        select coalesce(sum(discount_applied), 0)
        from coupon_redemption
        where pedido_id = v_pedido_id and result = 'applied'
      ),
    impuesto_total = (
      select coalesce(sum(impuesto), 0) from pedido_items where pedido_id = v_pedido_id
    )
  where id = v_pedido_id;
  return null;
end;
$$;

drop trigger if exists coupon_redemption_recalcular_pedido on coupon_redemption;

create trigger coupon_redemption_recalcular_pedido
  after insert or update or delete on coupon_redemption
  for each row execute function recalcular_totales_pedido();

-- Los `update` de arriba no dispararon nada (el trigger de `pedido_items`
-- se creó antes que las columnas y la función nueva), así que el agregado
-- se calcula una vez para todo lo que ya existe.
update pedidos p
set
  descuento_total = (
    select coalesce(sum(pi.descuento), 0) from pedido_items pi where pi.pedido_id = p.id
  ) + (
    select coalesce(sum(r.discount_applied), 0)
    from coupon_redemption r
    where r.pedido_id = p.id and r.result = 'applied'
  ),
  impuesto_total = (
    select coalesce(sum(pi.impuesto), 0) from pedido_items pi where pi.pedido_id = p.id
  );

-- ── 7 · Los medios de pago, contra lo que de verdad se cobró ───────────
--
-- `pedido_pagos` (20260907180000) se sembró con el bruto porque entonces no
-- había descuentos. Ahora los hay, y un pago que suma más que la compra
-- dispara la alerta de descuadre del modal en pedidos que están perfectos.
--
-- Se reescala proporcionalmente en vez de volver a sembrar: los MEDIOS
-- (efectivo, tarjeta, el pago partido escrito a mano) son la parte que se
-- decidió en esa migración y no hay razón para recalcularla; lo único que
-- cambió es cuánto se cobró.

update pedido_pagos g
set importe = greatest(0.01, round(g.importe * (p.total - p.descuento_total) / p.total, 2))
from pedidos p
where p.id = g.pedido_id
  and p.descuento_total > 0
  and p.total > 0
  -- La única sentencia del archivo que no es idempotente por sí sola: sin
  -- esta guarda, una segunda pasada reescalaría un importe ya reescalado y
  -- dejaría la caja corta. `pedido_pagos` se sembró sumando exactamente el
  -- bruto (20260907180000), así que «todavía suman el total» es lo mismo
  -- que «todavía no se les descontó nada».
  and (
    select coalesce(sum(g2.importe), 0) from pedido_pagos g2 where g2.pedido_id = p.id
  ) = p.total;

-- El redondeo de cada tramo deja céntimos sueltos en un pago partido. El
-- resto se carga al tramo mayor —el mismo criterio de cualquier caja— para
-- que la suma cuadre exacta y el aviso de descuadre solo aparezca cuando de
-- verdad hay uno.
with objetivo as (
  select distinct on (p.id)
    g.id as pago_id,
    (p.total - p.descuento_total) - (
      select coalesce(sum(g2.importe), 0) from pedido_pagos g2 where g2.pedido_id = p.id
    ) as delta
  from pedidos p
  join pedido_pagos g on g.pedido_id = p.id
  where p.descuento_total > 0 and p.total > 0
  order by p.id, g.importe desc, g.metodo
)
update pedido_pagos g
set importe = g.importe + o.delta
from objetivo o
where g.id = o.pago_id
  and o.delta <> 0
  and g.importe + o.delta > 0;

-- Los puntos se recalculan desde el importe nuevo con la misma conversión
-- que los sembró: son dos unidades del mismo pago y desalinearlas es
-- exactamente el descuadre que la columna existe para evitar.
update pedido_pagos g
set puntos = greatest(1, round(g.importe / nullif(par.valor_punto, 0))::int)
from pedidos p
join programa_parametros par on par.org_id = p.org_id
where p.id = g.pedido_id
  and g.metodo = 'puntos'
  and p.descuento_total > 0;

-- La función auxiliar era solo del sembrado: la app no la llama nunca y
-- dejarla viva sería una superficie más sin dueño.
drop function if exists cupon_descuento_sobre(text, numeric, numeric, numeric);

comment on column pedido_items.promocion_id is
  'La promoción que descontó esta línea. Nulo = se vendió a precio de lista.';
comment on column pedido_items.descuento is
  'Lo que la promoción quitó de esta línea, en dinero. El reembolso de una devolución se calcula contra subtotal − descuento, no contra el precio de lista.';
