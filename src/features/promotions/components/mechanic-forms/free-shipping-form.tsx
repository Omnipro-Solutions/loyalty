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
  NON_TRANSACTIONAL_BENEFIT_TYPES,
  type NonTransactionalBenefitType,
} from "@/types/domain"

import { NON_TRANSACTIONAL_BENEFIT_TYPE_LABEL } from "../../lib/labels"
import type { PromotionValues } from "../../schemas"

type FreeShippingFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
}

/**
 * Mecánica `envio_gratis`, como "beneficio no transaccional" (T17): el
 * envío gratis es solo uno de los 4 sub-tipos que el documento agrupa
 * bajo esta modalidad — el sub-tipo elegido no cambia el precio del
 * producto, solo qué beneficio se otorga y cómo se valida.
 */
export function FreeShippingForm({
  control,
  register,
  errors,
  setValue,
}: FreeShippingFormProps) {
  const tipoBeneficioNoTransaccional = useWatch({
    control,
    name: "tipoBeneficioNoTransaccional",
  })
  const registraUso = useWatch({ control, name: "registraUso" })

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Row>
        <Field label="Tipo de beneficio" htmlFor="tipoBeneficioNoTransaccional">
          <Select
            value={tipoBeneficioNoTransaccional}
            onValueChange={(v) =>
              setValue(
                "tipoBeneficioNoTransaccional",
                v as NonTransactionalBenefitType
              )
            }
          >
            <SelectTrigger id="tipoBeneficioNoTransaccional">
              <SelectValue>
                {(v: NonTransactionalBenefitType) =>
                  NON_TRANSACTIONAL_BENEFIT_TYPE_LABEL[v]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {NON_TRANSACTIONAL_BENEFIT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {NON_TRANSACTIONAL_BENEFIT_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Monto mínimo del carrito (opcional)"
          htmlFor="montoMinimoDisparo"
          hint="Deja vacío para que aplique sin mínimo de compra."
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
      <Row>
        <Field
          label="Validación requerida (opcional)"
          htmlFor="validacionRequerida"
          hint="Ej. «Presentar tarjeta»."
          error={errors.validacionRequerida?.message}
        >
          <Input
            id="validacionRequerida"
            placeholder="Presentar tarjeta"
            {...register("validacionRequerida")}
          />
        </Field>
        <Field
          label="Cupo disponible (opcional)"
          htmlFor="cupoDisponible"
          error={errors.cupoDisponible?.message}
        >
          <Input
            id="cupoDisponible"
            type="number"
            min="1"
            {...register("cupoDisponible", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
      </Row>
      <Field
        label="Registrar uso del cupo"
        htmlFor="registraUso"
        hint="Necesario para que el cupo disponible se agote de verdad (S21)."
      >
        <Select
          value={registraUso ? "si" : "no"}
          onValueChange={(v) => setValue("registraUso", v === "si")}
        >
          <SelectTrigger id="registraUso">
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
    </div>
  )
}
