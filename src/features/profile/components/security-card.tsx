import { KeyRound, LogIn, ShieldCheck } from "lucide-react"
import Link from "next/link"

import { DetailField } from "@/components/data/detail-field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { SecurityInfo } from "../lib/queries"

const ACCESS_METHOD_LABELS: Record<string, string> = {
  microsoft_entra_id: "SSO · Microsoft Entra ID",
  saml_okta: "SSO · Okta (SAML)",
  saml_ping: "SSO · Ping (SAML)",
  saml_google_workspace: "SSO · Google Workspace (SAML)",
}

type SecurityCardProps = {
  security: SecurityInfo
  tenantIdp: string | null
}

export function SecurityCard({ security, tenantIdp }: SecurityCardProps) {
  const accessMethod = tenantIdp
    ? (ACCESS_METHOD_LABELS[tenantIdp] ?? tenantIdp)
    : "Correo y contraseña"

  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <p className="text-[15px] font-semibold text-foreground">
        Seguridad de la cuenta
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
        <DetailField
          icon={ShieldCheck}
          label="VERIFICACIÓN EN DOS PASOS"
          value={
            <Badge variant={security.mfaEnrolled ? "success" : "neutral"}>
              {security.mfaEnrolled ? "Activa" : "Inactiva"}
            </Badge>
          }
        />
        <DetailField
          icon={KeyRound}
          label="CÓDIGOS DE RESPALDO"
          value={
            security.mfaEnrolled
              ? `${security.remainingBackupCodes} disponibles`
              : "—"
          }
        />
        <DetailField
          icon={LogIn}
          label="MÉTODO DE ACCESO"
          value={accessMethod}
        />
      </div>
      {!security.mfaEnrolled && (
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
