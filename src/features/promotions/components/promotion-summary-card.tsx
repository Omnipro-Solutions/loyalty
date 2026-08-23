"use client"

import { useAction } from "next-safe-action/hooks"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

import { simulatePromotionAction } from "../actions/promotions"
import type { Collision } from "../lib/collision"
import type { Condition, ConditionSegment } from "../lib/queries"

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="flex-1 text-secondary-foreground">{label}</span>
      <span className="shrink-0 font-medium whitespace-nowrap text-foreground">
        {value}
      </span>
    </div>
  )
}

type PromotionSummaryCardProps = {
  excludeId?: string
  conditions: Condition[]
  segments: ConditionSegment[]
  channelScope: string
  priority: number
  onSave: (status: "activa" | "borrador") => void
  saving: boolean
}

/** Figma "Resumen de la regla" + colisión + acciones (633:928) — panel lateral de 07.1. */
export function PromotionSummaryCard({
  excludeId,
  conditions,
  segments,
  channelScope,
  priority,
  onSave,
  saving,
}: PromotionSummaryCardProps) {
  const segmentCondition = conditions.find((c) => c.campo === "segmento")
  const segment = segmentCondition
    ? segments.find((s) => s.id === segmentCondition.valor)
    : undefined
  const [result, setResult] = useState<{
    impactedStores: number
    collisions: Collision[]
  } | null>(null)

  const simulate = useAction(simulatePromotionAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setResult({
          impactedStores: data.impactedStores,
          collisions: data.collisions,
        })
      }
    },
  })

  function runSimulation() {
    simulate.execute({
      excludeId,
      conditions,
      channelScope: channelScope as "pos" | "ecommerce" | "pos_ecommerce",
      priority,
    })
  }

  // Primera estimación automática al montar, con las condiciones por defecto.
  useEffect(() => {
    runSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo la corrida inicial; después el usuario dispara "Simular con datos reales".
  }, [])

  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex flex-col gap-3 rounded-[20px] bg-background px-[18px] py-4 shadow-form-section">
        <p className="text-sm font-semibold text-foreground">
          Resumen de la promoción
        </p>
        <SummaryRow
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
          label="Tiendas impactadas"
          value={result ? formatNumber(result.impactedStores) : "…"}
        />
        <SummaryRow label="Impacto estimado" value="Próximamente" />
        <SummaryRow
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

      {result && result.collisions.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-[20px] bg-warning-bg px-4 py-3.5 shadow-form-section">
          <p className="text-[13px] font-semibold text-warning">
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

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={() => onSave("activa")}
          disabled={saving}
        >
          Guardar y activar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={runSimulation}
          disabled={simulate.isPending}
        >
          {simulate.isPending ? "Simulando…" : "Simular con datos reales"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSave("borrador")}
          disabled={saving}
        >
          Guardar como borrador
        </Button>
      </div>
    </div>
  )
}
