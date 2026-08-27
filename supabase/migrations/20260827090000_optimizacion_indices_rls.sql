-- Optimización de rendimiento: índices faltantes en columnas de filtro RLS
-- y foreign keys, limpieza de índices redundantes, y dos correcciones de
-- seguridad/integridad encontradas en el mismo barrido (diagnóstico
-- estático de las 65 migraciones previas — no hay proyecto Supabase
-- enlazado en este entorno para medir contra `pg_stat_statements`).

-- 1. Columnas de filtro RLS (`org_id`) sin índice. `org_scoped(org_id)`
-- corre en CADA fila de CADA política `for all`/`for select` de estas
-- tablas — sin índice, cualquier lectura hace seq scan completo aunque la
-- fila objetivo sea una sola. `coupon_event` es el caso más urgente: es un
-- log append-only que solo crece.
create index if not exists coupon_event_org_id_idx on coupon_event (org_id);
create index if not exists coupon_assignment_org_id_idx on coupon_assignment (org_id);
create index if not exists challenges_org_id_idx on challenges (org_id);
create index if not exists member_consentimientos_org_id_idx on member_consentimientos (org_id);
create index if not exists segment_size_history_org_id_idx on segment_size_history (org_id);
create index if not exists segment_members_org_id_idx on segment_members (org_id);
create index if not exists member_promociones_org_id_idx on member_promociones (org_id);

-- 2. Foreign keys sin índice de soporte. Postgres nunca crea estos índices
-- automáticamente (solo indexa la PK del lado referenciado) — sin ellos,
-- un `delete`/`update` en la tabla padre o un join desde la tabla hija cae
-- a seq scan. Prioridad en las tablas append-only/alto volumen
-- (`points_ledger`, `coupon_redemption`, `workflow_run_steps`).
create index if not exists points_ledger_workflow_run_id_idx on points_ledger (workflow_run_id);
create index if not exists coupon_redemption_member_id_idx on coupon_redemption (member_id);
create index if not exists coupon_redemption_tienda_id_idx on coupon_redemption (tienda_id);
create index if not exists workflow_run_steps_node_id_idx on workflow_run_steps (node_id);
create index if not exists challenges_workflow_run_id_idx on challenges (workflow_run_id);
create index if not exists profiles_role_id_idx on profiles (role_id);
create index if not exists profiles_tienda_id_idx on profiles (tienda_id);
create index if not exists coupon_batch_free_product_id_idx on coupon_batch (free_product_id);
create index if not exists tiendas_grupo_id_idx on tiendas (grupo_id);

-- 3. `estado_publicacion` es el filtro más común sobre `promociones`
-- (dashboard, listado con filtro, promos activas del builder — ver
-- features/promotions/lib/queries.ts) y nunca tuvo índice propio, ni
-- siquiera cuando pasó de 2 a 4 valores en
-- 20260826210000_promociones_estado_publicacion.sql. Compuesto con
-- `org_id` (no parcial) porque RLS ya filtra por `org_id` en cada consulta,
-- así que ambas condiciones viajan juntas al planner.
create index if not exists promociones_org_id_estado_publicacion_idx
  on promociones (org_id, estado_publicacion);

-- 4. Índices redundantes: cada uno de estos es un índice de una sola
-- columna cuyas columnas ya son el prefijo líder de un índice único
-- existente sobre la misma tabla — el índice único ya sirve cualquier
-- consulta que use estos, así que son puro costo de escritura/espacio sin
-- beneficio de lectura.
drop index if exists coupon_batch_id_idx; -- subsumido por unique (batch_id, sequence)
drop index if exists segment_size_history_segment_id_idx; -- subsumido por unique (segment_id, fecha)
drop index if exists segment_members_segment_id_idx; -- subsumido por unique (segment_id, member_id)

-- 5. `cupones_doble_aprobacion.sql` definió estas 2 políticas con
-- `auth.uid()` sin envolver en `(select ...)`, rompiendo el patrón que el
-- resto del proyecto sigue a propósito desde `20260822205859_rls.sql`
-- (permite a Postgres cachear el resultado una vez por consulta en vez de
-- reevaluarlo en cada fila).
alter policy coupon_approval_insert on coupon_approval
  with check (org_scoped(org_id) and requested_by = (select auth.uid()));

alter policy coupon_approval_withdraw on coupon_approval
  using (org_scoped(org_id) and requested_by = (select auth.uid()) and status = 'pending')
  with check (org_scoped(org_id) and requested_by = (select auth.uid()) and status = 'withdrawn');

-- 6. `producto_eventos` se documenta como append-only (mismo espíritu que
-- `points_ledger`/`coupon_event`) pero conserva el `grant update, delete`
-- por defecto que Supabase concede a tablas nuevas — el mismo problema que
-- `20260824120000_cupones_evento_append_only.sql` ya corrigió para
-- `coupon_event`, nunca aplicado aquí. Cualquier rol autenticado puede hoy
-- editar o borrar la bitácora de auditoría del catálogo.
revoke update, delete on producto_eventos from authenticated;
