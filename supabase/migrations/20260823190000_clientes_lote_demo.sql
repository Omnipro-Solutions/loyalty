-- 100 socios adicionales para que "05 · Clientes" tenga un dataset de
-- tamaño real (paginación, filtros, KPIs) — antes solo había 13 en total.
-- Generados de forma determinista (`hashtext`/módulo sobre el índice, nunca
-- `random()`) para que el seed sea reproducible entre corridas — mismo
-- criterio que `segment_size_history`
-- (20260823152000_audiencias_datos_demo.sql). Perfil con variación
-- realista: no todos los campos opcionales quedan llenos (mismo espíritu
-- que Cárdenas/Herrera en el cohorte original) — la mayoría sí, una
-- fracción se queda con algún campo en null, para que "Perfil completo" no
-- sea un 100% plano y aburrido.
--
-- Como migración además de `seed.sql`, mismo motivo que
-- 20260823152000_audiencias_datos_demo.sql: `supabase db push
-- --include-seed` contra este proyecto remoto no deja las filas de
-- `seed.sql` insertadas — el camino fiable es `db push` de migraciones.
-- `seed.sql` conserva este bloque igual, palabra por palabra.
--
-- `numero_documento` usa el rango 2000000001-2000000100 a propósito: no
-- colisiona con ningún documento sembrado antes (todos por debajo de
-- 1200000000) y sirve como marcador para el `update` de tienda de más
-- abajo, que solo debe tocar a este lote nuevo.
with org as (select id from organizations where slug = 'omni'),
tier_ids as (select nombre, id from tiers where org_id = (select id from org)),
gen as (
  select
    i,
    (i % 2 = 0) as es_masculino,
    case
      when i % 100 < 45 then 'bronce'
      when i % 100 < 75 then 'plata'
      when i % 100 < 93 then 'oro'
      else 'diamante'
    end as tier,
    abs(hashtext('pts|' || i)) as h_puntos,
    abs(hashtext('alta|' || i)) as h_alta,
    abs(hashtext('tel|' || i)) as h_tel,
    abs(hashtext('nac|' || i)) as h_nacimiento,
    abs(hashtext('hijos|' || i)) as h_hijos,
    abs(hashtext('mascotas|' || i)) as h_mascotas,
    abs(hashtext('consent|' || i)) as h_consent
  from generate_series(1, 100) as i
),
nombres_m as (
  select array[
    'Juan','Carlos','Luis','Andrés','Miguel','José','David','Daniel','Sergio','Óscar',
    'Alejandro','Fernando','Ricardo','Iván','Diego','Cristian','Mauricio','Esteban','Nicolás','Rodrigo'
  ] as arr
),
nombres_f as (
  select array[
    'Laura','Ana','Paula','Valeria','Carolina','Andrea','Natalia','Alejandra','Camila','Isabella',
    'Manuela','Gabriela','Juliana','Claudia','Marcela','Adriana','Catalina','Vanessa','Lorena','Ximena'
  ] as arr
),
apellidos as (
  select array[
    'Rodríguez','Gómez','Martínez','López','García','Hernández','Sánchez','Ramírez','Torres','Díaz',
    'Vargas','Castro','Ortiz','Rojas','Moreno','Muñoz','Suárez','Rincón','Molina','Cárdenas',
    'Peña','Reyes','Guerrero','Mejía','Cortés','Cáceres','Beltrán','Aguilar','Osorio','Franco'
  ] as arr
),
provincias as (
  select array[
    'Antioquia','Cundinamarca','Valle del Cauca','Atlántico','Santander','Bolívar','Risaralda',
    'Tolima','Caldas','Nariño','Boyacá','Huila','Meta','Quindío','Norte de Santander'
  ] as arr
),
estados_civiles as (
  select array['soltero','casado','union_libre','divorciado','viudo'] as arr
),
canales as (
  select array['pos','ecommerce','app','referido','campana','otro'] as arr
),
preferencias as (
  select array[
    'Analgésicos','Vitaminas','Respiratorio','Dermocosmética','Cuidado personal',
    'Antihistamínicos','Gastrointestinal','Cuidado bucal','Primeros auxilios'
  ] as arr
),
socios as (
  select
    g.i,
    g.tier,
    g.h_puntos, g.h_alta, g.h_tel, g.h_nacimiento, g.h_hijos, g.h_mascotas, g.h_consent,
    case when g.es_masculino then 'masculino' else 'femenino' end as genero_base,
    case when g.es_masculino then (select arr from nombres_m)[1 + g.i % 20]
         else (select arr from nombres_f)[1 + g.i % 20] end as nombre,
    (select arr from apellidos)[1 + (g.i * 7) % 30] as apellido,
    (select arr from provincias)[1 + (g.i * 7) % 15] as provincia,
    (select arr from estados_civiles)[1 + (g.i * 3) % 5] as estado_civil,
    (select arr from canales)[1 + (g.i * 13) % 6] as canal_adquisicion,
    (select arr from preferencias)[1 + (g.i * 11) % 9] as preferencia_compra
  from gen g
)
insert into members (
  org_id, nombre, apellido, email, tier_id, saldo_puntos, fecha_alta,
  tipo_documento, numero_documento, telefono, fecha_nacimiento, genero,
  provincia, estado_civil, preferencia_compra, tiene_hijos, tiene_mascotas,
  consentimiento_marketing, canal_adquisicion, estado_cuenta
)
select
  (select id from org),
  s.nombre,
  s.apellido,
  lower(translate(s.nombre, 'áéíóúñ', 'aeioun')) || '.' ||
    lower(translate(s.apellido, 'áéíóúñ', 'aeioun')) || s.i || '@example.com',
  (select id from tier_ids where tier_ids.nombre = s.tier),
  case s.tier
    when 'bronce' then 200 + s.h_puntos % 1300
    when 'plata' then 1500 + s.h_puntos % 2500
    when 'oro' then 4000 + s.h_puntos % 5000
    else 9000 + s.h_puntos % 11000
  end,
  now() - ((s.h_alta % 700) || ' days')::interval,
  case when s.i % 23 = 0 then null else 'cc' end,
  case when s.i % 23 = 0 then null else (2000000000 + s.i)::text end,
  case when s.i % 11 = 0 then null
       else '+57 3' || (10 + s.h_tel % 90) || ' 555 ' || lpad((1000 + s.i)::text, 4, '0')
  end,
  case when s.i % 13 = 0 then null
       else (date '1970-01-01' + (s.h_nacimiento % 12800) * interval '1 day')::date
  end,
  case when s.i % 17 = 0 then null else s.genero_base end,
  s.provincia,
  case when s.i % 9 = 0 then null else s.estado_civil end,
  case when s.i % 7 = 0 then null else s.preferencia_compra end,
  case when s.i % 5 = 0 then null else (s.h_hijos % 2 = 0) end,
  case when s.i % 6 = 0 then null else (s.h_mascotas % 2 = 0) end,
  (s.h_consent % 10) < 7,
  s.canal_adquisicion,
  case
    when s.i % 20 = 0 then 'suspendido'
    when s.i % 8 = 0 then 'inactivo'
    else 'activo'
  end
from socios s
on conflict (org_id, email) do nothing;

-- Consentimientos del lote nuevo: mismo criterio derivado de
-- `consentimiento_marketing` que ya usa el resto del seed. Alcance real
-- (no una lista de emails a mano): cualquier socio que todavía no tenga
-- ningún canal registrado — cubre este lote de 100 sin tocar a los 13 que
-- ya lo tienen.
with org as (select id from organizations where slug = 'omni')
insert into member_consentimientos (org_id, member_id, canal, otorgado, fuente, actualizado_en)
select
  (select id from org), m.id, c.canal,
  m.consentimiento_marketing and c.canal in ('email', 'push', 'personalizacion'),
  case when m.consentimiento_marketing then 'web' end,
  m.creado_en
from members m
cross join (
  values ('email'), ('sms'), ('push'), ('whatsapp'), ('personalizacion'), ('socios_comerciales')
) as c (canal)
where m.org_id = (select id from org)
  and not exists (select 1 from member_consentimientos mc where mc.member_id = m.id)
on conflict (member_id, canal) do nothing;

-- Tienda de inscripción para ~70% del lote nuevo (el resto queda sin
-- tienda, como socios de e-commerce puro). Acotado por el rango de
-- `numero_documento` de este lote para no tocar los 13 socios anteriores
-- (algunos de ellos, como Camila Flores, se dejan sin tienda a propósito
-- en su propia migración).
with org as (select id from organizations where slug = 'omni'),
tiendas_arr as (
  select array_agg(id order by codigo_tienda) as arr
  from tiendas where org_id = (select id from org)
)
update members m
set tienda_inscripcion_id = (select arr from tiendas_arr)[1 + (abs(hashtext(m.email)) % 8)]
where m.org_id = (select id from org)
  and m.numero_documento is not null
  and m.numero_documento::bigint between 2000000001 and 2000000100
  and abs(hashtext(m.email || 'tienda')) % 10 < 7;
