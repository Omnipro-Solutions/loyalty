"use client"

import { useAction } from "next-safe-action/hooks"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatFechaHora } from "@/lib/format"

import { getVersionGraphAction, listVersionsAction } from "./history-actions"
import type { WorkflowVersionSummary } from "./queries"

export function VersionHistoryDialog({
  open,
  onOpenChange,
  workflowId,
  onRestore,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  /** Sin esta prop el diálogo es de solo lectura (sin botón "Restaurar") — para páginas sin un canvas vivo al que aplicar un grafo pasado, como la de analítica. */
  onRestore?: (grafo: {
    nodes: import("./queries").WorkflowGraphNode[]
    edges: import("./queries").WorkflowGraphEdge[]
  }) => void
}) {
  const [versiones, setVersiones] = useState<WorkflowVersionSummary[]>()
  const list = useAction(listVersionsAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) setVersiones(data.versiones)
    },
  })
  const getGraph = useAction(getVersionGraphAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) onRestore?.(data.grafo)
    },
  })

  useEffect(() => {
    if (open) list.execute({ workflowId })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo recarga al abrir el diálogo.
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Historial de versiones</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto">
          {versiones?.length === 0 && (
            <p className="text-[13px] text-muted-foreground">
              Todavía no hay versiones publicadas de este workflow.
            </p>
          )}
          {versiones?.map((v) => (
            <div
              key={v.version}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  Versión {v.version}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatFechaHora(v.creado_en)}
                  {v.autorNombre && ` · ${v.autorNombre}`}
                </p>
              </div>
              {onRestore && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={getGraph.isPending}
                  onClick={() =>
                    getGraph.execute({ workflowId, version: v.version })
                  }
                >
                  Restaurar
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
