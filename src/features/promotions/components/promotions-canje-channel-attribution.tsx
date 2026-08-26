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

import { formatNumber } from "@/lib/format"

import { CHANNEL_SCOPE_LABEL } from "../lib/labels"
import type { PromotionChannelAttributionItem } from "../lib/queries"

const SEGMENT_COLOR_VAR = ["--data-teal", "--data-indigo"]

type PromotionsCanjeChannelAttributionProps = {
  items: PromotionChannelAttributionItem[]
}

/**
 * Adaptado de "Atribución de canjes" (Analítica de Loyalty.dc.html), con
 * `canal` real del evento (`promocion_eventos.canal`) — solo POS/E-commerce,
 * no los 3 canales del mock (no hay canal "App" real en este schema, ver
 * `ChannelAttributionWidget` de `features/dashboard` para el mismo criterio
 * de divergencia honesta).
 */
export function PromotionsCanjeChannelAttribution({
  items,
}: PromotionsCanjeChannelAttributionProps) {
  const isEmpty = items.length === 0
  const row: Record<string, string | number> = { category: "canjes" }
  for (const item of items) row[item.canal] = item.pct

  return (
    <div className="flex w-full flex-col items-start gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex w-full items-center gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold text-foreground">
            Atribución de canjes
          </p>
          <p className="text-[11px] leading-[15px] text-muted-foreground">
            Por canal del evento
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
              {items.map((item, i) => (
                <Bar
                  key={item.canal}
                  dataKey={item.canal}
                  stackId="canal"
                  fill={`var(${SEGMENT_COLOR_VAR[i % SEGMENT_COLOR_VAR.length]})`}
                  radius={[
                    i === 0 ? 8 : 0,
                    i === items.length - 1 ? 8 : 0,
                    i === items.length - 1 ? 8 : 0,
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
        {items.map((item, i) => (
          <div
            key={item.canal}
            className="flex w-full items-center gap-2.5 text-xs"
          >
            <span
              className="size-2 shrink-0 rounded-[3px]"
              style={{
                backgroundColor: `var(${SEGMENT_COLOR_VAR[i % SEGMENT_COLOR_VAR.length]})`,
              }}
            />
            <span className="text-secondary-foreground">
              {CHANNEL_SCOPE_LABEL[item.canal]}
            </span>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">
              {formatNumber(item.count)}
            </span>
            <span className="w-11 text-right font-semibold text-foreground">
              {item.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
