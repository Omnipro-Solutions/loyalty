-- El insert de PROMO-CASHBACK-VIP, PROMO-2X-PUNTOS y PROMO-CONTINUIDAD-CRON
-- en 20260827220000_promociones_kpi_mecanicas.sql envolvía el id de segmento
-- en `jsonb_build_array(...)` para la condición `campo = 'segmento'` — copiado
-- por error del patrón de `producto`/`categoria` (esas SÍ son arrays,
-- `socio_nivel` también). Tanto el schema de Promociones
-- (`conditionSchema` en src/features/promotions/schemas.ts) como su lectura
-- en src/features/members/lib/queries.ts (`memberMatchesSegment`) esperan
-- `valor` como un string suelto para `segmento` — el array rompía
-- `/clientes/[id]` con `segmentValue.toLowerCase is not a function` al
-- calcular las promociones activas del socio.
--
-- Esta migración corrige las 3 filas YA sembradas; el insert original en
-- 20260827220000_promociones_kpi_mecanicas.sql ya se corrigió en paralelo
-- para que un `db reset` futuro siembre bien desde el inicio (su
-- `on conflict (org_id, codigo) do nothing` no habría tocado estas filas ya
-- existentes).
with org as (select id from organizations where slug = 'omni')
update promociones
set condiciones = jsonb_build_object(
  'combinador', 'todas',
  'condiciones', jsonb_build_array(
    jsonb_build_object('campo', 'segmento', 'valor',
      (select id::text from segments
       where codigo = 'seg_vip_gold' and org_id = (select id from org)))
  )
)
where org_id = (select id from org) and codigo = 'PROMO-CASHBACK-VIP';

with org as (select id from organizations where slug = 'omni')
update promociones
set condiciones = jsonb_build_object(
  'combinador', 'todas',
  'condiciones', jsonb_build_array(
    jsonb_build_object('campo', 'segmento', 'valor',
      (select id::text from segments
       where codigo = 'seg_freq_2026' and org_id = (select id from org))),
    jsonb_build_object('campo', 'socio_nivel', 'valor', jsonb_build_array('oro', 'diamante'))
  )
)
where org_id = (select id from org) and codigo = 'PROMO-2X-PUNTOS';

with org as (select id from organizations where slug = 'omni')
update promociones
set condiciones = jsonb_build_object(
  'combinador', 'todas',
  'condiciones', jsonb_build_array(
    jsonb_build_object('campo', 'segmento', 'valor',
      (select id::text from segments
       where codigo = 'seg_alta_frecuencia_farmacia' and org_id = (select id from org)))
  )
)
where org_id = (select id from org) and codigo = 'PROMO-CONTINUIDAD-CRON';
