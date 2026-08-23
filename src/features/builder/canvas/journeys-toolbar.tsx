"use client"

import { Download } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { WORKFLOW_ESTADOS } from "@/types/domain"

import type { WorkflowListItem } from "./queries"
import { NuevoJourneyButton } from "./nuevo-journey-button"

const ESTADO_OPCIONES = WORKFLOW_ESTADOS.map((e) => ({
  value: e,
  label: e[0]!.toUpperCase() + e.slice(1),
}))

/** Genera un CSV a partir de las filas visibles (la página actual, ya filtrada). */
function exportarCsv(items: WorkflowListItem[]) {
  const encabezado = [
    "Workflow",
    "Estado",
    "Nodos",
    "Editado por",
    "Actualizado",
  ]
  const filas = items.map((w) => [
    w.nombre,
    w.estado,
    String(w.totalNodos),
    w.autorNombre ?? "",
    w.actualizado_en,
  ])
  const csv = [encabezado, ...filas]
    .map((fila) => fila.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "workflows.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export function JourneysToolbar({
  total,
  borradores,
  pausados,
  publicados,
  clientesEnRecorrido,
  itemsVisibles,
}: {
  total: number
  borradores: number
  pausados: number
  publicados: number
  clientesEnRecorrido: string
  itemsVisibles: WorkflowListItem[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  function actualizarParam(nombre: string, valor: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) params.set(nombre, valor)
    else params.delete(nombre)
    params.delete("page")
    router.push(`/journeys?${params.toString()}`)
  }

  function onBuscar(valor: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(
      () => actualizarParam("q", valor || null),
      350
    )
  }

  const estadoActual = searchParams.get("estado")

  return (
    <div className="flex w-full items-center gap-2.5 pt-[18px] pb-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
            Loyalty Builder
          </p>
          <span className="flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
            {total}
          </span>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {publicados} publicados · {borradores} borradores · {pausados}{" "}
          pausados · {clientesEnRecorrido} clientes en recorrido
        </p>
      </div>
      <FilterSearch
        className="w-[190px]"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => onBuscar(e.target.value)}
      />
      <FilterSelect
        label="Estado"
        options={ESTADO_OPCIONES}
        value={estadoActual ? [estadoActual] : []}
        onChange={(v) => actualizarParam("estado", v[0] ?? null)}
      />
      <Button
        variant="outline"
        className="gap-1.5 rounded-[10px] text-xs"
        onClick={() => exportarCsv(itemsVisibles)}
      >
        <Download className="size-3.5" />
        Exportar
      </Button>
      <NuevoJourneyButton />
    </div>
  )
}
