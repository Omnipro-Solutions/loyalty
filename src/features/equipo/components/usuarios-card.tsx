import { Users } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { formatNumber } from "@/lib/format"

import { EquipoPaginacion } from "./equipo-paginacion"
import { InvitarUsuarioDialog } from "./invitar-usuario-dialog"
import { UsuariosFiltrosBar } from "./usuarios-filtros-bar"
import { UsuariosTabla } from "./usuarios-tabla"
import { EQUIPO_PAGE_SIZE } from "../lib/queries"
import type { RoleConConteo, TiendaOption, Usuario } from "../lib/queries"

type UsuariosCardProps = {
  usuarios: Usuario[]
  total: number
  totalActivos: number
  invitacionesPendientes: number
  roles: RoleConConteo[]
  tiendas: TiendaOption[]
  puedeGestionar: boolean
  hayFiltrosAplicados: boolean
}

/** Figma "Table" (720:3027): título + conteo + filtros + "Invitar usuario" arriba, tabla, paginación. */
export function UsuariosCard({
  usuarios,
  total,
  totalActivos,
  invitacionesPendientes,
  roles,
  tiendas,
  puedeGestionar,
  hayFiltrosAplicados,
}: UsuariosCardProps) {
  const sinUsuariosAun = total === 0 && !hayFiltrosAplicados
  const sinResultadosDeFiltro = total === 0 && hayFiltrosAplicados

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Usuarios
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumber(total)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(totalActivos)} activos ·{" "}
            {formatNumber(invitacionesPendientes)} invitaciones pendientes
          </p>
        </div>
        <UsuariosFiltrosBar roles={roles} />
        {puedeGestionar && (
          <InvitarUsuarioDialog roles={roles} tiendas={tiendas} />
        )}
      </div>

      {sinUsuariosAun ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            titulo="Todavía no hay usuarios"
            descripcion="Invita a tu equipo para que pueda acceder a Loyalty System."
          />
        </div>
      ) : sinResultadosDeFiltro ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            titulo="Sin resultados"
            descripcion="Ningún usuario coincide con la búsqueda o el filtro aplicado."
          />
        </div>
      ) : (
        <>
          <UsuariosTabla usuarios={usuarios} />
          <EquipoPaginacion total={total} pageSize={EQUIPO_PAGE_SIZE} />
        </>
      )}
    </div>
  )
}
