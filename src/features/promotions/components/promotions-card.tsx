import { formatCOP, formatNumber } from "@/lib/format"

import { ExportPromotionsButton } from "./export-promotions-button"
import { PromotionsFiltersBar } from "./promotions-filters-bar"
import { PromotionsPagination } from "./promotions-pagination"
import { PromotionsTable } from "./promotions-table"
import type { Promotion, PromotionsSummary } from "../lib/queries"

type PromotionsCardProps = {
  promotions: Promotion[]
  total: number
  pageSize: number
  summary: PromotionsSummary
  totalStores: number
  categoryNameById: Map<string, string>
  segmentNameById: Map<string, string>
}

/** Figma "Table" de 06.1 (706:2518): título + conteo + resumen, filtros, tabla, paginación. */
export function PromotionsCard({
  promotions,
  total,
  pageSize,
  summary,
  totalStores,
  categoryNameById,
  segmentNameById,
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
            {formatCOP(summary.assignedBudget)}
          </p>
        </div>
        <PromotionsFiltersBar />
        <ExportPromotionsButton promotions={promotions} />
      </div>
      <PromotionsTable
        promotions={promotions}
        totalStores={totalStores}
        categoryNameById={categoryNameById}
        segmentNameById={segmentNameById}
      />
      <PromotionsPagination total={total} pageSize={pageSize} />
    </div>
  )
}
