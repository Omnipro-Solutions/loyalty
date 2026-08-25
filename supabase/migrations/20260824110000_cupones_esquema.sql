-- Módulo de cupones (docs/cupones.md). Reemplaza la tabla `coupons` (creada
-- en 20260822205659_socios_niveles_ledger.sql) por el modelo completo del
-- doc: una emisión (`coupon_batch`) agrupa N códigos (`coupon`), con
-- asociación a socios, redenciones y una bitácora append-only de eventos.
--
-- EXCEPCIÓN DE IDIOMA (ver CLAUDE.md §3): este módulo, a diferencia de las
-- 30+ tablas restantes del proyecto, usa nombres de tabla/columna y valores
-- de `check` EN INGLÉS — decisión explícita del usuario.
--
-- `coupons` (español, plana, sin batch) no tiene ningún consumidor real en
-- `src/` ni filas sembradas ni FK entrante (`challenges` no la referencia) —
-- verificado antes de este drop. Se elimina limpia, sin `cascade` necesario
-- más allá de su propia FK saliente a `workflow_runs`.
drop table if exists coupons cascade;

-- Búsqueda parcial por código sobre el universo completo (regla 7.8 del
-- doc) — primera extensión del proyecto. Al esquema `extensions`, no
-- `public` (convención de Supabase).
create extension if not exists pg_trgm with schema extensions;

-- Gemelo en inglés de `set_actualizado_en()` (20260822205559_org_y_perfiles.sql)
-- — mismo cuerpo, otra columna. El módulo de cupones va en inglés; el resto
-- del proyecto sigue usando el helper original.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Metadatos de un archivo CSV importado (docs/cupones.md §6.6). No guarda
-- los bytes: el CSV se parsea en el navegador (sin bucket de Storage
-- configurado en este proyecto) y la Server Action recibe filas ya
-- normalizadas, que se insertan directo como `coupon` — por eso no hay una
-- tabla de "filas pendientes": los orígenes que necesitan importación o
-- redención de puntos son de volumen bajo (decenas/cientos, no miles) y se
-- materializan en un solo paso, sin el chunking asíncrono que sí necesitan
-- `batch_audience`/`batch_anonymous` (ver generate_coupon_batch_chunk más
-- abajo).
create table coupon_import_file (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  filename text not null,
  row_count integer not null default 0,
  matched_count integer not null default 0,
  unmatched_count integer not null default 0,
  column_mapping jsonb not null default '{}'::jsonb,
  uploaded_by uuid references profiles (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index coupon_import_file_org_id_idx on coupon_import_file (org_id);

-- Emisión (batch). Un cupón sin emisión no existe (regla 7.1) — incluso las
-- emisiones manuales de 1 código crean un batch de tamaño 1.
create table coupon_batch (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,

  reference text not null,
  name text not null,

  origin text not null check (origin in (
    'manual_customer', 'manual_bearer', 'points_redemption',
    'batch_audience', 'batch_anonymous', 'csv_import'
  )),
  -- 'pending_approval': estado NUEVO respecto al doc (5 estados -> 6). Sin
  -- él no hay forma de congelar la emisión mientras se decide la doble
  -- aprobación: el solicitante podría seguir editando `requested_quantity`
  -- mientras el aprobador la mira, y se aprobarían números distintos de
  -- los que se vieron. Ver guard_coupon_batch_transition().
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'generating', 'issued', 'closed', 'cancelled'
  )),

  discount_type text not null check (discount_type in (
    'percentage', 'fixed_amount', 'free_product'
  )),
  discount_value numeric(12, 2) not null default 0,
  free_product_id uuid references productos (id) on delete set null,
  currency text not null default 'USD' check (currency in ('USD')),
  min_purchase_amount numeric(12, 2),
  max_uses_per_coupon integer not null default 1 check (max_uses_per_coupon > 0),
  max_coupons_per_person integer not null default 1 check (max_coupons_per_person > 0),

  -- Patrón de código: 'N' = dígito de `coupon.sequence` (con relleno según
  -- la longitud de la corrida), 'A' = carácter aleatorio de un alfabeto sin
  -- I/L/O/0/1 (se leen mal por teléfono/papel impreso). Ver
  -- render_coupon_code() más abajo y su espejo en TS,
  -- features/coupons/lib/code.ts.
  code_prefix text,
  code_pattern text not null default 'CUP-AAAA-NNNN'
    check (char_length(code_pattern) between 4 and 32 and code_pattern ~ 'N'),

  valid_from timestamptz not null default now(),
  valid_to timestamptz,

  promotion_id uuid references promociones (id) on delete set null,
  -- `rule_id` del doc: omitida a propósito. No existe tabla `reglas` en
  -- este proyecto todavía (`/reglas` es un placeholder de Fase 5) — un uuid
  -- sin tabla a la que apuntar sería un campo fabricado.

  -- Audiencia: FK real a `segments` (11 · Audiencias), no un id de texto
  -- opaco de un CDP externo que este proyecto no tiene. `audience_name`/
  -- `audience_size_at_issue` son el snapshot del momento de emisión —
  -- sobreviven a que el segmento se renombre o cambie de tamaño después.
  audience_segment_id uuid references segments (id) on delete set null,
  audience_name text,
  audience_mode text check (audience_mode is null or audience_mode in ('dynamic', 'frozen')),
  audience_resolved_at timestamptz,
  audience_size_at_issue integer,

  csv_file_id uuid references coupon_import_file (id) on delete set null,

  points_cost integer check (points_cost is null or points_cost >= 0),
  points_charge_timing text check (
    points_charge_timing is null or points_charge_timing in ('on_create', 'on_redeem')
  ),
  points_rate numeric(10, 4),

  requested_quantity integer not null default 1 check (requested_quantity > 0),
  -- Contadores desnormalizados, mantenidos por trigger de SENTENCIA sobre
  -- `coupon` (coupon_refresh_batch_counts) — un batch se materializa en
  -- lotes de 500 y un trigger por FILA los recontaría 500 veces.
  generated_count integer not null default 0,
  assigned_count integer not null default 0,
  redeemed_count integer not null default 0,
  cancelled_count integer not null default 0,

  -- Solo 'print' tiene implementación real en este proyecto — no hay
  -- sender de email/SMS. Se conserva la elección del operador igual (es un
  -- dato real de la emisión), documentando la limitación en vez de fingir
  -- un canal que no envía nada.
  delivery_channels text[] not null default '{}'::text[],
  store_ids uuid[] not null default '{}'::uuid[],
  category_ids uuid[] not null default '{}'::uuid[],

  -- Firma de autorización del emisor — obligatoria antes de salir de
  -- 'draft' (regla 7.2), enforceada por guard_coupon_batch_transition().
  issue_reason text,
  internal_reference text,
  created_by uuid references profiles (id) on delete set null,
  authorized_by uuid references profiles (id) on delete set null,
  authorized_at timestamptz,
  authorization_ip inet,
  -- Calculado en TS por evaluateApprovalRequirement() y escrito por la
  -- Server Action de autorización — NO es una columna generada: los
  -- umbrales deben poder moverse sin migración (ver
  -- features/coupons/lib/thresholds.ts).
  requires_approval boolean not null default false,
  -- `approved_by`/`approved_at` (espejo desnormalizado de la aprobación
  -- viva) y la tabla `coupon_approval` los agrega la migración del flujo de
  -- aprobación — no existen todavía en este commit.

  generation_started_at timestamptz,
  generation_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (org_id, reference),
  constraint coupon_batch_free_product_required check (
    discount_type <> 'free_product' or free_product_id is not null
  )
);

create index coupon_batch_org_id_idx on coupon_batch (org_id);
create index coupon_batch_status_idx on coupon_batch (org_id, status);
create index coupon_batch_origin_idx on coupon_batch (org_id, origin);
create index coupon_batch_audience_segment_id_idx on coupon_batch (audience_segment_id);
create index coupon_batch_promotion_id_idx on coupon_batch (promotion_id);
create index coupon_batch_csv_file_id_idx on coupon_batch (csv_file_id);
create index coupon_batch_created_at_idx on coupon_batch (org_id, created_at desc);

create trigger coupon_batch_set_updated_at
  before update on coupon_batch
  for each row execute function set_updated_at();

-- `reference` autogenerada (EMI-2026-0142) por secuencia + trigger — mismo
-- patrón que `members.codigo_socio`
-- (20260823110000_clientes_perfil.sql:55-71).
create sequence coupon_batch_reference_seq;

create or replace function set_coupon_batch_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null then
    new.reference := 'EMI-' || to_char(now(), 'YYYY') || '-'
      || lpad(nextval('coupon_batch_reference_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger coupon_batch_set_reference
  before insert on coupon_batch
  for each row execute function set_coupon_batch_reference();

-- Código individual. `sequence` (1..N dentro del batch) es lo que hace
-- expresable el rango de impresión y alimenta el token 'N' del
-- `code_pattern` — sustituye a los `coupon_id_from/_to` del doc, que sobre
-- uuids no ordenan nada.
create table coupon (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  batch_id uuid not null references coupon_batch (id) on delete cascade,

  code text not null,
  sequence integer not null check (sequence > 0),

  -- 'expired' NO se almacena: se deriva cruzando `valid_to` en
  -- features/coupons/lib/status.ts, igual que
  -- features/promotions/lib/status.ts hace con las promociones.
  status text not null default 'draft' check (status in (
    'draft', 'issued', 'assigned', 'redeemed', 'cancelled'
  )),

  member_id uuid references members (id) on delete set null,
  bearer boolean not null default false,

  -- Materializados del batch al momento de generar — permiten excepción
  -- por cupón sin tener que ir a `coupon_batch` en cada lectura.
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount', 'free_product')),
  discount_value numeric(12, 2) not null default 0,
  currency text not null default 'USD' check (currency in ('USD')),
  min_purchase_amount numeric(12, 2),
  max_uses integer not null default 1 check (max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),

  points_cost integer,
  points_charged_at timestamptz,
  points_refunded boolean not null default false,

  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  issued_at timestamptz,
  assigned_at timestamptz,
  redeemed_at timestamptz,

  cancelled_at timestamptz,
  cancel_reason_code text check (cancel_reason_code is null or cancel_reason_code in (
    'issued_in_error', 'duplicate', 'suspected_fraud', 'customer_request', 'other'
  )),
  cancel_reason_note text,
  cancelled_by uuid references profiles (id) on delete set null,

  -- Solo QR (decisión de producto) — el valor es el propio `code`; la
  -- columna existe por si algún día el QR lleva una URL firmada en vez del
  -- código plano.
  qr_value text not null,

  printed_at timestamptz,
  print_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (org_id, code),
  unique (batch_id, sequence),
  -- Regla 7.4: fraude y "otro" exigen nota.
  constraint coupon_cancel_note_required check (
    cancel_reason_code is null
    or cancel_reason_code not in ('suspected_fraud', 'other')
    or (cancel_reason_note is not null and btrim(cancel_reason_note) <> '')
  ),
  -- Al portador y con titular son excluyentes en el alta.
  constraint coupon_bearer_or_member check (not (bearer and member_id is not null))
);

create index coupon_org_id_idx on coupon (org_id);
create index coupon_batch_id_idx on coupon (batch_id, sequence);
create index coupon_member_id_idx on coupon (member_id);
create index coupon_status_idx on coupon (org_id, status);
create index coupon_valid_to_idx on coupon (org_id, valid_to);
create index coupon_code_trgm_idx on coupon using gin (code extensions.gin_trgm_ops);

create trigger coupon_set_updated_at
  before update on coupon
  for each row execute function set_updated_at();

-- Contadores del batch por trigger de SENTENCIA (ver comentario en
-- coupon_batch.generated_count). `batch_id` nunca cambia tras el insert, así
-- que basta con mirar la tabla de transición "new" en insert/update y
-- "old" en delete.
create or replace function coupon_refresh_batch_counts()
returns trigger
language plpgsql
as $$
declare
  v_batch_ids uuid[];
begin
  if tg_op = 'DELETE' then
    select array_agg(distinct batch_id) into v_batch_ids from old_rows;
  else
    select array_agg(distinct batch_id) into v_batch_ids from new_rows;
  end if;

  if v_batch_ids is null then
    return null;
  end if;

  update coupon_batch b set
    generated_count = (select count(*) from coupon c where c.batch_id = b.id),
    assigned_count  = (select count(*) from coupon c where c.batch_id = b.id and c.member_id is not null),
    redeemed_count  = (select count(*) from coupon c where c.batch_id = b.id and c.status = 'redeemed'),
    cancelled_count = (select count(*) from coupon c where c.batch_id = b.id and c.status = 'cancelled')
  where b.id = any (v_batch_ids);
  return null;
end;
$$;

create trigger coupon_counts_after_insert
  after insert on coupon
  referencing new table as new_rows
  for each statement execute function coupon_refresh_batch_counts();

create trigger coupon_counts_after_update
  after update on coupon
  referencing new table as new_rows
  for each statement execute function coupon_refresh_batch_counts();

create trigger coupon_counts_after_delete
  after delete on coupon
  referencing old table as old_rows
  for each statement execute function coupon_refresh_batch_counts();

-- Vínculo cupón <-> persona, con historial (un cupón puede reasignarse;
-- solo una asociación activa a la vez).
create table coupon_assignment (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  coupon_id uuid not null references coupon (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  role text not null check (role in ('holder', 'previous_holder', 'issuer')),
  source text not null check (source in ('manual', 'rule', 'journey', 'redemption', 'csv')),
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  assigned_by uuid references profiles (id) on delete set null,
  is_active boolean not null default true
);

create index coupon_assignment_coupon_id_idx on coupon_assignment (coupon_id);
create index coupon_assignment_member_id_idx on coupon_assignment (member_id);

create unique index coupon_assignment_active_unique
  on coupon_assignment (coupon_id) where is_active;

-- Intento de uso del cupón (aplicado/rechazado/validado). Sin motor de
-- checkout en este proyecto: se llena por el seed y por una acción manual
-- del back-office (registerRedemptionAction), no por un flujo de compra
-- real.
create table coupon_redemption (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  coupon_id uuid not null references coupon (id) on delete cascade,
  member_id uuid references members (id) on delete set null,
  tienda_id uuid references tiendas (id) on delete set null,
  pedido_id uuid references pedidos (id) on delete set null,
  order_amount numeric(12, 2),
  discount_applied numeric(12, 2),
  points_charged integer,
  result text not null check (result in ('applied', 'rejected', 'validated')),
  rejection_code text,
  -- Mismo conjunto que `pedidos.canal`/`points_ledger.canal`
  -- (SALES_CHANNELS en src/types/domain.ts) — que la redención y el pedido
  -- que la origina hablen de canales distintos sería un bug garantizado.
  channel text not null check (channel in ('pos', 'ecommerce', 'app')),
  occurred_at timestamptz not null default now()
);

create index coupon_redemption_coupon_id_idx on coupon_redemption (coupon_id);
create index coupon_redemption_org_occurred_idx on coupon_redemption (org_id, occurred_at desc);
create index coupon_redemption_pedido_id_idx on coupon_redemption (pedido_id);

-- Log append-only por cupón y/o por emisión. `org_id` directo (no un
-- helper `coupon_owned_by_current_org()`) — mismo patrón que
-- `producto_eventos`, policy más simple.
create table coupon_event (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  coupon_id uuid references coupon (id) on delete cascade,
  batch_id uuid references coupon_batch (id) on delete cascade,
  -- Fuera del set del doc: 'viewed'/'reminder_sent'/'delivered' (no hay
  -- sender de email/SMS ni tracking de apertura — emitirlos sería dato
  -- fabricado). Dentro, que el doc no tenía: 'approval_requested'/
  -- 'approval_rejected'/'approval_withdrawn' (el doc solo registraba el
  -- desenlace positivo, dejando la petición y el rechazo invisibles en la
  -- línea de tiempo).
  type text not null check (type in (
    'batch_created', 'authorization_signed',
    'approval_requested', 'approval_granted', 'approval_rejected', 'approval_revoked', 'approval_withdrawn',
    'generation_started', 'generation_completed',
    'issued', 'assigned', 'unassigned', 'validity_extended',
    'redeemed', 'redemption_rejected', 'expired', 'cancelled', 'printed', 'exported'
  )),
  title text not null,
  detail text,
  actor_type text not null check (actor_type in ('user', 'system', 'rule', 'journey', 'store')),
  actor_id uuid,
  actor_label text not null,
  reason_code text,
  reason_note text,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  occurred_at timestamptz not null default now(),
  constraint coupon_event_target_required check (coupon_id is not null or batch_id is not null)
);

create index coupon_event_coupon_id_idx on coupon_event (coupon_id, occurred_at desc);
create index coupon_event_batch_id_idx on coupon_event (batch_id, occurred_at desc);

-- Autor del evento — calcado de `producto_evento_autor()`
-- (20260823160000_bitacora_producto.sql:99).
create or replace function coupon_event_actor(
  out actor_id uuid, out actor_label text, out actor_type text
)
language sql
stable
as $$
  select u.uid,
         coalesce(p.nombre, 'Sistema de cupones'),
         case when u.uid is null then 'system' else 'user' end
  from (select auth.uid() as uid) u
  left join profiles p on p.id = u.uid
$$;

-- Trabajo de impresión (vale QR en cuadrícula o uno por hoja). `file_url`
-- siempre null hoy: la impresión es `window.print()` sobre una ruta
-- dedicada, no un generador de PDF en servidor.
create table coupon_print_job (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  batch_id uuid references coupon_batch (id) on delete set null,
  coupon_ids uuid[] not null default '{}'::uuid[],
  sequence_from integer,
  sequence_to integer,
  layout text not null default 'grid_8' check (layout in ('grid_8', 'single_page')),
  page_count integer,
  requested_by uuid references profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  file_url text,
  created_at timestamptz not null default now()
);

create index coupon_print_job_batch_id_idx on coupon_print_job (batch_id);
create index coupon_print_job_org_id_idx on coupon_print_job (org_id);

-- Guardarraíl de la máquina de estados (regla 7.2). Versión MÍNIMA: valida
-- transiciones legales y exige motivo + firma antes de salir de 'draft'.
-- La migración del flujo de aprobación reemplaza esta función (`create or
-- replace`) para además exigir una fila aprobada de `coupon_approval` antes
-- de 'generating' cuando `requires_approval` — esa tabla no existe todavía
-- en este commit.
create or replace function guard_coupon_batch_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is not distinct from old.status then
    if old.status = 'pending_approval' then
      raise exception 'La emisión está esperando aprobación: no se puede editar.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if (old.status, new.status) not in (
    ('draft', 'pending_approval'), ('draft', 'generating'), ('draft', 'cancelled'),
    ('pending_approval', 'draft'), ('pending_approval', 'generating'), ('pending_approval', 'cancelled'),
    ('generating', 'issued'), ('generating', 'cancelled'),
    ('issued', 'closed'), ('issued', 'cancelled'), ('closed', 'cancelled')
  ) then
    raise exception 'Transición de estado inválida: % → %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status in ('pending_approval', 'generating') then
    if coalesce(btrim(new.issue_reason), '') = ''
       or new.authorized_by is null or new.authorized_at is null then
      raise exception 'Falta el motivo de emisión o la firma de autorización.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger coupon_batch_guard_transition
  before update on coupon_batch
  for each row execute function guard_coupon_batch_transition();

-- Renderiza un código a partir del patrón del batch. 'N' = dígito de
-- `sequence` (relleno a la longitud de la corrida), 'A' = carácter
-- aleatorio del alfabeto sin ambigüedades, cualquier otro carácter es
-- literal. Espejo SQL de features/coupons/lib/code.ts (esa copia TS es
-- solo para la previsualización del asistente; esta es la fuente real).
create or replace function render_coupon_code(
  p_pattern text, p_prefix text, p_sequence integer
)
returns text
language plpgsql
as $$
declare
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_result text := '';
  v_len int := char_length(p_pattern);
  v_i int := 1;
  v_char text;
  v_run_len int;
begin
  while v_i <= v_len loop
    v_char := substr(p_pattern, v_i, 1);
    v_run_len := 0;
    while v_i <= v_len and substr(p_pattern, v_i, 1) = v_char loop
      v_run_len := v_run_len + 1;
      v_i := v_i + 1;
    end loop;

    if v_char = 'N' then
      v_result := v_result || lpad(p_sequence::text, v_run_len, '0');
    elsif v_char = 'A' then
      for v_j in 1..v_run_len loop
        v_result := v_result || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      end loop;
    else
      v_result := v_result || repeat(v_char, v_run_len);
    end if;
  end loop;

  return coalesce(p_prefix, '') || v_result;
end;
$$;

-- Generación por lotes dirigida por el navegador (ver la nota "honesta" de
-- la Fase 7 del plan): no hay worker ni cola en este proyecto, así que el
-- cliente llama esta función en bucle desde batch-generation-progress.tsx
-- hasta que `done`. Solo los 2 orígenes que pueden escalar a miles
-- (`batch_audience`, `batch_anonymous`) pasan por aquí — manual/CSV/canje
-- de puntos se materializan en un solo paso desde la Server Action, sin
-- chunking, porque son de volumen bajo.
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
        discount_type, discount_value, currency, min_purchase_amount, max_uses,
        points_cost, valid_from, valid_to, issued_at, assigned_at, qr_value
      )
      select
        v_batch.org_id, p_batch_id, render_coupon_code(v_batch.code_pattern, v_batch.code_prefix, n.seq),
        n.seq, 'assigned', n.member_id, false,
        v_batch.discount_type, v_batch.discount_value, v_batch.currency, v_batch.min_purchase_amount,
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
        discount_type, discount_value, currency, min_purchase_amount, max_uses,
        points_cost, valid_from, valid_to, issued_at, qr_value
      )
      select
        v_batch.org_id, p_batch_id, render_coupon_code(v_batch.code_pattern, v_batch.code_prefix, n.seq),
        n.seq, 'issued', true,
        v_batch.discount_type, v_batch.discount_value, v_batch.currency, v_batch.min_purchase_amount,
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

alter table coupon_import_file enable row level security;
alter table coupon_batch enable row level security;
alter table coupon enable row level security;
alter table coupon_assignment enable row level security;
alter table coupon_redemption enable row level security;
alter table coupon_event enable row level security;
alter table coupon_print_job enable row level security;

create policy coupon_import_file_org on coupon_import_file
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy coupon_batch_org on coupon_batch
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy coupon_org on coupon
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy coupon_assignment_org on coupon_assignment
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

create policy coupon_redemption_org on coupon_redemption
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

-- Append-only de verdad (a diferencia de `producto_eventos`, que concede
-- CRUD completo pese a documentarse como append-only): sin policy ni grant
-- de update/delete.
create policy coupon_event_select on coupon_event
  for select to authenticated
  using (org_scoped(org_id));

create policy coupon_event_insert on coupon_event
  for insert to authenticated
  with check (org_scoped(org_id));

create policy coupon_print_job_org on coupon_print_job
  for all to authenticated
  using (org_scoped(org_id))
  with check (org_scoped(org_id));

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  coupon_import_file, coupon_batch, coupon, coupon_assignment,
  coupon_redemption, coupon_print_job
to authenticated;

grant select, insert on coupon_event to authenticated;

grant execute on function render_coupon_code(text, text, integer) to authenticated;
grant execute on function generate_coupon_batch_chunk(uuid, integer) to authenticated;

-- Vista de búsqueda (regla 7.8: el ámbito "Todo" del buscador debe correr
-- en servidor sobre el universo completo). `security_invoker = true`: la
-- RLS de `coupon`/`members`/`coupon_batch` sigue aplicando por el usuario
-- que consulta, la vista solo denormaliza para poder hacer un `.or()` de
-- PostgREST sobre una sola relación — algo que un join embebido no permite.
create view coupon_search
with (security_invoker = true) as
select
  c.id, c.org_id, c.code, c.status, c.valid_to, c.batch_id, c.member_id, c.created_at,
  m.nombre as member_nombre, m.email as member_email,
  b.reference as batch_reference, b.name as batch_name
from coupon c
left join members m on m.id = c.member_id
left join coupon_batch b on b.id = c.batch_id;

grant select on coupon_search to authenticated;
