"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type HeroMoreAttributesProps = {
  /** Conteo real de campos en `fields` — no el "6" fijo del Figma, que asumía otro inventario de atributos. */
  count: number
  fields: ReactNode
}

/** Figma "Ver más atributos" (1159:6) pixel-perfect: barra colapsable al pie del hero con los atributos que no entran en las 3 secciones visibles. "UTM · scoring · notas" es copy decorativo del propio Figma — no hay esos sistemas en este proyecto, no se muestra ningún valor bajo esas etiquetas. */
export function HeroMoreAttributes({ count, fields }: HeroMoreAttributesProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-[10px] bg-accent px-3 py-2.5 text-left"
      >
        <span className="flex-1 text-[11px] font-medium text-primary">
          {open ? "Ocultar atributos" : `Ver ${count} atributos más`}
        </span>
        <span className="shrink-0 text-[9px] text-muted-foreground">
          UTM · scoring · notas
        </span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 text-primary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
          {fields}
        </div>
      )}
    </div>
  )
}
