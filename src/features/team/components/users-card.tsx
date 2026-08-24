import type { ReactNode } from "react"

import { InviteUserDialog } from "./invite-user-dialog"
import { UsersFiltersBar } from "./users-filters-bar"
import { formatNumber } from "@/lib/format"
import type { RoleWithCount, StoreOption } from "../lib/queries"

type UsersCardProps = {
  activeUsers: number
  pendingInvitations: number
  roles: RoleWithCount[]
  stores: StoreOption[]
  canManage: boolean
  /** Pill de conteo — su propio `<Suspense>`, misma promesa que `children`. */
  count: ReactNode
  /** Tabla + paginación, o `EmptyState` — va dentro de un `<Suspense>` con key. */
  children: ReactNode
}

/**
 * Figma "Table" (720:3027): título + conteo + filtros + "Invitar usuario"
 * arriba, tabla, paginación. Shell del card: la barra de filtros vive fuera
 * de cualquier `<Suspense>` con key a propósito — remontarla borraría el
 * texto del buscador y el foco (mismo patrón que `MembersFiltersBar`).
 */
export function UsersCard({
  activeUsers,
  pendingInvitations,
  roles,
  stores,
  canManage,
  count,
  children,
}: UsersCardProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Usuarios
            </p>
            {count}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(activeUsers)} activos ·{" "}
            {formatNumber(pendingInvitations)} invitaciones pendientes
          </p>
        </div>
        <UsersFiltersBar roles={roles} />
        {canManage && <InviteUserDialog roles={roles} stores={stores} />}
      </div>

      {children}
    </div>
  )
}
