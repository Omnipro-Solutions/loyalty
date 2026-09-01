"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { AlertTriangle, Braces } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { BUILDER_BLOCKS, BUILDER_GROUP_META } from "@/config/builder-blocks"
import {
  outputPortsFor,
  STATIC_OUTPUT_PORTS,
  type PortTone,
} from "@/config/builder-ports"
import {
  connectedMessageProviders,
  findFlow,
  isMessageNodeType,
} from "@/config/integration-flows"
import { nodeProse } from "@/features/builder/engine/rule-reading"
import {
  nodeLogicLines,
  NODE_LOGIC_KEYWORDS,
} from "@/features/builder/inspector/node-logic"
import { validateNodeConfig } from "@/features/builder/inspector/schemas"
import { cn } from "@/lib/utils"
import { BUILDER_ENTRY_NODE_TYPES, type BuilderNodeType } from "@/types/domain"

import { configSummaryFor } from "./node-config-summary"

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
 * Significado semántico de un puerto de salida — pinta el punto del handle,
 * la etiqueta y la arista que sale de él con el mismo token (reusa
 * `success`/`warning`/`destructive` de `globals.css`, los mismos 3 que ya
 * usa `Badge`— sin paleta nueva). `undefined` = neutro (gris, el mismo
 * look de siempre): ramas dinámicas (`ramificacion_valor`/`split_ab`) y el
 * puerto único `out` de la mayoría de bloques no tienen una lectura
 * positiva/negativa real, así que se quedan sin tono.
 */
export type { PortTone }

/**
 * Puertos de salida y sus etiquetas — reexportados desde
 * `config/builder-ports.ts`, la fuente única que comparten el canvas y
 * `validation/graph-validation.ts`. Antes la tabla vivía aquí y estaba
 * repetida a mano en la validación; con los 5 puertos de
 * `revertir_beneficios` una divergencia dejó de ser teórica.
 */
export {
  STATIC_OUTPUT_PORTS as OUTPUT_HANDLES,
  outputPortsFor as outputsForNode,
}

const TONE_DOT_CLASS: Record<PortTone, string> = {
  success: "!bg-success",
  warning: "!bg-warning",
  destructive: "!bg-destructive",
}

const TONE_TEXT_CLASS: Record<PortTone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
}

/** Color de la arista que sale de un puerto con tono — reutilizado por `journey-editor.tsx` para pintar la conexión completa, no solo el punto del handle. */
export const TONE_EDGE_CLASS: Record<PortTone, string> = {
  success: "!stroke-success",
  warning: "!stroke-warning",
  destructive: "!stroke-destructive",
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

/**
 * Resalta las palabras clave del pseudocódigo. Se parte por token para no
 * tocar el resto de la línea (un nombre de variable puede contener "on" o
 * "if" y no debe resaltarse), y se ordena de más larga a más corta para que
 * "WAIT UNTIL" gane a "WAIT".
 */
const KEYWORD_PATTERN = new RegExp(
  `\\b(${[...NODE_LOGIC_KEYWORDS].sort((a, b) => b.length - a.length).join("|")})\\b`,
  "g"
)

function LogicLine({ line }: { line: string }) {
  const [code, comment] = line.split(/\s+--\s+/, 2)
  const parts = code.split(KEYWORD_PATTERN)
  return (
    <span className="block">
      {parts.map((part, i) =>
        (NODE_LOGIC_KEYWORDS as readonly string[]).includes(part) ? (
          <span key={i} className="font-medium text-avatar-violet-fg">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
      {comment && (
        <span className="text-muted-foreground/70">{` -- ${comment}`}</span>
      )}
    </span>
  )
}

export function BuilderNode({
  data,
  selected,
}: NodeProps & { data: BuilderNodeData }) {
  const [logicOpen, setLogicOpen] = useState(false)
  const meta = BUILDER_BLOCKS[data.tipo]
  const groupMeta = BUILDER_GROUP_META[meta.group]
  const Icon = meta.icon
  const isEntry = (BUILDER_ENTRY_NODE_TYPES as readonly string[]).includes(
    data.tipo
  )
  const outputs = outputPortsFor(data.tipo, data.config ?? {})
  const flowSummary = messageFlowSummary(data.tipo, data.config ?? {})
  const configSummary = configSummaryFor(data.tipo, data.config ?? {})
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
        {/* `nodrag`/`nopan` y el `stopPropagation`: sin ellos xyflow trata el
            clic como arrastre del nodo y el desplegable nunca abre. */}
        <button
          type="button"
          aria-expanded={logicOpen}
          aria-label="Ver qué hace este bloque"
          title="Ver qué hace este bloque"
          onClick={(e) => {
            e.stopPropagation()
            setLogicOpen((v) => !v)
          }}
          className={cn(
            "nodrag nopan flex size-[22px] shrink-0 items-center justify-center rounded-md border transition-colors",
            logicOpen
              ? "border-avatar-violet-fg bg-avatar-violet-bg text-avatar-violet-fg"
              : "border-border text-muted-foreground hover:border-avatar-violet-fg hover:bg-avatar-violet-bg hover:text-avatar-violet-fg"
          )}
        >
          <Braces className="size-3" />
        </button>
      </div>

      {/* Dos formas de decir lo mismo, elegidas por el grupo del bloque:
          los de Lógica se leen mejor como pseudocódigo —un árbol de
          condiciones anidado o un SWITCH con sus casos es más claro
          tabulado que en prosa—, y el resto se leen mejor como frases,
          porque lo que hacen es una acción, no una estructura. */}
      {logicOpen &&
        (meta.group === "logic" ? (
          <pre className="nowheel overflow-x-auto border-t border-border bg-muted px-3 py-2 font-mono text-[10px] leading-[1.65] text-muted-foreground">
            {nodeLogicLines({
              tipo: data.tipo,
              config: data.config ?? {},
              ports: outputs,
              // El nombre real de una emisión/promoción vive en una lista que
              // este componente no carga (ver `REFERENCE_KINDS` en
              // `node-config-summary.ts`); el flujo de mensajería sí se
              // resuelve aquí, así que se pasa.
              refs: { flow: flowSummary?.flowName },
            }).map((line, i) => (
              <LogicLine key={i} line={line} />
            ))}
          </pre>
        ) : (
          <div className="nowheel flex flex-col gap-1 border-t border-border bg-muted px-3 py-2">
            {nodeProse({
              id: data.tipo,
              tipo: data.tipo,
              etiqueta: data.etiqueta,
              config: data.config ?? {},
            }).map((line, i) => (
              <p
                key={i}
                className={cn(
                  "text-[11px] leading-[15px]",
                  // La primera frase es QUÉ hace el bloque; las siguientes
                  // matizan. Distinguirlas evita que un detalle se lea con
                  // el mismo peso que la acción principal.
                  i === 0
                    ? "text-secondary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {line}
              </p>
            ))}
          </div>
        ))}

      {flowSummary && (
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 14px, no vale next/image. */}
          <img src={flowSummary.logo} alt="" className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
            {flowSummary.flowName}
          </span>
        </div>
      )}

      {configSummary && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
          {configSummary.rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="shrink-0 text-muted-foreground">
                {row.label}
              </span>
              <span
                title={row.value}
                className="min-w-0 truncate text-right font-medium text-foreground"
              >
                {row.value}
              </span>
            </div>
          ))}
          {configSummary.pills && configSummary.pills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {configSummary.pills.map((pill) => (
                <Badge key={pill} variant="neutral" className="font-normal">
                  {pill}
                </Badge>
              ))}
            </div>
          )}
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
                className={cn(
                  "relative flex items-center justify-end gap-1.5 text-[11px]",
                  output.tone
                    ? TONE_TEXT_CLASS[output.tone]
                    : "text-muted-foreground"
                )}
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
                  className={cn(
                    "!static !size-2.5 !translate-x-0 !translate-y-0 !border-2 !border-background",
                    output.tone
                      ? TONE_DOT_CLASS[output.tone]
                      : "!bg-border-strong"
                  )}
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
