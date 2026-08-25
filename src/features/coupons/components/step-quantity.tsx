"use client"

import { Field } from "@/components/form/field"
import { Section } from "@/components/form/section"
import { Input } from "@/components/ui/input"

type StepQuantityProps = {
  quantity: number | undefined
  error?: string
  onChange: (quantity: number) => void
}

/** Paso "Lote" (batch_anonymous): cuántos códigos sin titular generar. */
export function StepQuantity({ quantity, error, onChange }: StepQuantityProps) {
  return (
    <Section
      title="Lote anónimo"
      description="Códigos sin titular, para imprimir o repartir — se asocian a quien los canjee."
    >
      <Field
        label="Cantidad de códigos"
        error={error}
        required
        htmlFor="quantity"
      >
        <Input
          id="quantity"
          type="number"
          min={1}
          max={50000}
          value={quantity ?? ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      </Field>
    </Section>
  )
}
