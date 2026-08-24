"use client"

import { RadioGroup } from "@/components/ui/radio-group"
import { RadioCard } from "@/components/form/radio-card"
import { Section } from "@/components/form/section"
import { COUPON_ORIGINS, type CouponOrigin } from "@/types/domain"

import { COUPON_ORIGIN_LABEL } from "../lib/labels"

const ORIGIN_DESCRIPTION: Record<CouponOrigin, string> = {
  manual_customer: "1 cupón, titular conocido.",
  manual_bearer: "1 cupón sin titular; se asocia a quien lo canjee.",
  points_redemption: "El saldo del cliente se transforma en valor.",
  batch_audience: "Un cupón por persona de una audiencia del CDP.",
  batch_anonymous: "N códigos sin titular, para imprimir o repartir.",
  csv_import: "Una fila = un cupón; sin coincidencia, al portador.",
}

type StepOriginProps = {
  value: CouponOrigin
  onChange: (value: CouponOrigin) => void
}

export function StepOrigin({ value, onChange }: StepOriginProps) {
  return (
    <Section
      title="Origen de la emisión"
      description="Determina los pasos siguientes del asistente."
    >
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as CouponOrigin)}
        className="grid grid-cols-2 gap-3"
      >
        {COUPON_ORIGINS.map((origin) => (
          <RadioCard
            key={origin}
            value={origin}
            title={COUPON_ORIGIN_LABEL[origin]}
            description={ORIGIN_DESCRIPTION[origin]}
            className="w-full"
          />
        ))}
      </RadioGroup>
    </Section>
  )
}
