-- Datos de ejemplo de "11 · Audiencias" como migración (no solo `seed.sql`):
-- `supabase db push --include-seed` contra este proyecto remoto actualiza
-- el hash de `seed.sql` pero no deja las filas nuevas insertadas (verificado
-- por REST tras varios intentos) — mismo contenido, aplicado por el camino
-- que sí es fiable (`db push` de migraciones). `seed.sql` conserva este
-- bloque igual, palabra por palabra, para que `supabase db reset` (entorno
-- local) siga sembrando lo mismo sin depender de esta migración.

-- Audiencias (11 · Audiencias) — 24 segmentos de demo con los campos reales
-- añadidos en 20260823150000_audiencias.sql. Las primeras 6 filas son
-- literales del Figma (nombre/código/nivel/tamaño/estado); las 18
-- siguientes son audiencias plausibles inventadas para que "Total
-- audiencias: 24" (11.1 KPI) sea un conteo real, no solo las del mock.
with org as (select id from organizations where slug = 'omni')
insert into segments (org_id, nombre, codigo, descripcion, estado, nivel_dominante, sincronizado_con_ajo, ultima_sincronizacion_en, conteo_estimado, condiciones)
select
  (select id from org), s.nombre, s.codigo, s.descripcion, s.estado, s.nivel, s.sync,
  case when s.sync then now() - interval '12 minutes' else null end,
  s.tamano, '{}'::jsonb
from (
  values
    ('Compradores frecuentes', 'seg_freq_2026', 'Clientes con 3 o más compras en los últimos 60 días. Se sincroniza a diario con Adobe Journey Optimizer para activar journeys de fidelización.', 'activa', 'oro', true, 8240),
    ('Alto valor · VIP', 'seg_vip_gold', 'Socios en el 10% superior de valor acumulado en los últimos 12 meses.', 'activa', 'oro', true, 3482),
    ('En riesgo de fuga', 'seg_churn_risk', 'Sin compras en los últimos 45 días tras un historial de compra recurrente.', 'activa', 'plata', true, 5910),
    ('Nuevos registrados 30d', 'seg_new_30d', 'Socios que se inscribieron en el programa en los últimos 30 días.', 'activa', 'bronce', true, 2104),
    ('Inactivos 90 días', 'seg_inactive_90', 'Sin ninguna transacción en los últimos 90 días.', 'pausada', 'bronce', false, 6733),
    ('Cumpleañeros del mes', 'seg_birthday', 'Socios cuyo mes de nacimiento es el actual.', 'activa', 'plata', true, 1288),
    ('Carrito abandonado 7d', 'seg_cart_abandon_7d', 'Dejaron un carrito de ecommerce sin completar en los últimos 7 días.', 'activa', 'bronce', true, 1560),
    ('Compradores multicategoría', 'seg_multi_categoria', 'Compraron en 3 o más categorías del catálogo en los últimos 90 días.', 'activa', 'oro', true, 2870),
    ('Solo canal app', 'seg_solo_app', 'Toda su actividad de compra ocurre en la app móvil.', 'activa', 'plata', false, 4120),
    ('Solo canal POS', 'seg_solo_pos', 'Toda su actividad de compra ocurre en tienda física.', 'activa', 'bronce', false, 3390),
    ('Diamante todos', 'seg_diamante_all', 'Todos los socios del nivel más alto del programa.', 'activa', 'diamante', true, 640),
    ('Sin compras 6 meses', 'seg_sin_compra_6m', 'Sin ninguna transacción en los últimos 6 meses.', 'pausada', 'bronce', false, 4890),
    ('Alta frecuencia farmacia', 'seg_alta_frecuencia_farmacia', 'Compran medicamentos OTC al menos una vez por semana.', 'activa', 'oro', true, 1975),
    ('Cumpleaños próximos 7d', 'seg_birthday_7d', 'Cumplen años dentro de los próximos 7 días.', 'activa', 'plata', true, 410),
    ('Referidos activos', 'seg_referidos', 'Se inscribieron por un referido y ya registran al menos una compra.', 'activa', 'oro', true, 860),
    ('Con consentimiento de marketing', 'seg_consent_marketing', 'Otorgaron consentimiento de marketing en al menos un canal.', 'activa', 'plata', true, 6210),
    ('Sin consentimiento', 'seg_sin_consent', 'No han otorgado consentimiento de marketing en ningún canal.', 'pausada', 'bronce', false, 3040),
    ('Compradores dermocosmética', 'seg_dermo', 'Compraron en la categoría Dermocosmética en los últimos 90 días.', 'activa', 'plata', true, 1730),
    ('Compradores vitaminas', 'seg_vitaminas', 'Compraron en la categoría Vitaminas en los últimos 90 días.', 'activa', 'bronce', true, 2255),
    ('Clientes región Antioquia', 'seg_region_antioquia', 'Provincia de residencia registrada: Antioquia.', 'activa', 'plata', false, 3610),
    ('Clientes región CDMX', 'seg_region_cdmx', 'Tienda de inscripción en Ciudad de México.', 'activa', 'oro', true, 2980),
    ('Alto ticket promedio', 'seg_alto_ticket', 'Ticket promedio de compra en el 5% superior del programa.', 'activa', 'diamante', true, 720),
    ('Riesgo de bajar de nivel', 'seg_riesgo_bajar_nivel', 'A menos de 500 puntos del umbral inferior de su nivel actual.', 'activa', 'oro', true, 540),
    ('Canal referido campaña', 'seg_canal_campana', 'Se inscribieron a través de una campaña de adquisición.', 'pausada', 'bronce', false, 1190)
) as s (nombre, codigo, descripcion, estado, nivel, sync, tamano)
on conflict (org_id, codigo) do nothing;

-- Serie de 30 días por segmento (sparkline + flecha de TENDENCIA en 11.1,
-- "Tamaño de audiencia" con nuevos/salieron/neto en 11.2). Interpolación
-- lineal determinista entre un punto de partida y `conteo_estimado` (hoy)
-- — no hay motor de evaluación real que recalcule el tamaño día a día, así
-- que esta tabla es la única fuente de la serie, no una simulación de algo
-- que ya existe en otro lado.
with org as (select id from organizations where slug = 'omni'),
variacion as (
  select * from (
    values
      ('seg_freq_2026', 0.15), ('seg_vip_gold', 0.10), ('seg_churn_risk', 0.08),
      ('seg_new_30d', 0.20), ('seg_inactive_90', -0.12), ('seg_birthday', -0.05),
      ('seg_cart_abandon_7d', -0.06), ('seg_multi_categoria', 0.09), ('seg_solo_app', 0.04),
      ('seg_solo_pos', -0.02), ('seg_diamante_all', 0.03), ('seg_sin_compra_6m', -0.18),
      ('seg_alta_frecuencia_farmacia', 0.11), ('seg_birthday_7d', 0.07), ('seg_referidos', 0.14),
      ('seg_consent_marketing', 0.05), ('seg_sin_consent', -0.03), ('seg_dermo', 0.06),
      ('seg_vitaminas', 0.02), ('seg_region_antioquia', 0.01), ('seg_region_cdmx', 0.08),
      ('seg_alto_ticket', 0.10), ('seg_riesgo_bajar_nivel', -0.09), ('seg_canal_campana', -0.07)
  ) as v (codigo, variacion)
),
dias as (select d from generate_series(0, 29) as d)
insert into segment_size_history (org_id, segment_id, fecha, tamano)
select
  (select id from org), sg.id, current_date - d.d,
  -- El día 0 (hoy) queda exacto en `conteo_estimado` — el resto suma un
  -- oscilador determinista (fase/amplitud por hash del código) para que
  -- "Nuevos"/"Salieron" (11.2) no sean siempre 0 solo por ser la tendencia
  -- monótona.
  greatest(1, round(
    (
      (sg.conteo_estimado::numeric / (1 + v.variacion)) +
      (sg.conteo_estimado::numeric - sg.conteo_estimado::numeric / (1 + v.variacion))
        * (29 - d.d) / 29.0
    ) + (
      case when d.d = 0 then 0::numeric else
        (3 + abs(hashtext(sg.codigo)) % 4)::numeric
        * (sin((d.d + abs(hashtext(sg.codigo)) % 10)::double precision * 0.8))::numeric
      end
    )
  ))::integer
from segments sg
join variacion v on v.codigo = sg.codigo
cross join dias d
where sg.org_id = (select id from org)
on conflict (segment_id, fecha) do nothing;

-- Muestra de socios reales para el detalle de audiencias (11.2, tabla de
-- miembros). Nombres nuevos, no se reciclan los 8 de 05 — son perfiles
-- adicionales del programa, no los mismos socios bajo otra audiencia.
with org as (select id from organizations where slug = 'omni'),
tier_ids as (select nombre, id from tiers where org_id = (select id from org))
insert into members (org_id, nombre, apellido, email, tier_id, saldo_puntos, fecha_alta, estado_cuenta, consentimiento_marketing, canal_adquisicion)
select
  (select id from org), m.nombre, m.apellido, m.email,
  (select id from tier_ids where tier_ids.nombre = m.tier), m.saldo_puntos,
  now() - (m.dias_antiguedad || ' days')::interval, m.estado_cuenta, true, 'app'
from (
  values
    ('María', 'González', 'maria.gonzalez@mail.com', 'oro', 4820, 11, 'activo'),
    ('Jorge', 'Ramírez', 'jorge.ramirez@mail.com', 'oro', 3910, 13, 'activo'),
    ('Lucía', 'Pérez', 'lucia.perez@mail.com', 'plata', 2340, 14, 'activo'),
    ('Diego', 'Salinas', 'diego.salinas@mail.com', 'plata', 2105, 16, 'activo'),
    ('Camila', 'Flores', 'camila.flores@mail.com', 'bronce', 980, 18, 'inactivo')
) as m (nombre, apellido, email, tier, saldo_puntos, dias_antiguedad, estado_cuenta)
on conflict (org_id, email) do nothing;

-- Reparte la muestra sobre varias audiencias: "Compradores frecuentes" usa
-- exactamente los 5 socios del Figma 11.2; el resto reutiliza también
-- algunos de los 8 socios de 05, para que más de un detalle de audiencia
-- tenga tabla de miembros real.
with org as (select id from organizations where slug = 'omni'),
seg as (select codigo, id from segments where org_id = (select id from org)),
mem as (select email, id from members where org_id = (select id from org))
insert into segment_members (org_id, segment_id, member_id)
select
  (select id from org),
  (select id from seg where seg.codigo = x.codigo),
  (select id from mem where mem.email = x.email)
from (
  values
    ('seg_freq_2026', 'maria.gonzalez@mail.com'),
    ('seg_freq_2026', 'jorge.ramirez@mail.com'),
    ('seg_freq_2026', 'lucia.perez@mail.com'),
    ('seg_freq_2026', 'diego.salinas@mail.com'),
    ('seg_freq_2026', 'camila.flores@mail.com'),
    ('seg_vip_gold', 'maria.gonzalez@mail.com'),
    ('seg_vip_gold', 'sofia.ramirez@example.com'),
    ('seg_vip_gold', 'andres.gomez@example.com'),
    ('seg_churn_risk', 'julian.restrepo@example.com'),
    ('seg_churn_risk', 'felipe.herrera@example.com'),
    ('seg_churn_risk', 'diego.salinas@mail.com'),
    ('seg_new_30d', 'camila.flores@mail.com'),
    ('seg_inactive_90', 'felipe.herrera@example.com'),
    ('seg_inactive_90', 'julian.restrepo@example.com'),
    ('seg_birthday', 'lucia.perez@mail.com'),
    ('seg_birthday', 'mariana.ocampo@example.com'),
    ('seg_diamante_all', 'sofia.ramirez@example.com'),
    ('seg_diamante_all', 'camilo.torres@example.com')
) as x (codigo, email)
on conflict (segment_id, member_id) do nothing;

-- Dos journeys reales que usan "Compradores frecuentes" como entrada
-- (11.2 "Journeys vinculados"). El resto de audiencias no tiene journeys
-- vinculados todavía — el Loyalty Builder (08) tampoco trae datos de
-- ejemplo propios fuera de este seed puntual.
with org as (select id from organizations where slug = 'omni'),
seg as (select id from segments where org_id = (select id from org) and codigo = 'seg_freq_2026')
insert into workflows (org_id, nombre, descripcion, estado, version_actual)
select (select id from org), w.nombre, w.descripcion, 'publicado', 1
from (
  values
    ('Recompensa por frecuencia', 'Otorga puntos extra a compradores frecuentes al entrar al segmento.'),
    ('Recordatorio de puntos por vencer', 'Avisa por email cuando los puntos del socio están por expirar.')
) as w (nombre, descripcion)
where exists (select 1 from seg)
  and not exists (
    select 1 from workflows existing
    where existing.org_id = (select id from org) and existing.nombre = w.nombre
  );

with org as (select id from organizations where slug = 'omni'),
seg as (select id from segments where org_id = (select id from org) and codigo = 'seg_freq_2026'),
wf as (
  select id, nombre from workflows
  where org_id = (select id from org)
    and nombre in ('Recompensa por frecuencia', 'Recordatorio de puntos por vencer')
)
insert into workflow_nodes (workflow_id, tipo, etiqueta, posicion_x, posicion_y, config)
select
  wf.id, n.tipo, n.etiqueta, n.posicion_x, n.posicion_y,
  case when n.tipo = 'entra_segmento'
    then jsonb_build_object('audiencia_id', (select id::text from seg), 'modo', 'al_entrar', 'reevaluacion', 'diaria')
    else '{}'::jsonb
  end
from wf
join (
  values
    ('Recompensa por frecuencia', 'entra_segmento', 'Entra al segmento', 0, 0),
    ('Recompensa por frecuencia', 'acumular_puntos', 'Acumular puntos', 260, 0),
    ('Recompensa por frecuencia', 'fin_workflow', 'Fin', 520, 0),
    ('Recordatorio de puntos por vencer', 'entra_segmento', 'Entra al segmento', 0, 0),
    ('Recordatorio de puntos por vencer', 'email', 'Email', 260, 0),
    ('Recordatorio de puntos por vencer', 'fin_workflow', 'Fin', 520, 0)
) as n (workflow_nombre, tipo, etiqueta, posicion_x, posicion_y) on n.workflow_nombre = wf.nombre
where exists (select 1 from seg)
  and not exists (
    select 1 from workflow_nodes existing
    where existing.workflow_id = wf.id and existing.tipo = n.tipo
  );

with org as (select id from organizations where slug = 'omni'),
wf as (
  select id, nombre from workflows
  where org_id = (select id from org)
    and nombre in ('Recompensa por frecuencia', 'Recordatorio de puntos por vencer')
),
nodos as (
  select wf.id as workflow_id, wn.id as node_id, wn.posicion_x
  from wf join workflow_nodes wn on wn.workflow_id = wf.id
)
insert into workflow_edges (workflow_id, source_node_id, source_port, target_node_id)
select a.workflow_id, a.node_id, 'out', b.node_id
from nodos a
join nodos b on b.workflow_id = a.workflow_id and b.posicion_x = a.posicion_x + 260
on conflict (source_node_id, source_port, target_node_id) do nothing;
