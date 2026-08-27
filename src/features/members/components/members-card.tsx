import type { ReactNode } from "react"

import { MembersFiltersBar } from "./members-filters-bar"
import type { TierOption } from "../lib/queries"

type MembersCardProps = {
  tiers: TierOption[]
  /** Pill de conteo — su propio `<Suspense>`, misma promesa que `children`. */
  count: ReactNode
  /** `ExportMembersButton` necesita el array resuelto — va en su propio `<Suspense>` sin key (no hace falta remontarlo, solo esperar). */
  exportSlot: ReactNode
  /** Tabla + paginación, o `EmptyState` — va dentro de un `<Suspense>` con key. */
  children: ReactNode
}

/**
 * Figma "05.1 · Clientes · listado" (704:3012): título + conteo + filtros
 * arriba, tabla, paginación. Shell del card: la barra de filtros vive fuera
 * de cualquier `<Suspense>` con key a propósito — remontarla borraría el
 * texto del buscador y el foco (ver `MembersFiltersBar`).
 */
export function MembersCard({
  tiers,
  count,
  exportSlot,
  children,
}: MembersCardProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Clientes
            </p>
            {count}
          </div>
        </div>
        <MembersFiltersBar tiers={tiers} />
        {exportSlot}
      </div>

      {children}
    </div>
  )
}
