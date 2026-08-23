"use client"

import { Plus } from "lucide-react"
import { useFieldArray, useWatch, type Control } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { COMBINADORES_CONDICION } from "@/types/domain"
import type { CombinadorCondicion } from "@/types/domain"

import { CondicionRow } from "./condicion-row"
import { COMBINADOR_CONDICION_LABEL } from "../lib/labels"
import type {
  CategoriaCondicion,
  CiudadCondicion,
  SegmentoCondicion,
} from "../lib/queries"
import type { PromocionValues } from "../schemas"

type CondicionesBuilderProps = {
  control: Control<PromocionValues>
  onCombinadorChange: (valor: CombinadorCondicion) => void
  categorias: CategoriaCondicion[]
  ciudades: CiudadCondicion[]
  segmentos: SegmentoCondicion[]
}

/** Figma "Card · Condiciones (SI)" (633:851): combinador AND/OR + filas dinámicas + "Agregar condición". */
export function CondicionesBuilder({
  control,
  onCombinadorChange,
  categorias,
  ciudades,
  segmentos,
}: CondicionesBuilderProps) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "condiciones",
  })
  const combinador = useWatch({ control, name: "combinadorCondiciones" })

  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex items-center gap-2">
        {COMBINADORES_CONDICION.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => onCombinadorChange(valor)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
              combinador === valor
                ? "border-primary bg-brand-subtle text-primary-800"
                : "border-border bg-background text-secondary-foreground"
            )}
          >
            {COMBINADOR_CONDICION_LABEL[valor]}
          </button>
        ))}
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sin condiciones: la promoción aplica a todos los clientes.
        </p>
      )}

      {fields.map((field, index) => (
        <CondicionRow
          key={field.id}
          numero={index + 1}
          condicion={field}
          categorias={categorias}
          ciudades={ciudades}
          segmentos={segmentos}
          onChange={(siguiente) => update(index, siguiente)}
          onRemove={() => remove(index)}
        />
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => append({ campo: "categoria", valor: [] })}
        className="w-fit"
      >
        <Plus className="size-3.5" />
        Agregar condición
      </Button>
    </div>
  )
}
