"use client"

import { ShieldCheck } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/format"

import { ResetUserMfaDialog } from "./reset-user-mfa-dialog"
import type { UserAuthDetail } from "../lib/admin-auth"

type UserSecurityCardProps = {
  profileId: string
  authDetail: UserAuthDetail
  canManage: boolean
}

export function UserSecurityCard({
  profileId,
  authDetail,
  canManage,
}: UserSecurityCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const enrolled = authDetail.factors.length > 0

  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <div className="flex items-center gap-2.5">
        <p className="text-[15px] font-semibold text-foreground">
          Verificación en dos pasos
        </p>
        <Badge variant={enrolled ? "success" : "neutral"}>
          {enrolled ? "Activa" : "Inactiva"}
        </Badge>
        {authDetail.banned && (
          <Badge variant="warning">Cuenta desactivada</Badge>
        )}
      </div>

      {enrolled && (
        <div className="flex flex-col gap-2">
          {authDetail.factors.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center gap-2.5 rounded-2xl border border-border px-4 py-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ShieldCheck className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {factor.friendlyName ?? "App autenticadora"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {factor.verifiedAt
                    ? `Verificado el ${formatDateTime(factor.verifiedAt)}`
                    : "Verificado"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="flex items-center justify-between gap-3.5 rounded-2xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Borra sus factores verificados y sus códigos de respaldo — tendrá
            que enrolar de nuevo. También cierra sus sesiones activas.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={!enrolled}
            onClick={() => setDialogOpen(true)}
          >
            Restablecer 2FA
          </Button>
        </div>
      )}

      <ResetUserMfaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profileId={profileId}
      />
    </div>
  )
}
