import { FileText, Info, Settings2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"

import type { Integration } from "../lib/catalog"

type IntegrationDetailPanelProps = {
  integration: Integration
  category: string
  direction: "origen" | "destino"
  onClose: () => void
}

/** Figma "Panel · detalle integración" (1265:4205 / 1265:4811). */
export function IntegrationDetailPanel({
  integration,
  category,
  direction,
  onClose,
}: IntegrationDetailPanelProps) {
  return (
    <div className="flex w-[292px] shrink-0 flex-col rounded-2xl bg-background pb-[18px] shadow-form-section">
      <div className="flex items-center gap-2.5 py-4 pr-3.5 pl-4">
        <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] border border-muted bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 28px, no vale next/image. */}
          <img src={integration.logo} alt="" className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {integration.shortName}
          </p>
          <p className="truncate text-[10.5px] text-muted-foreground">
            {integration.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1 px-3 pb-3">
        <div
          className="flex items-center gap-2.5 rounded-lg p-2 opacity-45"
          title="Disponible en una próxima fase"
        >
          <Settings2 className="size-[15px] text-secondary-foreground" />
          <span className="flex-1 text-xs font-medium text-secondary-foreground">
            Configurar
          </span>
          <Info className="size-3.5 text-secondary-foreground" />
        </div>
        <div
          className="flex items-center gap-2.5 rounded-lg p-2 opacity-45"
          title="Disponible en una próxima fase"
        >
          <FileText className="size-[15px] text-secondary-foreground" />
          <span className="flex-1 text-xs font-medium text-secondary-foreground">
            Ver documentación
          </span>
        </div>
        <p className="rounded-lg bg-warning-bg px-2.5 py-2 text-[10.5px] leading-[15px] text-foreground">
          {integration.note}
        </p>
      </div>

      <div className="h-px w-full bg-muted" />

      <div className="flex flex-col gap-3.5 px-4 pt-4">
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold tracking-[0.5px] text-muted-foreground">
            DESCRIPCIÓN
          </p>
          <p className="text-[11.5px] leading-[17px] text-secondary-foreground">
            {integration.description}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold tracking-[0.5px] text-muted-foreground">
            CATEGORÍA
          </p>
          <p className="text-[11.5px] leading-[17px] text-secondary-foreground">
            {category}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold tracking-[0.5px] text-muted-foreground">
            {direction === "origen" ? "DATOS QUE RECIBE" : "DATOS QUE ENVÍA"}
          </p>
          <p className="text-[11.5px] leading-[17px] text-secondary-foreground">
            {integration.data}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold tracking-[0.5px] text-muted-foreground">
            MÉTODO
          </p>
          <p className="text-[11.5px] leading-[17px] text-secondary-foreground">
            {integration.method}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {integration.tags.map((tag) => (
            <Badge
              key={tag}
              variant="neutral"
              className="h-auto px-2.5 py-[3px] text-[10px] font-medium"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
