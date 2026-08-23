import { formatCOP, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import { vigenciaResumen } from "../lib/estado"
import type { Promocion } from "../lib/queries"

const BANDA_FILL = {
  alta: "bg-warning",
  media: "bg-primary",
  baja: "bg-success",
}

function bandaConsumo(porcentaje: number): "alta" | "media" | "baja" {
  if (porcentaje >= 0.85) return "alta"
  if (porcentaje >= 0.5) return "media"
  return "baja"
}

type PromoKpiCardProps = { promocion: Promocion }

/** Figma "Promo card" (630:570) — las 3 promociones activas con más presupuesto consumido. */
export function PromoKpiCard({ promocion }: PromoKpiCardProps) {
  const porcentaje =
    promocion.presupuesto_asignado > 0
      ? promocion.presupuesto_consumido / promocion.presupuesto_asignado
      : 0
  const banda = bandaConsumo(porcentaje)

  return (
    <div className="flex flex-1 flex-col gap-4 rounded-2xl bg-background px-[18px] py-4 shadow-form-section">
      <div className="flex items-center gap-2">
        <p className="flex-1 truncate text-[15px] font-semibold text-foreground">
          {promocion.nombre}
        </p>
        <span className="shrink-0 rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-medium text-success">
          Activa
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {vigenciaResumen(promocion)}
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary-foreground">
            Presupuesto consumido
          </span>
          <span className="font-medium text-foreground">
            {formatPercent(porcentaje)}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", BANDA_FILL[banda])}
            style={{ width: `${Math.min(porcentaje * 100, 100)}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-foreground">
          {formatCOP(promocion.presupuesto_consumido)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatNumber(promocion.canjes)} canjes
        </p>
      </div>
    </div>
  )
}
