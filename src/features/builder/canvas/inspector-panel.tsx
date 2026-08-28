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
import { CouponBatchReference } from "@/features/builder/inspector/coupon-batch-reference"
import {
  allowedHolders,
  couponConstraints,
} from "@/features/builder/inspector/coupon-constraints"
import { EventReference } from "@/features/builder/inspector/event-reference"
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
  readOnly = false,
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
  /**
   * Regla ya publicada: los bloques quedan de solo lectura y lo único
   * editable es el estado (`isLocked`). Se aplica sobre el panel entero con
   * `inert` en vez de propagar un `disabled` por cada formulario: son 8
   * componentes con controles muy distintos, y bastaría olvidarse de uno
   * para que la garantía dejara de serlo.
   */
  readOnly?: boolean
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

      {/* `key={node.id}` remonta el subárbol al cambiar de nodo: React ve
          "el mismo componente en la misma posición" cuando se pasa de un
          bloque a otro DEL MISMO TIPO (ej. dos "Acumular puntos"), y sin la
          key conservaría el estado local de UI del anterior — el plegado y
          la vista previa de `MultiConditionForm`, el scroll del panel.
          NO es lo que aísla la configuración de cada nodo: eso lo garantiza
          que los formularios sean controlados sobre `node.data.config` (sin
          `useState` que copie el config), y así debe seguir. */}
      {readOnly && (
        <p className="border-b border-border bg-muted px-4 py-2 text-[11px] leading-4 text-muted-foreground">
          Regla publicada: los bloques son de solo lectura. Para cambiar algo,
          duplícala o cambia su estado desde la barra superior.
        </p>
      )}

      <div
        key={node.id}
        inert={readOnly || undefined}
        className={cn(
          "flex-1 scrollbar-thin overflow-y-auto p-4",
          readOnly && "opacity-70"
        )}
      >
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
          ) : tipo === "evento" ? (
            // El payload del evento se ve al elegirlo, ANTES de configurar
            // el modo de disparo: es lo que dice con qué variables se va a
            // poder trabajar el resto del flujo.
            <div className="flex flex-col gap-4">
              <SimpleConfigForm
                specs={SIMPLE_FIELD_SPECS.evento ?? []}
                config={node.data.config}
                onChange={update}
              />
              <EventReference config={node.data.config} />
            </div>
          ) : tipo === "emitir_cupon" ? (
            // El único bloque que necesita algo además del formulario: la
            // ficha de la emisión elegida, para no tener que ir a Cupones a
            // ver qué va a emitir la regla, y los constraints del lote, para
            // no dejar construir una combinación que la base rechazaría
            // recién al ejecutar la regla.
            <CouponBlockForm
              config={node.data.config}
              couponBatches={couponBatches}
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
          <BranchesTab
            config={node.data.config}
            tipo={tipo as "ramificacion_valor" | "split_ab"}
            graphVariables={graphVariables}
            onChange={update}
          />
        )}
        {activeTab === "Datos" && (
          <DataTab tipo={tipo as never} config={node.data.config} />
        )}
      </div>

      {!readOnly && (
        <div className="border-t border-border p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onDelete(node.id)}
          >
            Eliminar nodo
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * `emitir_cupon` es el único bloque cuya validez depende de una entidad de
 * OTRO módulo (el lote de `features/coupons`), así que su formulario se
 * arma aquí: filtra las opciones que el lote no admite y explica las que sí
 * admite pero conviene revisar.
 *
 * Filtrar en vez de validar después no es cosmético: `coupon_bearer_or_member`
 * hace excluyentes titular y portador, y un lote anónimo no tiene titular
 * posible. Ofrecer la opción y rechazarla al guardar enseñaría la regla como
 * un error de la persona, cuando es una combinación que nunca existió.
 */
function CouponBlockForm({
  config,
  couponBatches,
  onChange,
}: {
  config: Record<string, unknown>
  couponBatches: CouponBatchSummary[]
  onChange: (config: Record<string, unknown>) => void
}) {
  const batch = couponBatches.find((b) => b.id === config.coupon_batch_id)
  const holders = allowedHolders(batch)
  const constraints = couponConstraints(batch, config)

  const asigna = config.modo === "asignar"

  const specs = (SIMPLE_FIELD_SPECS.emitir_cupon ?? []).map((spec) => {
    if (spec.key === "titular" && spec.kind === "select") {
      return {
        ...spec,
        options: spec.options.filter((o) => holders.includes(o.value)),
      }
    }
    // La emisión hace falta en los DOS modos, pero significa cosas
    // distintas: al emitir es la PLANTILLA de la que salen el descuento y
    // el patrón de código; al asignar es el LOTE del que se toma un cupón
    // ya creado. Con una etiqueta única ("Emisión base") el modo emitir se
    // leía como «elige un cupón existente», que es justo lo que NO hace.
    if (spec.key === "coupon_batch_id") {
      return {
        ...spec,
        label: asigna
          ? "Lote del que se asigna"
          : "Emisión que sirve de plantilla",
        hint: asigna
          ? "Se toma un cupón ya creado y sin dueño de este lote, y su stock baja en 1."
          : "No se elige un cupón existente: de aquí salen el descuento, la moneda y el patrón con el que se genera un código nuevo.",
      }
    }
    return spec
  })

  return (
    <div className="flex flex-col gap-4">
      <SimpleConfigForm
        specs={specs}
        config={config}
        couponBatches={couponBatches.map((b) => ({
          value: b.id,
          label: `${b.reference} · ${b.name}`,
        }))}
        onChange={onChange}
      />
      {constraints.map((constraint, i) => (
        <p
          key={i}
          className={cn(
            "rounded-lg px-3 py-2 text-[11.5px] leading-4",
            constraint.level === "error"
              ? "bg-destructive-bg text-destructive"
              : "bg-warning-bg text-warning"
          )}
        >
          {constraint.message}
        </p>
      ))}
      <CouponBatchReference batch={batch} />
    </div>
  )
}
