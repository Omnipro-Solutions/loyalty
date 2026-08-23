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
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Message } from "@/components/form/message"
import { BUILDER_BLOCKS } from "@/config/builder-blocks"
import {
  validarGrafo,
  type ValidationIssue,
} from "@/features/builder/validation/graph-validation"
import type { BuilderNodeType } from "@/types/domain"

import { renameWorkflowAction, saveGraphAction } from "./actions"
import { BLOCK_DRAG_MIME, BlockPalette } from "./block-palette"
import { BuilderNode, type BuilderNodeData } from "./builder-node"
import { EditorBar } from "./editor-bar"
import {
  publishWorkflowAction,
  simulateWorkflowAction,
} from "./publish-actions"
import { InspectorPanel } from "./inspector-panel"
import type { TierResumen, WorkflowWithGraph } from "./queries"
import { VersionHistoryDialog } from "./version-history-dialog"

const NODE_TYPES = { builderNode: BuilderNode }
const AUTOSAVE_DEBOUNCE_MS = 1200

/**
 * `dimensions` lo dispara xyflow solo con medir cada nodo al montar (no es
 * una edición), y `select` con hacer click para inspeccionar un bloque —
 * ninguno de los dos es un cambio real de diseño que deba reactivar
 * "Publicar workflow".
 */
function esCambioRealDeGrafo(change: { type: string }) {
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
}: {
  workflow: WorkflowWithGraph
  tiers: TierResumen[]
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BuilderNodeData>>(
    workflow.nodes.map(toFlowNode)
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    workflow.edges.map(toFlowEdge)
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actualizadoEn, setActualizadoEn] = useState(workflow.actualizado_en)
  const [estado, setEstado] = useState(workflow.estado)
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [mensajePublicar, setMensajePublicar] = useState<string>()
  // Publicar debe quedar inhabilitado apenas se publica con éxito, hasta
  // que el grafo cambie de verdad — si no, un doble clic (o clic accidental
  // otra vez) crea una versión y una fila de `workflow_runs` idénticas a la
  // que ya existía. Arranca en `false` si ya estaba publicado al cargar
  // (nada nuevo que publicar todavía), o en `true` para borrador/pausado/
  // archivado (siempre hay algo que publicar la primera vez).
  const [huboCambiosSinPublicar, setHuboCambiosSinPublicar] = useState(
    workflow.estado !== "publicado"
  )
  const { screenToFlowPosition } = useReactFlow()
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const save = useAction(saveGraphAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) setActualizadoEn(data.guardadoEn)
    },
  })
  const rename = useAction(renameWorkflowAction)
  const simulate = useAction(simulateWorkflowAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      const porId = new Map(data.pasos.map((p) => [p.nodeId, p]))
      setNodes((nds) =>
        nds.map((n) => {
          const paso = porId.get(n.id)
          return paso
            ? {
                ...n,
                data: {
                  ...n.data,
                  simulacion: {
                    conteoEntrada: paso.conteoEntrada,
                    salidas: paso.salidas,
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
        setEstado("publicado")
        setMensajePublicar(undefined)
        setHuboCambiosSinPublicar(false)
      } else {
        setMensajePublicar(data?.message ?? "No se pudo publicar.")
      }
    },
  })

  // Programar el guardado (setTimeout) es un efecto secundario, no una
  // derivación de estado — no dispara `set-state-in-effect`. El indicador
  // "Guardando…" de la barra viene de `save.isPending` (abajo), que solo se
  // vuelve true cuando la llamada de red arranca de verdad, no durante la
  // espera del debounce.
  const scheduleSave = useCallback(
    (nextNodes: Node<BuilderNodeData>[], nextEdges: Edge[]) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        save.execute({
          workflowId: workflow.id,
          nodes: nextNodes.map((n) => ({
            id: n.id,
            tipo: n.data.tipo,
            etiqueta: n.data.etiqueta,
            posicion_x: n.position.x,
            posicion_y: n.position.y,
            config: n.data.config ?? {},
          })),
          edges: nextEdges.map((e) => ({
            id: e.id,
            source_node_id: e.source,
            target_node_id: e.target,
            source_port: e.sourceHandle ?? "out",
          })),
        })
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [save, workflow.id]
  )

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    scheduleSave(nodes, edges)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a cambios de grafo, no a que `scheduleSave` cambie de identidad.
  }, [nodes, edges])

  // Marca que hay cambios reales de diseño pendientes de publicar — a
  // propósito NO se engancha al `useEffect([nodes, edges])` de más abajo
  // (ese también dispara con la anotación de `simulacion` que `simulate`
  // pega directo en `nodes`, y correr Simular no debería reactivar
  // "Publicar workflow"). Se llama explícitamente desde cada mutación real
  // del grafo (conectar, soltar un bloque, editar config, borrar, restaurar
  // versión) y desde los handlers de xyflow (mover/soltar/borrar con teclado).
  const marcarCambio = useCallback(() => setHuboCambiosSinPublicar(true), [])

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      if (changes.some(esCambioRealDeGrafo)) marcarCambio()
    },
    [onNodesChange, marcarCambio]
  )

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
      if (changes.some(esCambioRealDeGrafo)) marcarCambio()
    },
    [onEdgesChange, marcarCambio]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds))
      marcarCambio()
    },
    [setEdges, marcarCambio]
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
      const nuevo: Node<BuilderNodeData> = {
        id: crypto.randomUUID(),
        type: "builderNode",
        position,
        data: { tipo, etiqueta: BUILDER_BLOCKS[tipo].label, config: {} },
      }
      setNodes((nds) => [...nds, nuevo])
      marcarCambio()
    },
    [screenToFlowPosition, setNodes, marcarCambio]
  )

  const actualizarConfigNodo = useCallback(
    (id: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, config } } : n
        )
      )
      marcarCambio()
    },
    [setNodes, marcarCambio]
  )

  const eliminarNodo = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
      setSelectedId(null)
      marcarCambio()
    },
    [setNodes, setEdges, marcarCambio]
  )

  const nodoSeleccionado = useMemo(() => {
    const n = nodes.find((n) => n.id === selectedId)
    return n ? { id: n.id, data: n.data } : null
  }, [nodes, selectedId])

  const grafoParaAcciones = useCallback(
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

  const validacion: ValidationIssue[] = useMemo(
    () =>
      validarGrafo(
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
  const erroresBloqueantes = validacion.filter((v) => v.nivel === "error")

  function restaurarVersion(grafo: {
    nodes: WorkflowWithGraph["nodes"]
    edges: WorkflowWithGraph["edges"]
  }) {
    setNodes(grafo.nodes.map(toFlowNode))
    setEdges(grafo.edges.map(toFlowEdge))
    setHistorialAbierto(false)
    marcarCambio()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorBar
        workflowId={workflow.id}
        nombre={workflow.nombre}
        estado={estado}
        autorNombre={workflow.autorNombre}
        actualizadoEn={actualizadoEn}
        guardando={save.isPending}
        simulando={simulate.isPending}
        publicando={publish.isPending}
        motivoPublicarDeshabilitado={
          erroresBloqueantes.length > 0
            ? "Resuelve los errores del workflow antes de publicar"
            : !huboCambiosSinPublicar
              ? "Ya está publicado — no hay cambios nuevos que publicar"
              : undefined
        }
        onRename={(nombre) =>
          rename.execute({ workflowId: workflow.id, nombre })
        }
        onHistorial={() => setHistorialAbierto(true)}
        onSimular={() =>
          simulate.execute({ ...grafoParaAcciones(), cohorteInicial: 1514 })
        }
        onPublicar={() => publish.execute(grafoParaAcciones())}
      />
      {mensajePublicar && (
        <div className="border-b border-border px-6 py-2.5">
          <Message
            tipo="error"
            titulo="No se pudo publicar"
            descripcion={mensajePublicar}
          />
        </div>
      )}
      {!mensajePublicar && erroresBloqueantes.length > 0 && (
        <div className="border-b border-border px-6 py-2.5">
          {/*
            "info", no "error": esto no es una falla, es el estado normal
            de un journey a medio construir (ej. recién creado, sin bloque
            de entrada todavía) — antes mostraba una banda roja de "el
            workflow tiene errores" apenas se creaba el journey, antes de
            que el usuario hubiera arrastrado un solo bloque. Publicar
            sigue bloqueado (`deshabilitarPublicar` abajo) hasta que se
            resuelva, pero no hace falta alarmar por algo esperado.
          */}
          <Message
            tipo="info"
            titulo="Falta esto para poder publicar"
            descripcion={erroresBloqueantes.map((e) => e.mensaje).join(" ")}
          />
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <BlockPalette />
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
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
          node={nodoSeleccionado}
          tiers={tiers}
          onClose={() => setSelectedId(null)}
          onDelete={eliminarNodo}
          onConfigChange={actualizarConfigNodo}
        />
      </div>
      <VersionHistoryDialog
        open={historialAbierto}
        onOpenChange={setHistorialAbierto}
        workflowId={workflow.id}
        onRestore={restaurarVersion}
      />
    </div>
  )
}

export function JourneyEditor({
  workflow,
  tiers,
}: {
  workflow: WorkflowWithGraph
  tiers: TierResumen[]
}) {
  return (
    <ReactFlowProvider>
      <CanvasArea workflow={workflow} tiers={tiers} />
    </ReactFlowProvider>
  )
}
