"use client"

import "@xyflow/react/dist/style.css"

import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react"
import { useAction } from "next-safe-action/hooks"
import { useCallback, useMemo, useState } from "react"

import { Message } from "@/components/form/message"
import { formatDate } from "@/lib/format"
import { BUILDER_BLOCKS } from "@/config/builder-blocks"
import {
  isLocked as isPublicationLocked,
  publicationStatus,
} from "@/lib/publication-status"
import { ruleReading } from "@/features/builder/engine/rule-reading"
import {
  validateGraph,
  type ValidationIssue,
} from "@/features/builder/validation/graph-validation"
import type { BuilderNodeType } from "@/types/domain"

import { renameWorkflowAction, saveGraphAction } from "./actions"
import { BLOCK_DRAG_MIME, BlockPalette } from "./block-palette"
import {
  BuilderNode,
  outputsForNode,
  TONE_EDGE_CLASS,
  type BuilderNodeData,
} from "./builder-node"
import { EditorBar } from "./editor-bar"
import {
  changeWorkflowStatusAction,
  publishWorkflowAction,
  simulateWorkflowAction,
} from "./publish-actions"
import {
  StatusChangeDialog,
  type StatusChangePayload,
} from "./status-change-dialog"
import { InspectorPanel } from "./inspector-panel"
import type {
  AudienceSummary,
  CouponBatchSummary,
  PromotionSummary,
  TierSummary,
  WorkflowActivityEntry,
  WorkflowWithGraph,
} from "./queries"
import { RulePanel } from "./rule-panel"
import { VersionHistoryDialog } from "./version-history-dialog"

const NODE_TYPES = { builderNode: BuilderNode }

/**
 * `dimensions` lo dispara xyflow solo con medir cada nodo al montar (no es
 * una edición), y `select` con hacer click para inspeccionar un bloque —
 * ninguno de los dos es un cambio real de diseño que deba reactivar
 * "Publicar workflow".
 */
function isRealGraphChange(change: { type: string }) {
  return change.type !== "dimensions" && change.type !== "select"
}

export function toFlowNode(
  n: WorkflowWithGraph["nodes"][number]
): Node<BuilderNodeData> {
  return {
    id: n.id,
    type: "builderNode",
    position: { x: n.posicion_x, y: n.posicion_y },
    data: {
      tipo: n.tipo,
      etiqueta: n.etiqueta,
      config: (n.config as Record<string, unknown>) ?? {},
    },
  }
}

export function toFlowEdge(e: WorkflowWithGraph["edges"][number]): Edge {
  return {
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    sourceHandle: e.source_port === "out" ? null : e.source_port,
  }
}

function CanvasArea({
  workflow,
  tiers,
  audiences,
  couponBatches,
  promotions,
  activity,
}: {
  workflow: WorkflowWithGraph
  tiers: TierSummary[]
  audiences: AudienceSummary[]
  couponBatches: CouponBatchSummary[]
  promotions: PromotionSummary[]
  activity: WorkflowActivityEntry[]
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BuilderNodeData>>(
    workflow.nodes.map(toFlowNode)
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    workflow.edges.map(toFlowEdge)
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState(workflow.actualizado_en)
  const [status, setStatus] = useState(workflow.estado)
  const [validFrom, setValidFrom] = useState(workflow.vigente_desde)
  const [validTo, setValidTo] = useState(workflow.vigente_hasta)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [statusDialog, setStatusDialog] = useState<
    "publicar" | "cambiar" | null
  >(null)
  const [publishMessage, setPublishMessage] = useState<string>()
  // Publicar debe quedar inhabilitado apenas se publica con éxito, hasta
  // que el grafo cambie de verdad — si no, un doble clic (o clic accidental
  // otra vez) crea una versión y una fila de `workflow_runs` idénticas a la
  // que ya existía. Arranca en `true` solo si sigue en borrador — una vez
  // publicada la regla queda bloqueada para editar, así que no hay cambios
  // de grafo nuevos que publicar por definición.
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(
    workflow.estado === "borrador"
  )
  // El builder ya no autoguarda (decisión de producto) — este flag habilita
  // el botón "Guardar" solo cuando hay algo real que persistir, y se apaga
  // apenas el guardado (o la publicación, que también persiste el grafo)
  // termina con éxito.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { screenToFlowPosition } = useReactFlow()

  const save = useAction(saveGraphAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setUpdatedAt(data.savedAt)
        setHasUnsavedChanges(false)
      }
    },
  })
  const rename = useAction(renameWorkflowAction)
  const simulate = useAction(simulateWorkflowAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      // El resultado se lee sobre el canvas: cada tarjeta recibe su conteo
      // de entrada y el reparto por puerto. Ver `RulePanel` para por qué no
      // hay además una lista aparte.
      const byId = new Map(data.steps.map((p) => [p.nodeId, p]))
      setNodes((nds) =>
        nds.map((n) => {
          const step = byId.get(n.id)
          return step
            ? {
                ...n,
                data: {
                  ...n.data,
                  simulacion: {
                    entryCount: step.entryCount,
                    outputs: step.outputs,
                  },
                },
              }
            : n
        })
      )
    },
  })
  const publish = useAction(publishWorkflowAction, {
    onSuccess: ({ data, input }) => {
      if (data?.ok) {
        // `input` es el parsedInput del schema, que tiene defaults para
        // estos tres — TS los ve opcionales igual, así que se cae al valor
        // que ya estaba en pantalla en vez de escribir `undefined`.
        setStatus(input.estado ?? "activa")
        setValidFrom(input.vigente_desde)
        setValidTo(input.vigente_hasta ?? null)
        setPublishMessage(undefined)
        setHasUnpublishedChanges(false)
        setStatusDialog(null)
        // Publicar persiste el grafo igual que "Guardar" (ver
        // `persist-graph.ts`) — sin esto el botón "Guardar" seguiría
        // habilitado después de publicar aunque ya no hubiera nada pendiente.
        setHasUnsavedChanges(false)
      } else {
        setPublishMessage(data?.message ?? "No se pudo publicar.")
      }
    },
  })

  const changeStatus = useAction(changeWorkflowStatusAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setStatus(data.estado)
        setPublishMessage(undefined)
        setStatusDialog(null)
      } else {
        setPublishMessage(data?.message ?? "No se pudo cambiar el estado.")
      }
    },
  })

  const handleSave = useCallback(() => {
    save.execute({
      workflowId: workflow.id,
      nodes: nodes.map((n) => ({
        id: n.id,
        tipo: n.data.tipo,
        etiqueta: n.data.etiqueta,
        posicion_x: n.position.x,
        posicion_y: n.position.y,
        config: n.data.config ?? {},
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source_node_id: e.source,
        target_node_id: e.target,
        source_port: e.sourceHandle ?? "out",
      })),
    })
  }, [save, workflow.id, nodes, edges])

  // Marca que hay cambios reales de diseño pendientes de publicar y de
  // guardar. Se llama explícitamente desde cada mutación real del grafo
  // (conectar, soltar un bloque, editar config, borrar, restaurar versión)
  // y desde los handlers de xyflow (mover/soltar/borrar con teclado) — no
  // desde un `useEffect([nodes, edges])`, porque ese también dispararía con
  // la anotación de `simulacion` que `simulate` pega directo en `nodes`, y
  // correr Simular no debería marcar el workflow como editado.
  const markChanged = useCallback(() => {
    setHasUnpublishedChanges(true)
    setHasUnsavedChanges(true)
  }, [])

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      if (changes.some(isRealGraphChange)) markChanged()
    },
    [onNodesChange, markChanged]
  )

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
      if (changes.some(isRealGraphChange)) markChanged()
    },
    [onEdgesChange, markChanged]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds))
      markChanged()
    },
    [setEdges, markChanged]
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const tipo = event.dataTransfer.getData(
        BLOCK_DRAG_MIME
      ) as BuilderNodeType
      if (!tipo || !BUILDER_BLOCKS[tipo]) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const newNode: Node<BuilderNodeData> = {
        id: crypto.randomUUID(),
        type: "builderNode",
        position,
        data: { tipo, etiqueta: BUILDER_BLOCKS[tipo].label, config: {} },
      }
      setNodes((nds) => [...nds, newNode])
      markChanged()
    },
    [screenToFlowPosition, setNodes, markChanged]
  )

  const updateNodeConfig = useCallback(
    (id: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, config } } : n
        )
      )
      markChanged()
    },
    [setNodes, markChanged]
  )

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
      setSelectedId(null)
      markChanged()
    },
    [setNodes, setEdges, markChanged]
  )

  const selectedNode = useMemo(() => {
    const n = nodes.find((n) => n.id === selectedId)
    return n ? { id: n.id, data: n.data } : null
  }, [nodes, selectedId])

  const graphNodeRefs = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        tipo: n.data.tipo,
        etiqueta: n.data.etiqueta,
        // `evento` expone el payload del evento ELEGIDO, no una lista fija
        // por tipo — sin la config, los bloques siguientes no verían
        // ninguna variable de la entrada (ver `variablesForNode`).
        config: n.data.config ?? {},
      })),
    [nodes]
  )
  const graphEdgeRefs = useMemo(
    () =>
      edges.map((e) => ({
        source_node_id: e.source,
        target_node_id: e.target,
      })),
    [edges]
  )

  /**
   * Pinta cada arista con el tono semántico de su puerto de origen (ver
   * `OUTPUT_HANDLES` en `builder-node.tsx`) — puramente presentacional, no
   * se persiste con el grafo (`graphForActions` de abajo sigue mandando
   * solo `id`/`source_node_id`/`target_node_id`/`source_port`).
   */
  const styledEdges = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    return edges.map((e) => {
      const source = byId.get(e.source)
      const tone = source
        ? outputsForNode(source.data.tipo, source.data.config ?? {}).find(
            (p) => p.id === (e.sourceHandle ?? "out")
          )?.tone
        : undefined
      return tone ? { ...e, className: TONE_EDGE_CLASS[tone] } : e
    })
  }, [nodes, edges])

  const graphForActions = useCallback(
    () => ({
      workflowId: workflow.id,
      nodes: nodes.map((n) => ({
        id: n.id,
        tipo: n.data.tipo,
        etiqueta: n.data.etiqueta,
        posicion_x: n.position.x,
        posicion_y: n.position.y,
        config: n.data.config ?? {},
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source_node_id: e.source,
        target_node_id: e.target,
        source_port: e.sourceHandle ?? "out",
      })),
    }),
    [nodes, edges, workflow.id]
  )

  const validation: ValidationIssue[] = useMemo(
    () =>
      validateGraph(
        nodes.map((n) => ({
          id: n.id,
          tipo: n.data.tipo,
          config: n.data.config,
        })),
        edges.map((e) => ({
          source_node_id: e.source,
          source_port: e.sourceHandle ?? "out",
          target_node_id: e.target,
        }))
      ),
    [nodes, edges]
  )
  const blockingErrors = validation.filter((v) => v.level === "error")

  const readingClauses = useMemo(
    () =>
      ruleReading(
        nodes.map((n) => ({
          id: n.id,
          tipo: n.data.tipo,
          etiqueta: n.data.etiqueta,
          config: n.data.config ?? {},
        })),
        edges.map((e) => ({
          source_node_id: e.source,
          source_port: e.sourceHandle ?? "out",
          target_node_id: e.target,
        })),
        {
          prioridad: workflow.prioridad,
          exclusividad: workflow.exclusividad,
          grupoExclusividad: workflow.grupo_exclusividad,
          // Formateadas aquí y no dentro de `ruleReading`: ese módulo es
          // puro y no debe cargar el locale. Sin esto la frase decía
          // "vigente del 2027-01-01", que es una fecha para una máquina.
          vigenteDesde: formatDate(validFrom),
          vigenteHasta: validTo ? formatDate(validTo) : null,
          estado: status,
        },
        // La emisión y la promoción viven en otras features; la lectura solo
        // conoce sus ids, y un uuid crudo en medio de una frase es peor que
        // no decir el nombre (mismo criterio que `NodeLogicInput.refs`).
        {
          couponBatches: Object.fromEntries(
            couponBatches.map((b) => [b.id, `${b.reference} · ${b.name}`])
          ),
          promotions: Object.fromEntries(promotions.map((p) => [p.id, p.name])),
          audiences: Object.fromEntries(audiences.map((a) => [a.id, a.name])),
        }
      ),
    [
      nodes,
      edges,
      workflow.prioridad,
      workflow.exclusividad,
      workflow.grupo_exclusividad,
      validFrom,
      validTo,
      status,
      couponBatches,
      promotions,
      audiences,
    ]
  )

  // Publicada = solo lectura. No es una preferencia de UI: es la regla del
  // ciclo de vida (`isLocked`), y se aplica en el canvas —arrastrar,
  // conectar, borrar, editar config— y no solo escondiendo el botón, que
  // sería una barrera que se salta sin querer con el teclado.
  const locked = isPublicationLocked({ estado: status })
  const displayStatus = publicationStatus({
    estado: status,
    vigente_desde: validFrom,
    vigente_hasta: validTo,
  })

  function restoreVersion(graph: {
    nodes: WorkflowWithGraph["nodes"]
    edges: WorkflowWithGraph["edges"]
  }) {
    setNodes(graph.nodes.map(toFlowNode))
    setEdges(graph.edges.map(toFlowEdge))
    setHistoryOpen(false)
    markChanged()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorBar
        workflowId={workflow.id}
        name={workflow.nombre}
        status={status}
        displayStatus={displayStatus}
        priority={workflow.prioridad}
        exclusivity={workflow.exclusividad}
        exclusivityGroup={workflow.grupo_exclusividad}
        validFrom={validFrom}
        validTo={validTo}
        version={workflow.version_actual}
        authorName={workflow.authorName}
        updatedAt={updatedAt}
        saving={save.isPending}
        hasUnsavedChanges={hasUnsavedChanges}
        simulating={simulate.isPending}
        publishing={publish.isPending}
        publishDisabledReason={
          blockingErrors.length > 0
            ? "Resuelve los errores de la regla antes de publicar"
            : !hasUnpublishedChanges
              ? "Ya está publicada — no hay cambios nuevos que publicar"
              : undefined
        }
        onRename={(name) =>
          rename.execute({ workflowId: workflow.id, nombre: name })
        }
        onSave={handleSave}
        onHistory={() => setHistoryOpen(true)}
        onSimulate={() =>
          simulate.execute({ ...graphForActions(), initialCohort: 1514 })
        }
        onPublish={() => setStatusDialog("publicar")}
        onChangeStatus={() => setStatusDialog("cambiar")}
      />
      {/* La capa de compatibilidad (`schema-compat.ts`) deja crear y publicar
          reglas contra la base sin migrar, pero la vigencia, la prioridad y
          la exclusividad no tienen columna donde guardarse. Se dice aquí, no
          en un comentario del código: quien las cambie y no vea el cambio la
          próxima vez merece saber por qué antes de tocarlas. */}
      {!workflow.lifecyclePersisted && (
        <div className="border-b border-border px-6 py-2.5">
          <Message
            variant="warning"
            title="Vigencia, prioridad y exclusividad no se están guardando"
            description="La base todavía no tiene esas columnas: se muestran con valores por defecto y los cambios se pierden al recargar. Todo lo demás —bloques, conexiones, publicar— sí persiste. Aplica las migraciones del builder para activarlas."
          />
        </div>
      )}
      {publishMessage && (
        <div className="border-b border-border px-6 py-2.5">
          <Message
            variant="error"
            title="No se pudo publicar"
            description={publishMessage}
          />
        </div>
      )}
      {!publishMessage && blockingErrors.length > 0 && (
        <div className="border-b border-border px-6 py-2.5">
          {/*
            "info", no "error": esto no es una falla, es el estado normal
            de un journey a medio construir (ej. recién creado, sin bloque
            de entrada todavía) — antes mostraba una banda roja de "el
            workflow tiene errores" apenas se creaba el journey, antes de
            que el usuario hubiera arrastrado un solo bloque. Publicar
            sigue bloqueado (`publishDisabledReason` arriba) hasta que se
            resuelva, pero no hace falta alarmar por algo esperado.
          */}
          <Message
            variant="info"
            title="Falta esto para poder publicar"
            description={blockingErrors.map((e) => e.message).join(" ")}
          />
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <BlockPalette disabled={locked} />
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            nodesDraggable={!locked}
            nodesConnectable={!locked}
            elementsSelectable
            deleteKeyCode={locked ? null : ["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 0.85 }}
            minZoom={0.2}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <InspectorPanel
          node={selectedNode}
          readOnly={locked}
          nodes={graphNodeRefs}
          edges={graphEdgeRefs}
          tiers={tiers}
          audiences={audiences}
          couponBatches={couponBatches}
          promotions={promotions}
          onClose={() => setSelectedId(null)}
          onDelete={deleteNode}
          onConfigChange={updateNodeConfig}
        />
      </div>
      <RulePanel
        clauses={readingClauses}
        activity={activity}
        displayStatus={displayStatus}
      />
      <VersionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        workflowId={workflow.id}
        onRestore={restoreVersion}
      />
      {/* `key` remonta el diálogo cada vez que se abre: sus campos son
          estado local (estado destino, motivo, nota) y sin esto reaparecen
          con lo que se tecleó y se canceló la vez anterior. */}
      {statusDialog && (
        <StatusChangeDialog
          key={statusDialog}
          open
          mode={statusDialog}
          currentStatus={status}
          currentValidFrom={validFrom}
          currentValidTo={validTo}
          pending={publish.isPending || changeStatus.isPending}
          blockedReason={
            statusDialog === "publicar" && blockingErrors.length > 0
              ? blockingErrors.map((e) => e.message).join(" ")
              : undefined
          }
          onOpenChange={(open) => !open && setStatusDialog(null)}
          onConfirm={(payload: StatusChangePayload) => {
            if (statusDialog === "publicar") {
              publish.execute({
                ...graphForActions(),
                initialCohort: 1514,
                estado: payload.status,
                motivo: payload.reason,
                nota: payload.note,
                vigente_desde: payload.validFrom ?? validFrom,
                vigente_hasta: payload.validTo ?? null,
              })
              return
            }
            changeStatus.execute({
              workflowId: workflow.id,
              estado: payload.status,
              motivo: payload.reason,
              nota: payload.note,
            })
          }}
        />
      )}
    </div>
  )
}

export function JourneyEditor({
  workflow,
  tiers,
  audiences,
  couponBatches,
  promotions,
  activity,
}: {
  workflow: WorkflowWithGraph
  tiers: TierSummary[]
  audiences: AudienceSummary[]
  couponBatches: CouponBatchSummary[]
  promotions: PromotionSummary[]
  activity: WorkflowActivityEntry[]
}) {
  return (
    <ReactFlowProvider>
      <CanvasArea
        workflow={workflow}
        tiers={tiers}
        audiences={audiences}
        couponBatches={couponBatches}
        promotions={promotions}
        activity={activity}
      />
    </ReactFlowProvider>
  )
}
