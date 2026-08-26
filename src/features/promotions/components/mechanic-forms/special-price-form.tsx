"use client"

import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"

import { EntityPickerField } from "@/components/form/entity-picker"
import { CurrencyInput } from "@/components/form/currency-input"
import { Field } from "@/components/form/field"
import { Row } from "@/components/form/row"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  ProductPickerRow,
  productBrandFacet,
  productPickerChipLabel,
  productPickerSearchText,
} from "../../lib/product-picker"
import type { ProductOption } from "../../lib/queries"
import type { PromotionValues } from "../../schemas"

type SpecialPriceFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  products: ProductOption[]
}

/**
 * Mecánica `precio_especial` (T03) — sustituye el precio de lista de UN
 * SKU puntual, no un descuento sobre él. El tope de piezas por cliente se
 * exige aparte, en el paso Límites (ver `refineByBenefitType`) — es
 * exactamente L03/L18 del documento, no un campo dedicado más.
 */
export function SpecialPriceForm({
  control,
  register,
  errors,
  setValue,
  products,
}: SpecialPriceFormProps) {
  const productoCompradoId = useWatch({ control, name: "productoCompradoId" })
  const hastaAgotarExistencias = useWatch({
    control,
    name: "hastaAgotarExistencias",
  })
  const respetaPrecioMinimoLegal = useWatch({
    control,
    name: "respetaPrecioMinimoLegal",
  })

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Row>
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
        <Field
          label="Precio especial"
          htmlFor="precioPromocional"
          required
          error={errors.precioPromocional?.message}
        >
          <CurrencyInput
            id="precioPromocional"
            {...register("precioPromocional", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
        <Field
          label="Precio de referencia (opcional)"
          htmlFor="precioReferencia"
          hint="Se muestra en caja como el ahorro frente a este precio."
          error={errors.precioReferencia?.message}
        >
          <CurrencyInput
            id="precioReferencia"
            {...register("precioReferencia", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          />
        </Field>
      </Row>
      <Row>
        <Field
          label="Hasta agotar existencias"
          htmlFor="hastaAgotarExistencias"
        >
          <Select
            value={hastaAgotarExistencias ? "si" : "no"}
            onValueChange={(v) =>
              setValue("hastaAgotarExistencias", v === "si")
            }
          >
            <SelectTrigger id="hastaAgotarExistencias">
              <SelectValue>
                {(v: "si" | "no") => (v === "si" ? "Sí" : "No")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="si">Sí</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Respeta el precio mínimo legal"
          htmlFor="respetaPrecioMinimoLegal"
          hint="Si se desmarca, el precio especial puede quedar por debajo del mínimo legal del producto."
        >
          <Select
            value={respetaPrecioMinimoLegal ? "si" : "no"}
            onValueChange={(v) =>
              setValue("respetaPrecioMinimoLegal", v === "si")
            }
          >
            <SelectTrigger id="respetaPrecioMinimoLegal">
              <SelectValue>
                {(v: "si" | "no") => (v === "si" ? "Sí" : "No")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="si">Sí</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Row>
    </div>
  )
}
