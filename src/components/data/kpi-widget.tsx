import type { ReactNode } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"

type KpiWidgetProps = {
  etiqueta: string
  valor: ReactNode
  /** Pill verde con flecha (ej. "6,2%") — omite si no hay dato real que respalde la variación. */
  delta?: string
  /** Texto de contexto junto al delta, o solo (ej. "Aún sin seguimiento en vivo"). */
  caption?: string
}

/**
 * Figma "Widget / KPI · sparkline" (731:399): tarjeta blanca con etiqueta,
 * valor grande y una píldora de variación. El Figma también dibuja un
 * sparkline junto al valor — se omite aquí a propósito: esta tarjeta no
 * finge una serie de tiempo que no existe (no hay tracking histórico de
 * estas métricas todavía). Cuando exista, se agrega un prop `trend` sin
 * cambiar la forma de esta API.
 */
export function KpiWidget({ etiqueta, valor, delta, caption }: KpiWidgetProps) {
  const esNegativo = delta?.trim().startsWith("-") ?? false

  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-[20px] bg-background px-[18px] py-4 shadow-form-section">
      <p className="text-[11px] leading-[15px] font-medium text-muted-foreground">
        {etiqueta}
      </p>
      <p className="text-[22px] leading-7 font-semibold text-foreground">
        {valor}
      </p>
      {(delta || caption) && (
        <div className="flex items-center gap-1.5">
          {delta && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full py-0.5 pr-2 pl-1.5 text-[10px] leading-[14px] font-semibold",
                esNegativo
                  ? "bg-destructive-bg text-destructive"
                  : "bg-success-bg text-success"
              )}
            >
              {esNegativo ? (
                <ArrowDown className="size-2.5" />
              ) : (
                <ArrowUp className="size-2.5" />
              )}
              {delta}
            </span>
          )}
          {caption && (
            <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
              {caption}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
