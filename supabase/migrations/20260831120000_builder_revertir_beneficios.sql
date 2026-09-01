-- Bloque `revertir_beneficios` y política de reversión a nivel de regla.
--
-- Qué resuelve: hasta ahora el builder solo sabía DAR beneficios. Cuando la
-- orden que disparó una regla se caía —devolución, cancelación,
-- contracargo— no había forma de deshacer lo que esa orden otorgó.
--
-- Por qué `ajustar_puntos` no bastaba: resta una cantidad FIJA escrita a
-- mano. No sabe qué otorgó el pedido, no distingue puntos canjeables de
-- calificadores, no toca el cupón ni el nivel, y sobre todo no puede ver si
-- un tope truncó el otorgamiento original — con un tope de por medio,
-- revertir un porcentaje del total le cobra al socio puntos que nunca
-- recibió. Ver `features/builder/engine/reversal.ts`.
--
-- Por qué un bloque y no una pantalla aparte en Pedidos: deshacer tiene
-- cinco desenlaces y cada uno pide una respuesta distinta del programa. De
-- `no_reversible` cuelga una suspensión de cuenta, de `saldo_insuficiente`
-- una aprobación humana. Esas ramas solo existen en el lienzo.
--
-- Por qué NO un tipo de entrada nuevo: la consolidación del builder
-- (20260827130000) eliminó 8 tipos de entrada —entre ellos `devolucion`—
-- para que el evento fuera DATO y no tipo. La familia de eventos de orden
-- caída entra por el bloque `evento` de siempre, con varios disparadores en
-- `config.eventos_adicionales`; el grafo sigue teniendo una sola entrada.

-- ── 1 · El tipo de bloque ───────────────────────────────────────────────
alter table workflow_nodes drop constraint workflow_nodes_tipo_check;

alter table workflow_nodes add constraint workflow_nodes_tipo_check check (
  tipo in (
    -- Entradas — solo una entrada activa por workflow (regla del Figma,
    -- validada en aplicación, no en constraint: depende del estado 'activo').
    'evento', 'webhook_entrante',
    -- Lealtad
    'acumular_puntos', 'canjear_puntos', 'cambio_nivel', 'emitir_cupon', 'reto', 'referido', 'ajustar_puntos',
    'revertir_beneficios',
    -- Acciones
    'email', 'push', 'sms_whatsapp', 'aplicar_promocion', 'webhook_saliente',
    'actualizar_cliente', 'cambiar_segmento', 'emitir_evento',
    -- Lógica
    'condicion_multiple', 'ramificacion_valor', 'split_ab', 'esperar',
    'espera_hasta_evento', 'ventana_horaria', 'esperar_aprobacion', 'union',
    -- Fin
    'fin_workflow'
  )
);

comment on constraint workflow_nodes_tipo_check on workflow_nodes is
  'Espeja BUILDER_NODE_GROUPS de src/types/domain.ts. Los puertos de cada tipo viven en src/config/builder-ports.ts.';

-- ── 2 · Ámbito de la regla ──────────────────────────────────────────────
--
-- `global` es la regla que define qué hacer con cualquier orden del
-- programa. Su política la heredan todas las de ámbito `journey`, que solo
-- la sobreescriben cuando de verdad difieren (Rx con ventana regulatoria
-- propia, un canal con plazo legal más largo).
--
-- Default `journey`: los workflows existentes toman ese valor y no cambian
-- de comportamiento.
alter table workflows
  add column ambito text not null default 'journey'
    check (ambito in ('journey', 'global'));

comment on column workflows.ambito is
  'journey = una regla más. global = define el contra-flujo de todo el programa y su politica_reversion la heredan las demás.';

-- ── 3 · La política de reversión de la regla ────────────────────────────
--
-- Las 7 decisiones viven a nivel de REGLA y no de bloque: «qué hago si la
-- orden que me disparó se cae» no lo puede contestar ningún nodo por
-- separado. Se resuelven en cascada global → regla → nodo
-- (`resolveReversalPolicy`), y `{}` significa «heredo todo».
--
-- jsonb y no columnas: son 7 valores que solo lee un motor, y añadir la
-- octava decisión no debería costar una migración. Mismo criterio que
-- `workflow_nodes.config`.
alter table workflows
  add column politica_reversion jsonb not null default '{}'::jsonb;

comment on column workflows.politica_reversion is
  'Parcial de ReversalPolicy (types/domain.ts). Vacío = hereda de la regla global. Ver features/builder/engine/reversal.ts.';

-- Solo puede haber UNA regla global activa por organización: dos definirían
-- dos contra-flujos para la misma orden y ganaría el azar. Índice parcial —
-- los borradores y las archivadas no compiten.
create unique index workflows_una_global_activa_idx
  on workflows (org_id)
  where ambito = 'global' and estado = 'activa';

-- ── 4 · Canales que atiende cada regla ──────────────────────────────────
--
-- Mismo principio que los disparadores: el canal es dato. Una regla atiende
-- a los canales que tenga marcados, así que empiezan todos juntos y solo se
-- separa el que de verdad se porte distinto.
--
-- La invariante —cada canal en exactamente una regla activa— NO se puede
-- expresar con un constraint: es una condición entre filas y depende del
-- estado. Se valida en aplicación y se muestra en el panel de cobertura,
-- que señala tanto el canal sin asignar (se pierde la orden) como el
-- duplicado (se procesa dos veces).
alter table workflows
  add column canales_reversion text[] not null default '{}'::text[];

comment on column workflows.canales_reversion is
  'Canales de origen que atiende esta regla: pos, erp, ecommerce, call_center. Vacío = no participa del contra-flujo.';

alter table workflows
  add constraint workflows_canales_reversion_validos check (
    canales_reversion <@ array['pos', 'erp', 'ecommerce', 'call_center']::text[]
  );
