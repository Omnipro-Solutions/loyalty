"use client"

import { useAction } from "next-safe-action/hooks"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

import { cancelarInvitacionAction } from "../actions/invitaciones"
import type { Invitacion } from "../lib/queries"

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  cancelada: "Cancelada",
  expirada: "Expirada",
}

const ESTADO_DOT: Record<string, string> = {
  pendiente: "bg-warning",
  aceptada: "bg-success",
  cancelada: "bg-border-strong",
  expirada: "bg-border-strong",
}

type InvitacionesTablaProps = {
  invitaciones: Invitacion[]
  puedeGestionar: boolean
}

export function InvitacionesTabla({
  invitaciones,
  puedeGestionar,
}: InvitacionesTablaProps) {
  const cancelar = useAction(cancelarInvitacionAction)

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>CORREO</TableHead>
          <TableHead>ROL</TableHead>
          <TableHead>INVITADO POR</TableHead>
          <TableHead>VENCE</TableHead>
          <TableHead>ESTADO</TableHead>
          {puedeGestionar && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitaciones.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell className="font-medium text-foreground">
              {inv.email}
            </TableCell>
            <TableCell className="text-secondary-foreground">
              {inv.rol.nombre}
            </TableCell>
            <TableCell className="text-secondary-foreground">
              {inv.invitadoPor?.nombre ?? "—"}
            </TableCell>
            <TableCell className="text-secondary-foreground">
              {formatDateTime(inv.expira_en)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-[7px]">
                <span
                  className={cn(
                    "size-[7px] rounded-full",
                    ESTADO_DOT[inv.estado]
                  )}
                />
                <span className="text-[11px] font-medium">
                  {ESTADO_LABEL[inv.estado]}
                </span>
              </div>
            </TableCell>
            {puedeGestionar && (
              <TableCell className="text-right">
                {inv.estado === "pendiente" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={cancelar.isPending}
                    onClick={() => cancelar.execute({ invitacionId: inv.id })}
                  >
                    Cancelar
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
