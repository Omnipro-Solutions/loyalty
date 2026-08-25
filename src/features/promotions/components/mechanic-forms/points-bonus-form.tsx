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
import { Stepper } from "@/components/form/stepper"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ACCRUAL_TIMINGS,
  BALANCE_INITIAL_STATES,
  BALANCE_TYPES,
  ENROLLMENT_REQUIREMENTS,
  TRIGGER_EVENTS,
  type AccrualTiming,
  type BalanceInitialState,
  type BalanceType,
  type EnrollmentRequirement,
  type TriggerEvent,
} from "@/types/domain"

import {
  ACCRUAL_TIMING_LABEL,
  BALANCE_INITIAL_STATE_LABEL,
  BALANCE_TYPE_LABEL,
  ENROLLMENT_REQUIREMENT_LABEL,
  TRIGGER_EVENT_LABEL,
} from "../../lib/labels"
import type { PromotionValues } from "../../schemas"

type PointsBonusFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
}

/**
 * Mecánica `bono_puntos` — puntos extra fijos, sin tocar el precio. "¿Qué
 * evento dispara la regla?" cubre T23 (bono por evento del ciclo de vida
 * del socio: alta, cumpleaños, cambio de nivel…) como alterno al monto de
 * carrito.
 */
export function PointsBonusForm({
  control,
  register,
  errors,
  setValue,
}: PointsBonusFormProps) {
  const bonoPuntos = useWatch({ control, name: "bonoPuntos" }) ?? 100
  const eventoGatillo = useWatch({ control, name: "eventoGatillo" })
  const tipoSaldo = useWatch({ control, name: "tipoSaldo" })
  const momentoAcreditacion = useWatch({
    control,
    name: "momentoAcreditacion",
  })
  const estadoInicial = useWatch({ control, name: "estadoInicial" })
  const requisitoAlta = useWatch({ control, name: "requisitoAlta" })
  const elegibleEnInactividad = useWatch({
    control,
    name: "elegibleEnInactividad",
  })

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Row>
        <Field
          label="Puntos de bono"
          htmlFor="bonoPuntos"
          required
          error={errors.bonoPuntos?.message}
        >
          <Stepper
            value={bonoPuntos}
            onValueChange={(v) => setValue("bonoPuntos", v)}
            min={1}
            max={10000}
            step={50}
          />
        </Field>
        <Field
          label="Monto mínimo del carrito (opcional)"
          htmlFor="montoMinimoDisparo"
          hint="Deja vacío para que el bono aplique sin mínimo de compra."
          error={errors.montoMinimoDisparo?.message}
        >
          <CurrencyInput
            id="montoMinimoDisparo"
            {...register("montoMinimoDisparo", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
      </Row>
      <Field
        label="¿Qué evento dispara la regla? (opcional)"
        htmlFor="eventoGatillo"
        hint="Ej. alta de socio, cumpleaños, cambio de nivel."
      >
        <Select
          value={eventoGatillo ?? ""}
          onValueChange={(v) =>
            setValue("eventoGatillo", (v || undefined) as TriggerEvent)
          }
        >
          <SelectTrigger id="eventoGatillo">
            <SelectValue placeholder="Solo por monto de carrito">
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
      <Row>
        <Field
          label="Tipo de saldo"
          htmlFor="tipoSaldo"
          hint="Calificador solo cuenta para nivel, no se puede canjear."
        >
          <Select
            value={tipoSaldo}
            onValueChange={(v) => setValue("tipoSaldo", v as BalanceType)}
          >
            <SelectTrigger id="tipoSaldo">
              <SelectValue>
                {(v: BalanceType) => BALANCE_TYPE_LABEL[v]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BALANCE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {BALANCE_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Momento de acreditación"
          htmlFor="momentoAcreditacion"
          hint="Diferido implica saldo inicial «pendiente»."
        >
          <Select
            value={momentoAcreditacion}
            onValueChange={(v) =>
              setValue("momentoAcreditacion", v as AccrualTiming)
            }
          >
            <SelectTrigger id="momentoAcreditacion">
              <SelectValue>
                {(v: AccrualTiming) => ACCRUAL_TIMING_LABEL[v]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ACCRUAL_TIMINGS.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACCRUAL_TIMING_LABEL[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado inicial del saldo" htmlFor="estadoInicial">
          <Select
            value={estadoInicial}
            onValueChange={(v) =>
              setValue("estadoInicial", v as BalanceInitialState)
            }
          >
            <SelectTrigger id="estadoInicial">
              <SelectValue>
                {(v: BalanceInitialState) => BALANCE_INITIAL_STATE_LABEL[v]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BALANCE_INITIAL_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {BALANCE_INITIAL_STATE_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Row>
      <Row>
        <Field
          label="Requisito de alta (opcional)"
          htmlFor="requisitoAlta"
          hint="Ej. exige perfil completo antes de otorgar el bono."
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
          hint="Si el socio está inactivo, ¿igual recibe este bono?"
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
