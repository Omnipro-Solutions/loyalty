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

import { formatNumber } from "@/lib/format"
import type { PromotionType } from "@/types/domain"

import { PROMOTION_TYPE_LABEL } from "../lib/labels"
import type { PromotionCanjesTrendRow } from "../lib/queries"

const SERIES_COLOR_VAR = [
  "--data-indigo",
  "--data-teal",
  "--data-amber",
  "--data-violet",
  "--data-coral",
  "--data-navy",
]

type PromotionsCanjesTrendProps = {
  rows: PromotionCanjesTrendRow[]
  tipos: PromotionType[]
}

/**
 * "Canjes por semana" — adaptado de "Conversión por tipo de regla" (Analítica
 * de Loyalty.dc.html), pero con conteo absoluto real en vez de una tasa de
 * conversión: no hay "expuestos" (impresiones) en el schema, así que una
 * tasa canjes/expuestos no tiene denominador real que calcular. Usa
 * `promocion_eventos.ocurrido_en` real (ver `getPromotionCanjesTrend`) —
 * volumen de la muestra sembrada, no de producción.
 */
export function PromotionsCanjesTrend({
  rows,
  tipos,
}: PromotionsCanjesTrendProps) {
  const isEmpty = rows.length === 0 || tipos.length === 0

  const data = rows.map((row) => {
    const point: Record<string, string | number> = { week: row.weekLabel }
    for (const tipo of tipos) point[tipo] = row.counts[tipo] ?? 0
    return point
  })

  const totals = tipos.map((tipo) => ({
    tipo,
    total: rows.reduce((acc, row) => acc + (row.counts[tipo] ?? 0), 0),
  }))

  return (
    <div className="flex w-full flex-col gap-4 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">
            Canjes por semana
          </p>
          <p className="text-xs text-muted-foreground">
            Por tipo de promoción · semanal
          </p>
        </div>
        <div className="flex flex-wrap gap-3.5 text-xs text-secondary-foreground">
          {tipos.map((tipo, i) => (
            <span key={tipo} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: `var(${SERIES_COLOR_VAR[i % SERIES_COLOR_VAR.length]})`,
                }}
              />
              {PROMOTION_TYPE_LABEL[tipo]}
            </span>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex h-[220px] w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
          Sin canjes registrados en la muestra todavía.
        </div>
      ) : (
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
              {tipos.map((tipo, i) => (
                <Line
                  key={tipo}
                  type="monotone"
                  dataKey={tipo}
                  name={PROMOTION_TYPE_LABEL[tipo]}
                  stroke={`var(${SERIES_COLOR_VAR[i % SERIES_COLOR_VAR.length]})`}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!isEmpty && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 border-t border-muted pt-3">
          {totals.map(({ tipo, total }) => (
            <div key={tipo} className="flex flex-col gap-0.5">
              <p className="text-[11px] text-muted-foreground">
                {PROMOTION_TYPE_LABEL[tipo]}
              </p>
              <p className="text-base font-semibold text-foreground">
                {formatNumber(total)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                canjes en la muestra
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
