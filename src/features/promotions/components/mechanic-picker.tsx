"use client"

import type { UseFormSetValue } from "react-hook-form"

import { RadioCard } from "@/components/form/radio-card"
import { Section } from "@/components/form/section"
import { RadioGroup } from "@/components/ui/radio-group"
import {
  BENEFIT_TYPES,
  type BenefitType,
  type PromotionType,
} from "@/types/domain"

import { suggestedCostNature } from "../lib/cost-nature"
import { BENEFIT_TYPE_DESCRIPTION, BENEFIT_TYPE_LABEL } from "../lib/labels"
import {
  ALL_MECHANIC_SPECIFIC_FIELDS,
  MECHANIC_FIELDS,
  PROMOTION_TYPE_MECHANICS,
} from "../lib/mechanic-fields"
import type { PromotionValues } from "../schemas"

type MechanicPickerProps = {
  value: BenefitType
  promotionType: PromotionType
  onChange: (value: BenefitType) => void
  setValue: UseFormSetValue<PromotionValues>
}

/**
 * Valor al que se resetea cada campo al limpiarlo (en vez de `undefined`)
 * — SOLO para los campos de `ALL_MECHANIC_SPECIFIC_FIELDS` que en
 * `schemas.ts` son de tipo base obligatorio (`applyTo`, `discountTiers`,
 * `thresholdType`, `tierCalculationMode`: ninguno tiene `.optional()`, a
 * diferencia de `compraCantidad`/`multiplicadorPuntos`/etc.). Poner
 * `undefined` en un campo obligatorio rompe el schema BASE (no el
 * `superRefine`) — y un schema base roto salta el `superRefine` entero,
 * exactamente como el bug de `NaN` ya documentado en
 * `discount-tiers-builder.tsx`: `trigger()` del paso "Configuración" deja
 * de ver los errores reales de la mecánica activa y "Siguiente" avanza con
 * datos inválidos. Detectado en vivo: al elegir `por_piezas`, esto dejaba
 * `compraCantidad`/`pagaCantidad` sin validar.
 */
const MECHANIC_FIELD_RESET_VALUE: Partial<
  Record<(typeof ALL_MECHANIC_SPECIFIC_FIELDS)[number], unknown>
> = {
  applyTo: "subtotal_carrito",
  discountTiers: [],
  thresholdType: "unidades",
  tierCalculationMode: "escalon_unico",
  productosBundleIds: [],
  nivelesRequeridos: [],
  modoResolucionMultiplicador: "gana_mayor",
  tipoBeneficioNoTransaccional: "envio_gratis",
  hastaAgotarExistencias: false,
  respetaPrecioMinimoLegal: true,
  tipoMonedero: "porcentaje",
  mezclaEnUniverso: true,
  tipoSaldo: "canjeable",
  momentoAcreditacion: "inmediato",
  estadoInicial: "disponible",
  registraUso: false,
  devolucionSiVence: false,
  elegibleEnInactividad: false,
  acumulaRetroactivo: false,
}

/**
 * Limpia los campos propios de todas las mecánicas salvo `next` y sugiere
 * la naturaleza de costo — se extrae del picker para reusarla también
 * cuando "Tipo de promoción" cambia y fuerza un cambio de mecánica (ver
 * `promotion-form.tsx`), sin duplicar la lógica de limpieza.
 */
export function applyMechanicChange(
  next: BenefitType,
  setValue: UseFormSetValue<PromotionValues>
) {
  const keep = new Set(MECHANIC_FIELDS[next])
  // `setValue` está tipado para exigir un `name` literal cuyo tipo de
  // valor combina con ese campo — recorrer una lista dinámica de campos
  // (`ALL_MECHANIC_SPECIFIC_FIELDS`) no calza con esa sobrecarga, así que
  // se relaja el tipo solo dentro de este loop de limpieza.
  const clear = setValue as unknown as (
    field: (typeof ALL_MECHANIC_SPECIFIC_FIELDS)[number],
    fieldValue: unknown
  ) => void
  for (const field of ALL_MECHANIC_SPECIFIC_FIELDS) {
    if (keep.has(field)) continue
    clear(field, MECHANIC_FIELD_RESET_VALUE[field])
  }
  // Paso "Economía": la naturaleza de costo se sugiere por mecánica
  // (confirmar, no rellenar) — el operador puede volver a cambiarla ahí.
  setValue("naturalezaCosto", suggestedCostNature(next))
  // T03 · "debe declararse no acumulable por defecto" — sugerencia, no
  // un bloqueo: el operador puede volver a marcarla acumulable.
  if (next === "precio_especial") setValue("stackable", false)
}

/**
 * Paso "Mecánica" — mismo patrón que
 * `features/coupons/components/step-origin.tsx` (`RadioGroup` +
 * `RadioCard`), con 10 tarjetas en vez de 2. Al cambiar de mecánica limpia
 * los campos propios de TODAS las demás (bug #3 de la revisión: react-hook-
 * form no desregistra valores de inputs que dejan de montarse) — doble
 * seguro junto al null-out de `toRow()` en `actions/promotions.ts`.
 *
 * Solo se ofrecen las mecánicas asociadas a `promotionType`
 * (`PROMOTION_TYPE_MECHANICS`, decisión de producto — `tipo` no trae esa
 * regla desde el modelo de datos). La mecánica ya elegida se sigue
 * mostrando aunque no esté en esa lista, para no esconder de golpe una
 * combinación guardada antes de que existiera este filtro.
 */
export function MechanicPicker({
  value,
  promotionType,
  onChange,
  setValue,
}: MechanicPickerProps) {
  function handleChange(next: BenefitType) {
    applyMechanicChange(next, setValue)
    onChange(next)
  }

  const allowed = PROMOTION_TYPE_MECHANICS[promotionType]
  const visibleTypes = BENEFIT_TYPES.filter(
    (type) => allowed.includes(type) || type === value
  )

  return (
    <Section
      title="Mecánica"
      description="El tipo de beneficio determina qué campos de configuración siguen."
    >
      <RadioGroup
        value={value}
        onValueChange={(v) => handleChange(v as BenefitType)}
        className="grid grid-cols-3 gap-3"
      >
        {visibleTypes.map((type) => (
          <RadioCard
            key={type}
            value={type}
            title={BENEFIT_TYPE_LABEL[type]}
            description={BENEFIT_TYPE_DESCRIPTION[type]}
            className="w-full"
          />
        ))}
      </RadioGroup>
    </Section>
  )
}
