-- 6 bloques nuevos del Loyalty Builder para cubrir más flujos de negocio —
-- ninguno tiene tarjeta en el catálogo de Figma ("08.4 · catálogo de
-- bloques", `20260822205759_workflows.sql`), mismo criterio que
-- `webhook_entrante`/`webhook_saliente` (`20260826210000_webhook_bloques.sql`):
-- sin equivalente en el Figma, resuelto con el lenguaje de formulario
-- existente del inspector.
--
-- `ajustar_puntos` (Lealtad): la acción real ya existe manual en la ficha
-- de cliente (`features/members/actions/points-adjustments.ts`, escribe a
-- `points_ledger` con `tipo: 'ajuste'`).
-- `cambio_nivel_entrada` (Entradas): distinto del `cambio_nivel` de Lealtad
-- (esa es la acción que recalcula/fuerza el nivel; este es el disparador
-- que arranca el journey cuando el nivel cambia).
-- `devolucion` (Entradas): `pedidos.estado` ya incluye 'devuelto'.
-- `espera_hasta_evento`/`ventana_horaria` (Lógica): extraídos del bloque
-- `esperar` existente (antes eran sub-modos `modo: 'hasta_evento'` y el
-- campo `ventana_reanudacion`) — se separan en bloques propios de la
-- paleta. Ver src/features/builder/inspector/field-specs.ts para el
-- recorte del spec de `esperar`.
-- `esperar_aprobacion` (Lógica): declarativo, sin motor real de aprobación
-- (mismo criterio que el resto del builder) — grounded en el flujo real de
-- doble aprobación de cupones (`coupon_approval`) solo como referencia de
-- forma, no reusa esa tabla.
--
-- Ver src/config/builder-blocks.ts para la copia estructurada de UI
-- (etiquetas, íconos).
alter table workflow_nodes drop constraint workflow_nodes_tipo_check;

alter table workflow_nodes add constraint workflow_nodes_tipo_check check (
  tipo in (
    -- Entradas — solo una entrada activa por workflow (regla del Figma,
    -- validada en aplicación, no en constraint: depende del estado 'activo').
    'evento_compra', 'entra_segmento', 'canje_cupon', 'fecha_recurrente', 'alta_socio', 'webhook_entrante',
    'cambio_nivel_entrada', 'devolucion',
    -- Lealtad
    'acumular_puntos', 'canjear_puntos', 'cambio_nivel', 'emitir_cupon', 'reto', 'referido', 'ajustar_puntos',
    -- Acciones
    'email', 'push', 'sms_whatsapp', 'aplicar_promocion', 'webhook_saliente',
    -- Lógica
    'condicion_multiple', 'ramificacion_valor', 'split_ab', 'esperar',
    'espera_hasta_evento', 'ventana_horaria', 'esperar_aprobacion',
    -- Fin
    'fin_workflow'
  )
);
