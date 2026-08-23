"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

import { BUILDER_BLOCKS, BUILDER_GROUP_META } from "@/config/builder-blocks"
import { cn } from "@/lib/utils"
import { BUILDER_ENTRY_NODE_TIPOS, type BuilderNodeTipo } from "@/types/domain"

export type BuilderNodeData = {
  tipo: BuilderNodeTipo
  etiqueta: string
  config: Record<string, unknown>
  /** Conteos de la última corrida de Simular — solo presentational, no se persiste con el grafo. */
  simulacion?: {
    conteoEntrada: number
    salidas: { port: string; conteo: number }[]
  }
}

/**
 * Puertos de salida dinámicos: `ramificacion_valor`/`split_ab` leen las
 * ramas que el usuario definió en la pestaña "Ramas" del inspector
 * (`config.ramas: {id, etiqueta}[]`) — si todavía no configuró ninguna,
 * caen a un placeholder de 2 salidas para que el nodo siga siendo
 * conectable mientras tanto. `condicion_multiple` NO es dinámico: su
 * salida es intrínsecamente binaria (cumple/no cumple el árbol de
 * condiciones), así que se queda fija.
 */
function ramasDeConfig(
  config: Record<string, unknown>
): { id: string; label: string }[] | null {
  const ramas = config.ramas
  if (!Array.isArray(ramas) || ramas.length === 0) return null
  return ramas
    .filter(
      (r): r is { id: string; etiqueta: string } =>
        !!r &&
        typeof r === "object" &&
        typeof (r as Record<string, unknown>).id === "string" &&
        typeof (r as Record<string, unknown>).etiqueta === "string"
    )
    .map((r) => ({ id: r.id, label: r.etiqueta }))
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
  Record<BuilderNodeTipo, { id: string; label: string }[]>
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
const RAMAS_DINAMICAS: readonly BuilderNodeTipo[] = [
  "ramificacion_valor",
  "split_ab",
]

/** Etiquetas humanas de los puertos de salida de un nodo — misma fuente que usa el canvas del editor, reutilizada por la analítica (08.3) para las píldoras "vino de…". */
export function outputsDeNodo(
  tipo: BuilderNodeTipo,
  config: Record<string, unknown>
): { id: string; label: string }[] {
  const ramasConfig = RAMAS_DINAMICAS.includes(tipo)
    ? ramasDeConfig(config ?? {})
    : null
  return ramasConfig ?? OUTPUT_HANDLES[tipo] ?? DEFAULT_OUTPUT
}

export function BuilderNode({
  data,
  selected,
}: NodeProps & { data: BuilderNodeData }) {
  const meta = BUILDER_BLOCKS[data.tipo]
  const grupoMeta = BUILDER_GROUP_META[meta.grupo]
  const Icon = meta.icono
  const esEntrada = (BUILDER_ENTRY_NODE_TIPOS as readonly string[]).includes(
    data.tipo
  )
  const outputs = outputsDeNodo(data.tipo, data.config ?? {})

  return (
    <div
      className={cn(
        "w-[240px] rounded-2xl border bg-background shadow-form-section",
        selected ? "border-primary" : "border-border"
      )}
    >
      {!esEntrada && (
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
            grupoMeta.bgClassName
          )}
        >
          <Icon className={cn("size-3.5", grupoMeta.fgClassName)} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] leading-[14px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
            {grupoMeta.etiqueta}
          </p>
          <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
            {data.etiqueta}
          </p>
        </div>
        {data.simulacion && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
            {data.simulacion.conteoEntrada.toLocaleString("es-CO")}
          </span>
        )}
      </div>

      {outputs.length > 1 && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
          {outputs.map((output) => {
            const conteo = data.simulacion?.salidas.find(
              (s) => s.port === output.id
            )?.conteo
            return (
              <div
                key={output.id}
                className="relative flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground"
              >
                {output.label}
                {typeof conteo === "number" && (
                  <span className="font-semibold text-foreground">
                    {conteo.toLocaleString("es-CO")}
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
