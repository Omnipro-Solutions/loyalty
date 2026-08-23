import { FileText, Info, Settings2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"

import type { Integracion } from "../lib/catalogo"

type IntegracionDetallePanelProps = {
  integracion: Integracion
  categoria: string
  direccion: "origen" | "destino"
  onCerrar: () => void
}

/** Figma "Panel · detalle integración" (1265:4205 / 1265:4811). */
export function IntegracionDetallePanel({
  integracion,
  categoria,
  direccion,
  onCerrar,
}: IntegracionDetallePanelProps) {
  return (
    <div className="flex w-[292px] shrink-0 flex-col rounded-2xl bg-background pb-[18px] shadow-form-section">
      <div className="flex items-center gap-2.5 py-4 pr-3.5 pl-4">
        <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-muted bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 24px, no vale next/image. */}
          <img src={integracion.logo} alt="" className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {integracion.nombreCorto}
          </p>
          <p className="truncate text-[10.5px] text-muted-foreground">
            {integracion.subtitulo}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1 px-3 pb-3">
        <div className="flex items-center gap-2.5 rounded-lg p-2 opacity-45">
          <Settings2 className="size-[15px] text-secondary-foreground" />
          <span className="flex-1 text-xs font-medium text-secondary-foreground">
            Configurar
          </span>
          <Info className="size-3.5 text-secondary-foreground" />
        </div>
        <div className="flex items-center gap-2.5 rounded-lg p-2 opacity-45">
          <FileText className="size-[15px] text-secondary-foreground" />
          <span className="flex-1 text-xs font-medium text-secondary-foreground">
            Ver documentación
          </span>
        </div>
        <p className="rounded-lg bg-warning-bg px-2.5 py-2 text-[10.5px] leading-[15px] text-foreground">
          {integracion.nota}
        </p>
      </div>

      <div className="h-px w-full bg-muted" />

      <div className="flex flex-col gap-3.5 px-4 pt-4">
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold tracking-[0.5px] text-muted-foreground">
            DESCRIPCIÓN
          </p>
          <p className="text-[11.5px] leading-[17px] text-secondary-foreground">
            {integracion.descripcion}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold tracking-[0.5px] text-muted-foreground">
            CATEGORÍA
          </p>
          <p className="text-[11.5px] leading-[17px] text-secondary-foreground">
            {categoria}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold tracking-[0.5px] text-muted-foreground">
            {direccion === "origen" ? "DATOS QUE RECIBE" : "DATOS QUE ENVÍA"}
          </p>
          <p className="text-[11.5px] leading-[17px] text-secondary-foreground">
            {integracion.datos}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-semibold tracking-[0.5px] text-muted-foreground">
            MÉTODO
          </p>
          <p className="text-[11.5px] leading-[17px] text-secondary-foreground">
            {integracion.metodo}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {integracion.tags.map((tag) => (
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
