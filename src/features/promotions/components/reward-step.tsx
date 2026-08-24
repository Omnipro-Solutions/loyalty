"use client"

import { CurrencyInput } from "@/components/form/currency-input"
import { Field } from "@/components/form/field"
import { Row } from "@/components/form/row"
import { Stepper } from "@/components/form/stepper"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  APPLY_TO_OPTIONS,
  DISCOUNT_VALUE_TYPES,
  ESCALONADO_BASES,
  NXM_SCOPES,
  POINTS_MODES,
  type ApplyTo,
  type DiscountValueType,
  type EscalonadoBase,
  type NxmScope,
  type PointsMode,
} from "@/types/domain"

import {
  APPLY_TO_LABEL,
  DISCOUNT_VALUE_TYPE_LABEL,
  ESCALONADO_BASE_LABEL,
  NXM_SCOPE_LABEL,
  POINTS_MODE_LABEL,
} from "../lib/labels"
import type { RewardValues } from "../schemas"
import { RewardPreview } from "./reward-preview"
import { TiersBuilder } from "./tiers-builder"

type RewardStepProps = {
  reward: RewardValues
  onChange: (next: RewardValues) => void
}

/** "Tipo de descuento" + "Valor" — compartido por `descuento` y `cupon` (mismo par de campos). */
function DiscountValueFields({
  tipoDescuento,
  valor,
  onTipoChange,
  onValorChange,
}: {
  tipoDescuento: DiscountValueType
  valor: number
  onTipoChange: (value: DiscountValueType) => void
  onValorChange: (value: number) => void
}) {
  return (
    <>
      <Field label="Tipo de descuento" htmlFor="reward-tipo-descuento">
        <Select
          value={tipoDescuento}
          onValueChange={(v) => onTipoChange(v as DiscountValueType)}
        >
          <SelectTrigger id="reward-tipo-descuento">
            <SelectValue>
              {(v: DiscountValueType) => DISCOUNT_VALUE_TYPE_LABEL[v]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DISCOUNT_VALUE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {DISCOUNT_VALUE_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field
        label={tipoDescuento === "porcentaje" ? "Valor (%)" : "Valor"}
        htmlFor="reward-valor"
      >
        {tipoDescuento === "porcentaje" ? (
          <Input
            id="reward-valor"
            type="number"
            step="0.1"
            value={valor}
            onChange={(e) => onValorChange(Number(e.target.value) || 0)}
          />
        ) : (
          <CurrencyInput
            id="reward-valor"
            value={valor}
            onChange={(e) => onValorChange(Number(e.target.value) || 0)}
          />
        )}
      </Field>
    </>
  )
}

/** Paso "Recompensa (ENTONCES)" — los campos que se muestran dependen de `reward.mecanica`, igual que `condition-row.tsx` cambia según `condition.campo`. */
export function RewardStep({ reward, onChange }: RewardStepProps) {
  switch (reward.mecanica) {
    case "descuento":
      return (
        <div className="flex w-full flex-col gap-3.5">
          <Row>
            <DiscountValueFields
              tipoDescuento={reward.tipoDescuento}
              valor={reward.valor}
              onTipoChange={(tipoDescuento) =>
                onChange({ ...reward, tipoDescuento })
              }
              onValorChange={(valor) => onChange({ ...reward, valor })}
            />
            <Field label="Tope máximo (opcional)" htmlFor="reward-tope">
              <CurrencyInput
                id="reward-tope"
                value={reward.topeMaximo ?? ""}
                onChange={(e) =>
                  onChange({
                    ...reward,
                    topeMaximo:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
            </Field>
          </Row>
          <Row>
            <Field label="Aplicar sobre" htmlFor="reward-aplicar-sobre">
              <Select
                value={reward.aplicarSobre}
                onValueChange={(v) =>
                  onChange({ ...reward, aplicarSobre: v as ApplyTo })
                }
              >
                <SelectTrigger id="reward-aplicar-sobre">
                  <SelectValue>{(v: ApplyTo) => APPLY_TO_LABEL[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {APPLY_TO_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {APPLY_TO_LABEL[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
          <RewardPreview reward={reward} />
        </div>
      )

    case "escalonado":
      return (
        <div className="flex w-full flex-col gap-3.5">
          <Row>
            <Field label="Tramos según" htmlFor="reward-base">
              <Select
                value={reward.base}
                onValueChange={(v) =>
                  onChange({ ...reward, base: v as EscalonadoBase })
                }
              >
                <SelectTrigger id="reward-base">
                  <SelectValue>
                    {(v: EscalonadoBase) => ESCALONADO_BASE_LABEL[v]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ESCALONADO_BASES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {ESCALONADO_BASE_LABEL[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
          <TiersBuilder
            base={reward.base}
            tramos={reward.tramos}
            onChange={(tramos) => onChange({ ...reward, tramos })}
          />
          <RewardPreview reward={reward} />
        </div>
      )

    case "puntos":
      return (
        <div className="flex w-full flex-col gap-3.5">
          <Row>
            <Field label="Modo" htmlFor="reward-modo">
              <Select
                value={reward.modo}
                onValueChange={(v) =>
                  onChange({ ...reward, modo: v as PointsMode })
                }
              >
                <SelectTrigger id="reward-modo">
                  <SelectValue>
                    {(v: PointsMode) => POINTS_MODE_LABEL[v]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {POINTS_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {POINTS_MODE_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={
                reward.modo === "multiplicador"
                  ? "Multiplicador"
                  : "Puntos otorgados"
              }
              htmlFor="reward-valor"
            >
              <Stepper
                value={reward.valor}
                onValueChange={(valor) => onChange({ ...reward, valor })}
                min={1}
                max={reward.modo === "multiplicador" ? 10 : 10000}
              />
            </Field>
          </Row>
          <RewardPreview reward={reward} />
        </div>
      )

    case "nxm":
      return (
        <div className="flex w-full flex-col gap-3.5">
          <Row>
            <Field label="El cliente lleva" htmlFor="reward-lleva-n">
              <Stepper
                value={reward.llevaN}
                onValueChange={(llevaN) =>
                  onChange({
                    ...reward,
                    llevaN,
                    pagaM: Math.min(reward.pagaM, llevaN - 1),
                  })
                }
                min={2}
                max={20}
              />
            </Field>
            <Field label="Y paga" htmlFor="reward-paga-m">
              <Stepper
                value={reward.pagaM}
                onValueChange={(pagaM) => onChange({ ...reward, pagaM })}
                min={1}
                max={reward.llevaN - 1}
              />
            </Field>
            <Field label="Aplica a" htmlFor="reward-aplica-a">
              <Select
                value={reward.aplicarA}
                onValueChange={(v) =>
                  onChange({ ...reward, aplicarA: v as NxmScope })
                }
              >
                <SelectTrigger id="reward-aplica-a">
                  <SelectValue>
                    {(v: NxmScope) => NXM_SCOPE_LABEL[v]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {NXM_SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {NXM_SCOPE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Row>
          <RewardPreview reward={reward} />
        </div>
      )

    case "cupon":
      return (
        <div className="flex w-full flex-col gap-3.5">
          <Row>
            <DiscountValueFields
              tipoDescuento={reward.tipoDescuento}
              valor={reward.valor}
              onTipoChange={(tipoDescuento) =>
                onChange({ ...reward, tipoDescuento })
              }
              onValorChange={(valor) => onChange({ ...reward, valor })}
            />
            <Field label="Vigencia del cupón (días)" htmlFor="reward-vigencia">
              <Stepper
                value={reward.vigenciaDias}
                onValueChange={(vigenciaDias) =>
                  onChange({ ...reward, vigenciaDias })
                }
                min={1}
                max={365}
              />
            </Field>
          </Row>
          <RewardPreview reward={reward} />
        </div>
      )
  }
}
