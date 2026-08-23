import { Package } from "lucide-react"

import { formatPorcentaje } from "@/lib/format"
import { cn } from "@/lib/utils"

import { bandaCompletitud, calcularCompletitud } from "../lib/completitud"
import type { Producto } from "../lib/queries"

const BANDA_LABEL = { success: "ALTA", warning: "MEDIA", destructive: "BAJA" }
const BANDA_TEXT = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
}
const BANDA_BADGE_BG = {
  success: "bg-success-bg",
  warning: "bg-warning-bg",
  destructive: "bg-destructive-bg",
}
const BANDA_FILL = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
}

type ProductoHeroProps = { producto: Producto }

/** Figma "Hero" (1211:4026): imagen + identidad + completitud de datos. */
export function ProductoHero({ producto }: ProductoHeroProps) {
  const { llenos, total, porcentaje } = calcularCompletitud({
    ...producto,
    tieneClasificacion: producto.rutas.length > 0,
  })
  const banda = bandaCompletitud(porcentaje)
  const activo = producto.estado === "activo"

  return (
    <div className="flex items-center gap-[18px] rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      {producto.imagen_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 62px, no vale next/image.
        <img
          src={producto.imagen_url}
          alt=""
          className="size-[62px] shrink-0 rounded-2xl object-cover"
        />
      ) : (
        <div className="flex size-[62px] shrink-0 items-center justify-center rounded-2xl bg-avatar-indigo-bg">
          <Package className="size-6 text-avatar-indigo-fg" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2">
        <p className="text-lg font-semibold text-foreground">
          {producto.nombre}
          {producto.presentacion ? ` · ${producto.presentacion}` : ""}
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.2px]",
              activo
                ? "bg-success-bg text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            {activo ? "ACTIVO" : "INACTIVO"}
          </span>
          {producto.tipo_producto && (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-semibold tracking-[0.2px] text-warning">
              {producto.tipo_producto.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="h-14 w-px bg-muted" />

      <div className="flex w-[300px] flex-col gap-1.5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <p className="flex-1 text-[9px] font-semibold tracking-[0.5px]">
            COMPLETITUD DE DATOS
          </p>
          <p className="text-[10px]">
            {llenos} de {total} campos
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <p className="text-xl font-semibold text-foreground">
            {formatPorcentaje(porcentaje)}
          </p>
          <span
            className={cn(
              "rounded-md px-[7px] py-0.5 text-[8px] font-semibold tracking-[0.4px]",
              BANDA_BADGE_BG[banda],
              BANDA_TEXT[banda]
            )}
          >
            {BANDA_LABEL[banda]}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", BANDA_FILL[banda])}
              style={{ width: `${porcentaje * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
