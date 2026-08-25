-- El listado de emisiones (13.1 del Figma) muestra, para descuentos
-- porcentuales, un tope máximo junto a la compra mínima ("15% · máx.
-- 40,00 € · mín. compra 60,00 €") — el esquema original de cupones no
-- modela ese tope (a diferencia de `promociones.tope_maximo`, que sí lo
-- tiene para el mismo concepto). Se añade a `coupon_batch` (la fuente) y a
-- `coupon` (donde se materializa por código, igual que `min_purchase_amount`
-- ya hace), y se propaga en `generate_coupon_batch_chunk` — las rutas
-- manuales (`actions/batches.ts` `buildDirectCoupons`) se ajustan en TS.
alter table coupon_batch add column discount_cap numeric(12, 2);
alter table coupon add column discount_cap numeric(12, 2);

create or replace function generate_coupon_batch_chunk(
  p_batch_id uuid, p_chunk_size integer default 500
)
returns table (generated integer, total integer, done boolean)
language plpgsql
as $$
declare
  v_batch coupon_batch%rowtype;
  v_current_max integer;
  v_remaining integer;
  v_this_chunk integer;
  v_inserted integer;
  v_generated_this_call integer;
begin
  select * into v_batch from coupon_batch where id = p_batch_id and org_scoped(org_id);
  if not found then
    raise exception 'Emisión no encontrada.';
  end if;
  if v_batch.status <> 'generating' then
    raise exception 'La emisión no está en generación.';
  end if;
  if v_batch.origin not in ('batch_audience', 'batch_anonymous') then
    raise exception 'Este origen no genera códigos por lotes.';
  end if;

  select coalesce(max(sequence), 0) into v_current_max from coupon where batch_id = p_batch_id;
  v_remaining := v_batch.requested_quantity - v_current_max;

  if v_remaining > 0 then
    v_this_chunk := least(p_chunk_size, v_remaining);

    if v_batch.origin = 'batch_audience' then
      -- `segment_members` es una MUESTRA curada, no el universo completo
      -- de la audiencia (segments.conteo_estimado es la única fuente del
      -- tamaño real) — un batch por audiencia solo puede emitir tantos
      -- cupones como filas de muestra queden sin usar en este batch.
      with candidates as (
        select member_id, row_number() over (order by agregado_en) as rn
        from segment_members
        where segment_id = v_batch.audience_segment_id
          and member_id not in (
            select coalesce(member_id, '00000000-0000-0000-0000-000000000000'::uuid)
            from coupon where batch_id = p_batch_id
          )
        limit v_this_chunk
      ),
      numbered as (
        select member_id, v_current_max + rn as seq from candidates
      )
      insert into coupon (
        org_id, batch_id, code, sequence, status, member_id, bearer,
        discount_type, discount_value, discount_cap, currency, min_purchase_amount, max_uses,
        points_cost, valid_from, valid_to, issued_at, assigned_at, qr_value
      )
      select
        v_batch.org_id, p_batch_id, render_coupon_code(v_batch.code_pattern, v_batch.code_prefix, n.seq),
        n.seq, 'assigned', n.member_id, false,
        v_batch.discount_type, v_batch.discount_value, v_batch.discount_cap, v_batch.currency, v_batch.min_purchase_amount,
        v_batch.max_uses_per_coupon, v_batch.points_cost, v_batch.valid_from, v_batch.valid_to, now(), now(),
        render_coupon_code(v_batch.code_pattern, v_batch.code_prefix, n.seq)
      from numbered n
      on conflict (org_id, code) do nothing;
    else
      with numbered as (
        select v_current_max + g as seq from generate_series(1, v_this_chunk) as g
      )
      insert into coupon (
        org_id, batch_id, code, sequence, status, bearer,
        discount_type, discount_value, discount_cap, currency, min_purchase_amount, max_uses,
        points_cost, valid_from, valid_to, issued_at, qr_value
      )
      select
        v_batch.org_id, p_batch_id, render_coupon_code(v_batch.code_pattern, v_batch.code_prefix, n.seq),
        n.seq, 'issued', true,
        v_batch.discount_type, v_batch.discount_value, v_batch.discount_cap, v_batch.currency, v_batch.min_purchase_amount,
        v_batch.max_uses_per_coupon, v_batch.points_cost, v_batch.valid_from, v_batch.valid_to, now(),
        render_coupon_code(v_batch.code_pattern, v_batch.code_prefix, n.seq)
      from numbered n
      on conflict (org_id, code) do nothing;
    end if;
  end if;

  -- Cuántas filas insertó realmente ESTA llamada — no `v_this_chunk`, que
  -- es solo lo que se pidió: `on conflict do nothing` puede haber
  -- descartado alguna por colisión de código, y para 'batch_audience' la
  -- muestra del segmento pudo tener menos miembros libres que el cupo.
  select count(*) into v_inserted from coupon where batch_id = p_batch_id;
  v_generated_this_call := v_inserted - v_batch.generated_count;

  -- Para 'batch_audience', si la muestra del segmento se agotó antes de
  -- llegar a `requested_quantity`, la emisión se cierra con lo generado en
  -- vez de quedar dando vueltas para siempre — el paso "Audiencia" del
  -- asistente ya avisa de esto con el tamaño resoluble hoy.
  if v_inserted >= v_batch.requested_quantity or v_generated_this_call = 0 then
    update coupon_batch
    set status = 'issued', generation_completed_at = now()
    where id = p_batch_id;

    insert into coupon_event (org_id, batch_id, type, title, actor_type, actor_label)
    values (v_batch.org_id, p_batch_id, 'generation_completed', 'Generación completada', 'system', 'Sistema de cupones');

    return query select v_generated_this_call, v_batch.requested_quantity, true;
    return;
  end if;

  return query select v_generated_this_call, v_batch.requested_quantity, false;
end;
$$;

-- Columnas "VALOR"/"PUNTOS" del listado de cupones (13.2) — `coupon_search`
-- solo denormalizaba persona/emisión (necesario para el `.or()` de
-- PostgREST), no el descuento del propio código ni `valid_from` (el filtro
-- "Vigencia" de `listCoupons` lo necesita: sin esta columna, PostgREST
-- rechaza la consulta entera con un error de columna inexistente).
-- `create or replace view` solo permite AÑADIR columnas al final, nunca
-- reordenar ni quitar las que ya expone `listCoupons`/`toCouponSearchRow`
-- — por eso van al final.
create or replace view coupon_search
with (security_invoker = true) as
select
  c.id, c.org_id, c.code, c.status, c.valid_to, c.batch_id, c.member_id, c.created_at,
  m.nombre as member_nombre, m.email as member_email,
  b.reference as batch_reference, b.name as batch_name,
  c.discount_type, c.discount_value, c.discount_cap, c.points_cost, c.valid_from
from coupon c
left join members m on m.id = c.member_id
left join coupon_batch b on b.id = c.batch_id;
