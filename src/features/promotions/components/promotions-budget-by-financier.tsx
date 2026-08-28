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

import { formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import { FINANCIADOR_LABEL } from "../lib/labels"
import type { BudgetByFinancier } from "../lib/queries"

type PromotionsBudgetByFinancierProps = {
  items: BudgetByFinancier[]
  className?: string
}

/**
 * Duplicado de `features/dashboard/components/channel-attribution-widget.tsx`
 * (aislamiento entre features, CLAUDE.md §2) — mismo patrón (barra apilada
 * Recharts + leyenda), con `financiador` real en vez de canal. El pill
 * "Financiador" con su chevron es decorativo, igual que "Canal" en el
 * original — no abre nada.
 */
export function PromotionsBudgetByFinancier({
  items,
  className,
}: PromotionsBudgetByFinancierProps) {
  const isEmpty = items.length === 0
  const row: Record<string, string | number> = { category: "presupuesto" }
  for (const item of items) row[item.financiador] = item.pct

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-start gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section",
        className
      )}
    >
      <div className="flex w-full items-center gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold text-foreground">
            Presupuesto por financiador
          </p>
          <p className="text-[11px] leading-[15px] text-muted-foreground">
            Quién financia el presupuesto asignado
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted py-1.5 pr-2.5 pl-[11px]">
          <span className="text-[11px] leading-[15px] font-medium text-muted-foreground">
            Financiador
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
                  key={item.financiador}
                  dataKey={item.financiador}
                  stackId="financiador"
                  fill={`var(${item.colorVar})`}
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
        {items.map((item) => (
          <div
            key={item.financiador}
            className="flex w-full items-center gap-2.5"
          >
            <span
              className="size-[9px] shrink-0 rounded-[3px]"
              style={{ backgroundColor: `var(${item.colorVar})` }}
            />
            <p className="min-w-0 flex-1 truncate text-xs leading-[17px] text-secondary-foreground">
              {FINANCIADOR_LABEL[item.financiador]}
            </p>
            <p className="text-[11px] leading-[15px] text-muted-foreground">
              {formatUSD(item.amount)}
            </p>
            <p className="w-9 text-right text-xs leading-[17px] font-semibold text-foreground">
              {item.pct}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
