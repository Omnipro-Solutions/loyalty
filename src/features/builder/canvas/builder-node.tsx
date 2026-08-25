"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { AlertTriangle } from "lucide-react"

import { BUILDER_BLOCKS, BUILDER_GROUP_META } from "@/config/builder-blocks"
import {
  connectedMessageProviders,
  findFlow,
  isMessageNodeType,
} from "@/config/integration-flows"
import { validateNodeConfig } from "@/features/builder/inspector/schemas"
import { cn } from "@/lib/utils"
import { BUILDER_ENTRY_NODE_TYPES, type BuilderNodeType } from "@/types/domain"

export type BuilderNodeData = {
  tipo: BuilderNodeType
  etiqueta: string
  config: Record<string, unknown>
  /** Conteos de la última corrida de Simular — solo presentational, no se persiste con el grafo. */
  simulacion?: {
    entryCount: number
    outputs: { port: string; count: number }[]
  }
}

/**
 * Puertos de salida dinámicos: `ramificacion_valor`/`split_ab` leen las
 * ramas que el usuario definió en la pestaña "Ramas" del inspector
 * (`config.branches: {id, label}[]`) — si todavía no configuró ninguna,
 * caen a un placeholder de 2 salidas para que el nodo siga siendo
 * conectable mientras tanto. `condicion_multiple` NO es dinámico: su
 * salida es intrínsecamente binaria (cumple/no cumple el árbol de
 * condiciones), así que se queda fija.
 */
function branchesFromConfig(
  config: Record<string, unknown>
): { id: string; label: string }[] | null {
  const branches = config.branches
  if (!Array.isArray(branches) || branches.length === 0) return null
  return branches
    .filter(
      (r): r is { id: string; label: string } =>
        !!r &&
        typeof r === "object" &&
        typeof (r as Record<string, unknown>).id === "string" &&
        typeof (r as Record<string, unknown>).label === "string"
    )
    .map((r) => ({ id: r.id, label: r.label }))
}

/**
 * Puertos de salida nombrados por tipo (ver comentario de `workflow_edges`
 * en la migración): los de lógica ramifican, `acumular_puntos` además
 * expone "tope alcanzado". El resto de nodos usa un único puerto `out`.
 * Los nodos de ramificación aquí muestran un set FIJO de 2 salidas de
 * ejemplo ("rama_1" + "por_defecto") — la paleta real de ramas (agregar/
 * quitar, atributo evaluado) es trabajo del inspector, que construye el
 * siguiente fork; esto es solo para que el canvas tenga algo conectable
 * mientras tanto.
 */
export const OUTPUT_HANDLES: Partial<
  Record<BuilderNodeType, { id: string; label: string }[]>
> = {
  condicion_multiple: [
    { id: "cumple", label: "Cumple" },
    { id: "no_cumple", label: "No cumple" },
  ],
  ramificacion_valor: [
    { id: "rama_1", label: "Rama 1" },
    { id: "por_defecto", label: "Por defecto" },
  ],
  split_ab: [
    { id: "rama_1", label: "Variante A" },
    { id: "por_defecto", label: "Variante B" },
  ],
  acumular_puntos: [
    { id: "out", label: "Siguiente" },
    { id: "tope_alcanzado", label: "Tope alcanzado" },
  ],
  fin_workflow: [],
}

const DEFAULT_OUTPUT = [{ id: "out", label: "" }]
const DYNAMIC_BRANCHES: readonly BuilderNodeType[] = [
  "ramificacion_valor",
  "split_ab",
]

/** Etiquetas humanas de los puertos de salida de un nodo — misma fuente que usa el canvas del editor, reutilizada por la analítica (08.3) para las píldoras "vino de…". */
export function outputsForNode(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): { id: string; label: string }[] {
  const branchesConfig = DYNAMIC_BRANCHES.includes(tipo)
    ? branchesFromConfig(config ?? {})
    : null
  return branchesConfig ?? OUTPUT_HANDLES[tipo] ?? DEFAULT_OUTPUT
}

/**
 * Proveedor + flujo elegidos en un bloque de mensajería (`email`/`push`/
 * `sms_whatsapp`), para mostrarlo al pie del nodo — sin esto la integración
 * es invisible desde el canvas y hay que abrir cada nodo para saber a dónde
 * despacha. `null` si el tipo no es de mensajería o todavía no tiene flujo
 * elegido (bloque a medio configurar).
 */
function messageFlowSummary(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): { logo: string; flowName: string } | null {
  if (!isMessageNodeType(tipo)) return null
  const flowId = config.flujo_id
  if (typeof flowId !== "string") return null
  const flow = findFlow(flowId)
  if (!flow) return null
  const provider = connectedMessageProviders(tipo).find(
    (p) => p.integrationId === flow.integrationId
  )
  if (!provider) return null
  return { logo: provider.logo, flowName: flow.name }
}

export function BuilderNode({
  data,
  selected,
}: NodeProps & { data: BuilderNodeData }) {
  const meta = BUILDER_BLOCKS[data.tipo]
  const groupMeta = BUILDER_GROUP_META[meta.group]
  const Icon = meta.icon
  const isEntry = (BUILDER_ENTRY_NODE_TYPES as readonly string[]).includes(
    data.tipo
  )
  const outputs = outputsForNode(data.tipo, data.config ?? {})
  const flowSummary = messageFlowSummary(data.tipo, data.config ?? {})
  const missingFields = validateNodeConfig(data.tipo, data.config ?? {})

  return (
    <div
      className={cn(
        "w-[240px] rounded-2xl border bg-background shadow-form-section",
        selected ? "border-primary" : "border-border"
      )}
    >
      {!isEntry && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-2.5 !border-2 !border-background !bg-border-strong"
        />
      )}

      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            groupMeta.bgClassName
          )}
        >
          <Icon className={cn("size-3.5", groupMeta.fgClassName)} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] leading-[14px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
            {groupMeta.label}
          </p>
          <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
            {data.etiqueta}
          </p>
        </div>
        {missingFields.length > 0 && (
          <span
            title={`Faltan campos obligatorios: ${missingFields.join(", ")}.`}
            className="flex shrink-0 items-center justify-center"
          >
            <AlertTriangle className="size-3.5 text-warning" />
          </span>
        )}
        {data.simulacion && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {data.simulacion.entryCount.toLocaleString("es-CO")}
          </span>
        )}
      </div>

      {flowSummary && (
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 14px, no vale next/image. */}
          <img src={flowSummary.logo} alt="" className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
            {flowSummary.flowName}
          </span>
        </div>
      )}

      {outputs.length > 1 && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
          {outputs.map((output) => {
            const count = data.simulacion?.outputs.find(
              (s) => s.port === output.id
            )?.count
            return (
              <div
                key={output.id}
                className="relative flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground"
              >
                {output.label}
                {typeof count === "number" && (
                  <span className="font-semibold text-foreground">
                    {count.toLocaleString("es-CO")}
                  </span>
                )}
                <Handle
                  type="source"
                  id={output.id}
                  position={Position.Right}
                  className="!static !size-2.5 !translate-x-0 !translate-y-0 !border-2 !border-background !bg-border-strong"
                />
              </div>
            )
          })}
        </div>
      )}

      {outputs.length === 1 && (
        <Handle
          type="source"
          id={outputs[0].id}
          position={Position.Right}
          className="!size-2.5 !border-2 !border-background !bg-border-strong"
        />
      )}
    </div>
  )
}
