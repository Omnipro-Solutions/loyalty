import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type KpiRowProps = {
  children: ReactNode
  className?: string
}

/**
 * Fila de KPIs de cabecera de pantalla (`KpiCard`, `KpiWidget`,
 * `KpiDenseCard`). En el Figma es un `flex` de tarjetas al mismo ancho,
 * pero un flex row solo puede apretar: con 4-6 KPIs y el viewport
 * estrechado (zoom de navegador incluido) los valores se parten en dos
 * líneas y las etiquetas se truncan.
 *
 * `auto-fit` + `minmax` reproduce el reparto a partes iguales del Figma
 * cuando hay espacio y reduce el número de columnas cuando no, sin tener
 * que declarar un breakpoint por cada cantidad de KPIs (las filas de esta
 * app van de 3 a 6 tarjetas).
 */
export function KpiRow({ children, className }: KpiRowProps) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] items-stretch gap-4",
        className
      )}
    >
      {children}
    </div>
  )
}
