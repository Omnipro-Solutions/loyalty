"use client"

import { Plus, X } from "lucide-react"
import { useState } from "react"
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"

import { Segmented } from "@/components/filters/segmented"
import { EntityPickerField } from "@/components/form/entity-picker"
import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Row } from "@/components/form/row"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CONTINUITY_BREAK_BEHAVIORS,
  PIECE_SELECTION_CRITERIA,
  RETURN_EFFECTS,
  type ContinuityBreakBehavior,
  type PieceSelectionCriterion,
  type ReturnEffect,
} from "@/types/domain"

import { computeContinuityDiscount } from "../../lib/continuity-discount"
import {
  CONTINUITY_BREAK_BEHAVIOR_LABEL,
  PIECE_SELECTION_CRITERION_LABEL,
  RETURN_EFFECT_LABEL,
  describeContinuityRule,
} from "../../lib/labels"
import {
  ProductPickerRow,
  productBrandFacet,
  productPickerChipLabel,
  productPickerSearchText,
} from "../../lib/product-picker"
import type { ProductOption } from "../../lib/queries"
import type { PromotionValues } from "../../schemas"

type ContinuityFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  products: ProductOption[]
  /** Salta al paso "Condiciones" — ahí, no aquí, se define a qué categoría/marca aplica la promoción en general (mismo mecanismo que usan las demás mecánicas). */
  onGoToConditionsStep: () => void
}

const MAX_TIERS = 6
/** Mismo caso que ya se usó para explicar la mecánica — un punto de partida editable en vez de un formulario en blanco. */
const EXAMPLE_TIERS = [
  { umbral: 1, beneficio_valor: 20 },
  { umbral: 2, beneficio_valor: 25 },
  { umbral: 3, beneficio_valor: 30 },
  { umbral: 4, beneficio_valor: 35 },
]

const BREAK_OPTIONS = CONTINUITY_BREAK_BEHAVIORS.map((v) => ({
  value: v,
  label: CONTINUITY_BREAK_BEHAVIOR_LABEL[v],
}))
const RETURN_EFFECT_OPTIONS = RETURN_EFFECTS.map((v) => ({
  value: v,
  label: RETURN_EFFECT_LABEL[v],
}))
const PIECE_SELECTION_OPTIONS = PIECE_SELECTION_CRITERIA.map((v) => ({
  value: v,
  label: PIECE_SELECTION_CRITERION_LABEL[v],
}))

/** `text-[11px] font-medium tracking-[0.2px] text-muted-foreground uppercase` — mismo tratamiento que ya usa el bloque "Simular" de este módulo para separar un sub-grupo dentro de un solo `Field`/`Section`. */
function SubsectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-medium tracking-[0.2px] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

/**
 * Mecánica `descuento_continuidad` — escalera de descuento que crece con
 * cada compra consecutiva del cliente dentro de una ventana de días (ej.:
 * plan de adherencia de Mounjaro en Farmacias Benavides: 20 % → 25 % → 30 %
 * → 35 % en la 1ª a 4ª compra, con ventana de 35 días). Reusa el campo
 * `discountTiers` de `descuento_escalonado`: aquí `umbral` es el ordinal de
 * compra consecutiva, no unidades/monto — por eso NO se renderiza como
 * input editable (a diferencia de `DiscountTiersBuilder`): se recalcula a
 * "1, 2, 3…" cada vez que se agrega o quita un escalón, así nunca queda un
 * hueco o un umbral repetido.
 *
 * Orden pedagógico deliberado (no el orden de columnas de la base de
 * datos): 1) la escalera — el corazón de la regla, 2) la regla de
 * continuidad que la mueve, 3) esa misma configuración leída como una
 * frase (`describeContinuityRule`) para confirmar sin interpretar 6 campos
 * sueltos, 4) los casos especiales (menos frecuentes de tocar), 5) un
 * simulador para probar antes de guardar.
 */
export function ContinuityForm({
  control,
  register,
  errors,
  setValue,
  products,
  onGoToConditionsStep,
}: ContinuityFormProps) {
  const { fields, append, replace } = useFieldArray({
    control,
    name: "discountTiers",
  })
  const tiers = useWatch({ control, name: "discountTiers" }) ?? []
  const productoCompradoId = useWatch({ control, name: "productoCompradoId" })
  const ventanaContinuidadDias = useWatch({
    control,
    name: "ventanaContinuidadDias",
  })
  const alRomperContinuidad = useWatch({
    control,
    name: "alRomperContinuidad",
  })
  const acumulaRetroactivo = useWatch({ control, name: "acumulaRetroactivo" })
  const efectoDevolucion = useWatch({ control, name: "efectoDevolucion" })
  const criterioSeleccionPiezas = useWatch({
    control,
    name: "criterioSeleccionPiezas",
  })

  const [previewPurchase, setPreviewPurchase] = useState(1)
  const [previewDays, setPreviewDays] = useState(20)
  const validTiers = tiers.filter((t) => t.umbral > 0 && t.beneficio_valor > 0)
  const preview = computeContinuityDiscount(
    {
      tiers: validTiers,
      windowDays: ventanaContinuidadDias ?? 0,
      onBreak: alRomperContinuidad ?? "reiniciar",
    },
    {
      previousTier: Math.max(0, previewPurchase - 1),
      daysSincePrevious: previewPurchase === 1 ? null : previewDays,
    }
  )
  const ruleDescription = describeContinuityRule(
    validTiers,
    ventanaContinuidadDias,
    alRomperContinuidad
  )

  function addTier() {
    const last = tiers.at(-1)
    append({
      umbral: tiers.length + 1,
      beneficio_valor: last ? Math.min(100, last.beneficio_valor + 5) : 20,
    })
  }

  function removeTier(index: number) {
    replace(
      tiers
        .filter((_, i) => i !== index)
        .map((tier, i) => ({ ...tier, umbral: i + 1 }))
    )
  }

  const tiersError =
    errors.discountTiers?.root?.message ?? errors.discountTiers?.message

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Message
          variant="info"
          title="¿A qué productos aplica?"
          description='El alcance general (marca, categoría, proveedor) se define en el paso "Condiciones" (2) — igual que el resto de mecánicas. Si además quieres acotar a UN producto puntual (ej. una presentación específica), hazlo abajo.'
        />
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onGoToConditionsStep}
          className="h-auto w-fit p-0"
        >
          Ir al paso Condiciones →
        </Button>
      </div>

      <Field
        label="Producto específico (opcional)"
        htmlFor="productoCompradoId"
        hint="Vacío = aplica a todos los productos que cumplan las condiciones (marca/categoría)."
        error={errors.productoCompradoId?.message}
      >
        <EntityPickerField
          id="productoCompradoId"
          title="Producto"
          description="Busca por nombre, SKU o marca."
          mode="single"
          items={products}
          getId={(p) => p.id}
          getSearchText={productPickerSearchText}
          getChipLabel={productPickerChipLabel}
          renderRow={(p) => <ProductPickerRow product={p} />}
          facets={[productBrandFacet(products)]}
          placeholder="Cualquier producto que cumpla las condiciones"
          confirmLabel="Elegir producto"
          value={productoCompradoId ? [productoCompradoId] : []}
          onValueChange={([id]) => setValue("productoCompradoId", id)}
        />
      </Field>

      <Field
        label="1. Escalones de continuidad"
        required
        hint="El descuento de cada compra consecutiva — debe crecer, compra a compra."
      >
        <div className="flex flex-col gap-2">
          {fields.length === 0 && (
            <div className="flex flex-col gap-2 rounded-[10px] border border-dashed border-border px-3 py-3">
              <p className="text-xs text-muted-foreground">
                Sin escalones todavía. Empieza de cero o parte de un ejemplo
                editable.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => replace(EXAMPLE_TIERS)}
                className="w-fit"
              >
                Usar ejemplo: 20 % → 25 % → 30 % → 35 %
              </Button>
            </div>
          )}
          {fields.map((field, index) => {
            const rowError = errors.discountTiers?.[index]?.beneficio_valor
            const previousValue = tiers[index - 1]?.beneficio_valor
            const currentValue = tiers[index]?.beneficio_valor
            const delta =
              index > 0 &&
              typeof previousValue === "number" &&
              typeof currentValue === "number"
                ? currentValue - previousValue
                : null
            return (
              <div key={field.id} className="flex flex-col gap-1">
                <div className="flex w-full items-center gap-2.5 rounded-[10px] border border-border bg-neutral-50 px-3 py-2.5">
                  <span className="w-20 shrink-0 text-xs font-medium text-secondary-foreground">
                    Compra {index + 1}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    →
                  </span>
                  <div className="min-w-0 flex-1">
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
                    {rowError?.message && (
                      <p className="mt-1 text-[11px] text-destructive">
                        {rowError.message}
                      </p>
                    )}
                  </div>
                  {delta !== null && (
                    <span
                      className={
                        delta > 0
                          ? "shrink-0 text-[11px] font-medium text-success"
                          : "shrink-0 text-[11px] font-medium text-destructive"
                      }
                    >
                      {delta > 0 ? `+${delta} pts` : "no crece"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    aria-label="Eliminar escalón"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
          {tiersError && (
            <p className="text-[11px] text-destructive">{tiersError}</p>
          )}
          {fields.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addTier}
              disabled={fields.length >= MAX_TIERS}
              className="w-fit"
            >
              <Plus className="size-3.5" />
              Agregar escalón
            </Button>
          )}
        </div>
      </Field>

      <div className="flex flex-col gap-2.5">
        <SubsectionLabel>2. Continuidad entre compras</SubsectionLabel>
        <Row>
          <Field
            label="Ventana de continuidad (días)"
            htmlFor="ventanaContinuidadDias"
            required
            hint="Días máximos entre dos compras para conservar el escalón alcanzado."
            error={errors.ventanaContinuidadDias?.message}
          >
            <Input
              id="ventanaContinuidadDias"
              type="number"
              step="1"
              min="1"
              max="365"
              placeholder="35"
              {...register("ventanaContinuidadDias", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
          </Field>
          <Field
            label="Al exceder la ventana"
            error={errors.alRomperContinuidad?.message}
          >
            <Segmented
              options={BREAK_OPTIONS}
              value={alRomperContinuidad ?? ""}
              onValueChange={(v) =>
                setValue("alRomperContinuidad", v as ContinuityBreakBehavior)
              }
              stretch
            />
          </Field>
        </Row>
      </div>

      {ruleDescription && (
        <div className="rounded-[10px] border border-primary/30 bg-brand-subtle px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-[0.2px] text-primary-800 uppercase">
            Así queda la regla
          </p>
          <p className="mt-1 text-xs text-primary-800">{ruleDescription}</p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <SubsectionLabel>3. Casos especiales</SubsectionLabel>
        <Row>
          <Field
            label="Efecto de una devolución"
            error={errors.efectoDevolucion?.message}
          >
            <Segmented
              options={RETURN_EFFECT_OPTIONS}
              value={efectoDevolucion ?? ""}
              onValueChange={(v) =>
                setValue("efectoDevolucion", v as ReturnEffect)
              }
              stretch
            />
          </Field>
          <Field
            label="Piezas que reciben el beneficio"
            hint="Cuando el límite de piezas del paso Límites topa las unidades elegibles."
            error={errors.criterioSeleccionPiezas?.message}
          >
            <Segmented
              options={PIECE_SELECTION_OPTIONS}
              value={criterioSeleccionPiezas ?? ""}
              onValueChange={(v) =>
                setValue(
                  "criterioSeleccionPiezas",
                  v as PieceSelectionCriterion
                )
              }
              stretch
            />
          </Field>
          <Field
            label="Acumula compras retroactivas"
            htmlFor="acumulaRetroactivo"
            hint="No, si la racha solo cuenta desde que se activa la promoción."
          >
            <Select
              value={acumulaRetroactivo ? "si" : "no"}
              onValueChange={(v) => setValue("acumulaRetroactivo", v === "si")}
            >
              <SelectTrigger id="acumulaRetroactivo">
                <SelectValue>
                  {(v: "si" | "no") => (v === "si" ? "Sí" : "No")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="si">Sí</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Row>
      </div>

      {validTiers.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-dashed border-border px-3 py-2.5">
          <SubsectionLabel>Simular una compra</SubsectionLabel>
          <div className="flex items-center gap-3.5">
            <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
              N.º de compra
              <Input
                type="number"
                min="1"
                value={previewPurchase}
                onChange={(e) =>
                  setPreviewPurchase(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </label>
            {previewPurchase > 1 && (
              <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
                Días desde la anterior
                <Input
                  type="number"
                  min="0"
                  value={previewDays}
                  onChange={(e) =>
                    setPreviewDays(Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </label>
            )}
          </div>
          <p className="text-xs text-foreground">
            {preview.tier === 0
              ? "Sin escalones válidos."
              : `Escalón ${preview.tier}: ${preview.discount} % de descuento${
                  preview.brokeContinuity
                    ? " (rompió la ventana de continuidad)"
                    : ""
                }`}
          </p>
        </div>
      )}
    </div>
  )
}
