-- Resultado tipado en las acciones externas y de mensajería del builder.
--
-- Hasta ahora el fallo de un `webhook_saliente` se resolvía con el campo
-- `si_falla` de su `config` (continuar / detener el workflow): una decisión
-- global, no un camino. No se podía dibujar "si la llamada falla, por acá",
-- así que ni el reintento ni el aviso al equipo eran parte del grafo.
--
-- Ahora esos bloques exponen puertos por resultado, igual que
-- `acumular_puntos` ya hacía con `tope_alcanzado`/`sin_puntos`:
--
--   webhook_saliente        exito · error · timeout
--   email/push/sms_whatsapp entregado · fallido
--
-- `error` se toma al AGOTAR los reintentos, no en cada intento fallido: el
-- reintento es interno al bloque (`reintentos` + `politica_reintento`) y no
-- puede ser una arista de vuelta, porque `validateGraph` rechaza los ciclos.
-- `timeout` va aparte de `error` porque la respuesta operativa es distinta.
--
-- `workflow_edges.source_port` es `text` sin `check` (a propósito: los
-- puertos de rama son dinámicos, ver `config.branches`), así que no hay
-- constraint que alterar — solo hay que reapuntar las aristas ya sembradas,
-- que salían todas de 'out'. Sin esto, una arista con `source_port = 'out'`
-- en un nodo de mensaje quedaría colgando: el canvas ya no dibuja ese
-- handle y el simulador no le entregaría cohorte.

comment on column workflow_edges.source_port is
  'Puerto de salida del nodo origen. ''out'' para los de un solo camino; '
  '''cumple''/''no_cumple'' en condición múltiple; ''rama_<id>''/''por_defecto'' '
  'en ramificación por valor y split A/B; ''out''/''tope_alcanzado''/''sin_puntos'' '
  'en acumular puntos; ''aprobado''/''rechazado'' en esperar aprobación; '
  '''exito''/''error''/''timeout'' en webhook saliente; '
  '''entregado''/''fallido'' en email, push y SMS/WhatsApp.';

update workflow_edges e
set source_port = 'entregado'
from workflow_nodes n
where n.id = e.source_node_id
  and n.tipo in ('email', 'push', 'sms_whatsapp')
  and e.source_port = 'out';

update workflow_edges e
set source_port = 'exito'
from workflow_nodes n
where n.id = e.source_node_id
  and n.tipo = 'webhook_saliente'
  and e.source_port = 'out';

-- `si_falla` deja de existir como campo: qué ocurre tras un fallo es ahora
-- el camino que sale del puerto. Se quita de los `config` ya guardados para
-- que el inspector no arrastre un valor que ningún `FieldSpec` lee.
update workflow_nodes
set config = config - 'si_falla'
where tipo = 'webhook_saliente'
  and config ? 'si_falla';
