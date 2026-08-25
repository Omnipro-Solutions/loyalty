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
import { WALLET_VALUE_TYPES, type WalletValueType } from "@/types/domain"

import { WALLET_VALUE_TYPE_LABEL } from "../../lib/labels"
import type { PromotionValues } from "../../schemas"

type CashbackFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
}

/** Mecánica `cashback` (T13) — devuelve saldo en efectivo al monedero, distinto del ledger de puntos: tiene su propia tasa de disponibilidad y vigencia. */
export function CashbackForm({
  control,
  register,
  errors,
  setValue,
}: CashbackFormProps) {
  const tipoMonedero = useWatch({ control, name: "tipoMonedero" })

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Row>
        <Field label="Tipo de cashback" htmlFor="tipoMonedero">
          <Select
            value={tipoMonedero}
            onValueChange={(v) =>
              setValue("tipoMonedero", v as WalletValueType)
            }
          >
            <SelectTrigger id="tipoMonedero">
              <SelectValue>
                {(v: WalletValueType) => WALLET_VALUE_TYPE_LABEL[v]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WALLET_VALUE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {WALLET_VALUE_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={tipoMonedero === "monto_fijo" ? "Monto" : "Porcentaje"}
          htmlFor="benefitValue"
          required
          error={errors.benefitValue?.message}
        >
          {tipoMonedero === "monto_fijo" ? (
            <CurrencyInput
              id="benefitValue"
              {...register("benefitValue", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
          ) : (
            <Input
              id="benefitValue"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              {...register("benefitValue", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
          )}
        </Field>
        <Field
          label="Monto mínimo de canje (opcional)"
          htmlFor="montoMinimoCanje"
          error={errors.montoMinimoCanje?.message}
        >
          <CurrencyInput
            id="montoMinimoCanje"
            {...register("montoMinimoCanje", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
      </Row>
      <Row>
        <Field
          label="Disponible a partir de (días, opcional)"
          htmlFor="disponibilidadDias"
          hint="Ventana de devolución antes de que el saldo quede disponible."
          error={errors.disponibilidadDias?.message}
        >
          <Input
            id="disponibilidadDias"
            type="number"
            min="0"
            {...register("disponibilidadDias", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
        <Field
          label="Vigencia del saldo (días, opcional)"
          htmlFor="vigenciaSaldoDias"
          error={errors.vigenciaSaldoDias?.message}
        >
          <Input
            id="vigenciaSaldoDias"
            type="number"
            min="1"
            {...register("vigenciaSaldoDias", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
      </Row>
    </div>
  )
}
