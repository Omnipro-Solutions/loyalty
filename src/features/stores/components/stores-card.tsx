import { Plus } from "lucide-react"
import Link from "next/link"

import { formatNumber } from "@/lib/format"

import { ExportStoresButton } from "./export-stores-button"
import { StoresFiltersBar } from "./stores-filters-bar"
import { StoresPagination } from "./stores-pagination"
import { StoresTable } from "./stores-table"
import type { Store, StoresSummary } from "../lib/queries"

type StoresCardProps = {
  stores: Store[]
  cities: string[]
  total: number
  pageSize: number
  summary: StoresSummary
}

/** Figma "Table" (707:2518): título + conteo + resumen arriba, filtros, tabla, paginación. */
export function StoresCard({
  stores,
  cities,
  total,
  pageSize,
  summary,
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
        <ExportStoresButton stores={stores} />
        <Link
          href="/tiendas/nueva"
          className="flex items-center gap-[7px] rounded-[10px] bg-primary py-[9px] pr-3.5 pl-3 text-xs font-medium text-primary-foreground"
        >
          <Plus className="size-3.5" />
          Nueva tienda
        </Link>
      </div>
      <StoresTable stores={stores} />
      <StoresPagination total={total} pageSize={pageSize} />
    </div>
  )
}
