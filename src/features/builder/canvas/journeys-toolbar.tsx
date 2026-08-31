"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useRef } from "react"

import { ExportCsvButton } from "@/components/data/export-csv-button"
import { ExportDialog } from "@/components/data/export-dialog"
import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { notifyExportStatus } from "@/components/feedback/export-toast"
import { useCsvExportDialog } from "@/hooks/use-csv-export-dialog"
import { formatNumber } from "@/lib/format"
import { enumValue } from "@/lib/search-params"
import { WORKFLOW_STATUSES } from "@/types/domain"

import { PUBLICATION_STATUS_LABEL } from "@/lib/publication-status"

import { WORKFLOWS_EXPORT_COLUMN_OPTIONS } from "./export-columns"
import { exportWorkflowsAction, previewWorkflowsExportAction } from "./export"
import { NewJourneyButton } from "./new-journey-button"
import type { WorkflowsExportFiltersInput } from "./schemas"

// El filtro va contra la COLUMNA, así que ofrece los 4 estados guardados —
// no `programada`, que se deriva de la vigencia y no existe en la base
// (ver `publicationStatus`). Filtrar por algo que no es una columna daría
// resultados vacíos sin explicar por qué.
const STATUS_OPTIONS = WORKFLOW_STATUSES.map((estado) => ({
  value: estado,
  label: PUBLICATION_STATUS_LABEL[estado],
}))

const ENTITY = { singular: "journey", plural: "journeys" }

export function JourneysToolbar({
  total,
  drafts,
  paused,
  published,
  membersInJourney,
  pendingApprovals,
}: {
  total: number
  drafts: number
  paused: number
  published: number
  membersInJourney: string
  pendingApprovals: number
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
  const filters: WorkflowsExportFiltersInput = {
    status: enumValue(selectedStatus ?? undefined, WORKFLOW_STATUSES),
    q: searchParams.get("q") ?? undefined,
  }

  const dialog = useCsvExportDialog({
    previewAction: previewWorkflowsExportAction,
    exportAction: exportWorkflowsAction,
    columnOptions: WORKFLOWS_EXPORT_COLUMN_OPTIONS,
    filters,
    onStatus: notifyExportStatus,
  })

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
          {published} activas · {drafts} borradores · {paused} inactivas ·{" "}
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
      <ExportCsvButton
        className="rounded-[10px] text-xs"
        onExport={dialog.openDialog}
      />
      <ExportDialog
        {...dialog}
        title="Exportar journeys"
        entity={ENTITY}
        columns={WORKFLOWS_EXPORT_COLUMN_OPTIONS}
      />
      {pendingApprovals > 0 && (
        <Link
          href="/aprobaciones"
          className="flex shrink-0 items-center gap-[7px] rounded-[10px] border border-warning/40 bg-warning-bg px-3.5 py-2.5 text-xs font-medium text-warning"
        >
          {formatNumber(pendingApprovals)} pendiente
          {pendingApprovals === 1 ? "" : "s"} de aprobación
        </Link>
      )}
      <NewJourneyButton />
    </div>
  )
}
