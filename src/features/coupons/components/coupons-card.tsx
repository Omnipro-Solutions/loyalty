import type { ReactNode } from "react"

import { CouponsFiltersBar } from "./coupons-filters-bar"

type CouponsCardProps = {
  levelNote: ReactNode
  statusChips: ReactNode
  contextLine: ReactNode
  children: ReactNode
}

/**
 * Shell del card de listado (Figma 13.1/13.2): toolbar, nota de nivel,
 * chips de estado, línea de contexto y la tabla + paginación (en
 * `children`, dentro de su propio `<Suspense>`). El vista/estado/búsqueda
 * concretos se resuelven en `page.tsx`, que compone cada pieza — este
 * componente ya no tiene su propia cabecera con título/conteo ni los
 * botones de exportar/imprimir: el Figma los dibuja en la cabecera de la
 * página, no dentro de la tarjeta.
 */
export function CouponsCard({
  levelNote,
  statusChips,
  contextLine,
  children,
}: CouponsCardProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5">
        <CouponsFiltersBar />
      </div>
      <div className="flex flex-col gap-3 px-4 pb-3.5">
        {levelNote}
        {statusChips}
        {contextLine}
      </div>
      {children}
    </div>
  )
}
