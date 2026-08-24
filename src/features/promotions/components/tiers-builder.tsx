"use client"

import { Plus, X } from "lucide-react"

import { CurrencyInput } from "@/components/form/currency-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DISCOUNT_VALUE_TYPES,
  type DiscountValueType,
  type EscalonadoBase,
} from "@/types/domain"

import { DISCOUNT_VALUE_TYPE_LABEL } from "../lib/labels"
import type { TierValues } from "../schemas"

type TiersBuilderProps = {
  base: EscalonadoBase
  tramos: TierValues[]
  onChange: (next: TierValues[]) => void
}

/**
 * Tramos del beneficio "escalonado" — misma fila dinámica que
 * `condition-row.tsx`, pero sin `useFieldArray`: `reward` no es un
 * field-path de react-hook-form, es un objeto controlado que el wizard
 * reemplaza entero al cambiar de mecánica (ver `reward-step.tsx`).
 */
export function TiersBuilder({ base, tramos, onChange }: TiersBuilderProps) {
  function update(index: number, next: TierValues) {
    onChange(tramos.map((t, i) => (i === index ? next : t)))
  }

  function remove(index: number) {
    onChange(tramos.filter((_, i) => i !== index))
  }

  function add() {
    const last = tramos[tramos.length - 1]
    onChange([
      ...tramos,
      {
        desde: (last?.desde ?? 0) + 50,
        tipoDescuento: last?.tipoDescuento ?? "porcentaje",
        valor: (last?.valor ?? 10) + 5,
      },
    ])
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      {tramos.map((tramo, index) => (
        <div
          key={index}
          className="flex w-full items-center gap-2.5 rounded-[10px] border border-border bg-neutral-50 px-3 py-2.5"
        >
          <div className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted">
            <span className="text-[11px] font-semibold text-secondary-foreground">
              {index + 1}
            </span>
          </div>
          <span className="w-12 shrink-0 text-xs text-muted-foreground">
            Desde
          </span>
          {base === "monto_carrito" ? (
            <CurrencyInput
              className="flex-1"
              value={tramo.desde}
              onChange={(e) =>
                update(index, { ...tramo, desde: Number(e.target.value) || 0 })
              }
            />
          ) : (
            <Input
              type="number"
              className="flex-1"
              value={tramo.desde}
              onChange={(e) =>
                update(index, { ...tramo, desde: Number(e.target.value) || 0 })
              }
            />
          )}
          <Select
            value={tramo.tipoDescuento}
            onValueChange={(v) =>
              update(index, { ...tramo, tipoDescuento: v as DiscountValueType })
            }
          >
            <SelectTrigger className="w-36 shrink-0">
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
          {tramo.tipoDescuento === "porcentaje" ? (
            <Input
              type="number"
              step="0.1"
              className="w-24 shrink-0"
              value={tramo.valor}
              onChange={(e) =>
                update(index, { ...tramo, valor: Number(e.target.value) || 0 })
              }
            />
          ) : (
            <CurrencyInput
              className="w-32 shrink-0"
              value={tramo.valor}
              onChange={(e) =>
                update(index, { ...tramo, valor: Number(e.target.value) || 0 })
              }
            />
          )}
          <button
            type="button"
            onClick={() => remove(index)}
            aria-label="Eliminar tramo"
            disabled={tramos.length <= 2}
            className="shrink-0 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={add}
        className="w-fit"
      >
        <Plus className="size-3.5" />
        Agregar tramo
      </Button>
    </div>
  )
}
