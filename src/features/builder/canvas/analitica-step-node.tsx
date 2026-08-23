"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

import { BUILDER_BLOCKS, BUILDER_GROUP_META } from "@/config/builder-blocks"
import { formatNumero } from "@/lib/format"
import { cn } from "@/lib/utils"
import { BUILDER_ENTRY_NODE_TIPOS, type BuilderNodeTipo } from "@/types/domain"

export type AnaliticaStepData = {
  tipo: BuilderNodeTipo
  etiqueta: string
  /** % = conteoEntrada de este nodo / entradas del nodo de entrada — el mismo criterio en cada tarjeta, por eso el nodo de entrada y cualquier bloque sin fuga muestran 100%. */
  conteoEntrada: number | undefined
  pct: number | undefined
  ramaEntrante: { etiqueta: string; conteo: number } | null
  puertosSalida: string[]
  esMayorCaida: boolean
}

export function AnaliticaStepNode({
  data,
}: NodeProps & { data: AnaliticaStepData }) {
  const meta = BUILDER_BLOCKS[data.tipo]
  const grupoMeta = BUILDER_GROUP_META[meta.grupo]
  const Icon = meta.icono
  const esEntrada = (BUILDER_ENTRY_NODE_TIPOS as readonly string[]).includes(
    data.tipo
  )

  return (
    <div className="flex w-[300px] flex-col items-center gap-2.5">
      {data.ramaEntrante && (
        <div className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
          {data.ramaEntrante.etiqueta} ·{" "}
          {formatNumero(data.ramaEntrante.conteo)}
        </div>
      )}

      <div
        className={cn(
          "relative flex w-full flex-col gap-3 rounded-2xl border bg-background p-4 shadow-form-section",
          data.esMayorCaida ? "border-warning" : "border-border"
        )}
      >
        {!esEntrada && (
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
              grupoMeta.bgClassName
            )}
          >
            <Icon className={cn("size-4", grupoMeta.fgClassName)} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] leading-[14px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
              {grupoMeta.etiqueta}
            </p>
            <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
              {data.etiqueta}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl leading-7 font-bold text-foreground">
            {typeof data.conteoEntrada === "number"
              ? formatNumero(data.conteoEntrada)
              : "—"}
          </p>
          {typeof data.pct === "number" && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                data.esMayorCaida
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
              data.esMayorCaida ? "bg-warning" : "bg-primary"
            )}
            style={{ width: `${String(Math.min(data.pct ?? 0, 100))}%` }}
          />
        </div>

        {data.puertosSalida.map((puertoId, i) => (
          <Handle
            key={puertoId}
            type="source"
            id={puertoId}
            position={Position.Bottom}
            style={{
              left: `${String(((i + 1) / (data.puertosSalida.length + 1)) * 100)}%`,
            }}
            className="!size-2.5 !border-2 !border-background !bg-border-strong"
          />
        ))}
      </div>
    </div>
  )
}
