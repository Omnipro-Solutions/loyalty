"use client"

import { Field } from "@/components/form/field"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  COUPON_POINTS_CHARGE_TIMINGS,
  type CouponPointsChargeTiming,
} from "@/types/domain"

import { COUPON_POINTS_CHARGE_TIMING_LABEL } from "../lib/labels"

type StepPointsProps = {
  pointsCost: number | undefined
  chargeTiming: CouponPointsChargeTiming | undefined
  error?: string
  onPointsCostChange: (value: number) => void
  onChargeTimingChange: (value: CouponPointsChargeTiming) => void
}

/** Paso "Puntos" (points_redemption): cuántos puntos cuesta el cupón y cuándo se descuentan (doc §3.3, §4.2). */
export function StepPoints({
  pointsCost,
  chargeTiming,
  error,
  onPointsCostChange,
  onChargeTimingChange,
}: StepPointsProps) {
  return (
    <Section
      title="Canje de puntos"
      description="El saldo del cliente se transforma en el valor del cupón."
    >
      <Row>
        <Field
          label="Puntos por cupón"
          error={error}
          required
          htmlFor="points-cost"
        >
          <Input
            id="points-cost"
            type="number"
            min={0}
            value={pointsCost ?? ""}
            onChange={(e) => onPointsCostChange(Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="Descuento de puntos" htmlFor="points-timing">
          <Select
            value={chargeTiming ?? "on_create"}
            onValueChange={(v) =>
              onChargeTimingChange(v as CouponPointsChargeTiming)
            }
          >
            <SelectTrigger id="points-timing">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUPON_POINTS_CHARGE_TIMINGS.map((t) => (
                <SelectItem key={t} value={t}>
                  {COUPON_POINTS_CHARGE_TIMING_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Row>
    </Section>
  )
}
