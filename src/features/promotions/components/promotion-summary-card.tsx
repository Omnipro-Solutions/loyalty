"use client"

import {
  ClipboardList,
  GitMerge,
  Store,
  Tag,
  TriangleAlert,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { formatNumber, formatShortDate, formatUSD } from "@/lib/format"

import { simulatePromotionAction } from "../actions/promotions"
import type { Collision } from "../lib/collision"
import {
  BENEFIT_TYPE_LABEL,
  CHANNEL_SCOPE_LABEL,
  PROMOTION_STATUS_LABEL,
  PROMOTION_TYPE_LABEL,
} from "../lib/labels"
import { PROMOTION_TYPE_ICON } from "../lib/type-icon"
import {
  evaluateProgramRules,
  type ProgramRuleIssue,
} from "../lib/program-rules"
import type { Condition, ConditionNode, ConditionSegment } from "../lib/queries"
import type { PromotionValues } from "../schemas"
import type { PromotionPublicationStatus } from "@/types/domain"

/** Mismo criterio estructural que `flattenConditionTree` de `lib/condition-tree.ts` (schemas.ts, lado cliente) — redeclarado porque este archivo consume los tipos de `lib/queries.ts` (server-only). */
function flattenConditionNode(node: ConditionNode): Condition[] {
  if ("condiciones" in node)
    return node.condiciones.flatMap(flattenConditionNode)
  return [node]
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-secondary-foreground">{label}</span>
      <span className="shrink-0 font-medium whitespace-nowrap text-foreground">
        {value}
      </span>
    </div>
  )
}

type PromotionSummaryCardProps = {
  excludeId?: string
  conditions: ConditionNode
  segments: ConditionSegment[]
  channelScope: string
  priority: number
  values: Partial<PromotionValues>
  /** Estado elegido en el campo "Estado" del paso Resumen — con el que se guardará. */
  publicationStatus: PromotionPublicationStatus
  onSave: () => void
  /**
   * Guardar solo se habilita en el paso "Resumen": es donde se revisa todo
   * y donde se elige con qué estado se cierra el formulario.
   */
  canSave: boolean
  saving: boolean
  /** Promoción ya publicada: sus campos son de solo lectura y lo único que se guarda es el estado. */
  locked: boolean
}

/** Figma "Resumen de la regla" + colisión + acciones (633:928) — panel lateral de 07.1. */
export function PromotionSummaryCard({
  excludeId,
  conditions,
  segments,
  channelScope,
  priority,
  values,
  publicationStatus,
  onSave,
  canSave,
  saving,
  locked,
}: PromotionSummaryCardProps) {
  const leaves = flattenConditionNode(conditions)
  const segmentCondition = leaves.find((c) => c.campo === "segmento")
  const segment = segmentCondition
    ? segments.find((s) => s.id === segmentCondition.valor)
    : undefined
  const [result, setResult] = useState<{
    impactedStores: number
    collisions: Collision[]
    advisories: ProgramRuleIssue[]
  } | null>(null)

  const simulate = useAction(simulatePromotionAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setResult({
          impactedStores: data.impactedStores,
          collisions: data.collisions,
          advisories: data.advisories,
        })
      }
    },
  })

  function runSimulation() {
    simulate.execute({
      excludeId,
      conditions: leaves,
      channelScope: channelScope as "pos" | "ecommerce" | "pos_ecommerce",
      priority,
      benefitType: values.benefitType,
      benefitValue: values.benefitValue,
      stackable: values.stackable,
      exclusionGroup: values.exclusionGroup,
    })
  }

  // Estimación automática al montar, con las condiciones por defecto.
  useEffect(() => {
    runSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo la corrida inicial.
  }, [])

  const localAdvisories = evaluateProgramRules(values)
  const advisories = [...localAdvisories, ...(result?.advisories ?? [])]

  const TypeIcon = values.type ? PROMOTION_TYPE_ICON[values.type] : Tag
  const validityLabel = !values.validFrom
    ? "—"
    : values.validUntil
      ? `${formatShortDate(values.validFrom)} – ${formatShortDate(values.validUntil)}`
      : `Desde ${formatShortDate(values.validFrom)}`

  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background p-[18px] shadow-form-section">
        {/*
          Misma estructura que "Card · Tarjeta de lealtad"
          (`features/members/components/member-loyalty-card.tsx`): bloque de
          marca con micro-etiqueta + valor a cada lado, un panel interno
          centrado con el dato protagonista, y debajo la lista alineada.
          Reusa su token `--gradient-loyalty-card` (declarado solo en
          `:root` a propósito) en vez de añadir un degradado nuevo.

          El panel es lo único visible en los 7 pasos, así que carga la
          identidad de la regla: en los pasos 2-6 el nombre y el código ya
          no están en pantalla.
        */}
        <div
          className="flex w-full flex-col gap-3 rounded-[20px] p-4 shadow-lg"
          style={{ backgroundImage: "var(--gradient-loyalty-card)" }}
        >
          <div className="flex w-full items-start gap-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[8px] leading-[11px] font-medium tracking-[0.64px] text-white/60">
                PROMOCIÓN
              </p>
              <p className="truncate text-[13px] leading-[18px] font-semibold text-white">
                {values.name?.trim() || "Sin nombre"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end whitespace-nowrap">
              <p className="text-[8px] leading-[11px] font-medium tracking-[0.64px] text-white/60">
                CÓDIGO
              </p>
              <p className="font-mono text-[13px] leading-[18px] font-semibold text-white">
                {values.code?.trim() || "—"}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-1 rounded-[14px] bg-gradient-to-r from-white/20 to-white/[0.06] px-4 py-[18px]">
            <TypeIcon className="size-4 text-white" />
            <p className="text-center text-sm leading-[19px] font-semibold text-white">
              {values.benefitType
                ? BENEFIT_TYPE_LABEL[values.benefitType]
                : "Mecánica sin elegir"}
            </p>
            <p className="text-center text-[9px] leading-3 text-white/70">
              {values.type ? PROMOTION_TYPE_LABEL[values.type] : "Sin tipo"} ·
              prioridad {values.priority ?? "—"} ·{" "}
              {values.stackable ? "acumulable" : "no acumulable"}
            </p>
          </div>

          <div className="flex w-full items-start gap-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[8px] leading-[11px] font-medium tracking-[0.64px] text-white/60">
                CANAL
              </p>
              <p className="truncate text-[11px] leading-4 font-semibold text-white">
                {values.channelScope
                  ? CHANNEL_SCOPE_LABEL[values.channelScope]
                  : "—"}
              </p>
            </div>
            <div className="flex min-w-0 shrink-0 flex-col items-end">
              <p className="text-[8px] leading-[11px] font-medium tracking-[0.64px] text-white/60">
                VIGENCIA
              </p>
              <p className="truncate text-[11px] leading-4 font-semibold text-white">
                {validityLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-border" />

        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">
            Alcance e impacto
          </p>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <SummaryRow
            icon={Users}
            label="Clientes alcanzados"
            value={
              segment
                ? segment.estimatedCount !== null
                  ? `~${formatNumber(segment.estimatedCount)}`
                  : segment.name
                : "—"
            }
          />
          <SummaryRow
            icon={Store}
            label="Tiendas impactadas"
            value={result ? formatNumber(result.impactedStores) : "…"}
          />
          <SummaryRow
            icon={Wallet}
            label="Presupuesto asignado"
            value={
              values.assignedBudget ? formatUSD(values.assignedBudget) : "—"
            }
          />
          <SummaryRow
            icon={GitMerge}
            label="Colisiones"
            value={
              !result
                ? "…"
                : result.collisions.length === 0
                  ? "Ninguna"
                  : `${result.collisions.length} detectada${result.collisions.length > 1 ? "s" : ""}`
            }
          />
        </div>
      </div>

      {result && result.collisions.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-[20px] bg-warning-bg px-4 py-3.5 shadow-form-section">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-warning">
            <GitMerge className="size-3.5 shrink-0" />
            Colisión detectada
          </p>
          {result.collisions.map((collision) => (
            <p
              key={collision.promotionId}
              className="text-xs leading-[18px] text-secondary-foreground"
            >
              &quot;{collision.name}&quot; {collision.reason}.{" "}
              {priority >= collision.priority
                ? "Esta promoción se ejecuta primero."
                : `Prioridad ${collision.priority} — "${collision.name}" se ejecuta primero.`}
            </p>
          ))}
        </div>
      )}

      {advisories.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-[20px] bg-warning-bg px-4 py-3.5 shadow-form-section">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-warning">
            <TriangleAlert className="size-3.5 shrink-0" />
            Antes de publicar — no bloquean, pero conviene revisarlas
          </p>
          {advisories.map((advisory, i) => (
            <p
              key={i}
              className="text-xs leading-[18px] text-secondary-foreground"
            >
              <span className="font-medium text-foreground">
                {advisory.rule}
              </span>{" "}
              · {advisory.message}
            </p>
          ))}
        </div>
      )}

      {/*
        Bloqueada = no hay nada que guardar desde aquí: el único cambio
        posible es el de estado, y ese vive en su propio cuadrante con su
        diálogo de motivo (`PromotionStatusActions`).
      */}
      {!locked && (
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={onSave} disabled={saving || !canSave}>
            {saving ? "Guardando…" : "Guardar promoción"}
          </Button>
          <p className="text-center text-[11px] leading-4 text-muted-foreground">
            {canSave ? (
              <>
                Se guardará como{" "}
                <span className="font-medium text-foreground">
                  {PROMOTION_STATUS_LABEL[publicationStatus]}
                </span>
                .
              </>
            ) : (
              "Llega al paso «Resumen» para elegir el estado y guardar."
            )}
          </p>
        </div>
      )}
    </div>
  )
}
