import {
  Cloud,
  KeyRound,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { CUENTAS, type EstadoCuenta } from "../lib/cuentas"

const PROVEEDOR_ICON: Record<string, LucideIcon> = {
  "Microsoft Entra ID": ShieldCheck,
  "Google Cloud": Cloud,
  Twilio: MessageSquare,
  "Meta Business": Megaphone,
}

const ESTADO_LABEL: Record<EstadoCuenta, string> = {
  activa: "Activa",
  requiere_atencion: "Requiere atención",
}

/**
 * Sin equivalente en Figma — agrupa las credenciales que las notas del
 * catálogo referencian ("conectada en Cuentas", "vinculada en Cuentas").
 */
export function CuentasCard() {
  return (
    <div className="flex w-full flex-col gap-3">
      {CUENTAS.map((cuenta) => {
        const Icon = PROVEEDOR_ICON[cuenta.proveedor] ?? KeyRound
        return (
          <div
            key={cuenta.id}
            className="flex items-center gap-3.5 rounded-2xl bg-background p-4 shadow-form-section"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Icon className="size-[18px] text-secondary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {cuenta.proveedor}
                </p>
                <Badge
                  variant={cuenta.estado === "activa" ? "success" : "warning"}
                >
                  {ESTADO_LABEL[cuenta.estado]}
                </Badge>
              </div>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {cuenta.identificador} · conectada el {cuenta.conectadaEl}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Usada por {cuenta.usadaPor.join(", ")}
              </p>
              {cuenta.nota && (
                <p className="mt-1.5 rounded-lg bg-warning-bg px-2.5 py-1.5 text-[10.5px] text-foreground">
                  {cuenta.nota}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" disabled className="shrink-0">
              {cuenta.estado === "requiere_atencion"
                ? "Renovar acceso"
                : "Gestionar"}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
