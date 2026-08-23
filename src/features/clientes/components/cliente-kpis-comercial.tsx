import { Receipt } from "lucide-react"

import { PlaceholderCard } from "@/components/feedback/placeholder-card"
import { formatCOP, formatNumber, formatPercent } from "@/lib/format"

import { KpiCard } from "./kpi-card"
import type { ValorComercial } from "../lib/queries"

type ClienteKpisComercialProps = { valorComercial: ValorComercial }

/**
 * Figma "Sección · VALOR COMERCIAL" (1186:7) pixel-perfect, real: LTV y
 * margen salen de `pedidos`/`pedido_items`. "Valor previsto 12m" y
 * "Riesgo de fuga" son heurísticas (tendencia de gasto, intervalo entre
 * compras) — no hay modelo de scoring en este proyecto.
 */
export function ClienteKpisComercial({
  valorComercial,
}: ClienteKpisComercialProps) {
  if (valorComercial.totalPedidos === 0) {
    return (
      <div className="flex w-full flex-col gap-2.5">
        <p className="w-full text-[9px] font-semibold tracking-[0.72px] text-muted-foreground uppercase">
          Valor comercial
        </p>
        <PlaceholderCard
          icon={Receipt}
          titulo="Sin pedidos todavía"
          descripcion="LTV, margen, valor previsto y riesgo de fuga aparecen en cuanto el socio tenga compras registradas."
          compact
          className="w-full rounded-[18px]"
        />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      <p className="w-full text-[9px] font-semibold tracking-[0.72px] text-muted-foreground uppercase">
        Valor comercial
      </p>
      <div className="flex w-full items-start gap-3">
        <KpiCard
          etiqueta="Ingresos de por vida"
          valor={formatCOP(valorComercial.ltv)}
          serie={valorComercial.serieMensual}
          detalle={`${formatNumber(valorComercial.totalPedidos)} pedidos · ticket ${formatCOP(
            valorComercial.ltv / valorComercial.totalPedidos
          )}`}
        />
        <KpiCard
          etiqueta="Contribución de margen"
          valor={formatCOP(valorComercial.margen)}
          serie={valorComercial.serieMensual}
          detalle={
            valorComercial.margenPct !== null
              ? `${formatPercent(valorComercial.margenPct)} · devoluciones ${formatCOP(valorComercial.devoluciones)}`
              : "—"
          }
        />
        <KpiCard
          etiqueta="Valor previsto 12m"
          valor={formatCOP(valorComercial.valorPrevisto12m)}
          serie={valorComercial.serieMensual}
          detalle={`${formatCOP(valorComercial.valorPrevistoMargen)} de margen · ±${valorComercial.tendenciaPct}%`}
        />
        <KpiCard
          etiqueta="Riesgo de fuga"
          valor={`${valorComercial.riesgoFuga}/100`}
          valorClassName={
            valorComercial.riesgoFuga >= 60 ? "text-warning" : undefined
          }
          serie={valorComercial.serieMensual}
          strokeClassName={
            valorComercial.riesgoFuga >= 60 ? "stroke-warning" : undefined
          }
          detalle={
            valorComercial.riesgoFugaDelta !== null
              ? `${valorComercial.riesgoFugaDelta >= 0 ? "+" : ""}${valorComercial.riesgoFugaDelta} pts vs. hace 30 días`
              : "sin comparación todavía"
          }
        />
      </div>
    </div>
  )
}
