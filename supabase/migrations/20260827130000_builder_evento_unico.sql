-- Un solo bloque de Entrada: `evento`, parametrizado desde el catálogo.
--
-- Hasta ahora había 8 tipos de bloque de Entrada —`evento_compra`,
-- `entra_segmento`, `canje_cupon`, `fecha_recurrente`, `alta_socio`,
-- `cambio_nivel_entrada`, `devolucion`, `webhook_entrante`— que solo se
-- diferenciaban en QUÉ TRIGGER declaraban. Cada evento nuevo del negocio
-- («un cupón está por vencer», «el saldo cruzó un umbral») costaba un tipo
-- de bloque nuevo, su `FieldSpec`, su icono, su fila en este `check` y una
-- migración. El evento pasa a ser DATO: `config.evento_id` es el trigger
-- técnico del catálogo (`src/config/event-catalog.ts`), y agregar un evento
-- es agregar una entrada a ese archivo.
--
-- `webhook_entrante` se queda como tipo aparte: no es un evento del
-- catálogo de negocio, es una llamada HTTP entrante, con su propia
-- configuración y sin dominio ni payload declarado.
--
-- Y se agregan los 4 bloques que faltaban para cubrir los casos que el
-- grafo no podía representar:
--
--   actualizar_cliente  escribir un atributo o una etiqueta en `members` —
--                       hasta ahora una regla solo sabía dar beneficios, no
--                       dejar constancia de nada en el cliente.
--   cambiar_segmento    meter o sacar al socio de una audiencia (`segments`).
--   emitir_evento       publicar un evento del catálogo, lo que permite que
--                       una regla despierte a otra sin acoplarlas.
--   union               reanudar tras un fan-out. Sin él, abrir ramas en
--                       paralelo no tenía forma de volver a juntarse y el
--                       flujo había que escribirlo como cadena secuencial.
--
-- Ver src/config/builder-blocks.ts para la copia estructurada de UI.

alter table workflow_nodes drop constraint workflow_nodes_tipo_check;

alter table workflow_nodes add constraint workflow_nodes_tipo_check check (
  tipo in (
    -- Entradas — solo una entrada activa por workflow (regla del Figma,
    -- validada en aplicación, no en constraint: depende del estado 'activo').
    'evento', 'webhook_entrante',
    -- Lealtad
    'acumular_puntos', 'canjear_puntos', 'cambio_nivel', 'emitir_cupon', 'reto', 'referido', 'ajustar_puntos',
    -- Acciones
    'email', 'push', 'sms_whatsapp', 'aplicar_promocion', 'webhook_saliente',
    'actualizar_cliente', 'cambiar_segmento', 'emitir_evento',
    -- Lógica
    'condicion_multiple', 'ramificacion_valor', 'split_ab', 'esperar',
    'espera_hasta_evento', 'ventana_horaria', 'esperar_aprobacion', 'union',
    -- Fin
    'fin_workflow'
  )
) not valid;

-- ── Primero: deshacer la capa de compatibilidad ─────────────────────────
--
-- Mientras esta migración no estaba aplicada, la app pudo escribir nodos de
-- los tipos NUEVOS bajo un tipo portador, con el tipo real en
-- `config.__tipo` (jsonb no tiene `check`). Ver
-- `src/features/builder/canvas/schema-compat.ts`.
--
-- Va antes que las conversiones de abajo por dos razones: el marcador es
-- autoritativo (un nodo con `__tipo` ya trae su `evento_id` correcto y no
-- debe pasar por la traducción de `evento_compra`), y así los portadores
-- `webhook_saliente`/`esperar` recuperan su tipo real en vez de quedarse
-- como la acción que nunca fueron.
update workflow_nodes
set
  tipo = config ->> '__tipo',
  config = config - '__tipo'
where config ? '__tipo';

-- Los nodos ya sembrados se convierten ANTES de validar el constraint: sin
-- esto cualquier flujo existente quedaría con un `tipo` que la tabla ya no
-- acepta, y `validate constraint` fallaría.
--
-- La conversión no pierde nada: el trigger que cada tipo derivaba de sus
-- campos (`entry-triggers.ts`, antes de este cambio) pasa a ser
-- `config.evento_id` explícito, y el resto de la config se conserva tal
-- cual porque los campos siguen llamándose igual.

-- `evento_compra` ya guardaba su trigger elegido en `config.trigger`.
update workflow_nodes
set
  tipo = 'evento',
  config = (config - 'trigger')
    || jsonb_build_object(
         'dominio', coalesce(config ->> 'dominio', 'compra'),
         -- `config.evento_id` gana sobre `config.trigger`: un nodo escrito
         -- por la capa de compatibilidad ya eligió su evento del catálogo,
         -- y `trigger` es el campo del bloque VIEJO. Sin este `coalesce`,
         -- una regla creada con "Cupón por vencer" volvería a ser una
         -- compra al migrar.
         'evento_id', coalesce(
           config ->> 'evento_id', config ->> 'trigger', 'order.completed'
         ),
         'modo_disparo', coalesce(config ->> 'modo_disparo', 'al_ocurrir')
       )
where tipo = 'evento_compra';

update workflow_nodes
set
  tipo = 'evento',
  config = config || jsonb_build_object(
    'dominio', 'segmentacion',
    -- `modo` distinguía "al entrar" de "al entrar y salir"; el catálogo lo
    -- separa en dos eventos distintos, así que el que no sea sólo-entrada
    -- se queda con el de entrada (el disparo que de verdad tenía sembrado).
    'evento_id', 'segment.entered',
    'modo_disparo', 'al_ocurrir'
  )
where tipo = 'entra_segmento';

update workflow_nodes
set
  tipo = 'evento',
  config = config || jsonb_build_object(
    'dominio', 'cupon',
    'evento_id', 'coupon.redeemed',
    'modo_disparo', 'al_ocurrir'
  )
where tipo = 'canje_cupon';

update workflow_nodes
set
  tipo = 'evento',
  config = config || jsonb_build_object(
    'dominio', 'cliente',
    'evento_id', 'member.enrolled',
    'modo_disparo', 'al_ocurrir'
  )
where tipo = 'alta_socio';

update workflow_nodes
set
  tipo = 'evento',
  config = config || jsonb_build_object(
    'dominio', 'compra',
    'evento_id', 'order.returned',
    'modo_disparo', 'al_ocurrir'
  )
where tipo = 'devolucion';

-- `fecha_recurrente.tipo` y `cambio_nivel_entrada.direccion` ya derivaban
-- el trigger; aquí se materializa esa misma derivación como dato, y el modo
-- pasa a ser `programado` en los de tiempo — que es lo que siempre fueron.
update workflow_nodes
set
  tipo = 'evento',
  config = config || jsonb_build_object(
    'dominio', 'tiempo',
    'evento_id', case config ->> 'tipo'
      when 'fecha_fija' then 'schedule.fixed_date'
      when 'cumpleanos' then 'schedule.birthday'
      else 'schedule.recurring'
    end,
    'modo_disparo', 'programado',
    'cadencia', coalesce(config ->> 'cadencia', 'diaria'),
    'hora_ejecucion', '09:00',
    'zona_horaria', coalesce(config ->> 'zona_horaria', 'America/Bogota')
  )
where tipo = 'fecha_recurrente';

update workflow_nodes
set
  tipo = 'evento',
  config = config || jsonb_build_object(
    'dominio', 'cliente',
    'evento_id', case config ->> 'direccion'
      when 'baja' then 'member.tier_downgraded'
      else 'member.tier_upgraded'
    end,
    'modo_disparo', 'al_ocurrir'
  )
where tipo = 'cambio_nivel_entrada';

alter table workflow_nodes validate constraint workflow_nodes_tipo_check;

comment on column workflow_nodes.tipo is
  'Tipo de bloque. Las Entradas son solo 2: ''evento'' (parametrizado con '
  'config.evento_id, del catálogo en src/config/event-catalog.ts) y '
  '''webhook_entrante''. Ver src/types/domain.ts · BUILDER_NODE_GROUPS.';
