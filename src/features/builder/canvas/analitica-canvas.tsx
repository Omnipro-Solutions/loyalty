"use client"

import "@xyflow/react/dist/style.css"

import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react"
import { useMemo } from "react"

import { BUILDER_ENTRY_NODE_TYPES } from "@/types/domain"

import { calcularLayoutVertical } from "./analitica-layout"
import { encontrarMayorCaida } from "./analitica-metrics"
import {
  AnaliticaStepNode,
  type AnaliticaStepData,
} from "./analitica-step-node"
import type { RunResumen } from "./analytics-queries"
import { outputsDeNodo } from "./builder-node"
import type { WorkflowWithGraph } from "./queries"

const NODE_TYPES = { analiticaStep: AnaliticaStepNode }

/**
 * Versión de solo lectura del canvas, rediseñada como el diagrama vertical
 * de Figma "08.3 · analítica" (681:2135) en vez del canvas horizontal del
 * editor: mismo grafo (`workflow.nodes`/`edges`), pero con layout top-a-abajo
 * (`calcularLayoutVertical`) y una tarjeta por bloque con el conteo real y el
 * % de las entradas totales que llegó ahí — no reutiliza `BuilderNode`
 * porque ese está pensado para el canvas horizontal editable, no para un
 * reporte de lectura.
 */
export function AnaliticaCanvas({
  workflow,
  corrida,
}: {
  workflow: WorkflowWithGraph
  corrida: RunResumen | null
}) {
  const { nodes, edges } = useMemo(() => {
    const posiciones = calcularLayoutVertical(
      workflow.nodes.map((n) => n.id),
      workflow.edges
    )

    const conteoEntradaPorNodo = new Map<string, number>()
    for (const p of corrida?.pasos ?? []) {
      if (!conteoEntradaPorNodo.has(p.nodeId)) {
        conteoEntradaPorNodo.set(p.nodeId, p.conteoEntrada)
      }
    }

    const tiposEntrada = new Set<string>(BUILDER_ENTRY_NODE_TYPES)
    const nodoEntradaId = workflow.nodes.find((n) =>
      tiposEntrada.has(n.tipo)
    )?.id
    const entradasGlobales = nodoEntradaId
      ? conteoEntradaPorNodo.get(nodoEntradaId)
      : undefined

    const mayorCaida = corrida
      ? encontrarMayorCaida(corrida.pasos, workflow.edges)
      : null

    const nodosPorId = new Map(workflow.nodes.map((n) => [n.id, n]))
    const gradoEntradaPorNodo = new Map<string, number>()
    for (const e of workflow.edges) {
      gradoEntradaPorNodo.set(
        e.target_node_id,
        (gradoEntradaPorNodo.get(e.target_node_id) ?? 0) + 1
      )
    }

    // Píldora "vino de…" en cada hijo: solo cuando tiene un único padre Y ese
    // padre realmente ramifica (más de un puerto de salida en el grafo) —
    // un simple "out" único no aporta nada mostrado como píldora.
    const ramaEntrantePorNodo = new Map<
      string,
      { etiqueta: string; conteo: number }
    >()
    for (const e of workflow.edges) {
      if ((gradoEntradaPorNodo.get(e.target_node_id) ?? 0) !== 1) continue
      const padre = nodosPorId.get(e.source_node_id)
      if (!padre) continue
      const puertosReales = new Set(
        workflow.edges
          .filter((x) => x.source_node_id === padre.id)
          .map((x) => x.source_port)
      )
      if (puertosReales.size < 2) continue
      const etiqueta =
        outputsDeNodo(padre.tipo, padre.config).find(
          (o) => o.id === e.source_port
        )?.label ??
        e.source_port ??
        ""
      const paso = corrida?.pasos.find(
        (p) => p.nodeId === e.source_node_id && p.port === e.source_port
      )
      ramaEntrantePorNodo.set(e.target_node_id, {
        etiqueta,
        conteo: paso?.conteoSalida ?? 0,
      })
    }

    const flowNodes: Node<AnaliticaStepData>[] = workflow.nodes.map((n) => {
      const pos = posiciones.get(n.id) ?? { x: 0, y: 0 }
      const conteoEntrada = conteoEntradaPorNodo.get(n.id)
      const pct =
        typeof conteoEntrada === "number" && entradasGlobales
          ? Math.round((conteoEntrada / entradasGlobales) * 100)
          : undefined
      const puertosSalida = [
        ...new Set(
          workflow.edges
            .filter((e) => e.source_node_id === n.id)
            .map((e) => e.source_port ?? "out")
        ),
      ]
      return {
        id: n.id,
        type: "analiticaStep",
        position: pos,
        draggable: false,
        selectable: false,
        data: {
          tipo: n.tipo,
          etiqueta: n.etiqueta,
          conteoEntrada,
          pct,
          ramaEntrante: ramaEntrantePorNodo.get(n.id) ?? null,
          puertosSalida,
          esMayorCaida: mayorCaida?.targetNodeId === n.id,
        },
      }
    })

    const flowEdges: Edge[] = workflow.edges.map((e) => ({
      id: `${e.source_node_id}-${e.source_port ?? "out"}-${e.target_node_id}`,
      source: e.source_node_id,
      sourceHandle: e.source_port ?? "out",
      target: e.target_node_id,
      type: "smoothstep",
      pathOptions: { borderRadius: 16 },
    }))

    return { nodes: flowNodes, edges: flowEdges }
  }, [workflow, corrida])

  return (
    <div className="h-[640px] w-full overflow-hidden rounded-2xl border border-border bg-neutral-50">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
          minZoom={0.2}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
