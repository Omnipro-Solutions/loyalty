"use client"

import { Plus } from "lucide-react"
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"

import { Chip } from "@/components/filters/chip"
import { Button } from "@/components/ui/button"
import type { BenefitType } from "@/types/domain"

import { formatLimitRow } from "../lib/labels"
import { defaultLimitRow, limitTemplatesFor } from "../lib/limits"
import { LimitRow } from "./limit-row"
import type { PromotionValues } from "../schemas"

type LimitsBuilderProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  benefitType: BenefitType
}

/**
 * Constructor de límites (docs/modalidades-promocion-contexto.md L01–L23):
 * en vez de 23 campos, cada límite es una fila con las mismas 4
 * dimensiones. Los "sugeridos" son un atajo de un clic según la mecánica
 * elegida — no un campo obligatorio más. Mismo patrón de `useFieldArray`
 * que `DiscountTiersBuilder`.
 */
export function LimitsBuilder({
  control,
  register,
  errors,
  setValue,
  benefitType,
}: LimitsBuilderProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "limites",
  })
  const suggestions = limitTemplatesFor(benefitType)

  return (
    <div className="flex w-full flex-col gap-3">
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sin límites — la promoción no tiene tope de uso.
        </p>
      )}
      <div className="flex w-full flex-col gap-2">
        {fields.map((field, index) => (
          <LimitRow
            key={field.id}
            index={index}
            control={control}
            register={register}
            errors={errors}
            setValue={setValue}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(defaultLimitRow())}
        >
          <Plus className="size-3.5" />
          Añadir límite
        </Button>
        {suggestions.map((template, i) => (
          <Chip key={i} onClick={() => append(template)}>
            {formatLimitRow(template)}
          </Chip>
        ))}
      </div>
    </div>
  )
}
