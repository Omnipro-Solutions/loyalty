"use client"

import { Segmented } from "@/components/filters/segmented"
import { CurrencyInput } from "@/components/form/currency-input"
import { EntityPickerField } from "@/components/form/entity-picker"
import { Field } from "@/components/form/field"
import { Multiselect } from "@/components/form/multiselect"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { formatNumber } from "@/lib/format"
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
import {
  ProductPickerRow,
  productBrandFacet,
  productPickerChipLabel,
  productPickerSearchText,
} from "../lib/product-picker"
import type { CatalogOption, ProductOption } from "../lib/queries"
import { CollapsibleSummaryField } from "./collapsible-summary-field"

export type StepCouponValues = {
  name: string
  discountType: CouponDiscountType
  discountValue: number
  discountCap?: number
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
  /** Cuántos códigos va a materializar este cupón, para la descripción del card y el hint del patrón. `undefined` cuando el origen todavía no lo determina (p. ej. antes de elegir audiencia). */
  quantity?: number
  onChange: <K extends keyof StepCouponValues>(
    key: K,
    value: StepCouponValues[K]
  ) => void
}

const DISCOUNT_TYPE_OPTIONS = COUPON_DISCOUNT_TYPES.map((t) => ({
  value: t,
  label: COUPON_DISCOUNT_TYPE_LABEL[t],
}))

const USES_OPTIONS = [1, 2, 3, 5, 10]
const CODE_PATTERN_OPTIONS = [
  "CUP-AAAA-NNNN",
  "CUP-NNNNNN",
  "AAAA-NNNN",
  "NNNNNNNN",
]

function restrictionsSummary(
  storeIds: string[],
  categoryIds: string[],
  stores: CatalogOption[],
  categories: CatalogOption[]
): string {
  if (storeIds.length === 0 && categoryIds.length === 0) {
    return "Todas las tiendas y categorías"
  }
  const parts: string[] = []
  if (storeIds.length > 0) {
    parts.push(
      storeIds.length === 1
        ? (stores.find((s) => s.id === storeIds[0])?.name ?? "1 tienda")
        : `${storeIds.length} tiendas`
    )
  } else {
    parts.push("todas las tiendas")
  }
  if (categoryIds.length > 0) {
    parts.push(
      categoryIds.length === 1
        ? (categories.find((c) => c.id === categoryIds[0])?.name ??
            "1 categoría")
        : `${categoryIds.length} categorías del catálogo`
    )
  }
  return parts.join(" · ")
}

function deliverySummary(channels: CouponDeliveryChannel[]): string {
  if (channels.length === 0) return "Sin canal definido"
  return channels.map((c) => COUPON_DELIVERY_CHANNEL_LABEL[c]).join(" · ")
}

/** Paso "Cupón" (todos los orígenes): identidad del vale, descuento, vigencia, y restricciones/canal plegados por defecto (Figma 13.3). */
export function StepCoupon({
  values,
  errors,
  products,
  stores,
  categories,
  promotions,
  quantity,
  onChange,
}: StepCouponProps) {
  return (
    <Section
      title="Cupón"
      description={`Define el descuento, el patrón de código y la vigencia.${
        quantity
          ? ` Estos valores se materializan en cada uno de los ${formatNumber(quantity)} cupón${quantity === 1 ? "" : "es"}.`
          : ""
      }`}
    >
      <Field label="Nombre de la emisión" error={errors.name} required>
        <Input
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Ej. Bienvenida nueva socia"
        />
      </Field>

      <Segmented
        stretch
        options={DISCOUNT_TYPE_OPTIONS}
        value={values.discountType}
        onValueChange={(v) => onChange("discountType", v as CouponDiscountType)}
      />

      {values.discountType === "free_product" ? (
        <Field label="Producto de regalo" error={errors.freeProductId} required>
          <EntityPickerField
            title="Producto de regalo"
            description="Busca por nombre, SKU o marca."
            mode="single"
            items={products}
            getId={(p) => p.id}
            getSearchText={productPickerSearchText}
            getChipLabel={productPickerChipLabel}
            renderRow={(p) => <ProductPickerRow product={p} />}
            facets={[productBrandFacet(products)]}
            placeholder="Elige un producto"
            confirmLabel="Elegir producto"
            value={values.freeProductId ? [values.freeProductId] : []}
            onValueChange={([id]) => onChange("freeProductId", id)}
          />
        </Field>
      ) : (
        <Row>
          <Field
            label="Valor del descuento"
            error={errors.discountValue}
            required
          >
            {values.discountType === "percentage" ? (
              <Input
                type="number"
                min={1}
                max={100}
                value={values.discountValue}
                onChange={(e) =>
                  onChange("discountValue", Number(e.target.value) || 0)
                }
              />
            ) : (
              <CurrencyInput
                value={values.discountValue}
                onChange={(e) =>
                  onChange("discountValue", Number(e.target.value) || 0)
                }
              />
            )}
          </Field>
          {values.discountType === "percentage" && (
            <Field
              label="Tope de descuento"
              hint="Deja vacío para no limitar el descuento."
            >
              <CurrencyInput
                value={values.discountCap ?? ""}
                onChange={(e) =>
                  onChange(
                    "discountCap",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </Field>
          )}
        </Row>
      )}

      <Row>
        <Field label="Compra mínima">
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
        <Field label="Usos por cupón">
          <Select
            value={String(values.maxUsesPerCoupon)}
            onValueChange={(v) => v && onChange("maxUsesPerCoupon", Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USES_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Máx. por persona">
          <Select
            value={String(values.maxCouponsPerPerson)}
            onValueChange={(v) =>
              v && onChange("maxCouponsPerPerson", Number(v))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USES_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Row>
        <Field label="Prefijo de código (opcional)">
          <Input
            value={values.codePrefix ?? ""}
            onChange={(e) => onChange("codePrefix", e.target.value)}
            placeholder="Ej. VER26-"
          />
        </Field>
        <Field
          label="Patrón de código"
          error={errors.codePattern}
          hint={
            quantity
              ? `Genera ${formatNumber(quantity)} códigos únicos sin colisiones.`
              : undefined
          }
        >
          <Select
            value={values.codePattern}
            onValueChange={(v) => v && onChange("codePattern", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODE_PATTERN_OPTIONS.map((pattern) => (
                <SelectItem key={pattern} value={pattern}>
                  {pattern}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Row>
        <Field label="Vigente desde" error={errors.validFrom} required>
          <Input
            type="date"
            value={values.validFrom}
            onChange={(e) => onChange("validFrom", e.target.value)}
          />
        </Field>
        <Field label="Vigente hasta (opcional)">
          <Input
            type="date"
            value={values.validTo ?? ""}
            onChange={(e) => onChange("validTo", e.target.value)}
          />
        </Field>
      </Row>

      <Field label="Promoción vinculada (opcional)">
        <EntityPickerField
          title="Promoción vinculada"
          description="Busca por nombre."
          mode="single"
          items={promotions}
          getId={(p) => p.id}
          getSearchText={(p) => p.name}
          getChipLabel={(p) => p.name}
          renderRow={(p) => (
            <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
              {p.name}
            </div>
          )}
          placeholder="Sin vincular"
          confirmLabel="Vincular promoción"
          value={values.promotionId ? [values.promotionId] : []}
          onValueChange={([id]) => onChange("promotionId", id)}
        />
      </Field>

      <CollapsibleSummaryField
        title="Restricciones"
        summary={restrictionsSummary(
          values.storeIds,
          values.categoryIds,
          stores,
          categories
        )}
      >
        <Field label="Tiendas incluidas" hint="Vacío = todas las tiendas">
          <Multiselect
            options={stores.map((s) => ({ value: s.id, label: s.name }))}
            value={values.storeIds}
            onValueChange={(v) => onChange("storeIds", v)}
          />
        </Field>
        <Field label="Categorías incluidas" hint="Vacío = todas las categorías">
          <Multiselect
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={values.categoryIds}
            onValueChange={(v) => onChange("categoryIds", v)}
          />
        </Field>
      </CollapsibleSummaryField>

      <CollapsibleSummaryField
        title="Canal de entrega"
        summary={deliverySummary(values.deliveryChannels)}
      >
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
      </CollapsibleSummaryField>
    </Section>
  )
}
