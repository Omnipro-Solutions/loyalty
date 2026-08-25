"use client"

import { X } from "lucide-react"

import { CurrencyInput } from "@/components/form/currency-input"
import { Multiselect } from "@/components/form/multiselect"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"
import { CONDITION_FIELDS, ENABLED_CONDITION_FIELDS } from "@/types/domain"
import type { ConditionField } from "@/types/domain"

import { defaultConditionFor } from "../lib/condition-tree"
import { CONDITION_FIELD_LABEL, CONDITION_FIELD_OPERATOR } from "../lib/labels"
import type {
  ConditionCategory,
  ConditionCity,
  ConditionSegment,
  CouponBatchOption,
} from "../lib/queries"
import type { ConditionValues } from "../schemas"

const CHIP_TRIGGER =
  "w-fit gap-1 rounded-[7px] border-border bg-background px-2 py-[3px] text-[10.5px] font-semibold leading-[15px] whitespace-nowrap"

type ConditionLeafRowProps = {
  condition: ConditionValues
  categories: ConditionCategory[]
  cities: ConditionCity[]
  segments: ConditionSegment[]
  couponBatches: CouponBatchOption[]
  onChange: (next: ConditionValues) => void
  onRemove: () => void
}

/**
 * Figma "Condición" (1396:226, dentro de "07.2 · Paso 2 · Condiciones ·
 * árbol" 1395:6) — 3 chips compactos (campo/operador/valor) en vez de la
 * fila de 3 columnas estiradas de antes. El operador se dibuja como chip
 * **sin** chevron: hoy es fijo por campo (`CONDITION_FIELD_OPERATOR`), no
 * hay nada que elegir — un chevron insinuaría una interacción que no
 * existe.
 */
export function ConditionLeafRow({
  condition,
  categories,
  cities,
  segments,
  couponBatches,
  onChange,
  onRemove,
}: ConditionLeafRowProps) {
  const enabled = ENABLED_CONDITION_FIELDS.includes(condition.campo)

  return (
    <div className="flex w-full items-start justify-between gap-2 rounded-[9px] border border-border bg-background px-[9px] py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-[5px]">
        <Select
          value={condition.campo}
          onValueChange={(v) =>
            onChange(defaultConditionFor(v as ConditionField))
          }
        >
          <SelectTrigger className={CHIP_TRIGGER}>
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

        <span className="shrink-0 rounded-[7px] bg-brand-subtle px-2 py-[3px] text-[10.5px] font-medium whitespace-nowrap text-primary">
          {CONDITION_FIELD_OPERATOR[condition.campo]}
        </span>

        {condition.campo === "categoria" && (
          <Multiselect
            className="w-fit min-w-[160px]"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={condition.valor}
            onValueChange={(valor) => onChange({ campo: "categoria", valor })}
          />
        )}
        {condition.campo === "tienda" && (
          <Select
            value={condition.valor}
            onValueChange={(v) =>
              onChange({ campo: "tienda", valor: v as string })
            }
          >
            <SelectTrigger className={cn(CHIP_TRIGGER, "min-w-[110px]")}>
              <SelectValue placeholder="Elige una ciudad">
                {(v: string) => {
                  const city = cities.find((c) => c.city === v)
                  return city ? `${city.city} (${city.totalStores})` : v
                }}
              </SelectValue>
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
            <SelectTrigger className={cn(CHIP_TRIGGER, "min-w-[110px]")}>
              <SelectValue placeholder="Elige una audiencia">
                {(v: string) => {
                  const segment = segments.find((s) => s.id === v)
                  if (!segment) return v
                  return segment.estimatedCount !== null
                    ? `${segment.name} (${formatNumber(segment.estimatedCount)})`
                    : segment.name
                }}
              </SelectValue>
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
            className="w-28"
            value={condition.valor}
            onChange={(e) =>
              onChange({
                campo: "monto_carrito",
                valor: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
        )}
        {condition.campo === "cupon_codigo" && (
          <Select
            value={condition.valor}
            onValueChange={(v) =>
              onChange({ campo: "cupon_codigo", valor: v as string })
            }
          >
            <SelectTrigger className={cn(CHIP_TRIGGER, "min-w-[140px]")}>
              <SelectValue placeholder="Elige una emisión">
                {(v: string) => {
                  const batch = couponBatches.find((b) => b.id === v)
                  return batch ? `${batch.name} · ${batch.reference}` : v
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {couponBatches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} · {b.reference}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!enabled && (
          <p className="truncate text-[10.5px] text-muted-foreground italic">
            Disponible cuando exista el módulo de Clientes/Pedidos.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar condición"
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
