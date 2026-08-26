"use client"

import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"

import { Segmented } from "@/components/filters/segmented"
import { EntityPickerField } from "@/components/form/entity-picker"
import { Field } from "@/components/form/field"
import { Row } from "@/components/form/row"
import { Stepper } from "@/components/form/stepper"
import { Input } from "@/components/ui/input"
import { BXGY_SCOPES, type BxgyScope } from "@/types/domain"

import { BXGY_SCOPE_LABEL } from "../../lib/labels"
import {
  ProductPickerRow,
  productBrandFacet,
  productPickerChipLabel,
  productPickerSearchText,
} from "../../lib/product-picker"
import type { ProductOption } from "../../lib/queries"
import type { PromotionValues } from "../../schemas"

type BxgyFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  products: ProductOption[]
}

const SCOPE_OPTIONS = BXGY_SCOPES.map((s) => ({
  value: s,
  label: BXGY_SCOPE_LABEL[s],
}))

/**
 * Mecánica `por_piezas` (BxGy) — "compra N, paga M" (3x2, 2ª unidad al
 * 50 %…). `alcancePiezas === "producto_especifico"` reusa
 * `productoCompradoId`, el mismo campo que `producto_gratis` — aquí el
 * producto elegido es el que se compró, no un regalo distinto.
 */
export function BxgyForm({
  control,
  register,
  errors,
  setValue,
  products,
}: BxgyFormProps) {
  const compraCantidad = useWatch({ control, name: "compraCantidad" }) ?? 2
  const pagaCantidad = useWatch({ control, name: "pagaCantidad" }) ?? 1
  const alcancePiezas = useWatch({ control, name: "alcancePiezas" })
  const productoCompradoId = useWatch({ control, name: "productoCompradoId" })

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Row>
        <Field
          label="Compra"
          htmlFor="compraCantidad"
          required
          error={errors.compraCantidad?.message}
        >
          <Stepper
            value={compraCantidad}
            onValueChange={(v) => setValue("compraCantidad", v)}
            min={2}
            max={20}
          />
        </Field>
        <Field
          label="Paga"
          htmlFor="pagaCantidad"
          required
          error={errors.pagaCantidad?.message}
        >
          <Stepper
            value={pagaCantidad}
            onValueChange={(v) => setValue("pagaCantidad", v)}
            min={1}
            max={19}
          />
        </Field>
        <Field
          label="Descuento en la unidad extra (%)"
          htmlFor="descuentoUnidadExtraPct"
          required
          hint="100 % = gratis, como en un 3x2 clásico."
          error={errors.descuentoUnidadExtraPct?.message}
        >
          <Input
            id="descuentoUnidadExtraPct"
            type="number"
            step="1"
            min="1"
            max="100"
            placeholder="100"
            {...register("descuentoUnidadExtraPct", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
      </Row>

      <Field
        label="Alcance"
        hint="Sobre qué productos cuenta la mecánica."
        error={errors.alcancePiezas?.message}
      >
        <Segmented
          options={SCOPE_OPTIONS}
          value={alcancePiezas ?? ""}
          onValueChange={(v) => setValue("alcancePiezas", v as BxgyScope)}
          stretch
        />
      </Field>

      {alcancePiezas === "producto_especifico" && (
        <Field
          label="Producto"
          htmlFor="productoCompradoId"
          required
          error={errors.productoCompradoId?.message}
        >
          <EntityPickerField
            id="productoCompradoId"
            title="Producto"
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
            value={productoCompradoId ? [productoCompradoId] : []}
            onValueChange={([id]) => setValue("productoCompradoId", id)}
          />
        </Field>
      )}
      {alcancePiezas === "misma_categoria" && (
        <p className="text-[11px] text-muted-foreground">
          Aplica a los productos de la categoría que agregues como condición en
          el paso Condiciones.
        </p>
      )}

      {/*
        "Mezclar SKUs distintos del universo" (`mezclaEnUniverso`) ya no se
        muestra ni se exige — decisión del usuario. El campo sigue
        existiendo y persistiéndose con su default (`true`, mismo que el
        `default` de la columna) para no perder el dato de las promociones
        que ya lo tenían guardado; simplemente dejó de ser una decisión
        del formulario.
      */}
    </div>
  )
}
