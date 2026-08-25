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
import { Multiselect } from "@/components/form/multiselect"
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
  ACCRUAL_TIMINGS,
  BALANCE_INITIAL_STATES,
  BALANCE_TYPES,
  MULTIPLIER_RESOLUTION_MODES,
  TIER_NAMES,
  type AccrualTiming,
  type BalanceInitialState,
  type BalanceType,
  type MultiplierResolutionMode,
} from "@/types/domain"

import {
  ACCRUAL_TIMING_LABEL,
  BALANCE_INITIAL_STATE_LABEL,
  BALANCE_TYPE_LABEL,
  MULTIPLIER_RESOLUTION_MODE_LABEL,
  TIER_NAME_LABEL,
} from "../../lib/labels"
import type { PromotionValues } from "../../schemas"

type PointsMultiplierFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
}

const TIER_OPTIONS = TIER_NAMES.map((t) => ({
  value: t,
  label: TIER_NAME_LABEL[t],
}))

/**
 * Mecánica `multiplicador_puntos` — se aplica sobre el resultado del nivel
 * de lealtad (`tiers.multiplicador`), no lo reemplaza; ambos se multiplican
 * en cadena cuando exista el motor de puntos. "Niveles" vacío = aplica a
 * cualquier nivel.
 */
export function PointsMultiplierForm({
  control,
  register,
  errors,
  setValue,
}: PointsMultiplierFormProps) {
  const nivelesRequeridos =
    useWatch({ control, name: "nivelesRequeridos" }) ?? []
  const modoResolucionMultiplicador = useWatch({
    control,
    name: "modoResolucionMultiplicador",
  })
  const tipoSaldo = useWatch({ control, name: "tipoSaldo" })
  const momentoAcreditacion = useWatch({
    control,
    name: "momentoAcreditacion",
  })
  const estadoInicial = useWatch({ control, name: "estadoInicial" })

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Row>
        <Field
          label="Multiplicador"
          htmlFor="multiplicadorPuntos"
          required
          hint="Ej. 2 duplica los puntos, 1.5 los aumenta 50 %."
          error={errors.multiplicadorPuntos?.message}
        >
          <Input
            id="multiplicadorPuntos"
            type="number"
            step="0.1"
            min="0.1"
            placeholder="2"
            {...register("multiplicadorPuntos", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
        <Field
          label="Tope de puntos por ticket (opcional)"
          htmlFor="maxCap"
          hint="Sin tope, una compra grande genera pasivo por años."
          error={errors.maxCap?.message}
        >
          <CurrencyInput
            id="maxCap"
            {...register("maxCap", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
      </Row>
      <Row>
        <Field
          label="Niveles requeridos (opcional)"
          hint="Vacío = aplica a cualquier nivel de lealtad."
        >
          <Multiselect
            options={TIER_OPTIONS}
            value={nivelesRequeridos}
            onValueChange={(v) =>
              setValue(
                "nivelesRequeridos",
                v as PromotionValues["nivelesRequeridos"]
              )
            }
          />
        </Field>
        <Field
          label="Si otro multiplicador también aplica"
          htmlFor="modoResolucionMultiplicador"
          hint="«Se multiplican entre sí» es exponencial — nunca elegirlo por default."
        >
          <Select
            value={modoResolucionMultiplicador}
            onValueChange={(v) =>
              setValue(
                "modoResolucionMultiplicador",
                v as MultiplierResolutionMode
              )
            }
          >
            <SelectTrigger id="modoResolucionMultiplicador">
              <SelectValue>
                {(v: MultiplierResolutionMode) =>
                  MULTIPLIER_RESOLUTION_MODE_LABEL[v]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MULTIPLIER_RESOLUTION_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {MULTIPLIER_RESOLUTION_MODE_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Row>
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
    </div>
  )
}
