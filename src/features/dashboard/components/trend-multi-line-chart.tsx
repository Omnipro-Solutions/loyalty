"use client"

import { Info } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import type { TrendSeries } from "../lib/mock-data"

const numberFormat = new Intl.NumberFormat("es-CO")

type TrendMultiLineChartProps = {
  title: string
  bigValue: string
  bigValueCaption: string
  xLabels: string[]
  series: TrendSeries[]
  /** Dos series en escalas distintas (ej. conteo vs. moneda) — cada una con su propio eje. */
  dualAxis?: boolean
  className?: string
}

/**
 * Figma "Widget / Líneas múltiples" (733:431 / 1032:4326). Recharts en vez
 * de SVG a mano: maneja ejes, tooltip y proporciones reales sin
 * reimplementar esa matemática — estilizado con los tokens de
 * `globals.css`, no con los colores por defecto de la librería.
 */
export function TrendMultiLineChart({
  title,
  bigValue,
  bigValueCaption,
  xLabels,
  series,
  dualAxis = false,
  className,
}: TrendMultiLineChartProps) {
  const data = xLabels.map((label, i) => {
    const point: Record<string, string | number> = { label }
    for (const s of series) point[s.name] = s.values[i] ?? 0
    return point
  })

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
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: `var(${s.colorVar})` }}
            />
            <span className="text-[11px] leading-[15px] whitespace-nowrap text-muted-foreground">
              {s.name}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <p className="text-[28px] leading-[34px] font-bold tracking-[-0.8px] text-foreground">
          {bigValue}
        </p>
        <p className="text-[13px] leading-[19px] text-muted-foreground">
          {bigValueCaption}
        </p>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              vertical
              horizontal={false}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              dy={8}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickFormatter={(value: number) => numberFormat.format(value)}
            />
            {dualAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={36}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(value: number) => numberFormat.format(value)}
              />
            )}
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              formatter={(value) => numberFormat.format(Number(value))}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                fontSize: 12,
                boxShadow: "var(--shadow-form-section)",
              }}
            />
            {series.map((s, i) => (
              <Line
                key={s.name}
                yAxisId={dualAxis && i > 0 ? "right" : "left"}
                type="monotone"
                dataKey={s.name}
                stroke={`var(${s.colorVar})`}
                strokeWidth={2}
                dot={{
                  r: 4,
                  fill: "var(--background)",
                  stroke: `var(${s.colorVar})`,
                  strokeWidth: 2,
                }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
