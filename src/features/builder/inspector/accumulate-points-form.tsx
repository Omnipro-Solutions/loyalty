"use client"

import { useMemo, useState } from "react"

import { Field } from "@/components/form/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCOP } from "@/lib/format"
import type { TierName } from "@/types/domain"

import type { TierSummary } from "../canvas/queries"

type AccumulatePointsConfig = {
  multiplicador_override?: number
  tope_por_transaccion?: number
  tope_acumulado?: number
  unidad_monto: number
  monto_ejemplo: number
  tier_ejemplo: TierName
}

const DEFAULT_CONFIG: AccumulatePointsConfig = {
  unidad_monto: 1000,
  monto_ejemplo: 50000,
  tier_ejemplo: "oro",
}

const TIER_LABEL: Record<TierName, string> = {
  bronce: "Bronce",
  plata: "Plata",
  oro: "Oro",
  diamante: "Diamante",
}

/**
 * Caso difícil #1 del plan: multiplicador por nivel + topes + vista previa
 * en vivo. El multiplicador real por nivel viene de `tiers` (sembrado por
 * organización); `multiplicador_override` permite que ESTE bloque use uno
 * distinto al de la tabla si el producto lo pide (ej. una campaña con
 * multiplicador especial), pero por defecto usa el real.
 */
export function AccumulatePointsForm({
  config,
  tiers,
  onChange,
}: {
  config: Record<string, unknown>
  tiers: TierSummary[]
  onChange: (config: Record<string, unknown>) => void
}) {
  const [values, setValues] = useState<AccumulatePointsConfig>({
    ...DEFAULT_CONFIG,
    ...(config as Partial<AccumulatePointsConfig>),
  })

  function update(patch: Partial<AccumulatePointsConfig>) {
    const next = { ...values, ...patch }
    setValues(next)
    onChange(next)
  }

  const exampleTier = tiers.find((t) => t.nombre === values.tier_ejemplo)
  const multiplier =
    values.multiplicador_override ?? exampleTier?.multiplicador ?? 1

  const preview = useMemo(() => {
    const basePoints = Math.floor(values.monto_ejemplo / values.unidad_monto)
    const pointsWithMultiplier = Math.round(basePoints * multiplier)
    const capApplied =
      typeof values.tope_por_transaccion === "number" &&
      pointsWithMultiplier > values.tope_por_transaccion
    const finalPoints = capApplied
      ? values.tope_por_transaccion!
      : pointsWithMultiplier

    return { basePoints, pointsWithMultiplier, capApplied, finalPoints }
  }, [values, multiplier])

  return (
    <div className="flex flex-col gap-4">
      <Field label="Puntos por cada" htmlFor="ap-unidad">
        <div className="relative">
          <Input
            id="ap-unidad"
            type="number"
            min={1}
            value={values.unidad_monto}
            onChange={(e) =>
              update({ unidad_monto: Number(e.target.value) || 1 })
            }
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
            COP = 1 punto
          </span>
        </div>
      </Field>

      <Field
        label="Multiplicador personalizado"
        hint="Vacío usa el multiplicador real del nivel del socio"
        htmlFor="ap-mult"
      >
        <Input
          id="ap-mult"
          type="number"
          step="0.1"
          min={0}
          placeholder={String(exampleTier?.multiplicador ?? 1)}
          value={values.multiplicador_override ?? ""}
          onChange={(e) =>
            update({
              multiplicador_override: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
      </Field>

      <Field label="Tope por transacción" htmlFor="ap-tope-tx">
        <Input
          id="ap-tope-tx"
          type="number"
          min={0}
          placeholder="Sin tope"
          value={values.tope_por_transaccion ?? ""}
          onChange={(e) =>
            update({
              tope_por_transaccion: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
      </Field>

      <Field label="Tope acumulado" htmlFor="ap-tope-acum">
        <Input
          id="ap-tope-acum"
          type="number"
          min={0}
          placeholder="Sin tope"
          value={values.tope_acumulado ?? ""}
          onChange={(e) =>
            update({
              tope_acumulado: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
      </Field>

      <div className="rounded-xl border border-border bg-neutral-50 p-3.5">
        <p className="mb-2.5 text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Vista previa en vivo
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              min={0}
              value={values.monto_ejemplo}
              onChange={(e) =>
                update({ monto_ejemplo: Number(e.target.value) || 0 })
              }
            />
          </div>
          <Select
            value={values.tier_ejemplo}
            onValueChange={(v) => update({ tier_ejemplo: v as TierName })}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["bronce", "plata", "oro", "diamante"] as const).map((t) => (
                <SelectItem key={t} value={t}>
                  {TIER_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-2.5 text-[13px] text-foreground">
          Compra de {formatCOP(values.monto_ejemplo)} × {multiplier}x nivel{" "}
          {TIER_LABEL[values.tier_ejemplo]} ={" "}
          <span className="font-semibold">{preview.finalPoints} puntos</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          {preview.basePoints} base × {multiplier} ={" "}
          {preview.pointsWithMultiplier} — tope aplicado:{" "}
          {preview.capApplied ? "sí" : "no"}
        </p>
      </div>
    </div>
  )
}
