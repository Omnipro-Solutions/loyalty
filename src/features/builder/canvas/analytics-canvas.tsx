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

import { calculateVerticalLayout } from "./analytics-layout"
import { findBiggestDrop } from "./analytics-metrics"
import {
  AnalyticsStepNode,
  type AnalyticsStepData,
} from "./analytics-step-node"
import type { RunSummary } from "./analytics-queries"
import { outputsForNode } from "./builder-node"
import type { WorkflowWithGraph } from "./queries"

const NODE_TYPES = { analyticsStep: AnalyticsStepNode }

/**
 * Versión de solo lectura del canvas, rediseñada como el diagrama vertical
 * de Figma "08.3 · analítica" (681:2135) en vez del canvas horizontal del
 * editor: mismo grafo (`workflow.nodes`/`edges`), pero con layout top-a-abajo
 * (`calculateVerticalLayout`) y una tarjeta por bloque con el conteo real y el
 * % de las entradas totales que llegó ahí — no reutiliza `BuilderNode`
 * porque ese está pensado para el canvas horizontal editable, no para un
 * reporte de lectura.
 */
export function AnalyticsCanvas({
  workflow,
  run,
}: {
  workflow: WorkflowWithGraph
  run: RunSummary | null
}) {
  const { nodes, edges } = useMemo(() => {
    const positions = calculateVerticalLayout(
      workflow.nodes.map((n) => n.id),
      workflow.edges
    )

    const entryCountByNode = new Map<string, number>()
    for (const p of run?.steps ?? []) {
      if (!entryCountByNode.has(p.nodeId)) {
        entryCountByNode.set(p.nodeId, p.entryCount)
      }
    }

    const entryTypes = new Set<string>(BUILDER_ENTRY_NODE_TYPES)
    const entryNodeId = workflow.nodes.find((n) => entryTypes.has(n.tipo))?.id
    const totalEntries = entryNodeId
      ? entryCountByNode.get(entryNodeId)
      : undefined

    const biggestDrop = run ? findBiggestDrop(run.steps, workflow.edges) : null

    const nodesById = new Map(workflow.nodes.map((n) => [n.id, n]))
    const inDegreeByNode = new Map<string, number>()
    for (const e of workflow.edges) {
      inDegreeByNode.set(
        e.target_node_id,
        (inDegreeByNode.get(e.target_node_id) ?? 0) + 1
      )
    }

    // Píldora "vino de…" en cada hijo: solo cuando tiene un único padre Y ese
    // padre realmente ramifica (más de un puerto de salida en el grafo) —
    // un simple "out" único no aporta nada mostrado como píldora.
    const incomingBranchByNode = new Map<
      string,
      { label: string; count: number }
    >()
    for (const e of workflow.edges) {
      if ((inDegreeByNode.get(e.target_node_id) ?? 0) !== 1) continue
      const parent = nodesById.get(e.source_node_id)
      if (!parent) continue
      const realPorts = new Set(
        workflow.edges
          .filter((x) => x.source_node_id === parent.id)
          .map((x) => x.source_port)
      )
      if (realPorts.size < 2) continue
      const label =
        outputsForNode(parent.tipo, parent.config).find(
          (o) => o.id === e.source_port
        )?.label ??
        e.source_port ??
        ""
      const step = run?.steps.find(
        (p) => p.nodeId === e.source_node_id && p.port === e.source_port
      )
      incomingBranchByNode.set(e.target_node_id, {
        label,
        count: step?.exitCount ?? 0,
      })
    }

    const flowNodes: Node<AnalyticsStepData>[] = workflow.nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 }
      const entryCount = entryCountByNode.get(n.id)
      const pct =
        typeof entryCount === "number" && totalEntries
          ? Math.round((entryCount / totalEntries) * 100)
          : undefined
      const outputPorts = [
        ...new Set(
          workflow.edges
            .filter((e) => e.source_node_id === n.id)
            .map((e) => e.source_port ?? "out")
        ),
      ]
      return {
        id: n.id,
        type: "analyticsStep",
        position: pos,
        draggable: false,
        selectable: false,
        data: {
          tipo: n.tipo,
          etiqueta: n.etiqueta,
          entryCount,
          pct,
          incomingBranch: incomingBranchByNode.get(n.id) ?? null,
          outputPorts,
          isBiggestDrop: biggestDrop?.targetNodeId === n.id,
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
  }, [workflow, run])

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
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
