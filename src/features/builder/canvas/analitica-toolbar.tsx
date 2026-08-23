"use client"

import { History, Play } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

import { simulateWorkflowAction } from "./publish-actions"
import type { WorkflowWithGraph } from "./queries"
import { VersionHistoryDialog } from "./version-history-dialog"

/**
 * "Simular"/"Historial de versiones" en la página de Analítica (Figma
 * `1114:4478`) — se habían dejado fuera a propósito por ser una página de
 * puro Server Component; ahora viven en esta pequeña isla de cliente.
 * "Historial" aquí es de solo lectura: no hay un canvas vivo en esta
 * página al que "Restaurar" pueda aplicar un grafo pasado (eso sigue
 * siendo trabajo exclusivo del editor), así que `VersionHistoryDialog` se
 * usa sin `onRestore`.
 */
export function AnaliticaToolbar({
  workflow,
}: {
  workflow: WorkflowWithGraph
}) {
  const router = useRouter()
  const [historialAbierto, setHistorialAbierto] = useState(false)

  const simular = useAction(simulateWorkflowAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) router.refresh()
    },
  })

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={simular.isPending}
        onClick={() =>
          simular.execute({
            workflowId: workflow.id,
            nodes: workflow.nodes,
            edges: workflow.edges,
            cohorteInicial: 1514,
          })
        }
      >
        <Play className="size-3.5" />
        {simular.isPending ? "Simulando…" : "Simular"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setHistorialAbierto(true)}
      >
        <History className="size-3.5" />
        Historial de versiones
      </Button>
      <VersionHistoryDialog
        open={historialAbierto}
        onOpenChange={setHistorialAbierto}
        workflowId={workflow.id}
      />
    </>
  )
}
