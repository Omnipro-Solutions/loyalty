"use client"

import { Download } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { WORKFLOW_STATUSES } from "@/types/domain"

import type { WorkflowListItem } from "./queries"
import { NewJourneyButton } from "./new-journey-button"

const STATUS_OPTIONS = WORKFLOW_STATUSES.map((e) => ({
  value: e,
  label: e[0]!.toUpperCase() + e.slice(1),
}))

/** Genera un CSV a partir de las filas visibles (la página actual, ya filtrada). */
function exportCsv(items: WorkflowListItem[]) {
  const header = ["Workflow", "Estado", "Nodos", "Editado por", "Actualizado"]
  const rows = items.map((w) => [
    w.nombre,
    w.estado,
    String(w.totalNodes),
    w.authorName ?? "",
    w.actualizado_en,
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
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
  drafts,
  paused,
  published,
  membersInJourney,
  visibleItems,
}: {
  total: number
  drafts: number
  paused: number
  published: number
  membersInJourney: string
  visibleItems: WorkflowListItem[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  function updateParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(name, value)
    else params.delete(name)
    params.delete("page")
    router.push(`/journeys?${params.toString()}`)
  }

  function onSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParam("q", value || null), 350)
  }

  const selectedStatus = searchParams.get("estado")

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
          {published} publicados · {drafts} borradores · {paused} pausados ·{" "}
          {membersInJourney} clientes en recorrido
        </p>
      </div>
      <FilterSearch
        className="w-[190px]"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => onSearch(e.target.value)}
      />
      <FilterSelect
        label="Estado"
        options={STATUS_OPTIONS}
        value={selectedStatus ? [selectedStatus] : []}
        onChange={(v) => updateParam("estado", v[0] ?? null)}
      />
      <Button
        variant="outline"
        className="gap-1.5 rounded-[10px] text-xs"
        onClick={() => exportCsv(visibleItems)}
      >
        <Download className="size-3.5" />
        Exportar
      </Button>
      <NewJourneyButton />
    </div>
  )
}
