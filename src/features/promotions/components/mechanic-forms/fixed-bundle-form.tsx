"use client"

import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"

import { CurrencyInput } from "@/components/form/currency-input"
import { EntityPickerField } from "@/components/form/entity-picker"
import { Field } from "@/components/form/field"

import {
  ProductPickerRow,
  productBrandFacet,
  productPickerChipLabel,
  productPickerSearchText,
} from "../../lib/product-picker"
import type { ProductOption } from "../../lib/queries"
import type { PromotionValues } from "../../schemas"

type FixedBundleFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  products: ProductOption[]
}

/** Mecánica `precio_fijo_bundle` — varios SKU vendidos juntos a un precio combinado único. */
export function FixedBundleForm({
  control,
  register,
  errors,
  setValue,
  products,
}: FixedBundleFormProps) {
  const productosBundleIds =
    useWatch({ control, name: "productosBundleIds" }) ?? []

  // Mismo problema `.root` que ya resolvimos en `discount-tiers-builder.tsx`
  // para `discountTiers`: un issue de zod con `path: ["productosBundleIds"]`
  // (el `min(2)` de todo el array) lo guarda react-hook-form en
  // `.root.message`, no en `.message` directo.
  const bundleError =
    errors.productosBundleIds?.root?.message ??
    errors.productosBundleIds?.message

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Field
        label="Productos del bundle"
        hint="Elige al menos 2 productos."
        error={bundleError}
      >
        <EntityPickerField
          title="Productos del bundle"
          description="Agrega condiciones sobre los atributos del producto, busca y agrega lo que coincida."
          mode="multiple"
          items={products}
          getId={(p) => p.id}
          getSearchText={productPickerSearchText}
          getChipLabel={productPickerChipLabel}
          renderRow={(p) => <ProductPickerRow product={p} />}
          facets={[productBrandFacet(products)]}
          placeholder="Elige los productos del bundle"
          confirmLabel="Agregar al bundle"
          value={productosBundleIds}
          onValueChange={(ids) => setValue("productosBundleIds", ids)}
        />
      </Field>
      <Field
        label="Precio fijo del bundle"
        htmlFor="benefitValue"
        required
        error={errors.benefitValue?.message}
      >
        <CurrencyInput
          id="benefitValue"
          {...register("benefitValue", {
            setValueAs: (v) => (v === "" ? undefined : Number(v)),
          })}
        />
      </Field>
    </div>
  )
}
