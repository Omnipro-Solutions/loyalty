"use client"

import { Trash2, Workflow } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data/data-table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCOP, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import { deleteWorkflowsAction } from "./actions"
import type { WorkflowListItem } from "./queries"
import { JourneyEstadoDot } from "./journey-estado-dot"

const AVATAR_COLORES = [
  { bg: "bg-avatar-indigo-bg", fg: "text-avatar-indigo-fg" },
  { bg: "bg-avatar-teal-bg", fg: "text-avatar-teal-fg" },
  { bg: "bg-avatar-coral-bg", fg: "text-avatar-coral-fg" },
  { bg: "bg-avatar-amber-bg", fg: "text-avatar-amber-fg" },
  { bg: "bg-avatar-violet-bg", fg: "text-avatar-violet-fg" },
] as const

const tableFeaturesConfig = tableFeatures({ columnSizingFeature })
const columnHelper = createColumnHelper<
  typeof tableFeaturesConfig,
  WorkflowListItem
>()

function useColumns(
  seleccionados: Set<string>,
  onToggle: (id: string) => void,
  onToggleTodos: (marcar: boolean) => void,
  todosMarcados: boolean
) {
  return columnHelper.columns([
    columnHelper.display({
      id: "seleccion",
      size: 44,
      header: () => (
        <Checkbox
          checked={todosMarcados}
          onCheckedChange={(v) => onToggleTodos(v === true)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Seleccionar todos"
        />
      ),
      cell: (info) => (
        <Checkbox
          checked={seleccionados.has(info.row.original.id)}
          onCheckedChange={() => onToggle(info.row.original.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Seleccionar ${info.row.original.nombre}`}
        />
      ),
    }),
    columnHelper.accessor("nombre", {
      header: "Workflow",
      cell: (info) => {
        const idx = info.row.index % AVATAR_COLORES.length
        const color = AVATAR_COLORES[idx]!
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-[9px]",
                color.bg
              )}
            >
              <Workflow className={cn("size-[15px]", color.fg)} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
                {info.getValue()}
              </p>
              {info.row.original.descripcion && (
                <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
                  {info.row.original.descripcion}
                </p>
              )}
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor("estado", {
      header: "Estado",
      size: 118,
      cell: (info) => <JourneyEstadoDot estado={info.getValue()} />,
    }),
    columnHelper.accessor("enRecorrido", {
      id: "enRecorrido",
      size: 120,
      header: () => <span className="block text-right">En recorrido</span>,
      // `null` = ningún socio con un `points_ledger` vinculado a una
      // corrida de este workflow todavía (ver `getAtribucionPorWorkflow`
      // en queries.ts) — "—" es el mismo estado que el propio Figma usa
      // para journeys sin datos, no un placeholder inventado.
      cell: (info) => (
        <span className="block text-right text-[13px]">
          {info.getValue() !== null ? formatNumber(info.getValue()!) : "—"}
        </span>
      ),
    }),
    columnHelper.accessor("conversion", {
      id: "conversion",
      size: 140,
      header: "Conversión",
      cell: (info) => {
        const valor = info.getValue()
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-foreground">
              {valor !== null ? formatPercent(valor) : "—"}
            </span>
            <div className="h-[5px] w-full overflow-hidden rounded-full bg-muted">
              {valor !== null && (
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${String(Math.round(valor * 100))}%` }}
                />
              )}
            </div>
          </div>
        )
      },
    }),
    columnHelper.display({
      id: "tendencia",
      size: 92,
      header: "Tendencia",
      // Necesitaría una serie histórica (misma métrica en el periodo
      // anterior) que hoy no se guarda en ningún lado — a diferencia de
      // "En recorrido"/"Conversión"/"Ingreso", esto sigue sin dato real
      // detrás.
      cell: () => <span className="text-xs text-muted-foreground">—</span>,
    }),
    columnHelper.accessor("totalNodos", {
      header: () => <span className="block text-right">Nodos</span>,
      size: 88,
      cell: (info) => (
        <span className="block text-right text-xs text-muted-foreground">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("ingreso", {
      id: "ingreso",
      size: 120,
      header: () => <span className="block text-right">Ingreso</span>,
      cell: (info) => (
        <span className="block text-right text-[13px] font-semibold text-foreground">
          {info.getValue() !== null ? formatCOP(info.getValue()!) : "—"}
        </span>
      ),
    }),
  ])
}

export function JourneysTable({
  workflows,
}: {
  workflows: WorkflowListItem[]
}) {
  const router = useRouter()
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [confirmarAbierto, setConfirmarAbierto] = useState(false)

  const eliminar = useAction(deleteWorkflowsAction, {
    onSuccess: () => {
      setSeleccionados(new Set())
      setConfirmarAbierto(false)
      router.refresh()
    },
  })

  function onToggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onToggleTodos(marcar: boolean) {
    setSeleccionados(marcar ? new Set(workflows.map((w) => w.id)) : new Set())
  }

  const todosMarcados =
    workflows.length > 0 && workflows.every((w) => seleccionados.has(w.id))

  const columns = useColumns(
    seleccionados,
    onToggle,
    onToggleTodos,
    todosMarcados
  )

  const table = useTable({
    features: tableFeaturesConfig,
    columns,
    data: workflows,
  })

  return (
    <>
      {seleccionados.size > 0 && (
        <div className="flex items-center gap-3 border-b border-border bg-accent px-[22px] py-2.5">
          <p className="flex-1 text-[12px] font-medium text-accent-foreground">
            {seleccionados.size} seleccionado
            {seleccionados.size === 1 ? "" : "s"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive"
            onClick={() => setConfirmarAbierto(true)}
          >
            <Trash2 className="size-3.5" />
            Eliminar
          </Button>
        </div>
      )}
      <DataTable
        table={table}
        onRowClick={(row) => router.push(`/journeys/${row.id}`)}
        headerClassName="bg-neutral-50"
      />
      <Dialog open={confirmarAbierto} onOpenChange={setConfirmarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              ¿Eliminar {seleccionados.size} workflow
              {seleccionados.size === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se borran también sus nodos,
              conexiones, versiones y corridas de simulación/publicación.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              disabled={eliminar.isPending}
              onClick={() =>
                eliminar.execute({ workflowIds: [...seleccionados] })
              }
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
