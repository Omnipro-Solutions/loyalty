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

import { COST_NATURE_LABEL } from "../lib/labels"
import type { BudgetByCostNature } from "../lib/queries"

type PromotionsBudgetByCostNatureProps = {
  items: BudgetByCostNature[]
  className?: string
}

/**
 * Duplicado de `PromotionsBudgetByFinancier` (misma barra apilada Recharts
 * + leyenda), agrupado por `naturaleza_costo` en vez de `financiador` — a
 * qué cuenta contable golpea el presupuesto (margen sacrificado, costo de
 * producto, saldo en efectivo…), no quién lo financia.
 */
export function PromotionsBudgetByCostNature({
  items,
  className,
}: PromotionsBudgetByCostNatureProps) {
  const isEmpty = items.length === 0
  const row: Record<string, string | number> = { category: "presupuesto" }
  for (const item of items) row[item.naturaleza] = item.pct

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
            Presupuesto por naturaleza contable
          </p>
          <p className="text-[11px] leading-[15px] text-muted-foreground">
            A qué cuenta contable golpea el presupuesto asignado
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted py-1.5 pr-2.5 pl-[11px]">
          <span className="text-[11px] leading-[15px] font-medium text-muted-foreground">
            Naturaleza
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
                  key={item.naturaleza}
                  dataKey={item.naturaleza}
                  stackId="naturaleza"
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
            key={item.naturaleza}
            className="flex w-full items-center gap-2.5"
          >
            <span
              className="size-[9px] shrink-0 rounded-[3px]"
              style={{ backgroundColor: `var(${item.colorVar})` }}
            />
            <p className="min-w-0 flex-1 truncate text-xs leading-[17px] text-secondary-foreground">
              {COST_NATURE_LABEL[item.naturaleza]}
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
