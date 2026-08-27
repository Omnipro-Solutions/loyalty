import { Layers, Plus } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

import { StoreGroupsDialog } from "./store-groups-dialog"
import { StoresFiltersBar } from "./stores-filters-bar"
import type { StoreGroupOption, StoresSummary } from "../lib/queries"

type StoresCardProps = {
  cities: string[]
  summary: StoresSummary
  storeGroups: StoreGroupOption[]
  /** `ExportStoresButton` necesita el array resuelto — va detrás de un `<Suspense>`. */
  exportSlot: ReactNode
  /** Tabla + paginación — va dentro de un `<Suspense>` con key. */
  children: ReactNode
}

/**
 * Figma "Table" (707:2518): título + conteo + resumen arriba, filtros,
 * tabla, paginación. Shell del card — `summary` no depende de los filtros
 * (`getStoresSummary()` es una consulta aparte), así que el pill y el
 * resumen se quedan síncronos, sin `<Suspense>`.
 */
export function StoresCard({
  cities,
  summary,
  storeGroups,
  exportSlot,
  children,
}: StoresCardProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Tiendas
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumber(summary.total)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(summary.total)} tiendas ·{" "}
            {formatNumber(summary.operating)} operando ·{" "}
            {formatNumber(summary.opening)} en apertura ·{" "}
            {formatNumber(summary.withIssues)} con incidencias
          </p>
        </div>
        <StoresFiltersBar cities={cities} />
        {exportSlot}
        <StoreGroupsDialog
          groups={storeGroups}
          renderTrigger={<Button variant="outline" size="sm" />}
        >
          <Layers className="size-3.5" />
          Grupos de tienda
        </StoreGroupsDialog>
        <Link
          href="/tiendas/nueva"
          className="flex items-center gap-[7px] rounded-[10px] bg-primary py-[9px] pr-3.5 pl-3 text-xs font-medium text-primary-foreground"
        >
          <Plus className="size-3.5" />
          Nueva tienda
        </Link>
      </div>
      {children}
    </div>
  )
}
