"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Segmented } from "@/components/filters/segmented"
import { formatCompactUSD, formatNumber, formatUSD } from "@/lib/format"

import {
  TREND_GROUPINGS,
  TREND_METRICS,
  type TrendGrouping,
  type TrendMetric,
} from "../lib/result-analytics"
import type { ResultTrend } from "../lib/result-queries"

const METRIC_LABEL: Record<TrendMetric, string> = {
  usos: "Usos",
  valor: "Valor",
  clientes: "Clientes",
}

const GROUPING_LABEL: Record<TrendGrouping, string> = {
  dia: "Día",
  semana: "Semana",
  mes: "Mes",
}

/**
 * "Evolución del resultado" (spec §9) — la gráfica protagonista.
 *
 * El eje temporal es real: sale de `promocion_eventos.ocurrido_en`, no de un
 * contador de fila. Por eso el selector ofrece **Clientes** donde la spec
 * proponía "Presupuesto": `presupuesto_consumido` no tiene historia, así que
 * dibujarlo como curva inventaría su forma — justo lo que prohíbe la §28 de
 * la propia spec. El presupuesto vive abajo, como acumulado, que es lo que
 * de verdad es.
 */
export function PromotionsResultTrend({ trend }: { trend: ResultTrend }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = useTransition()

  /**
   * `replace` + `scroll: false`: cambiar la métrica de esta gráfica es
   * ajustarla, no navegar. Con `push` cada clic dejaba una entrada en el
   * historial —volver atrás recorría los seis toques anteriores— y sin
   * `scroll: false` la página saltaba al inicio, dejando fuera de vista la
   * gráfica que se estaba ajustando. El valor por defecto se BORRA del
   * query en vez de escribirse, para que la URL compartida no lleve ruido.
   */
  function setParam(key: string, value: string, fallback: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === fallback) params.delete(key)
    else params.set(key, value)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  const formatValue = (value: number) => {
    if (trend.unit === "money") return formatUSD(value)
    if (trend.unit === "points") return `${formatNumber(value)} pts`
    return formatNumber(value)
  }

  const axisFormatter = (value: number) =>
    trend.unit === "money" ? formatCompactUSD(value) : formatNumber(value)

  const total = trend.points.reduce((acc, p) => acc + p.value, 0)

  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[15px] leading-[21px] font-semibold text-foreground">
            Evolución del resultado
          </p>
          <p className="text-xs text-muted-foreground">
            {METRIC_LABEL[trend.metric]} por{" "}
            {GROUPING_LABEL[trend.grouping].toLowerCase()} ·{" "}
            {formatValue(total)} en total
            {isPending && " · actualizando…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            options={TREND_METRICS.map((m) => ({
              value: m,
              label: METRIC_LABEL[m],
            }))}
            value={trend.metric}
            onValueChange={(v) => setParam("metrica", v, "usos")}
          />
          <Segmented
            options={TREND_GROUPINGS.map((g) => ({
              value: g,
              label: GROUPING_LABEL[g],
            }))}
            value={trend.grouping}
            onValueChange={(v) => setParam("agrupacion", v, "semana")}
          />
        </div>
      </div>

      {trend.points.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">
          No hay canjes con bitácora en este período, así que no hay evolución
          que dibujar.
        </p>
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trend.points}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="resultTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--data-indigo)"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--data-indigo)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={axisFormatter}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                formatter={(value) => [
                  formatValue(Number(value)),
                  METRIC_LABEL[trend.metric],
                ]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  background: "var(--background)",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--data-indigo)"
                strokeWidth={2}
                fill="url(#resultTrend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
