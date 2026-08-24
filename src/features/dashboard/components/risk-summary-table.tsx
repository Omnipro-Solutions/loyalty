import { ChevronRight, Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RiskSegment } from "../lib/mock-data"

const RISK_VARIANT: Record<
  RiskSegment["risk"],
  "success" | "warning" | "error"
> = {
  bajo: "success",
  medio: "warning",
  alto: "error",
}

const RISK_LABEL: Record<RiskSegment["risk"], string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
}

type RiskSummaryTableProps = {
  segments: RiskSegment[]
  className?: string
}

/** Figma "Widget / Mini tabla con estado" (1028:4384) — "Resumen de riesgo de abandono". */
export function RiskSummaryTable({
  segments,
  className,
}: RiskSummaryTableProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-3.5 rounded-[20px] bg-background px-5 pt-5 pb-[18px] shadow-form-section",
        className
      )}
    >
      <div className="flex w-full items-center gap-1.5">
        <p className="flex-1 text-[15px] leading-[21px] font-semibold text-foreground">
          Resumen de riesgo de abandono
        </p>
        <Info className="size-[13px] text-muted-foreground" />
      </div>

      <div className="flex w-full items-center justify-between border-b border-muted pb-2">
        <p className="flex-1 text-[10px] leading-[14px] font-semibold text-muted-foreground">
          SEGMENTO
        </p>
        <p className="w-24 text-[10px] leading-[14px] font-semibold text-muted-foreground">
          MIEMBROS
        </p>
        <p className="w-14 text-right text-[10px] leading-[14px] font-semibold text-muted-foreground">
          RIESGO
        </p>
      </div>

      {segments.map((segment, i) => (
        <div
          key={segment.name}
          className={cn(
            "flex w-full items-center justify-between py-2.5",
            i < segments.length - 1 && "border-b border-muted"
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <p className="text-[13px] leading-[18px] font-medium text-foreground">
              {segment.name}
            </p>
            <p className="text-[10px] leading-[14px] text-muted-foreground">
              {segment.description}
            </p>
          </div>
          <p className="w-24 text-xs leading-[17px] text-secondary-foreground">
            {segment.members}
          </p>
          <div className="flex w-14 justify-end">
            <Badge variant={RISK_VARIANT[segment.risk]}>
              {RISK_LABEL[segment.risk]}
            </Badge>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="flex items-center gap-1.5 pt-1 text-xs leading-[17px] font-medium text-primary"
      >
        Ver detalle de segmentos
        <ChevronRight className="size-[13px]" />
      </button>
    </div>
  )
}
