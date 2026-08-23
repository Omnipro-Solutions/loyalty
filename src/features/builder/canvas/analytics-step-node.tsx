"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

import { BUILDER_BLOCKS, BUILDER_GROUP_META } from "@/config/builder-blocks"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { BUILDER_ENTRY_NODE_TYPES, type BuilderNodeType } from "@/types/domain"

export type AnalyticsStepData = {
  tipo: BuilderNodeType
  etiqueta: string
  /** % = entryCount de este nodo / entradas del nodo de entrada — el mismo criterio en cada tarjeta, por eso el nodo de entrada y cualquier bloque sin fuga muestran 100%. */
  entryCount: number | undefined
  pct: number | undefined
  incomingBranch: { label: string; count: number } | null
  outputPorts: string[]
  isBiggestDrop: boolean
}

export function AnalyticsStepNode({
  data,
}: NodeProps & { data: AnalyticsStepData }) {
  const meta = BUILDER_BLOCKS[data.tipo]
  const groupMeta = BUILDER_GROUP_META[meta.group]
  const Icon = meta.icon
  const isEntry = (BUILDER_ENTRY_NODE_TYPES as readonly string[]).includes(
    data.tipo
  )

  return (
    <div className="flex w-[300px] flex-col items-center gap-2.5">
      {data.incomingBranch && (
        <div className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
          {data.incomingBranch.label} ·{" "}
          {formatNumber(data.incomingBranch.count)}
        </div>
      )}

      <div
        className={cn(
          "relative flex w-full flex-col gap-3 rounded-2xl border bg-background p-4 shadow-form-section",
          data.isBiggestDrop ? "border-warning" : "border-border"
        )}
      >
        {!isEntry && (
          <Handle
            type="target"
            position={Position.Top}
            className="!size-2.5 !border-2 !border-background !bg-border-strong"
          />
        )}

        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              groupMeta.bgClassName
            )}
          >
            <Icon className={cn("size-4", groupMeta.fgClassName)} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] leading-[14px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
              {groupMeta.label}
            </p>
            <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
              {data.etiqueta}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl leading-7 font-bold text-foreground">
            {typeof data.entryCount === "number"
              ? formatNumber(data.entryCount)
              : "—"}
          </p>
          {typeof data.pct === "number" && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                data.isBiggestDrop
                  ? "bg-warning-bg text-warning"
                  : "bg-muted text-foreground"
              )}
            >
              {data.pct}%
            </span>
          )}
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full",
              data.isBiggestDrop ? "bg-warning" : "bg-primary"
            )}
            style={{ width: `${String(Math.min(data.pct ?? 0, 100))}%` }}
          />
        </div>

        {data.outputPorts.map((portId, i) => (
          <Handle
            key={portId}
            type="source"
            id={portId}
            position={Position.Bottom}
            style={{
              left: `${String(((i + 1) / (data.outputPorts.length + 1)) * 100)}%`,
            }}
            className="!size-2.5 !border-2 !border-background !bg-border-strong"
          />
        ))}
      </div>
    </div>
  )
}
