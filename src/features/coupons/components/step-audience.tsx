"use client"

import { Field } from "@/components/form/field"
import { Section } from "@/components/form/section"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup } from "@/components/ui/radio-group"
import { RadioCard } from "@/components/form/radio-card"
import { formatNumber } from "@/lib/format"
import { COUPON_AUDIENCE_MODES, type CouponAudienceMode } from "@/types/domain"

import { COUPON_AUDIENCE_MODE_LABEL } from "../lib/labels"
import type { AudienceOption } from "../lib/queries"

type StepAudienceProps = {
  audiences: AudienceOption[]
  segmentId: string | undefined
  mode: CouponAudienceMode | undefined
  error?: string
  onSegmentChange: (id: string) => void
  onModeChange: (mode: CouponAudienceMode) => void
}

const MODE_DESCRIPTION: Record<CouponAudienceMode, string> = {
  dynamic: "La audiencia se resuelve al momento de generar los códigos.",
  frozen: "Se congela la lista de personas en este instante.",
}

/** Paso "Audiencia" (batch_audience): elige el segmento del CDP y si se resuelve al emitir o se congela ahora (doc §4.2). */
export function StepAudience({
  audiences,
  segmentId,
  mode,
  error,
  onSegmentChange,
  onModeChange,
}: StepAudienceProps) {
  const selected = audiences.find((a) => a.id === segmentId)

  return (
    <Section
      title="Audiencia"
      description="El segmento se resuelve del CDP — un cupón por cada persona resoluble."
    >
      <Field label="Audiencia" error={error} required>
        <Select
          value={segmentId ?? ""}
          onValueChange={(v) => v && onSegmentChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Elige una audiencia" />
          </SelectTrigger>
          <SelectContent>
            {audiences.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
                {a.estimatedCount !== null
                  ? ` · ${formatNumber(a.estimatedCount)}`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {selected && selected.estimatedCount !== null && (
        <p className="text-[11px] text-muted-foreground">
          {formatNumber(selected.estimatedCount)} estimados en el segmento — la
          cantidad realmente resoluble hoy puede ser menor (ver la emisión
          resultante).
        </p>
      )}

      <Field label="Resolución">
        <RadioGroup
          value={mode ?? "dynamic"}
          onValueChange={(v) => onModeChange(v as CouponAudienceMode)}
          className="grid grid-cols-2 gap-3"
        >
          {COUPON_AUDIENCE_MODES.map((m) => (
            <RadioCard
              key={m}
              value={m}
              title={COUPON_AUDIENCE_MODE_LABEL[m]}
              description={MODE_DESCRIPTION[m]}
              className="w-full"
            />
          ))}
        </RadioGroup>
      </Field>
    </Section>
  )
}
