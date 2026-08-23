"use client"

import { Field } from "@/components/form/field"
import { CurrencyInput } from "@/components/form/currency-input"
import { Multiselect } from "@/components/form/multiselect"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import type { FieldSpec } from "./field-specs"

/**
 * Formulario genérico dirigido por `FieldSpec[]` — cubre los tipos de
 * bloque "simples" sin necesitar un componente a mano por cada uno.
 *
 * Cada campo es un input CONTROLADO directo sobre `config`/`onChange` (sin
 * `react-hook-form`): un intento anterior mezclaba `register()`+`watch()`
 * de react-hook-form (para texto/número/textarea) con `onChange` directo
 * (para select) sobre el mismo objeto `config`. Como react-hook-form solo
 * actualiza su `watch()` interno para campos que sí registró, un campo
 * puesto por `onChange` directo (select, multiselect, boolean…) se congela
 * en su valor inicial dentro de ese snapshot — la siguiente vez que
 * `watch()` dispara `onChange` por un cambio de texto, revierte esos otros
 * campos a su valor de montaje. Compilaba bien y no se veía en la primera
 * mirada; solo se manifiesta al combinar un campo de texto con uno de
 * select en el mismo formulario. Un solo modelo de datos (controlado,
 * directo) evita la clase completa de bug.
 */
export function SimpleConfigForm({
  specs,
  config,
  onChange,
}: {
  specs: FieldSpec[]
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  function set(key: string, value: unknown) {
    onChange({ ...config, [key]: value })
  }

  if (specs.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground">
        Este bloque no tiene configuración adicional.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {specs.map((spec) => {
        if (spec.kind === "boolean") {
          const checked = config[spec.key] === true
          return (
            <label
              key={spec.key}
              className="flex items-center gap-2.5 rounded-[10px] bg-muted px-3.5 py-2.5"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => set(spec.key, v === true)}
              />
              <span className="text-[13px] leading-[18px] text-secondary-foreground">
                {spec.label}
              </span>
            </label>
          )
        }

        if (spec.kind === "time-range") {
          const range =
            (config[spec.key] as { desde?: string; hasta?: string }) ?? {}
          return (
            <Field key={spec.key} label={spec.label}>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  aria-label={`${spec.label} · desde`}
                  value={range.desde ?? ""}
                  onChange={(e) =>
                    set(spec.key, { ...range, desde: e.target.value })
                  }
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="time"
                  aria-label={`${spec.label} · hasta`}
                  value={range.hasta ?? ""}
                  onChange={(e) =>
                    set(spec.key, { ...range, hasta: e.target.value })
                  }
                />
              </div>
            </Field>
          )
        }

        const currentValue = config[spec.key]

        return (
          <Field
            key={spec.key}
            label={spec.label}
            required={"required" in spec ? spec.required : undefined}
            hint={"hint" in spec ? spec.hint : undefined}
            htmlFor={`cfg-${spec.key}`}
          >
            {spec.kind === "textarea" ? (
              <Textarea
                id={`cfg-${spec.key}`}
                placeholder={spec.placeholder}
                value={typeof currentValue === "string" ? currentValue : ""}
                onChange={(e) => set(spec.key, e.target.value)}
              />
            ) : spec.kind === "currency" ? (
              <CurrencyInput
                id={`cfg-${spec.key}`}
                placeholder="0"
                value={typeof currentValue === "number" ? currentValue : ""}
                onChange={(e) =>
                  set(
                    spec.key,
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            ) : spec.kind === "multiselect" ? (
              <Multiselect
                options={spec.options}
                value={
                  Array.isArray(currentValue) ? (currentValue as string[]) : []
                }
                onValueChange={(value) => set(spec.key, value)}
              />
            ) : spec.kind === "select" ? (
              <Select
                value={
                  typeof currentValue === "string" ? currentValue : undefined
                }
                onValueChange={(value) => set(spec.key, value)}
              >
                <SelectTrigger id={`cfg-${spec.key}`} className="w-full">
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  {spec.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="relative">
                <Input
                  id={`cfg-${spec.key}`}
                  type={spec.kind === "number" ? "number" : "text"}
                  placeholder={spec.placeholder}
                  value={
                    currentValue === undefined || currentValue === null
                      ? ""
                      : String(currentValue)
                  }
                  onChange={(e) =>
                    set(
                      spec.key,
                      spec.kind === "number"
                        ? e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                        : e.target.value
                    )
                  }
                />
                {spec.kind === "number" && spec.suffix && (
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                    {spec.suffix}
                  </span>
                )}
              </div>
            )}
          </Field>
        )
      })}
    </div>
  )
}
