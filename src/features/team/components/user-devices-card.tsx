"use client"

import { ShieldCheck } from "lucide-react"
import { useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/format"

import { RevokeUserDevicesDialog } from "./revoke-user-devices-dialog"
import type { TrustedDeviceSummary } from "../lib/admin-auth"

type UserDevicesCardProps = {
  profileId: string
  devices: TrustedDeviceSummary[]
  canManage: boolean
}

export function UserDevicesCard({
  profileId,
  devices,
  canManage,
}: UserDevicesCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!devices.length) {
    return (
      <div className="w-full rounded-[20px] bg-background shadow-form-section">
        <EmptyState
          icon={ShieldCheck}
          title="Sin dispositivos recordados"
          description="No hay dispositivos marcados como de confianza para este usuario."
        />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-foreground">
          Dispositivos de confianza
        </p>
        {canManage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            Revocar todos
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {devices.map((device) => {
          const isValid = new Date(device.expira_en) > new Date()
          return (
            <div
              key={device.id}
              className="flex items-center gap-3.5 rounded-2xl border border-border px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-foreground">
                    Dispositivo confiado
                  </p>
                  <Badge variant={isValid ? "success" : "neutral"}>
                    {isValid ? "Vigente" : "Expirado"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recordado el {formatDateTime(device.creado_en)} · expira el{" "}
                  {formatDateTime(device.expira_en)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <RevokeUserDevicesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profileId={profileId}
        devicesCount={devices.length}
      />
    </div>
  )
}
