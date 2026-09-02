"use client"

import { Plus, X } from "lucide-react"
import { useState } from "react"
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form"

import { CurrencyInput } from "@/components/form/currency-input"
import { Field } from "@/components/form/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DISCOUNT_TIER_CALCULATION_MODES,
  DISCOUNT_TIER_THRESHOLD_TYPES,
  type DiscountTierCalculationMode,
  type DiscountTierThresholdType,
} from "@/types/domain"

import {
  DISCOUNT_TIER_CALCULATION_MODE_HINT,
  DISCOUNT_TIER_CALCULATION_MODE_LABEL,
  DISCOUNT_TIER_THRESHOLD_HINT,
  DISCOUNT_TIER_THRESHOLD_LABEL,
} from "../lib/labels"
import { computeTieredDiscount } from "../lib/tiered-discount"
import type { PromotionValues } from "../schemas"

type DiscountTiersBuilderProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  onThresholdTypeChange: (value: DiscountTierThresholdType) => void
  onCalculationModeChange: (value: DiscountTierCalculationMode) => void
}

/**
 * Editor de escalones para la mecánica `descuento_escalonado` (docs
 * §7.1a, versión transaccional). Reusa el mismo patrón de
 * `ConditionsBuilder`/`ConditionRow`: toggle plano con `cn()` (sin un
 * componente "segmented" nuevo) + filas de un `useFieldArray` + botón
 * "Agregar". Diferencia a propósito: las filas usan `register()` en vez
 * de `update(index, next)` — con inputs numéricos de texto libre,
 * `update()` remonta la fila en cada tecla y el input pierde el foco.
 */
export function DiscountTiersBuilder({
  control,
  register,
  errors,
  onThresholdTypeChange,
  onCalculationModeChange,
}: DiscountTiersBuilderProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "discountTiers",
  })
  const thresholdType = useWatch({ control, name: "thresholdType" })
  const calculationMode = useWatch({ control, name: "tierCalculationMode" })
  const tiers = useWatch({ control, name: "discountTiers" }) ?? []

  const [previewUnits, setPreviewUnits] = useState(0)
  const [previewAmount, setPreviewAmount] = useState(0)
  const preview = computeTieredDiscount(
    {
      tiers: tiers.filter((t) => t.umbral > 0 && t.beneficio_valor > 0),
      thresholdType,
      calculationMode,
    },
    { units: previewUnits, amount: previewAmount }
  )

  function addTier() {
    const last = fields.at(-1)
    const step = thresholdType === "unidades" ? 1 : 100
    append({
      umbral: last ? last.umbral + step : step,
      beneficio_valor: last ? Math.min(100, last.beneficio_valor + 5) : 10,
    })
  }

  // Un issue de zod cuyo `path` es exactamente ["discountTiers"] (sin
  // índice) — ej. "necesita al menos 2 escalones" — react-hook-form lo
  // guarda bajo `.root`, no en `.message` directo: ese slot es para
  // errores por índice (`discountTiers.0.umbral`), el de todo el array
  // vive aparte.
  const tiersError =
    errors.discountTiers?.root?.message ?? errors.discountTiers?.message

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Field
        label="Umbral medido en"
        hint={DISCOUNT_TIER_THRESHOLD_HINT[thresholdType]}
      >
        <div className="flex items-center gap-2">
          {DISCOUNT_TIER_THRESHOLD_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onThresholdTypeChange(value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
                thresholdType === value
                  ? "border-selected bg-brand-subtle text-primary-800"
                  : "border-border bg-background text-secondary-foreground"
              )}
            >
              {DISCOUNT_TIER_THRESHOLD_LABEL[value]}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Modo de cálculo"
        hint={DISCOUNT_TIER_CALCULATION_MODE_HINT[calculationMode]}
      >
        <div className="flex items-center gap-2">
          {DISCOUNT_TIER_CALCULATION_MODES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onCalculationModeChange(value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
                calculationMode === value
                  ? "border-selected bg-brand-subtle text-primary-800"
                  : "border-border bg-background text-secondary-foreground"
              )}
            >
              {DISCOUNT_TIER_CALCULATION_MODE_LABEL[value]}
            </button>
          ))}
        </div>
      </Field>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sin escalones: agrega al menos 2 para que el descuento sea escalonado.
        </p>
      )}

      {fields.map((field, index) => {
        const rowErrors = errors.discountTiers?.[index]
        return (
          <div
            key={field.id}
            className="flex w-full items-start gap-2.5 rounded-[10px] border border-border bg-neutral-50 px-3 py-2.5"
          >
            <div className="mt-1.5 flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted">
              <span className="text-[11px] font-semibold text-secondary-foreground">
                {index + 1}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {thresholdType === "unidades" ? (
                <Input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Desde N unidades"
                  {...register(`discountTiers.${index}.umbral`, {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                />
              ) : (
                <CurrencyInput
                  {...register(`discountTiers.${index}.umbral`, {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                />
              )}
              {rowErrors?.umbral?.message && (
                <p className="mt-1 text-[11px] text-destructive">
                  {rowErrors.umbral.message}
                </p>
              )}
            </div>

            <span className="mt-2.5 w-24 shrink-0 truncate text-center text-xs text-muted-foreground">
              → descuento
            </span>

            <div className="min-w-0 flex-1">
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  placeholder="%"
                  {...register(`discountTiers.${index}.beneficio_valor`, {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                />
              </div>
              {rowErrors?.beneficio_valor?.message && (
                <p className="mt-1 text-[11px] text-destructive">
                  {rowErrors.beneficio_valor.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              aria-label="Eliminar escalón"
              className="mt-1.5 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}

      {tiersError && (
        <p className="text-[11px] text-destructive">{tiersError}</p>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addTier}
        disabled={fields.length >= 6}
        className="w-fit"
      >
        <Plus className="size-3.5" />
        Agregar escalón
      </Button>

      {fields.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-dashed border-border px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-[0.2px] text-muted-foreground uppercase">
            Simular con un carrito de ejemplo
          </p>
          <div className="flex items-center gap-3.5">
            <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
              Unidades
              <Input
                type="number"
                min="0"
                value={previewUnits}
                onChange={(e) => setPreviewUnits(Number(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
              Monto
              <CurrencyInput
                value={previewAmount}
                onChange={(e) => setPreviewAmount(Number(e.target.value) || 0)}
              />
            </label>
          </div>
          <p className="text-xs text-foreground">
            {preview.reachedTierIndex === null
              ? "No alcanza ningún escalón."
              : `Descuento: USD $${preview.discount.toFixed(2)} (equivale a ${preview.effectiveRate.toFixed(1)} %)`}
          </p>
        </div>
      )}
    </div>
  )
}
