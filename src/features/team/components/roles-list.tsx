import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { NewRoleDialog } from "./new-role-dialog"
import type { RoleWithCount } from "../lib/queries"

type RolesListProps = {
  roles: RoleWithCount[]
  selectedRoleId: string
  canManage: boolean
}

/** Figma "Roles" (718:2893): columna izquierda de 09.2, 276px. */
export function RolesList({
  roles,
  selectedRoleId,
  canManage,
}: RolesListProps) {
  return (
    <div className="flex h-full w-[276px] shrink-0 flex-col gap-2.5 rounded-[20px] bg-background p-4 shadow-form-section">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-semibold text-foreground">Roles</p>
        {canManage && <NewRoleDialog />}
      </div>
      {roles.map((role) => {
        const active = role.id === selectedRoleId
        return (
          <Link
            key={role.id}
            href={`/ajustes/equipo?tab=roles&rol=${role.id}`}
            className={cn(
              "flex flex-col gap-[3px] rounded-[14px] px-[13px] py-[11px]",
              active
                ? "border border-selected bg-accent"
                : "bg-muted hover:bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-[13px] font-semibold text-foreground">
                {role.nombre}
              </p>
              <Badge variant="neutral" className="h-auto px-2 py-px text-[9px]">
                {role.tipo === "sistema" ? "Sistema" : "Personalizado"}
              </Badge>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {role.descripcion ?? "Sin descripción"} ·{" "}
              {formatNumber(role.members)} persona
              {role.members === 1 ? "" : "s"}
            </p>
          </Link>
        )
      })}
    </div>
  )
}
