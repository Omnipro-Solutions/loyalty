import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { NuevoRolDialog } from "./nuevo-rol-dialog"
import type { RoleConConteo } from "../lib/queries"

type RolesListProps = {
  roles: RoleConConteo[]
  rolSeleccionadoId: string
  puedeGestionar: boolean
}

/** Figma "Roles" (718:2893): columna izquierda de 09.2, 276px. */
export function RolesList({
  roles,
  rolSeleccionadoId,
  puedeGestionar,
}: RolesListProps) {
  return (
    <div className="flex h-full w-[276px] shrink-0 flex-col gap-2.5 rounded-[20px] bg-background p-4 shadow-form-section">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-semibold text-foreground">Roles</p>
        {puedeGestionar && <NuevoRolDialog />}
      </div>
      {roles.map((rol) => {
        const activo = rol.id === rolSeleccionadoId
        return (
          <Link
            key={rol.id}
            href={`/ajustes/equipo?tab=roles&rol=${rol.id}`}
            className={cn(
              "flex flex-col gap-[3px] rounded-[14px] px-[13px] py-[11px]",
              activo
                ? "border border-primary bg-accent"
                : "bg-muted hover:bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-[13px] font-semibold text-foreground">
                {rol.nombre}
              </p>
              <Badge variant="neutral" className="h-auto px-2 py-px text-[9px]">
                {rol.tipo === "sistema" ? "Sistema" : "Personalizado"}
              </Badge>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {rol.descripcion ?? "Sin descripción"} ·{" "}
              {formatNumber(rol.miembros)} persona
              {rol.miembros === 1 ? "" : "s"}
            </p>
          </Link>
        )
      })}
    </div>
  )
}
