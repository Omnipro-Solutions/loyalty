-- Continuación de `20260827090000_optimizacion_indices_rls.sql`: esa
-- auditoría no llegó a cubrir estos 4 casos (dos de ellos, tablas creadas
-- o revisadas después de que corriera).

-- 1. `points_ledger` es el ledger de puntos de los socios y su propio
-- comentario de creación (`20260822205659_socios_niveles_ledger.sql`) lo
-- documenta como "append-only por diseño: nunca se actualiza ni se borra
-- una fila, cada movimiento es un hecho auditable" — pero el `grant`
-- original (`20260822205859_rls.sql`) le dio `update, delete` a
-- `authenticated` de todas formas, el mismo problema que ya se corrigió
-- para `coupon_event`/`promocion_eventos`/`producto_eventos`, solo que a
-- este nunca le llegó el `revoke`. `members.saldo_puntos` es una
-- proyección calculada sobre este ledger — poder reescribirlo o borrarlo
-- descuadra saldos en silencio y rompe la trazabilidad.
revoke update, delete on points_ledger from authenticated;

-- 2. `coupon_redemption` (intento de uso de un cupón) tiene el mismo
-- `update, delete` de más. Ningún código de la app lo actualiza ni lo
-- borra (solo `select` en `features/coupons/lib/queries.ts` e `insert` en
-- el seed) — mismo criterio de bitácora inmutable que el resto.
revoke update, delete on coupon_redemption from authenticated;

-- 3. `workflow_status_events.actor_id` (FK a `profiles`, `on delete set
-- null`) quedó sin índice: la tabla se creó en
-- `20260827140000_builder_ciclo_vida.sql`, después de la auditoría de
-- índices de FK de este mismo día, así que se le escapó el mismo chequeo.
create index if not exists workflow_status_events_actor_id_idx
  on workflow_status_events (actor_id);

-- 4. `invitaciones` solo tenía índice por `org_id` y el único parcial de
-- `(org_id, email) where estado = 'pendiente'` — ninguno cubre el filtro
-- que de verdad corre en cada carga de 09.1 (`getTeamKpis`,
-- `features/team/lib/queries.ts`): `estado = 'pendiente' AND expira_en <=
-- X`.
create index if not exists invitaciones_pendiente_expira_idx
  on invitaciones (org_id, expira_en)
  where estado = 'pendiente';
