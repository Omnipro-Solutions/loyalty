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

import { cancelInvitationAction } from "../actions/invitations"
import type { Invitation } from "../lib/queries"

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  cancelada: "Cancelada",
  expirada: "Expirada",
}

const STATUS_DOT: Record<string, string> = {
  pendiente: "bg-warning",
  aceptada: "bg-success",
  cancelada: "bg-border-strong",
  expirada: "bg-border-strong",
}

type InvitationsTableProps = {
  invitations: Invitation[]
  canManage: boolean
}

export function InvitationsTable({
  invitations,
  canManage,
}: InvitationsTableProps) {
  const cancel = useAction(cancelInvitationAction)

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>CORREO</TableHead>
          <TableHead>ROL</TableHead>
          <TableHead>INVITADO POR</TableHead>
          <TableHead>VENCE</TableHead>
          <TableHead>ESTADO</TableHead>
          {canManage && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell className="font-medium text-foreground">
              {invitation.email}
            </TableCell>
            <TableCell className="text-secondary-foreground">
              {invitation.role.nombre}
            </TableCell>
            <TableCell className="text-secondary-foreground">
              {invitation.invitedBy?.nombre ?? "—"}
            </TableCell>
            <TableCell className="text-secondary-foreground">
              {formatDateTime(invitation.expira_en)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-[7px]">
                <span
                  className={cn(
                    "size-[7px] rounded-full",
                    STATUS_DOT[invitation.estado]
                  )}
                />
                <span className="text-[11px] font-medium">
                  {STATUS_LABEL[invitation.estado]}
                </span>
              </div>
            </TableCell>
            {canManage && (
              <TableCell className="text-right">
                {invitation.estado === "pendiente" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={cancel.isPending}
                    onClick={() =>
                      cancel.execute({ invitationId: invitation.id })
                    }
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
