"use client"

import { useState } from "react"

import { CurrencyInput } from "@/components/form/currency-input"
import { Field } from "@/components/form/field"
import { Multiselect } from "@/components/form/multiselect"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  COUPON_DELIVERY_CHANNELS,
  COUPON_DISCOUNT_TYPES,
  type CouponDeliveryChannel,
  type CouponDiscountType,
} from "@/types/domain"

import {
  COUPON_DELIVERY_CHANNEL_LABEL,
  COUPON_DISCOUNT_TYPE_LABEL,
} from "../lib/labels"
import type { CatalogOption, ProductOption } from "../lib/queries"

export type StepCouponValues = {
  name: string
  discountType: CouponDiscountType
  discountValue: number
  freeProductId?: string
  minPurchaseAmount?: number
  maxUsesPerCoupon: number
  maxCouponsPerPerson: number
  codePrefix?: string
  codePattern: string
  validFrom: string
  validTo?: string
  storeIds: string[]
  categoryIds: string[]
  deliveryChannels: CouponDeliveryChannel[]
  promotionId?: string
}

type StepCouponProps = {
  values: StepCouponValues
  errors: Partial<Record<keyof StepCouponValues, string>>
  products: ProductOption[]
  stores: CatalogOption[]
  categories: CatalogOption[]
  promotions: CatalogOption[]
  onChange: <K extends keyof StepCouponValues>(
    key: K,
    value: StepCouponValues[K]
  ) => void
}

/** Paso "Cupón" (todos los orígenes): identidad del vale, descuento, vigencia, y restricciones/canal plegados por defecto (doc §4.2). */
export function StepCoupon({
  values,
  errors,
  products,
  stores,
  categories,
  promotions,
  onChange,
}: StepCouponProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <>
      <Section title="Identidad del cupón">
        <Row>
          <Field
            label="Nombre de la emisión"
            error={errors.name}
            required
            htmlFor="coupon-name"
          >
            <Input
              id="coupon-name"
              value={values.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Ej. Bienvenida nueva socia"
            />
          </Field>
          <Field label="Promoción vinculada (opcional)">
            <Select
              value={values.promotionId ?? "none"}
              onValueChange={(v) =>
                onChange("promotionId", !v || v === "none" ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin vincular" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin vincular</SelectItem>
                {promotions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Row>
      </Section>

      <Section title="Descuento">
        <Row>
          <Field label="Tipo de descuento" required>
            <Select
              value={values.discountType}
              onValueChange={(v) =>
                onChange("discountType", v as CouponDiscountType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUPON_DISCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {COUPON_DISCOUNT_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {values.discountType === "free_product" ? (
            <Field
              label="Producto de regalo"
              error={errors.freeProductId}
              required
            >
              <Select
                value={values.freeProductId ?? ""}
                onValueChange={(v) => v && onChange("freeProductId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elige un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : values.discountType === "percentage" ? (
            <Field
              label="Porcentaje"
              error={errors.discountValue}
              required
              htmlFor="discount-value"
            >
              <Input
                id="discount-value"
                type="number"
                min={1}
                max={100}
                value={values.discountValue}
                onChange={(e) =>
                  onChange("discountValue", Number(e.target.value) || 0)
                }
              />
            </Field>
          ) : (
            <Field
              label="Valor del descuento"
              error={errors.discountValue}
              required
            >
              <CurrencyInput
                value={values.discountValue}
                onChange={(e) =>
                  onChange("discountValue", Number(e.target.value) || 0)
                }
              />
            </Field>
          )}
        </Row>

        <Row>
          <Field
            label="Vigente desde"
            error={errors.validFrom}
            required
            htmlFor="valid-from"
          >
            <Input
              id="valid-from"
              type="date"
              value={values.validFrom}
              onChange={(e) => onChange("validFrom", e.target.value)}
            />
          </Field>
          <Field label="Vigente hasta (opcional)" htmlFor="valid-to">
            <Input
              id="valid-to"
              type="date"
              value={values.validTo ?? ""}
              onChange={(e) => onChange("validTo", e.target.value)}
            />
          </Field>
        </Row>
      </Section>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="self-start text-[12px] font-medium text-primary"
      >
        {showAdvanced
          ? "Ocultar restricciones y canal"
          : "Restricciones y canal (opcional)"}
      </button>

      {showAdvanced && (
        <Section title="Restricciones y canal">
          <Row>
            <Field label="Monto mínimo de compra (opcional)">
              <CurrencyInput
                value={values.minPurchaseAmount ?? ""}
                onChange={(e) =>
                  onChange(
                    "minPurchaseAmount",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </Field>
            <Field label="Usos permitidos por cupón">
              <Input
                type="number"
                min={1}
                value={values.maxUsesPerCoupon}
                onChange={(e) =>
                  onChange("maxUsesPerCoupon", Number(e.target.value) || 1)
                }
              />
            </Field>
            <Field label="Cupones máximos por persona">
              <Input
                type="number"
                min={1}
                value={values.maxCouponsPerPerson}
                onChange={(e) =>
                  onChange("maxCouponsPerPerson", Number(e.target.value) || 1)
                }
              />
            </Field>
          </Row>

          <Row>
            <Field label="Prefijo del código (opcional)">
              <Input
                value={values.codePrefix ?? ""}
                onChange={(e) => onChange("codePrefix", e.target.value)}
                placeholder="Ej. VER26-"
              />
            </Field>
            <Field label="Patrón del código" error={errors.codePattern}>
              <Input
                value={values.codePattern}
                onChange={(e) => onChange("codePattern", e.target.value)}
              />
            </Field>
          </Row>

          <Field label="Tiendas incluidas" hint="Vacío = todas las tiendas">
            <Multiselect
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
              value={values.storeIds}
              onValueChange={(v) => onChange("storeIds", v)}
            />
          </Field>
          <Field
            label="Categorías incluidas"
            hint="Vacío = todas las categorías"
          >
            <Multiselect
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={values.categoryIds}
              onValueChange={(v) => onChange("categoryIds", v)}
            />
          </Field>

          <Field label="Canales de entrega">
            <div className="flex items-center gap-4">
              {COUPON_DELIVERY_CHANNELS.map((channel) => (
                <label key={channel} className="flex items-center gap-2">
                  <Checkbox
                    checked={values.deliveryChannels.includes(channel)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...values.deliveryChannels, channel]
                        : values.deliveryChannels.filter((c) => c !== channel)
                      onChange("deliveryChannels", next)
                    }}
                  />
                  <span className="text-[13px]">
                    {COUPON_DELIVERY_CHANNEL_LABEL[channel]}
                  </span>
                </label>
              ))}
            </div>
          </Field>
        </Section>
      )}
    </>
  )
}
