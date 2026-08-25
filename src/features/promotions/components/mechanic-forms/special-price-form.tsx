"use client"

import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"

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

import type { ProductOption } from "../../lib/queries"
import type { PromotionValues } from "../../schemas"

type SpecialPriceFormProps = {
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  products: ProductOption[]
}

function productLabel(products: ProductOption[], id: string): string {
  const product = products.find((p) => p.id === id)
  return product ? `${product.name} · ${product.sku}` : id
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
  const precioPromocional = useWatch({ control, name: "precioPromocional" })
  const hastaAgotarExistencias = useWatch({
    control,
    name: "hastaAgotarExistencias",
  })
  const respetaPrecioMinimoLegal = useWatch({
    control,
    name: "respetaPrecioMinimoLegal",
  })

  const selectedProduct = products.find((p) => p.id === productoCompradoId)
  const isBelowCost =
    selectedProduct?.costUnit !== null &&
    selectedProduct?.costUnit !== undefined &&
    precioPromocional !== undefined &&
    precioPromocional < selectedProduct.costUnit

  return (
    <div className="flex w-full flex-col gap-3.5">
      <Row>
        <Field
          label="Producto"
          htmlFor="productoCompradoId"
          required
          error={errors.productoCompradoId?.message}
        >
          <Select
            value={productoCompradoId ?? ""}
            onValueChange={(v) => v && setValue("productoCompradoId", v)}
          >
            <SelectTrigger id="productoCompradoId">
              <SelectValue placeholder="Elige un producto">
                {(v: string) => productLabel(products, v)}
              </SelectValue>
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
          hint="Si se desmarca, el precio especial puede quedar por debajo del costo — exige autorización en el paso Economía (F12)."
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
      {isBelowCost && (
        <p className="text-xs text-warning">
          Este precio queda por debajo del costo de adquisición del producto —
          autoriza la venta bajo costo en el paso Economía o no se podrá guardar
          (F12).
        </p>
      )}
    </div>
  )
}
