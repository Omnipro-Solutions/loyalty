"use client"

import { X } from "lucide-react"

import { CurrencyInput } from "@/components/form/currency-input"
import { FilterSelect } from "@/components/filters/select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatNumber } from "@/lib/format"
import { CONDITION_FIELDS, ENABLED_CONDITION_FIELDS } from "@/types/domain"
import type { ConditionField } from "@/types/domain"

import { CONDITION_FIELD_LABEL, CONDITION_FIELD_OPERATOR } from "../lib/labels"
import type {
  ConditionCategory,
  ConditionCity,
  ConditionSegment,
} from "../lib/queries"
import type { ConditionValues } from "../schemas"

function defaultValueFor(field: ConditionField): ConditionValues {
  switch (field) {
    case "categoria":
      return { campo: field, valor: [] }
    case "tienda":
      return { campo: field, valor: "" }
    case "segmento":
      return { campo: field, valor: "" }
    case "monto_carrito":
      return { campo: field, valor: 0 }
  }
}

type ConditionRowProps = {
  rowNumber: number
  condition: ConditionValues
  categories: ConditionCategory[]
  cities: ConditionCity[]
  segments: ConditionSegment[]
  onChange: (next: ConditionValues) => void
  onRemove: () => void
}

/** Figma "Condición" (633:860): número + campo + operador (fijo por campo) + valor + eliminar. */
export function ConditionRow({
  rowNumber,
  condition,
  categories,
  cities,
  segments,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const enabled = ENABLED_CONDITION_FIELDS.includes(condition.campo)

  return (
    <div className="flex w-full items-center gap-2.5 rounded-[10px] border border-border bg-neutral-50 px-3 py-2.5">
      <div className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted">
        <span className="text-[11px] font-semibold text-secondary-foreground">
          {rowNumber}
        </span>
      </div>

      <Select
        value={condition.campo}
        onValueChange={(v) => onChange(defaultValueFor(v as ConditionField))}
      >
        <SelectTrigger className="flex-1">
          <SelectValue>
            {(v: ConditionField) => CONDITION_FIELD_LABEL[v]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CONDITION_FIELDS.map((field) => (
            <SelectItem
              key={field}
              value={field}
              disabled={!ENABLED_CONDITION_FIELDS.includes(field)}
            >
              {CONDITION_FIELD_LABEL[field]}
              {!ENABLED_CONDITION_FIELDS.includes(field) && " · Próximamente"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="w-32 shrink-0 truncate text-center text-xs text-muted-foreground">
        {CONDITION_FIELD_OPERATOR[condition.campo]}
      </span>

      <div className="min-w-0 flex-1">
        {condition.campo === "categoria" && (
          <FilterSelect
            label="Categorías"
            multiple
            className="w-full justify-between"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={condition.valor}
            onChange={(valor) => onChange({ campo: "categoria", valor })}
          />
        )}
        {condition.campo === "tienda" && (
          <Select
            value={condition.valor}
            onValueChange={(v) =>
              onChange({ campo: "tienda", valor: v as string })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Elige una ciudad" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.city} value={c.city}>
                  {c.city} ({c.totalStores})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {condition.campo === "segmento" && (
          <Select
            value={condition.valor}
            onValueChange={(v) =>
              onChange({ campo: "segmento", valor: v as string })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Elige una audiencia" />
            </SelectTrigger>
            <SelectContent>
              {segments.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  {s.estimatedCount !== null &&
                    ` (${formatNumber(s.estimatedCount)})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {condition.campo === "monto_carrito" && (
          <CurrencyInput
            value={condition.valor}
            onChange={(e) =>
              onChange({
                campo: "monto_carrito",
                valor: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
        )}
        {!enabled && (
          <p className="truncate text-xs text-muted-foreground italic">
            Disponible cuando exista el módulo de Clientes/Pedidos.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar condición"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
