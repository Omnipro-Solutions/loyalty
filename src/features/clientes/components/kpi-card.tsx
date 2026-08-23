import { cn } from "@/lib/utils"

import { Sparkline } from "./sparkline"

type KpiCardProps = {
  etiqueta: string
  valor: string
  valorClassName?: string
  serie: number[]
  strokeClassName?: string
  detalle: string
  detalleClassName?: string
}

/** Tarjeta de KPI compartida por "Programa de lealtad" y "Valor comercial" (1186:4825, 1186:7) — mismo chrome, distintos datos. */
export function KpiCard({
  etiqueta,
  valor,
  valorClassName,
  serie,
  strokeClassName,
  detalle,
  detalleClassName,
}: KpiCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-[5px] rounded-[18px] bg-background px-4 py-3.5 shadow-form-section">
      <p className="w-full text-[10px] font-medium text-muted-foreground">
        {etiqueta}
      </p>
      <p
        className={cn(
          "w-full text-xl font-bold text-foreground",
          valorClassName
        )}
      >
        {valor}
      </p>
      <Sparkline valores={serie} strokeClassName={strokeClassName} />
      <p
        className={cn(
          "w-full text-[10px] text-muted-foreground",
          detalleClassName
        )}
      >
        {detalle}
      </p>
    </div>
  )
}
