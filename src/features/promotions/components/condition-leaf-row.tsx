"use client"

import { X } from "lucide-react"

import { CurrencyInput } from "@/components/form/currency-input"
import { Multiselect } from "@/components/form/multiselect"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"
import {
  CONDITION_FIELD_DOMAINS,
  CONDITION_FIELDS,
  ENABLED_CONDITION_FIELDS,
} from "@/types/domain"
import type { ConditionField } from "@/types/domain"

import { defaultConditionFor } from "../lib/condition-tree"
import {
  CONDITION_FIELD_DOMAIN,
  CONDITION_FIELD_LABEL,
  CONDITION_FIELD_OPERATOR,
} from "../lib/labels"
import type { ConditionOptions } from "../lib/queries"
import { conditionSchema, type ConditionValues } from "../schemas"

const CHIP_TRIGGER =
  "w-fit gap-1 rounded-[7px] border-border bg-background px-2 py-[3px] text-[10.5px] font-semibold leading-[15px] whitespace-nowrap"

type ConditionLeafRowProps = {
  condition: ConditionValues
  options: ConditionOptions
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
  options,
  onChange,
  onRemove,
}: ConditionLeafRowProps) {
  const enabled = ENABLED_CONDITION_FIELDS.includes(condition.campo)
  const { categories, cities, segments, couponBatches } = options
  // Sin esto, una condición sin valor bloquea "Siguiente" en silencio — el
  // `trigger()` del wizard sí la detecta (comparte esquema con `conditionSchema`),
  // pero nada en este árbol mostraba jamás el porqué. Reusa el mismo esquema
  // que ya valida el envío, no una copia de las reglas.
  const isComplete = conditionSchema.safeParse(condition).success

  return (
    <div
      className={cn(
        // `w-fit`, no `w-full`: una condición simple ("Tienda está en
        // Bogotá") no debe estirar su caja al ancho completo de la tarjeta
        // dejando un vacío enorme antes del botón de eliminar — cada chip
        // se ajusta a su propio contenido, como el resto de píldoras del
        // árbol (grupo, conector Y/O).
        "flex w-fit max-w-full flex-col gap-1 rounded-[9px] border bg-background px-[9px] py-2",
        isComplete ? "border-border" : "border-destructive"
      )}
    >
      <div className="flex items-start gap-2">
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
            <SelectContent className="w-max">
              {CONDITION_FIELD_DOMAINS.map((domain) => (
                <SelectGroup key={domain}>
                  <SelectLabel>{domain}</SelectLabel>
                  {CONDITION_FIELDS.filter(
                    (field) => CONDITION_FIELD_DOMAIN[field] === domain
                  ).map((field) => (
                    <SelectItem
                      key={field}
                      value={field}
                      disabled={!ENABLED_CONDITION_FIELDS.includes(field)}
                    >
                      {CONDITION_FIELD_LABEL[field]}
                      {!ENABLED_CONDITION_FIELDS.includes(field) &&
                        " · Próximamente"}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          <span className="shrink-0 rounded-[7px] bg-brand-subtle px-2 py-[3px] text-[10.5px] font-medium whitespace-nowrap text-primary">
            {CONDITION_FIELD_OPERATOR[condition.campo]}
          </span>

          {condition.campo === "categoria" && (
            <Multiselect
              size="chip"
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
              <SelectContent className="w-max">
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
              <SelectContent className="w-max">
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
              <SelectContent className="w-max">
                {couponBatches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} · {b.reference}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {condition.campo === "socio_nivel" && (
            <Multiselect
              size="chip"
              className="w-fit min-w-[160px]"
              options={options.tiers.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
              value={condition.valor}
              onValueChange={(valor) =>
                onChange({ campo: "socio_nivel", valor })
              }
            />
          )}
          {condition.campo === "socio_provincia" && (
            <Multiselect
              size="chip"
              className="w-fit min-w-[160px]"
              options={options.provinces}
              value={condition.valor}
              onValueChange={(valor) =>
                onChange({ campo: "socio_provincia", valor })
              }
            />
          )}
          {condition.campo === "socio_antiguedad" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min="0"
                className={cn(CHIP_TRIGGER, "w-16")}
                value={condition.valor}
                onChange={(e) =>
                  onChange({
                    campo: "socio_antiguedad",
                    valor: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
              />
              <span className="text-[10.5px] text-muted-foreground">meses</span>
            </div>
          )}
          {condition.campo === "socio_edad" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min="0"
                className={cn(CHIP_TRIGGER, "w-16")}
                value={condition.valor}
                onChange={(e) =>
                  onChange({
                    campo: "socio_edad",
                    valor: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
              />
              <span className="text-[10.5px] text-muted-foreground">años</span>
            </div>
          )}
          {condition.campo === "genero" && (
            <Multiselect
              size="chip"
              className="w-fit min-w-[160px]"
              options={options.genders}
              value={condition.valor}
              onValueChange={(valor) => onChange({ campo: "genero", valor })}
            />
          )}
          {condition.campo === "estado_civil" && (
            <Multiselect
              size="chip"
              className="w-fit min-w-[160px]"
              options={options.maritalStatuses}
              value={condition.valor}
              onValueChange={(valor) =>
                onChange({ campo: "estado_civil", valor })
              }
            />
          )}
          {condition.campo === "tiene_hijos" && (
            <Select
              value={condition.valor ? "si" : "no"}
              onValueChange={(v) =>
                onChange({ campo: "tiene_hijos", valor: v === "si" })
              }
            >
              <SelectTrigger className={cn(CHIP_TRIGGER, "min-w-[68px]")}>
                <SelectValue>
                  {(v: "si" | "no") => (v === "si" ? "Sí" : "No")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-max">
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          )}
          {condition.campo === "tiene_mascotas" && (
            <Select
              value={condition.valor ? "si" : "no"}
              onValueChange={(v) =>
                onChange({ campo: "tiene_mascotas", valor: v === "si" })
              }
            >
              <SelectTrigger className={cn(CHIP_TRIGGER, "min-w-[68px]")}>
                <SelectValue>
                  {(v: "si" | "no") => (v === "si" ? "Sí" : "No")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-max">
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          )}
          {condition.campo === "tienda_region" && (
            <Multiselect
              size="chip"
              className="w-fit min-w-[160px]"
              options={options.storeRegions}
              value={condition.valor}
              onValueChange={(valor) =>
                onChange({ campo: "tienda_region", valor })
              }
            />
          )}
          {condition.campo === "tienda_formato" && (
            <Multiselect
              size="chip"
              className="w-fit min-w-[160px]"
              options={options.storeFormats}
              value={condition.valor}
              onValueChange={(valor) =>
                onChange({ campo: "tienda_formato", valor })
              }
            />
          )}
          {condition.campo === "producto_marca" && (
            <Multiselect
              size="chip"
              className="w-fit min-w-[160px]"
              options={options.brands}
              value={condition.valor}
              onValueChange={(valor) =>
                onChange({ campo: "producto_marca", valor })
              }
            />
          )}
          {condition.campo === "producto_proveedor" && (
            <Multiselect
              size="chip"
              className="w-fit min-w-[160px]"
              options={options.suppliers}
              value={condition.valor}
              onValueChange={(valor) =>
                onChange({ campo: "producto_proveedor", valor })
              }
            />
          )}
          {condition.campo === "producto_receta" && (
            <Select
              value={condition.valor ? "si" : "no"}
              onValueChange={(v) =>
                onChange({ campo: "producto_receta", valor: v === "si" })
              }
            >
              <SelectTrigger className={cn(CHIP_TRIGGER, "min-w-[68px]")}>
                <SelectValue>
                  {(v: "si" | "no") => (v === "si" ? "Sí" : "No")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-max">
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
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
      {!isComplete && (
        <p className="text-[10.5px] text-destructive">
          Completa el valor de esta condición para poder avanzar.
        </p>
      )}
    </div>
  )
}
