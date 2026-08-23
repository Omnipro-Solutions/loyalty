import { ShieldCheck } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format"

import type { DispositivoConfiado } from "../lib/queries"
import { RevokeDeviceButton } from "./revoke-device-button"

type SesionesCardProps = { dispositivos: DispositivoConfiado[] }

export function SesionesCard({ dispositivos }: SesionesCardProps) {
  if (!dispositivos.length) {
    return (
      <div className="w-full rounded-[20px] bg-background shadow-form-section">
        <EmptyState
          icon={ShieldCheck}
          titulo="Sin dispositivos recordados"
          descripcion="Esta lista no es un registro de cada inicio de sesión: solo aparece un dispositivo aquí cuando marcas “Recordar este dispositivo” al iniciar sesión."
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
        {dispositivos.map((dispositivo) => {
          const vigente = new Date(dispositivo.expira_en) > new Date()
          return (
            <div
              key={dispositivo.id}
              className="flex items-center gap-3.5 rounded-2xl border border-border px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-foreground">
                    Dispositivo confiado
                  </p>
                  <Badge variant={vigente ? "success" : "neutral"}>
                    {vigente ? "Vigente" : "Expirado"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recordado el {formatDateTime(dispositivo.creado_en)} · expira
                  el {formatDateTime(dispositivo.expira_en)}
                </p>
              </div>
              <RevokeDeviceButton id={dispositivo.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
