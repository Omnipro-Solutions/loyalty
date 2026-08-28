import {
  Gift,
  Percent,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"

import { KpiDenseCard } from "@/components/data/kpi-dense-card"
import {
  formatCompactUSD,
  formatNumber,
  formatPercent,
  formatUSD,
} from "@/lib/format"

import type { BenefitValue } from "../lib/result-analytics"
import type { ResultKpis } from "../lib/result-queries"

/**
 * Cómo se escribe un valor según su unidad. El dinero se compacta (una
 * tarjeta densa no aguanta "US$ 3.412.880"), las piezas y los puntos no: un
 * "4,8 K piezas" se lee peor que "4.820 piezas".
 */
function formatBenefit(benefit: BenefitValue): string {
  if (benefit.unit === "money") return formatCompactUSD(benefit.value)
  if (benefit.unit === "points") {
    return `${formatNumber(Math.round(benefit.value))} pts`
  }
  return formatNumber(Math.round(benefit.value))
}

/**
 * Los seis KPI de resultado, con la MISMA tarjeta que el dashboard de
 * Analítica (`components/data/kpi-dense-card`, Figma 02.1 · denso): icono de
 * 13 px junto a la etiqueta, cifra de 22 px con la pill de variación en
 * línea y una sub-fila de caption + sparkline. Antes esta pantalla tenía su
 * propia tarjeta —círculo de color de 40 px, sin sparkline— y las dos
 * analíticas del portal se veían como dos productos distintos.
 *
 * Dos de los seis son DINÁMICOS: el valor del beneficio cambia de unidad
 * según la mecánica (dólares, puntos o piezas) y la eficiencia cambia de
 * métrica según lo que haya evidencia para calcular (ROI → costo por canje →
 * tasa de redención).
 *
 * Solo tres llevan sparkline. Utilización, presupuesto y eficiencia son
 * acumulados o razones sin serie detrás: dibujarles una curva sería
 * inventarles una forma.
 */
export function PromotionsResultKpiRow({ kpis }: { kpis: ResultKpis }) {
  const { benefit, efficiency } = kpis

  const benefitCaption = () => {
    if (!benefit.headline) return "Sin valor medible en el período"
    if (benefit.excluded.length === 0) return benefit.headline.label
    // Decir en voz alta qué NO está sumado: un total que esconde las
    // unidades que dejó fuera se lee como si fuera todo.
    const rest = benefit.excluded
      .map(
        (b) =>
          `${formatBenefit(b)} en ${b.unit === "points" ? "puntos" : "piezas"}`
      )
      .join(" · ")
    return `${benefit.headline.label} · fuera: ${rest}`
  }

  const efficiencyValue = () => {
    if (!efficiency) return "—"
    if (efficiency.metric === "roi")
      return `${formatNumber(efficiency.value)} ×`
    if (efficiency.metric === "cost_per_use") return formatUSD(efficiency.value)
    return formatPercent(efficiency.value)
  }

  // `deltaPct` de la tarjeta densa está en PUNTOS (18.6 = +18,6 %), no en
  // fracción — misma convención que el dashboard de Analítica.
  const asPoints = (fraction: number | null) =>
    fraction === null ? undefined : fraction * 100

  const against = kpis.previousWindowLabel
    ? `vs ${kpis.previousWindowLabel}`
    : "elige un período para comparar"

  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <KpiDenseCard
        icon={ReceiptText}
        label="Beneficios utilizados"
        value={formatNumber(kpis.uses)}
        deltaPct={asPoints(kpis.usesDelta)}
        caption={
          kpis.usesDelta !== null
            ? against
            : `de ${formatNumber(kpis.usesCounter)} en los contadores`
        }
        sparkline={kpis.usesSpark}
      />
      <KpiDenseCard
        icon={Users}
        label="Clientes beneficiados"
        value={formatNumber(kpis.customers)}
        deltaPct={asPoints(kpis.customersDelta)}
        caption={
          kpis.customersDelta !== null ? against : "socios distintos con canje"
        }
        sparkline={kpis.customersSpark}
      />
      <KpiDenseCard
        icon={Percent}
        label="Tasa de utilización"
        value={
          kpis.utilization !== null ? formatPercent(kpis.utilization) : "—"
        }
        caption={
          kpis.utilization !== null
            ? "cupones redimidos sobre entregados"
            : "sin cupones enlazados al filtro"
        }
      />
      <KpiDenseCard
        icon={Gift}
        label="Valor del beneficio"
        value={benefit.headline ? formatBenefit(benefit.headline) : "—"}
        caption={benefitCaption()}
        sparkline={kpis.benefitSpark}
      />
      <KpiDenseCard
        icon={Wallet}
        label="Presupuesto consumido"
        value={
          kpis.consumedBudgetPct !== null
            ? formatPercent(kpis.consumedBudgetPct)
            : "—"
        }
        caption={
          kpis.consumedBudgetPct !== null
            ? `${formatCompactUSD(kpis.consumedBudget)} de ${formatCompactUSD(kpis.assignedBudget)}`
            : "sin presupuesto asignado"
        }
      />
      <KpiDenseCard
        icon={TrendingUp}
        label={efficiency?.label ?? "Eficiencia"}
        value={efficiencyValue()}
        caption={efficiency?.hint ?? "sin datos suficientes"}
        tone="promo"
      />
    </div>
  )
}
