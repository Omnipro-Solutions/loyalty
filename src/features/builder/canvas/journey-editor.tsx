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
import { BUILDER_BLOCKS } from "@/config/builder-blocks"
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
  publishWorkflowAction,
  simulateWorkflowAction,
} from "./publish-actions"
import { InspectorPanel } from "./inspector-panel"
import type {
  AudienceSummary,
  CouponBatchSummary,
  PromotionSummary,
  TierSummary,
  WorkflowWithGraph,
} from "./queries"
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
}: {
  workflow: WorkflowWithGraph
  tiers: TierSummary[]
  audiences: AudienceSummary[]
  couponBatches: CouponBatchSummary[]
  promotions: PromotionSummary[]
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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [publishMessage, setPublishMessage] = useState<string>()
  // Publicar debe quedar inhabilitado apenas se publica con éxito, hasta
  // que el grafo cambie de verdad — si no, un doble clic (o clic accidental
  // otra vez) crea una versión y una fila de `workflow_runs` idénticas a la
  // que ya existía. Arranca en `false` si ya estaba publicado al cargar
  // (nada nuevo que publicar todavía), o en `true` para borrador/pausado/
  // archivado (siempre hay algo que publicar la primera vez).
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(
    workflow.estado !== "publicado"
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
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setStatus("publicado")
        setPublishMessage(undefined)
        setHasUnpublishedChanges(false)
        // Publicar persiste el grafo igual que "Guardar" (ver
        // `persist-graph.ts`) — sin esto el botón "Guardar" seguiría
        // habilitado después de publicar aunque ya no hubiera nada pendiente.
        setHasUnsavedChanges(false)
      } else {
        setPublishMessage(data?.message ?? "No se pudo publicar.")
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
        authorName={workflow.authorName}
        updatedAt={updatedAt}
        saving={save.isPending}
        hasUnsavedChanges={hasUnsavedChanges}
        simulating={simulate.isPending}
        publishing={publish.isPending}
        publishDisabledReason={
          blockingErrors.length > 0
            ? "Resuelve los errores del workflow antes de publicar"
            : !hasUnpublishedChanges
              ? "Ya está publicado — no hay cambios nuevos que publicar"
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
        onPublish={() => publish.execute(graphForActions())}
      />
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
        <BlockPalette />
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
            deleteKeyCode={["Backspace", "Delete"]}
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
      <VersionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        workflowId={workflow.id}
        onRestore={restoreVersion}
      />
    </div>
  )
}

export function JourneyEditor({
  workflow,
  tiers,
  audiences,
  couponBatches,
  promotions,
}: {
  workflow: WorkflowWithGraph
  tiers: TierSummary[]
  audiences: AudienceSummary[]
  couponBatches: CouponBatchSummary[]
  promotions: PromotionSummary[]
}) {
  return (
    <ReactFlowProvider>
      <CanvasArea
        workflow={workflow}
        tiers={tiers}
        audiences={audiences}
        couponBatches={couponBatches}
        promotions={promotions}
      />
    </ReactFlowProvider>
  )
}
