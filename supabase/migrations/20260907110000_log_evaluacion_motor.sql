-- La deliberación del motor, no solo su desenlace.
--
-- Qué faltaba: la bitácora registra que una promoción SE APLICÓ (`canje`) o
-- que se rechazó (`canje_rechazado`), pero no lo que el motor pensó para
-- llegar ahí. Y en este programa eso no es un adorno: con
-- `modo_multiple = 'mejor_beneficio'`, `acumulable = false`, `limites` por
-- socio y ventana, presupuesto por promoción, `canal_aplicacion` y
-- `aplica_a_rx`, hay media docena de razones distintas por las que una
-- promoción vigente no cae en un carrito que parecía calificar.
--
-- Sin eso, «¿por qué no le dio el 3x2?» solo se puede responder abriendo la
-- promoción y el ticket en dos pestañas y comparando a mano. Con las
-- candidatas en el evento, la respuesta está en la fila.
--
-- Por qué en `metadatos` y no en una tabla nueva: hoy no existe la API de
-- carrito/POS que escribiría esas filas —no hay quién las genere—, así que
-- una tabla de evaluación quedaría vacía y sin contrato. El evento de canje
-- ya nace de esa consulta y ya lleva `monto_carrito`: añadirle las
-- candidatas es el paso que se puede dar hoy sin inventar una integración.
-- Cuando exista el endpoint real, esa tabla tendrá sentido (una fila por
-- consulta, incluidas las que no otorgan nada) y este bloque será su
-- precedente, no su competencia.
--
-- El contrato de esas claves vive en `SystemLogEvaluation`
-- (`src/config/system-log.ts`), y se lee a la defensiva: son metadatos, no
-- columnas, y un evento sin ellas simplemente no pinta el bloque.
--
-- `promocion_eventos` es append-only para `authenticated`
-- (20260826161000), pero ese `revoke` no alcanza al rol que ejecuta las
-- migraciones — la misma excepción por la que existe la corrección de
-- fechas del seed de agosto (20260828090000, bloque 0).

-- ── 1 · Los dos canjes del seed, escritos a mano ────────────────────────
--
-- Son los únicos donde cada cifra se puede comprobar: 3 piezas de Vitamina
-- D3 a $27.400 son $82.200, y la que ganó es la única no acumulable del
-- carrito, que es justo por lo que las demás quedan fuera.

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id from promociones
  where org_id = (select id from org) and codigo = 'PROMO-3X2-VITAM'
),
socios as (select id, email from members where org_id = (select id from org))
update promocion_eventos pe
set metadatos = pe.metadatos || v.extra
from (
  values
    (
      'sofia.ramirez@example.com',
      jsonb_build_object(
        'ticket', 'TCK-0142-88301',
        'monto_carrito', 82200,
        'piezas_carrito', 3,
        'candidatas', jsonb_build_array(
          jsonb_build_object('codigo', 'PROMO-3X2-VITAM', 'aplicada', true),
          -- La ganadora no es acumulable, así que todo lo demás cae por ahí.
          jsonb_build_object(
            'codigo', 'PROMO-2X-PUNTOS', 'aplicada', false,
            'motivo', 'no_acumulable'
          ),
          -- Y esta ni llegaba a competir: su universo es dermocosmética.
          jsonb_build_object(
            'codigo', 'PROMO-DERMO-20', 'aplicada', false,
            'motivo', 'producto_fuera_universo'
          )
        )
      )
    ),
    (
      'daniela.cardenas@example.com',
      jsonb_build_object(
        'ticket', 'TCK-0142-88574',
        'monto_carrito', 187200,
        'piezas_carrito', 4,
        'candidatas', jsonb_build_array(
          jsonb_build_object('codigo', 'PROMO-3X2-VITAM', 'aplicada', true),
          -- El bundle daba menos: es la comparación que hace
          -- `modo_multiple = 'mejor_beneficio'`.
          jsonb_build_object(
            'codigo', 'PROMO-BUNDLE-BIENESTAR', 'aplicada', false,
            'motivo', 'menor_beneficio'
          ),
          jsonb_build_object(
            'codigo', 'PROMO-VIP-15', 'aplicada', false,
            'motivo', 'no_acumulable'
          )
        )
      )
    )
) as v (email, extra)
where pe.promocion_id = (select id from promo)
  and pe.tipo = 'canje'
  and pe.member_id = (select id from socios where socios.email = v.email)
  and not (pe.metadatos ? 'candidatas');

-- ── 2 · Un rechazo, que es el caso que hoy no deja rastro ───────────────
--
-- Valentina lleva 2 de 3 piezas: la caja intentó aplicar el 3x2 y el motor
-- dijo que no. Ese "no" es la conversación más frecuente del mostrador y la
-- que la bitácora no registraba en ninguna parte — el ciclo incompleto no
-- genera canje, así que no generaba nada.
--
-- Va sobre su compra (`PED-ACUM-04`, e-commerce) y no sobre la de Andrés,
-- que sería el caso más extremo (1 de 3), por una restricción del esquema
-- que conviene conocer: `promocion_eventos_canal_check` (20260826180500)
-- solo admite `pos` y `ecommerce`. El canal de una promoción es
-- `CHANNEL_SCOPES` (pos / ecommerce / pos_ecommerce), que nació antes de que
-- los pedidos tuvieran `app` — y la compra de Andrés fue por app. Meterla
-- como "ecommerce" haría que el log mostrara la misma venta como App en
-- Compras y como E-commerce en Promociones. Ver la nota al final del
-- fichero: es un hueco del modelo, no algo que este seed deba tapar.

with org as (select id from organizations where slug = 'omni'),
promo as (
  select id, creado_en from promociones
  where org_id = (select id from org) and codigo = 'PROMO-3X2-VITAM'
),
socio as (
  select id from members
  where org_id = (select id from org) and email = 'valentina.rios@example.com'
)
insert into promocion_eventos (
  org_id, promocion_id, member_id, tipo, titulo, detalle,
  actor_tipo, actor_etiqueta, canal, codigo_motivo, nota_motivo,
  metadatos, ocurrido_en
)
select
  (select id from org), (select id from promo), (select id from socio),
  'canje_rechazado',
  'Pieza gratis no aplicada',
  'Colágeno hidrolizado · 3x2',
  'sistema', 'Motor de promociones', 'ecommerce',
  'ciclo_incompleto',
  'Lleva 2 de las 3 piezas del ciclo. Se le informó cuántas le faltan.',
  jsonb_build_object(
    'ticket', 'TCK-EC-90118',
    'monto_carrito', 93600,
    'piezas_carrito', 2,
    'tipo_beneficio', 'por_piezas',
    'piezas_compradas', 2,
    'candidatas', jsonb_build_array(
      jsonb_build_object(
        'codigo', 'PROMO-3X2-VITAM', 'aplicada', false,
        'motivo', 'ciclo_incompleto'
      )
    )
  ),
  now() - interval '4 days'
where (select id from promo) is not null
  and (select id from socio) is not null
  and not exists (
    select 1 from promocion_eventos pe
    where pe.promocion_id = (select id from promo)
      and pe.tipo = 'canje_rechazado'
  );

-- ── 3 · Los canjes recientes que ya existían ────────────────────────────
--
-- Los 40 más recientes reciben ticket, piezas y candidatas derivadas con
-- `hashtext` —el patrón determinista del resto del seed—, así que dos
-- corridas producen los mismos valores.
--
-- Solo los 40 más recientes, y a propósito: los eventos viejos se quedan
-- sin el bloque. Es el mismo criterio que usó
-- `20260901110000_aprobacion_masiva_y_motivo.sql` con `codigo_decision`
-- («las filas decididas antes de esta migración no lo tienen, y forzar un
-- valor inventado las haría mentir»): el motor que escribe estas claves no
-- existía cuando esos eventos ocurrieron, y rellenarlos a todos haría creer
-- que el dato viene de la operación.
--
-- La promoción del propio evento entra como la aplicada; la competidora y
-- su motivo salen de dos arreglos fijos indexados por hash. Son plausibles
-- —códigos reales, motivos que esas promociones de verdad pueden producir—
-- pero son de demo, no una reconstrucción de lo que pasó.

with org as (select id from organizations where slug = 'omni'),
-- La ventana NO filtra por «los que aún no tienen candidatas»: si lo
-- hiciera, cada corrida enriquecería los 40 siguientes hacia atrás y la
-- migración dejaría de ser idempotente. Los 40 son siempre los mismos —los
-- más recientes— y el guard de abajo es el que evita reescribirlos.
recientes as (
  select pe.id, p.codigo
  from promocion_eventos pe
  join promociones p on p.id = pe.promocion_id
  where pe.org_id = (select id from org)
    and pe.tipo = 'canje'
  order by pe.ocurrido_en desc
  limit 40
),
competidoras as (
  select array[
    'PROMO-VIP-15', 'PROMO-DERMO-20', 'PROMO-2X-PUNTOS',
    'PROMO-ENVIO-80', 'PROMO-FIJO-DERMO', 'SUPER44'
  ] as arr
),
motivos as (
  select array[
    'no_acumulable', 'menor_beneficio', 'no_acumulable',
    'tope_socio', 'monto_minimo_no_alcanzado', 'menor_beneficio'
  ] as arr
)
update promocion_eventos pe
set metadatos = pe.metadatos || jsonb_build_object(
  'ticket',
  'TCK-' || lpad(((abs(hashtext('tck' || r.id::text)) % 9000) + 1000)::text, 4, '0')
    || '-' || lpad((abs(hashtext('num' || r.id::text)) % 99999)::text, 5, '0'),
  'piezas_carrito', 1 + (abs(hashtext('piezas' || r.id::text)) % 6),
  'candidatas', jsonb_build_array(
    jsonb_build_object('codigo', r.codigo, 'aplicada', true),
    jsonb_build_object(
      'codigo',
      (select arr from competidoras)[
        1 + (abs(hashtext('comp' || r.id::text)) % 6)
      ],
      'aplicada', false,
      'motivo',
      (select arr from motivos)[
        1 + (abs(hashtext('motivo' || r.id::text)) % 6)
      ]
    )
  )
)
from recientes r
where pe.id = r.id
  and not (pe.metadatos ? 'candidatas');

-- ── Nota · un hueco del modelo que este seed no tapa ───────────────────
--
-- `promocion_eventos.canal` solo admite `pos` y `ecommerce`
-- (20260826180500), pero `pedidos.canal` admite además `app` — y hoy 187 de
-- los 613 pedidos de la demo son de app. Consecuencia: un canje que ocurre
-- en la app no puede registrar su canal, así que "Atribución de canjes por
-- canal" nunca podrá atribuirle nada a la app.
--
-- No se arregla aquí a propósito. Ensanchar ese `check` es cambiar el
-- contrato del dominio: `CHANNEL_SCOPES` (pos / ecommerce / pos_ecommerce)
-- gobierna también `promociones.canal_aplicacion`, y decidir si "app" es un
-- canal propio o una variante de e-commerce afecta a qué promociones
-- aplican dónde, no solo a una columna de bitácora. Es una decisión de
-- producto con migración detrás, no una línea de seed.
