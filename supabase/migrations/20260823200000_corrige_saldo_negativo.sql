-- Corrige el saldo negativo de 5 socios (Valentina, Andrés, Mariana,
-- Julián, Daniela) causado por 20260823170000_dashboard_datos_demo.sql:
-- esa migración les agregó canjes (`points_ledger.tipo = 'canje'`) sin que
-- existiera ninguna acumulación previa que los respaldara. A diferencia de
-- Sofía/Camilo (que arrancan en 0 y se construyen 100% desde el ledger,
-- ver 20260822205659_socios_niveles_ledger.sql), estos 5 socios tenían su
-- saldo sembrado como un valor fijo directo en `members.saldo_puntos`
-- (nunca pensados como "derivados del ledger") — los canjes nuevos los
-- mandaron a negativo sin ningún respaldo real.
--
-- No se borra ni edita ninguna fila existente (el ledger es append-only,
-- cada canje ya sembrado sigue siendo un movimiento real para las
-- gráficas del dashboard). Se agrega un `ajuste` por socio, fechado antes
-- de su primer movimiento real, que representa el saldo migrado antes de
-- que este ledger empezara a registrar canjes — el monto deja a cada
-- socio exactamente en su saldo original de seed (05.3g) una vez sumado
-- todo el ledger.
with org as (select id from organizations where slug = 'omni'),
socios as (
  select email, id from members where org_id = (select id from org)
)
insert into points_ledger (org_id, member_id, tipo, puntos, origen, canal, creado_en)
select
  (select id from org),
  (select id from socios where socios.email = v.email),
  'ajuste',
  v.monto,
  'Migración de saldo histórico previo al ledger',
  null,
  (
    select min(pl.creado_en) from points_ledger pl
    where pl.member_id = (select id from socios where socios.email = v.email)
  ) - interval '30 days'
from (
  values
    ('valentina.rios@example.com', 18626),
    ('andres.gomez@example.com', 18168),
    ('mariana.ocampo@example.com', 14016),
    ('julian.restrepo@example.com', 9903),
    ('daniela.cardenas@example.com', 10181)
) as v (email, monto)
where exists (select 1 from socios where socios.email = v.email)
  and not exists (
    select 1 from points_ledger pl
    where pl.member_id = (select id from socios where socios.email = v.email)
      and pl.origen = 'Migración de saldo histórico previo al ledger'
  );

-- El trigger `points_ledger_apply_after_insert` suma el ajuste sobre el
-- valor QUE YA ESTABA en `saldo_puntos` (el saldo fijo original más los
-- canjes rotos) — sin este `update` directo quedaría duplicando el saldo
-- original en vez de solo corregirlo.
with org as (select id from organizations where slug = 'omni')
update members m
set saldo_puntos = v.saldo_final
from (
  values
    ('valentina.rios@example.com', 8760),
    ('andres.gomez@example.com', 7230),
    ('mariana.ocampo@example.com', 3450),
    ('julian.restrepo@example.com', 2680),
    ('daniela.cardenas@example.com', 890)
) as v (email, saldo_final)
where m.org_id = (select id from org) and m.email = v.email;
