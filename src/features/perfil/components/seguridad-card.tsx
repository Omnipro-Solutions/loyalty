import { KeyRound, LogIn, ShieldCheck } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { SeguridadInfo } from "../lib/queries"
import { Campo } from "./campo"

const METODO_ACCESO_LABELS: Record<string, string> = {
  microsoft_entra_id: "SSO · Microsoft Entra ID",
  saml_okta: "SSO · Okta (SAML)",
  saml_ping: "SSO · Ping (SAML)",
  saml_google_workspace: "SSO · Google Workspace (SAML)",
}

type SeguridadCardProps = {
  seguridad: SeguridadInfo
  tenantIdp: string | null
}

export function SeguridadCard({ seguridad, tenantIdp }: SeguridadCardProps) {
  const metodoAcceso = tenantIdp
    ? (METODO_ACCESO_LABELS[tenantIdp] ?? tenantIdp)
    : "Correo y contraseña"

  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <p className="text-[15px] font-semibold text-foreground">
        Seguridad de la cuenta
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
        <Campo
          icon={ShieldCheck}
          etiqueta="VERIFICACIÓN EN DOS PASOS"
          valor={
            <Badge variant={seguridad.mfaEnrolled ? "success" : "neutral"}>
              {seguridad.mfaEnrolled ? "Activa" : "Inactiva"}
            </Badge>
          }
        />
        <Campo
          icon={KeyRound}
          etiqueta="CÓDIGOS DE RESPALDO"
          valor={
            seguridad.mfaEnrolled
              ? `${seguridad.backupCodesRestantes} disponibles`
              : "—"
          }
        />
        <Campo icon={LogIn} etiqueta="MÉTODO DE ACCESO" valor={metodoAcceso} />
      </div>
      {!seguridad.mfaEnrolled && (
        <div className="flex items-center justify-between gap-3.5 rounded-2xl border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Protege tu cuenta pidiendo un código de tu app autenticadora además
            de la contraseña.
          </p>
          <Button
            size="sm"
            className="shrink-0"
            nativeButton={false}
            render={<Link href="/verificacion" />}
          >
            Activar verificación en dos pasos
          </Button>
        </div>
      )}
    </div>
  )
}
