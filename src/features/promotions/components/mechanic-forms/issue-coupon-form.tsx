"use client"

import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"

import { CurrencyInput } from "@/components/form/currency-input"
import { Field } from "@/components/form/field"
import { Row } from "@/components/form/row"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ENROLLMENT_REQUIREMENTS,
  POINTS_DEBIT_TIMINGS,
  TRIGGER_EVENTS,
  TRIGGER_FREQUENCIES,
  TRIGGER_RESOLUTION_MOMENTS,
  type EnrollmentRequirement,
  type PointsDebitTiming,
  type TriggerEvent,
  type TriggerFrequency,
  type TriggerResolutionMoment,
} from "@/types/domain"

import {
  ENROLLMENT_REQUIREMENT_LABEL,
  POINTS_DEBIT_TIMING_LABEL,
  TRIGGER_EVENT_LABEL,
  TRIGGER_FREQUENCY_LABEL,
  TRIGGER_RESOLUTION_MOMENT_LABEL,
} from "../../lib/labels"
import type { CouponBatchOption } from "../../lib/queries"
import type { PromotionValues } from "../../schemas"

type IssueCouponFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  couponBatches: CouponBatchOption[]
}

/**
 * Mecánica `emitir_cupon` — dispara una emisión real del módulo de Cupones
 * (referencia una `coupon_batch` ya creada, no crea una nueva aquí).
 * "Umbral de puntos"/"Duración del cupón" cubren T14 (cupón por umbral de
 * puntos) como disparador alterno al monto de carrito — ambos disparos
 * son opcionales y no se excluyen entre sí.
 */
export function IssueCouponForm({
  control,
  register,
  errors,
  setValue,
  couponBatches,
}: IssueCouponFormProps) {
  const couponBatchId = useWatch({ control, name: "couponBatchId" })
  const eventoGatillo = useWatch({ control, name: "eventoGatillo" })
  const momentoResolucion = useWatch({ control, name: "momentoResolucion" })
  const frecuenciaDisparo = useWatch({ control, name: "frecuenciaDisparo" })
  const umbralPuntos = useWatch({ control, name: "umbralPuntos" })
  const momentoDebitoPuntos = useWatch({
    control,
    name: "momentoDebitoPuntos",
  })
  const devolucionSiVence = useWatch({ control, name: "devolucionSiVence" })
  const requisitoAlta = useWatch({ control, name: "requisitoAlta" })
  const elegibleEnInactividad = useWatch({
    control,
    name: "elegibleEnInactividad",
  })

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Row>
        <Field
          label="Emisión de cupones"
          htmlFor="couponBatchId"
          required
          hint="Referencia una emisión ya creada en el módulo de Cupones."
          error={errors.couponBatchId?.message}
        >
          <Select
            value={couponBatchId ?? ""}
            onValueChange={(v) => v && setValue("couponBatchId", v)}
          >
            <SelectTrigger id="couponBatchId">
              <SelectValue placeholder="Elige una emisión">
                {(v: string) => {
                  const batch = couponBatches.find((b) => b.id === v)
                  return batch ? `${batch.name} · ${batch.reference}` : v
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {couponBatches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} · {b.reference}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Monto mínimo del carrito (opcional)"
          htmlFor="montoMinimoDisparo"
          error={errors.montoMinimoDisparo?.message}
        >
          <CurrencyInput
            id="montoMinimoDisparo"
            {...register("montoMinimoDisparo", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
        <Field
          label="Umbral de puntos (opcional)"
          htmlFor="umbralPuntos"
          hint="Disparador alterno al monto de carrito (T14)."
          error={errors.umbralPuntos?.message}
        >
          <Input
            id="umbralPuntos"
            type="number"
            min="1"
            {...register("umbralPuntos", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
      </Row>
      <Field
        label="Motivo de la emisión"
        htmlFor="motivoEmision"
        required
        hint="Se guarda como referencia interna — mínimo 5 caracteres."
        error={errors.motivoEmision?.message}
      >
        <Input
          id="motivoEmision"
          placeholder="Ej. Recompensa por compra de temporada"
          {...register("motivoEmision")}
        />
      </Field>
      <Row>
        <Field
          label="Duración del cupón emitido en días (opcional)"
          htmlFor="duracionCuponDias"
          error={errors.duracionCuponDias?.message}
        >
          <Input
            id="duracionCuponDias"
            type="number"
            min="1"
            {...register("duracionCuponDias", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
        <Field
          label="¿Qué otro evento dispara la regla? (opcional)"
          htmlFor="eventoGatillo"
        >
          <Select
            value={eventoGatillo ?? ""}
            onValueChange={(v) =>
              setValue("eventoGatillo", (v || undefined) as TriggerEvent)
            }
          >
            <SelectTrigger id="eventoGatillo">
              <SelectValue placeholder="Sin evento adicional">
                {(v: TriggerEvent) => TRIGGER_EVENT_LABEL[v]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_EVENTS.map((e) => (
                <SelectItem key={e} value={e}>
                  {TRIGGER_EVENT_LABEL[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Row>
      {eventoGatillo && (
        <Row>
          <Field
            label="¿En qué momento se resuelve?"
            htmlFor="momentoResolucion"
          >
            <Select
              value={momentoResolucion ?? ""}
              onValueChange={(v) =>
                setValue(
                  "momentoResolucion",
                  (v || undefined) as TriggerResolutionMoment
                )
              }
            >
              <SelectTrigger id="momentoResolucion">
                <SelectValue placeholder="Elige un momento">
                  {(v: TriggerResolutionMoment) =>
                    TRIGGER_RESOLUTION_MOMENT_LABEL[v]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_RESOLUTION_MOMENTS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {TRIGGER_RESOLUTION_MOMENT_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="¿Cuántas veces puede dispararse?"
            htmlFor="frecuenciaDisparo"
          >
            <Select
              value={frecuenciaDisparo ?? ""}
              onValueChange={(v) =>
                setValue(
                  "frecuenciaDisparo",
                  (v || undefined) as TriggerFrequency
                )
              }
            >
              <SelectTrigger id="frecuenciaDisparo">
                <SelectValue placeholder="Elige una frecuencia">
                  {(v: TriggerFrequency) => TRIGGER_FREQUENCY_LABEL[v]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {TRIGGER_FREQUENCY_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Row>
      )}
      {umbralPuntos !== undefined && (
        <Field
          label="¿Cuándo se debitan los puntos del umbral?"
          htmlFor="momentoDebitoPuntos"
          hint="Financian el cupón — declara el momento del débito (S09)."
          error={errors.momentoDebitoPuntos?.message}
        >
          <Select
            value={momentoDebitoPuntos ?? ""}
            onValueChange={(v) =>
              setValue(
                "momentoDebitoPuntos",
                (v || undefined) as PointsDebitTiming
              )
            }
          >
            <SelectTrigger id="momentoDebitoPuntos">
              <SelectValue placeholder="Elige un momento">
                {(v: PointsDebitTiming) => POINTS_DEBIT_TIMING_LABEL[v]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {POINTS_DEBIT_TIMINGS.map((t) => (
                <SelectItem key={t} value={t}>
                  {POINTS_DEBIT_TIMING_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <Row>
        <Field
          label="Si el cupón vence sin usarse"
          htmlFor="devolucionSiVence"
          hint="¿Se devuelven los puntos que lo financiaron?"
        >
          <Select
            value={devolucionSiVence ? "si" : "no"}
            onValueChange={(v) => setValue("devolucionSiVence", v === "si")}
          >
            <SelectTrigger id="devolucionSiVence">
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
        <Field
          label="Requisito de alta (opcional)"
          htmlFor="requisitoAlta"
          hint="Ej. exige perfil completo antes de emitir el cupón."
        >
          <Select
            value={requisitoAlta ?? ""}
            onValueChange={(v) =>
              setValue(
                "requisitoAlta",
                (v || undefined) as EnrollmentRequirement
              )
            }
          >
            <SelectTrigger id="requisitoAlta">
              <SelectValue placeholder="Ninguno">
                {(v: EnrollmentRequirement) => ENROLLMENT_REQUIREMENT_LABEL[v]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ENROLLMENT_REQUIREMENTS.map((r) => (
                <SelectItem key={r} value={r}>
                  {ENROLLMENT_REQUIREMENT_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Elegible en inactividad"
          htmlFor="elegibleEnInactividad"
          hint="Si el socio está inactivo, ¿igual puede recibir este cupón?"
        >
          <Select
            value={elegibleEnInactividad ? "si" : "no"}
            onValueChange={(v) => setValue("elegibleEnInactividad", v === "si")}
          >
            <SelectTrigger id="elegibleEnInactividad">
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
  )
}
