"use client"

import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"

import { EntityPickerField } from "@/components/form/entity-picker"
import { Field } from "@/components/form/field"
import { Row } from "@/components/form/row"
import { Stepper } from "@/components/form/stepper"
import { Input } from "@/components/ui/input"

import {
  ProductPickerRow,
  productBrandFacet,
  productPickerChipLabel,
  productPickerSearchText,
} from "../../lib/product-picker"
import type { ProductOption } from "../../lib/queries"
import type { PromotionValues } from "../../schemas"

type FreeProductFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  products: ProductOption[]
}

/**
 * Mecánica `producto_gratis` (2x1, 3x2… y T05 · N+M cruzado). "Producto
 * comprado" y "producto de regalo" son campos separados porque pueden ser
 * el mismo SKU (2x1 clásico) o distintos (compra A, regala B) — a
 * diferencia de `por_piezas`, que solo tiene un producto (el comprado,
 * sin regalo aparte). "Cantidad mínima comprada" y "% de beneficio en el
 * regalo" son lo que distingue un 2x1 simple de T05: sin ellos, la
 * mecánica solo modela "compra 1, regala 100 %".
 */
export function FreeProductForm({
  control,
  register,
  errors,
  setValue,
  products,
}: FreeProductFormProps) {
  const productoCompradoId = useWatch({ control, name: "productoCompradoId" })
  const productoRegaloId = useWatch({ control, name: "productoRegaloId" })
  const cantidadRegalo = useWatch({ control, name: "cantidadRegalo" }) ?? 1
  const cantidadMinimaComprada =
    useWatch({ control, name: "cantidadMinimaComprada" }) ?? 1

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Row>
        <Field
          label="Producto comprado"
          htmlFor="productoCompradoId"
          required
          error={errors.productoCompradoId?.message}
        >
          <EntityPickerField
            id="productoCompradoId"
            title="Producto comprado"
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
        <Field
          label="Cantidad mínima comprada"
          htmlFor="cantidadMinimaComprada"
          required
          hint="Por debajo de esto no dispara el regalo — 1 = sin mínimo."
          error={errors.cantidadMinimaComprada?.message}
        >
          <Stepper
            value={cantidadMinimaComprada}
            onValueChange={(v) => setValue("cantidadMinimaComprada", v)}
            min={1}
            max={20}
          />
        </Field>
      </Row>
      <Row>
        <Field
          label="Producto de regalo"
          htmlFor="productoRegaloId"
          required
          hint="Puede ser el mismo producto comprado (2x1) u otro distinto."
          error={errors.productoRegaloId?.message}
        >
          <EntityPickerField
            id="productoRegaloId"
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
            value={productoRegaloId ? [productoRegaloId] : []}
            onValueChange={([id]) => setValue("productoRegaloId", id)}
          />
        </Field>
        <Field
          label="Cantidad de regalo"
          htmlFor="cantidadRegalo"
          error={errors.cantidadRegalo?.message}
        >
          <Stepper
            value={cantidadRegalo}
            onValueChange={(v) => setValue("cantidadRegalo", v)}
            min={1}
            max={10}
          />
        </Field>
        <Field
          label="% de beneficio sobre el regalo"
          htmlFor="beneficioSobreRegaloPct"
          required
          hint="100 % = totalmente gratis; menos, un descuento parcial (T05)."
          error={errors.beneficioSobreRegaloPct?.message}
        >
          <Input
            id="beneficioSobreRegaloPct"
            type="number"
            step="1"
            min="1"
            max="100"
            {...register("beneficioSobreRegaloPct", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
      </Row>
    </div>
  )
}
