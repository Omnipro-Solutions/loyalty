"use client"

import { ChevronDown } from "lucide-react"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import type { RealChannelAttribution } from "../lib/queries"

type ChannelAttributionWidgetProps = {
  channels: RealChannelAttribution[]
  /** Histórico completo por diseño (no acotado por la ventana de fecha) — sólo respeta el filtro de segmento. */
  subtitle: string
  isEmpty: boolean
  className?: string
}

/**
 * Figma "Widget / Atribución por canal" (732:399) — "Atribución de canjes".
 * Divergencia honesta: 3 canales reales (pos/ecommerce/app) en vez de las 5
 * categorías de marketing del mock — ver `lib/queries.ts`. La barra
 * segmentada usa Recharts (una fila, un `Bar` apilado por canal); la lista
 * de abajo es HTML simple, más legible que forzarla dentro del SVG. El pill
 * "Canal" con su chevron es decorativo — no abre nada, no es un control roto.
 */
export function ChannelAttributionWidget({
  channels,
  subtitle,
  isEmpty,
  className,
}: ChannelAttributionWidgetProps) {
  const row: Record<string, string | number> = { category: "canjes" }
  for (const c of channels) row[c.name] = c.pct

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section",
        className
      )}
    >
      <div className="flex w-full items-center gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold text-foreground">
            Atribución de canjes
          </p>
          <p className="text-[11px] leading-[15px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted py-1.5 pr-2.5 pl-[11px]">
          <span className="text-[11px] leading-[15px] font-medium text-muted-foreground">
            Canal
          </span>
          <ChevronDown className="size-2.5 text-muted-foreground" />
        </div>
      </div>

      {isEmpty ? (
        <div className="h-[34px] w-full rounded-lg bg-muted" />
      ) : (
        <div className="h-[34px] w-full">
          <ResponsiveContainer width="100%" height={34}>
            <BarChart
              layout="vertical"
              data={[row]}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="category" hide />
              <Tooltip
                cursor={false}
                formatter={(value) => `${value}%`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  boxShadow: "var(--shadow-form-section)",
                }}
              />
              {channels.map((channel, i) => (
                <Bar
                  key={channel.name}
                  dataKey={channel.name}
                  stackId="atribucion"
                  fill={`var(${channel.colorVar})`}
                  radius={[
                    i === 0 ? 8 : 0,
                    i === channels.length - 1 ? 8 : 0,
                    i === channels.length - 1 ? 8 : 0,
                    i === 0 ? 8 : 0,
                  ]}
                  barSize={34}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex w-full flex-col gap-2">
        {channels.map((channel) => (
          <div key={channel.name} className="flex w-full items-center gap-2.5">
            <span
              className="size-[9px] shrink-0 rounded-[3px]"
              style={{ backgroundColor: `var(${channel.colorVar})` }}
            />
            <p className="min-w-0 flex-1 truncate text-xs leading-[17px] text-secondary-foreground">
              {channel.name}
            </p>
            <p className="text-[11px] leading-[15px] text-muted-foreground">
              {channel.count}
            </p>
            <p className="w-9 text-right text-xs leading-[17px] font-semibold text-foreground">
              {channel.pct}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
