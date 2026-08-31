import type { ReactNode } from "react"

import { formatUSD, formatNumber } from "@/lib/format"

import { PromotionsFiltersBar } from "./promotions-filters-bar"
import type { PromotionsSummary } from "../lib/queries"

type PromotionsCardProps = {
  summary: PromotionsSummary
  exportSlot: ReactNode
  /** Tabla + paginación, dentro de un `<Suspense>` con key. */
  children: ReactNode
}

/**
 * Figma "Table" de 06.1 (706:2518): título + conteo + resumen, filtros,
 * tabla, paginación. Shell del card: `summary` es un resumen agregado
 * (`getPromotionsSummary()`) independiente de los filtros de búsqueda, así
 * que el pill y la línea de resumen no necesitan `<Suspense>`. La barra de
 * filtros vive fuera de cualquier boundary con key a propósito — remontarla
 * borraría el texto del buscador y el foco.
 */
export function PromotionsCard({
  summary,
  exportSlot,
  children,
}: PromotionsCardProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Promociones
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumber(summary.total)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(summary.active)} activas ·{" "}
            {formatNumber(summary.scheduled)} programadas · presupuesto asignado{" "}
            {formatUSD(summary.assignedBudget)}
          </p>
        </div>
        <PromotionsFiltersBar />
        {exportSlot}
      </div>
      {children}
    </div>
  )
}
