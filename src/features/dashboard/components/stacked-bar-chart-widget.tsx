"use client"

import { CalendarOff, Info } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { EmptyState } from "@/components/feedback/empty-state"
import { cn } from "@/lib/utils"
import type { RedemptionsByBucket } from "../lib/queries"

type Segment = {
  key: keyof Omit<RedemptionsByBucket, "bucket">
  label: string
  colorVar: string
}

/** Mismos tres canales y mismos tokens que `CANAL_COLOR` en `lib/queries.ts` — rampa monocromática del acento, no la paleta categórica (ver CLAUDE.md §8). */
const SEGMENTS: Segment[] = [
  { key: "pos", label: "POS", colorVar: "--channel-pos" },
  { key: "ecommerce", label: "E-commerce", colorVar: "--channel-ecommerce" },
  { key: "app", label: "App", colorVar: "--channel-app" },
]

type StackedBarChartWidgetProps = {
  title: string
  buckets: RedemptionsByBucket[]
  periodTotal: string
  periodCaption: string
  highlightedBucket: string | null
  highlightedCallout: { value: string; deltaPct: number | null } | null
  isEmpty: boolean
  className?: string
}

/**
 * Figma "Widget / Barras apiladas" (733:330 / 734:4430) — "Canjes por mes" en
 * el Figma, pero el título/los buckets ahora se derivan de la ventana activa
 * (`bucketize` en `lib/filters.ts`): con un rango de 7 días serían 7 columnas
 * diarias, no 12 meses fijos. Divergencia honesta: apilado por canal real
 * (pos/ecommerce/app) en vez de las 4 categorías ficticias del mock (ver
 * `lib/queries.ts`). Recharts en vez de math de altura a mano.
 */
export function StackedBarChartWidget({
  title,
  buckets,
  periodTotal,
  periodCaption,
  highlightedBucket,
  highlightedCallout,
  isEmpty,
  className,
}: StackedBarChartWidgetProps) {
  const isNegative = (highlightedCallout?.deltaPct ?? 0) < 0
  const deltaLabel =
    highlightedCallout?.deltaPct != null
      ? `${isNegative ? "↓" : "↑"} ${Math.abs(highlightedCallout.deltaPct).toFixed(1).replace(".", ",")}%`
      : null

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-4 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section",
        className
      )}
    >
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex flex-1 items-center gap-1.5">
          <p className="text-[15px] leading-[21px] font-semibold text-foreground">
            {title}
          </p>
          <Info className="size-[13px] text-muted-foreground" />
        </div>
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: `var(${s.colorVar})` }}
            />
            <span className="text-[11px] leading-[15px] whitespace-nowrap text-muted-foreground">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <p className="text-[28px] leading-[34px] font-bold tracking-[-0.8px] text-foreground">
          {periodTotal}
        </p>
        <p className="text-[13px] leading-[19px] text-muted-foreground">
          {periodCaption}
        </p>
      </div>

      {isEmpty ? (
        <div className="flex h-[240px] w-full items-center justify-center">
          <EmptyState
            icon={CalendarOff}
            title="Sin canjes en el periodo"
            description="Ningún canje registrado en el rango seleccionado. Prueba un periodo más amplio."
            className="py-0"
          />
        </div>
      ) : (
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={buckets}
              margin={{ top: 24, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tick={(props) => {
                  const { x, y, payload } = props
                  const isHighlighted = payload.value === highlightedBucket
                  return (
                    <text
                      x={x}
                      y={Number(y) + 12}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={isHighlighted ? 700 : 400}
                      fill={
                        isHighlighted
                          ? "var(--primary)"
                          : "var(--muted-foreground)"
                      }
                    >
                      {payload.value}
                    </text>
                  )
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                content={({ active, label, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div
                      className="rounded-xl border border-border bg-background px-3 py-2 shadow-form-section"
                      style={{ fontSize: 12 }}
                    >
                      <p className="mb-1.5 font-semibold text-foreground">
                        {label}
                      </p>
                      <div className="flex flex-col gap-1">
                        {[...payload].reverse().map((entry) => (
                          <div
                            key={entry.name}
                            className="flex items-center gap-1.5"
                          >
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">
                              {entry.name}
                            </span>
                            <span className="font-medium text-foreground">
                              : {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }}
              />
              {SEGMENTS.map((segment, i) => (
                <Bar
                  key={segment.key}
                  dataKey={segment.key}
                  name={segment.label}
                  stackId="canjes"
                  fill={`var(${segment.colorVar})`}
                  radius={i === SEGMENTS.length - 1 ? [4, 4, 0, 0] : 0}
                  label={
                    i === SEGMENTS.length - 1
                      ? (props) => {
                          const x = Number(props.x ?? 0)
                          const y = Number(props.y ?? 0)
                          const width = Number(props.width ?? 0)
                          const index = props.index ?? -1
                          if (
                            !highlightedBucket ||
                            !highlightedCallout ||
                            buckets[index]?.bucket !== highlightedBucket
                          )
                            return <g />
                          return (
                            <g
                              transform={`translate(${x + width / 2}, ${y - 14})`}
                            >
                              <rect
                                x={-34}
                                y={-15}
                                width={68}
                                height={20}
                                rx={7}
                                fill="var(--foreground)"
                              />
                              <text
                                y={-1}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={700}
                              >
                                <tspan fill="var(--background)">
                                  {highlightedCallout.value}{" "}
                                </tspan>
                                <tspan fill="var(--success)" fontSize={10}>
                                  {deltaLabel}
                                </tspan>
                              </text>
                            </g>
                          )
                        }
                      : undefined
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
