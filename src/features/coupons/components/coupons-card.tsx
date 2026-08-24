import type { ReactNode } from "react"

import { formatNumber } from "@/lib/format"

import { CouponsFiltersBar } from "./coupons-filters-bar"
import type { CouponsSummary } from "../lib/queries"

type CouponsCardProps = {
  vista: "batches" | "coupons"
  summary: CouponsSummary
  exportButton: ReactNode
  children: ReactNode
}

/** Shell del card de listado (doc §4.1), mismo patrón que `PromotionsCard`: título + conteo + resumen + filtros + botón de exportar, `children` es la tabla + paginación dentro de su propio `<Suspense>`. */
export function CouponsCard({
  vista,
  summary,
  exportButton,
  children,
}: CouponsCardProps) {
  const count =
    vista === "batches" ? summary.totalBatches : summary.issuedCoupons

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              {vista === "batches" ? "Emisiones" : "Cupones"}
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumber(count)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(summary.pendingApproval)} esperando aprobación ·{" "}
            {formatNumber(summary.generating)} generando
          </p>
        </div>
        <CouponsFiltersBar />
        {exportButton}
      </div>
      {children}
    </div>
  )
}
