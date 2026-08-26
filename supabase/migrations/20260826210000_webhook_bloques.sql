-- Bloques de integración vía HTTP para el Loyalty Builder: `webhook_entrante`
-- (Entradas — un sistema externo llama a este webhook y eso arranca el
-- journey) y `webhook_saliente` (Acciones — el flujo llega al nodo y dispara
-- un HTTP request a una URL externa). Sin tarjeta en el catálogo de Figma
-- ("08.4 · catálogo de bloques", `20260822205759_workflows.sql`) — mismo
-- criterio que `email`/`push`/`sms_whatsapp` (ver comentario en
-- src/config/integration-flows.ts): sin equivalente en el Figma, resuelto
-- con el lenguaje de formulario existente del inspector en vez de inventar
-- UI pixel-perfect nueva. Ver src/config/builder-blocks.ts para la copia
-- estructurada de UI (etiquetas, íconos).
alter table workflow_nodes drop constraint workflow_nodes_tipo_check;

alter table workflow_nodes add constraint workflow_nodes_tipo_check check (
  tipo in (
    -- Entradas — solo una entrada activa por workflow (regla del Figma,
    -- validada en aplicación, no en constraint: depende del estado 'activo').
    'evento_compra', 'entra_segmento', 'canje_cupon', 'fecha_recurrente', 'alta_socio', 'webhook_entrante',
    -- Lealtad
    'acumular_puntos', 'canjear_puntos', 'cambio_nivel', 'emitir_cupon', 'reto', 'referido',
    -- Acciones
    'email', 'push', 'sms_whatsapp', 'aplicar_promocion', 'webhook_saliente',
    -- Lógica
    'condicion_multiple', 'ramificacion_valor', 'split_ab', 'esperar',
    -- Fin
    'fin_workflow'
  )
);
