import { FileText, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Integracion } from "../lib/catalogo"

type IntegracionCardProps = {
  integracion: Integracion
  seleccionada: boolean
  onSeleccionar: () => void
}

/** Figma "Card · Adobe Journey Optimizer" y análogas (1264:4218). */
export function IntegracionCard({
  integracion,
  seleccionada,
  onSeleccionar,
}: IntegracionCardProps) {
  return (
    <button
      type="button"
      onClick={onSeleccionar}
      aria-pressed={seleccionada}
      className={cn(
        "flex w-[186px] flex-col items-start gap-2.5 rounded-[14px] border bg-background px-3 pt-3 pb-2.5 text-left",
        seleccionada
          ? "border-[1.6px] border-primary shadow-form-section"
          : "border-muted hover:border-border-strong"
      )}
    >
      <div className="flex w-full items-center gap-2.5">
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-muted bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 22px, no vale next/image. */}
          <img src={integracion.logo} alt="" className="size-[22px]" />
        </div>
        <p className="min-w-0 flex-1 truncate text-[11.5px] leading-4 font-semibold text-foreground">
          {integracion.nombre}
        </p>
      </div>
      <div className="h-px w-full bg-muted" />
      <div className="flex w-full items-center gap-2">
        <span className="rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold text-border-strong">
          Configurar
        </span>
        <span className="h-px flex-1" />
        <FileText className="size-3.5 text-border-strong" />
        <MoreHorizontal className="size-3.5 text-border-strong" />
      </div>
    </button>
  )
}
