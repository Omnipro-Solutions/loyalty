"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BUILDER_BLOCKS, BUILDER_GROUP_META } from "@/config/builder-blocks"
import { isMessageNodeType } from "@/config/integration-flows"
import { AccumulatePointsForm } from "@/features/builder/inspector/accumulate-points-form"
import { MultiConditionForm } from "@/features/builder/inspector/multi-condition-form"
import { DataTab } from "@/features/builder/inspector/data-tab"
import { SIMPLE_FIELD_SPECS } from "@/features/builder/inspector/field-specs"
import { BranchesTab } from "@/features/builder/inspector/branches-tab"
import { entryTriggerFor } from "@/features/builder/inspector/entry-triggers"
import { IntegrationMessageForm } from "@/features/builder/inspector/integration-message-form"
import { WebhookSalienteForm } from "@/features/builder/inspector/webhook-saliente-form"
import {
  resolveAvailableVariables,
  type GraphEdgeRef,
  type GraphNodeRef,
} from "@/features/builder/inspector/node-variables"
import { SimpleConfigForm } from "@/features/builder/inspector/simple-config-form"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import type {
  AudienceSummary,
  CouponBatchSummary,
  PromotionSummary,
  TierSummary,
} from "./queries"

const BRANCH_TYPES = new Set(["ramificacion_valor", "split_ab"])

function tabsFor(tipo: string): readonly string[] {
  if (BRANCH_TYPES.has(tipo)) return ["Configuración", "Ramas", "Datos"]
  return ["Configuración", "Datos"]
}

export function InspectorPanel({
  node,
  nodes,
  edges,
  tiers,
  audiences,
  couponBatches,
  promotions,
  onClose,
  onDelete,
  onConfigChange,
}: {
  node: {
    id: string
    data: { tipo: string; etiqueta: string; config: Record<string, unknown> }
  } | null
  /** Grafo completo del canvas — para resolver qué variables de bloques anteriores llegan hasta el nodo seleccionado (ver `resolveAvailableVariables`). */
  nodes: GraphNodeRef[]
  edges: GraphEdgeRef[]
  tiers: TierSummary[]
  audiences: AudienceSummary[]
  couponBatches: CouponBatchSummary[]
  promotions: PromotionSummary[]
  onClose: () => void
  onDelete: (id: string) => void
  onConfigChange: (id: string, config: Record<string, unknown>) => void
}) {
  const tabs = node ? tabsFor(node.data.tipo) : []
  const [tab, setTab] = useState<string>("Configuración")
  const activeTab = tabs.includes(tab) ? tab : "Configuración"
  const graphVariables = useMemo(
    () => (node ? resolveAvailableVariables(nodes, edges, node.id) : []),
    [nodes, edges, node]
  )

  if (!node) {
    return (
      <div className="flex h-full w-[320px] shrink-0 flex-col items-center justify-center gap-2 border-l border-border bg-background p-6 text-center">
        <p className="text-[13px] font-medium text-foreground">
          Selecciona un nodo
        </p>
        <p className="text-[12px] text-muted-foreground">
          Haz clic en un bloque del canvas para ver su configuración.
        </p>
      </div>
    )
  }

  const meta = BUILDER_BLOCKS[node.data.tipo as keyof typeof BUILDER_BLOCKS]
  const groupMeta = BUILDER_GROUP_META[meta.group]
  const Icon = meta.icon
  const tipo = node.data.tipo
  const trigger = entryTriggerFor(tipo as never, node.data.config)

  function update(config: Record<string, unknown>) {
    onConfigChange(node!.id, config)
  }

  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-background">
      <div className="flex items-center gap-2.5 border-b border-border p-4">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            groupMeta.bgClassName
          )}
        >
          <Icon className={cn("size-4", groupMeta.fgClassName)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] leading-[14px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
            {groupMeta.label}
          </p>
          <p className="truncate text-[14px] leading-5 font-semibold text-foreground">
            {node.data.etiqueta}
          </p>
          {trigger && (
            <p
              title={`Trigger: ${trigger}`}
              className="truncate font-mono text-[11px] text-muted-foreground"
            >
              Trigger: {trigger}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex border-b border-border px-4">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 px-3 py-2.5 text-[13px] font-medium",
              t === activeTab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* `key={node.id}` fuerza a React a desmontar y remontar todo este
          subárbol cuando cambia el nodo seleccionado — sin esto, elegir OTRO
          nodo del mismo tipo (ej. dos "Acumular puntos") no remonta
          `AccumulatePointsForm`/`BranchesTab` (React los ve como "el mismo
          componente en la misma posición"), así que su `useState` local
          sigue mostrando/editando los valores del nodo anterior y termina
          escribiéndolos sobre el nodo nuevo. */}
      <div key={node.id} className="flex-1 overflow-y-auto p-4">
        {activeTab === "Configuración" &&
          (tipo === "acumular_puntos" ? (
            <AccumulatePointsForm
              config={node.data.config}
              tiers={tiers}
              graphVariables={graphVariables}
              onChange={update}
            />
          ) : tipo === "condicion_multiple" ? (
            <MultiConditionForm
              config={node.data.config}
              graphVariables={graphVariables}
              onChange={update}
            />
          ) : isMessageNodeType(tipo as never) ? (
            <IntegrationMessageForm
              channel={tipo as never}
              config={node.data.config}
              graphVariables={graphVariables}
              onChange={update}
            />
          ) : tipo === "webhook_saliente" ? (
            <WebhookSalienteForm
              config={node.data.config}
              graphVariables={graphVariables}
              onChange={update}
            />
          ) : (
            <SimpleConfigForm
              specs={
                SIMPLE_FIELD_SPECS[tipo as keyof typeof SIMPLE_FIELD_SPECS] ??
                []
              }
              config={node.data.config}
              audiences={audiences.map((a) => ({
                value: a.id,
                label:
                  a.estimatedCount !== null
                    ? `${a.name} (${formatNumber(a.estimatedCount)})`
                    : a.name,
              }))}
              couponBatches={couponBatches.map((b) => ({
                value: b.id,
                label: `${b.reference} · ${b.name}`,
              }))}
              promotions={promotions.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              onChange={update}
            />
          ))}
        {activeTab === "Ramas" && (
          <BranchesTab config={node.data.config} onChange={update} />
        )}
        {activeTab === "Datos" && <DataTab tipo={tipo as never} />}
      </div>

      <div className="border-t border-border p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onDelete(node.id)}
        >
          Eliminar nodo
        </Button>
      </div>
    </div>
  )
}
