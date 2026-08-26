"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { EntityPickerField } from "./entity-picker"

export type PickerOption = {
  value: string
  label: string
  /** Segunda línea del modal y texto extra buscable (SKU, referencia, conteo…). */
  hint?: string
}

/**
 * A partir de aquí un `Select` deja de servir: la lista se vuelve un scroll
 * a ciegas donde hay que reconocer la opción de memoria. El umbral es el
 * mismo para todo el sistema, así que vive aquí y no en cada formulario.
 */
export const SEARCHABLE_OPTION_THRESHOLD = 10

/** Aspecto "chip" de los controles embebidos en una frase (constructor de condiciones). */
export const CHIP_TRIGGER =
  "w-fit gap-1 rounded-[7px] border-border bg-background px-2 py-[3px] text-[10.5px] leading-[15px] font-semibold whitespace-nowrap"

type OptionPickerProps = {
  options: PickerOption[]
  value: string | undefined
  onValueChange: (value: string) => void
  /** Título del modal con buscador (se ignora con pocas opciones). */
  title: string
  description?: string
  placeholder?: string
  confirmLabel?: string
  id?: string
  className?: string
  size?: "default" | "chip"
}

/**
 * Selector de UN valor que se adapta al tamaño de la lista, sin que cada
 * formulario tenga que decidirlo: hasta `SEARCHABLE_OPTION_THRESHOLD`
 * opciones es el `Select` de siempre, y de ahí para arriba es
 * `EntityPickerField` en modo `single` — modal con buscador, sin tope de
 * filas visibles.
 *
 * No implementa nada propio: compone los dos componentes que ya existen,
 * así que el aspecto y el comportamiento son los mismos que en el resto de
 * la app (mismo criterio que `Multiselect`, que ya trae buscador).
 */
export function OptionPicker({
  options,
  value,
  onValueChange,
  title,
  description,
  placeholder,
  confirmLabel,
  id,
  className,
  size = "default",
}: OptionPickerProps) {
  const labelByValue = new Map(options.map((o) => [o.value, o.label]))

  if (options.length > SEARCHABLE_OPTION_THRESHOLD) {
    return (
      <EntityPickerField
        id={id}
        size={size}
        className={className}
        title={title}
        description={description}
        mode="single"
        items={options}
        getId={(option) => option.value}
        getSearchText={(option) => `${option.label} ${option.hint ?? ""}`}
        getChipLabel={(option) => option.label}
        renderRow={(option) => (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] leading-[18px] font-medium text-foreground">
              {option.label}
            </span>
            {option.hint && (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {option.hint}
              </span>
            )}
          </div>
        )}
        placeholder={placeholder}
        confirmLabel={confirmLabel}
        value={value ? [value] : []}
        onValueChange={([next]) => next && onValueChange(next)}
      />
    )
  }

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as string)}>
      <SelectTrigger
        id={id}
        className={cn(size === "chip" && CHIP_TRIGGER, className)}
      >
        <SelectValue placeholder={placeholder}>
          {(v: string) => labelByValue.get(v) ?? v}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-max">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
            {option.hint && (
              <span className="text-muted-foreground"> · {option.hint}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
