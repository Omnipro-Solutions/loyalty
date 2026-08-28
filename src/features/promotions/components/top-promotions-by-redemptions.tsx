"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatNumber, formatUSD } from "@/lib/format"

import type { TopPromotionTrendSeries } from "../lib/queries"

const SERIES_COLOR_VAR = [
  "--data-violet",
  "--data-teal",
  "--data-amber",
  "--data-coral",
  "--data-navy",
  "--data-indigo",
]

/**
 * Las promociones que más se canjean, como serie semanal. Antes era una
 * lista ordenada: decía quién iba primero, pero no si iba subiendo o
 * cayendo — y esa es la parte que decide si hay que hacer algo esta semana.
 *
 * El pie de la tarjeta cierra cada serie con lo que hace falta para
 * juzgarla: canjes de la muestra y **retorno** (venta asociada sobre
 * inversión). Deliberadamente NO es una tasa de conversión canjes/expuestos
 * como en el patrón de referencia: no existen impresiones en el schema, así
 * que esa tasa no tendría denominador real y sería un número inventado con
 * aspecto de medición.
 */
export function TopPromotionsByRedemptions({
  weeks,
  series,
}: {
  weeks: { weekKey: string; weekLabel: string }[]
  series: TopPromotionTrendSeries[]
}) {
  if (series.length === 0) {
    return (
      <div className="flex w-full flex-col items-start gap-1.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
        <p className="text-sm leading-5 font-semibold text-foreground">
          Top promociones por canjes
        </p>
        <p className="text-[11px] leading-[15px] text-muted-foreground">
          Ninguna promoción registra canjes en la bitácora todavía.
        </p>
      </div>
    )
  }

  const data = weeks.map((week) => {
    const point: Record<string, string | number> = { week: week.weekLabel }
    for (const s of series) point[s.id] = s.counts[week.weekKey] ?? 0
    return point
  })

  return (
    <div className="flex w-full flex-col gap-4 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">
            Top promociones por canjes
          </p>
          <p className="text-xs text-muted-foreground">
            Canjes de la bitácora · semanal
          </p>
        </div>
        <div className="flex flex-wrap gap-3.5 text-xs text-secondary-foreground">
          {series.map((s, i) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: `var(${SERIES_COLOR_VAR[i % SERIES_COLOR_VAR.length]})`,
                }}
              />
              <span className="max-w-[160px] truncate">{s.nombre}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid
              strokeDasharray="3 4"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border-strong)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                fontSize: 12,
                boxShadow: "var(--shadow-form-section)",
              }}
            />
            {series.map((s, i) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={s.nombre}
                stroke={`var(${SERIES_COLOR_VAR[i % SERIES_COLOR_VAR.length]})`}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 border-t border-muted pt-3">
        {series.map((s, i) => (
          <div key={s.id} className="flex flex-col gap-0.5">
            <p
              className="truncate text-[11px]"
              style={{
                color: `var(${SERIES_COLOR_VAR[i % SERIES_COLOR_VAR.length]})`,
              }}
              title={s.nombre}
            >
              {s.nombre}
            </p>
            <p className="text-base font-semibold text-foreground">
              {formatNumber(s.canjes)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {s.retorno !== null
                ? `Retorno ${s.retorno.toFixed(1)}× · ${formatUSD(s.inversion)}`
                : `${formatUSD(s.inversion)} de inversión`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
