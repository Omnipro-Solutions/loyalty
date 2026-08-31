import type { ReactNode } from "react"

import { AudiencesSearch } from "./audiences-search"

type AudiencesCardProps = {
  /** Pill de conteo — su propio `<Suspense>`, misma promesa que `children`. */
  count: ReactNode
  exportSlot: ReactNode
  /** Tabla + paginación, o `EmptyState` — dentro de un `<Suspense>` con key. */
  children: ReactNode
}

/**
 * Figma "11.1 · Audiencias · listado" (842:5955): título + conteo +
 * buscador/exportar arriba, tabla, paginación. Shell del card:
 * `AudiencesSearch` vive fuera de cualquier boundary con key a propósito —
 * remontarlo borraría el texto del buscador y el foco.
 */
export function AudiencesCard({
  count,
  exportSlot,
  children,
}: AudiencesCardProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-3 px-[22px] py-4">
        <div className="flex flex-1 items-center gap-2">
          <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
            Audiencias
          </p>
          {count}
        </div>
        <AudiencesSearch />
        {exportSlot}
      </div>

      {children}
    </div>
  )
}
