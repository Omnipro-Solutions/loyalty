import Link from "next/link"
import {
  AlertTriangle,
  ChevronRight,
  PieChart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

import type { ResultInsight } from "../lib/result-analytics"

const ICON: Record<string, LucideIcon> = {
  mejor_roi: TrendingUp,
  mayor_uso: TrendingUp,
  uso_alto_roi_bajo: AlertTriangle,
  concentracion: PieChart,
}

const ACCENT: Record<ResultInsight["tone"], string> = {
  positive: "bg-success-bg text-success",
  warning: "bg-avatar-amber-bg text-avatar-amber-fg",
  neutral: "bg-avatar-violet-bg text-avatar-violet-fg",
}

/**
 * "Insights clave" — lo que un humano sacaría comparando las columnas de la
 * tabla de al lado, dicho en voz alta.
 *
 * No es un motor de recomendaciones ni hay modelo detrás: son lecturas
 * deterministas de las mismas filas que ya se muestran (ver `buildInsights`),
 * cada una con su evidencia. Por eso el bloque puede traer tres tarjetas,
 * una o ninguna — y cuando no trae ninguna lo dice, en vez de rellenar con
 * frases genéricas que suenan a análisis sin serlo.
 */
export function PromotionsResultInsights({
  insights,
}: {
  insights: ResultInsight[]
}) {
  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-[15px] leading-[21px] font-semibold text-foreground">
          Insights clave
        </p>
        <p className="text-xs text-muted-foreground">
          Lecturas del portafolio filtrado
        </p>
      </div>

      {insights.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Todavía no hay suficientes promociones medidas para comparar unas con
          otras.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {insights.map((insight) => {
            const Icon = ICON[insight.id] ?? TrendingUp
            const body = (
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    ACCENT[insight.tone]
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-xs leading-4 font-semibold text-foreground">
                    {insight.title}
                  </p>
                  <p className="text-[11px] leading-[15px] text-muted-foreground">
                    {insight.detail}
                  </p>
                </div>
                {insight.promotionId && (
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                )}
              </div>
            )

            return insight.promotionId ? (
              <Link
                key={insight.id}
                href={`/promociones/${insight.promotionId}`}
                className="rounded-2xl border border-border px-3.5 py-3 transition-colors hover:bg-muted"
              >
                {body}
              </Link>
            ) : (
              <div
                key={insight.id}
                className="rounded-2xl border border-border px-3.5 py-3"
              >
                {body}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
