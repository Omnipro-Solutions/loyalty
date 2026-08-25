"use client"

import { ChevronRight } from "lucide-react"
import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type CollapsibleSummaryFieldProps = {
  title: string
  summary: string
  children: ReactNode
  defaultOpen?: boolean
}

/** Figma "Restricciones"/"Canal de entrega" (13.3): plegado por defecto, muestra un resumen de una línea + "Editar"; al abrir, revela los campos reales. */
export function CollapsibleSummaryField({
  title,
  summary,
  children,
  defaultOpen = false,
}: CollapsibleSummaryFieldProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-border bg-neutral-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{summary}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-primary">
          Editar
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3.5">
          {children}
        </div>
      )}
    </div>
  )
}
