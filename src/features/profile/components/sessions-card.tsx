import { ShieldCheck } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format"

import type { TrustedDevice } from "../lib/queries"
import { RevokeDeviceButton } from "./revoke-device-button"

type SessionsCardProps = { devices: TrustedDevice[] }

export function SessionsCard({ devices }: SessionsCardProps) {
  if (!devices.length) {
    return (
      <div className="w-full rounded-[20px] bg-background shadow-form-section">
        <EmptyState
          icon={ShieldCheck}
          title="Sin dispositivos recordados"
          description="Esta lista no es un registro de cada inicio de sesión: solo aparece un dispositivo aquí cuando marcas “Recordar este dispositivo” al iniciar sesión."
        />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <div className="flex flex-col gap-[3px]">
        <p className="text-[15px] font-semibold text-foreground">
          Dispositivos de confianza
        </p>
        <p className="text-xs text-muted-foreground">
          Dispositivos donde marcaste “Recordar este dispositivo” — no es un
          registro de cada inicio de sesión.
        </p>
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
              <RevokeDeviceButton id={device.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
