import Link from "next/link"
import { TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/layout/auth-card"

const FILAS = (email: string, motivo: string) => [
  { etiqueta: "Usuario", valor: email },
  { etiqueta: "Proveedor", valor: "Microsoft Entra ID" },
  { etiqueta: "Motivo", valor: motivo },
  { etiqueta: "Código", valor: "SSO_USER_NOT_PROVISIONED", mono: true },
]

export function SsoDeniedCard({
  email,
  motivo,
}: {
  email: string
  motivo: string
}) {
  return (
    <AuthCard className="gap-3">
      <div className="flex w-fit items-center justify-center rounded-2xl bg-destructive-bg p-2.5">
        <TriangleAlert className="size-5 text-destructive" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xl leading-[1.4] font-semibold text-foreground">
          No pudimos completar el acceso
        </p>
        <p className="text-sm text-muted-foreground">
          Tu identidad fue verificada en Microsoft Entra ID, pero la cuenta aún
          no está aprovisionada en Omni.
        </p>
      </div>

      <div className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-neutral-50 p-2.5 text-xs">
        {FILAS(email, motivo).map((fila) => (
          <div key={fila.etiqueta} className="flex items-center gap-3">
            <p className="w-[84px] shrink-0 text-muted-foreground">
              {fila.etiqueta}
            </p>
            <p
              className={
                fila.mono
                  ? "min-w-0 flex-1 font-mono text-destructive"
                  : "min-w-0 flex-1 text-foreground"
              }
            >
              {fila.valor}
            </p>
          </div>
        ))}
      </div>

      <Button
        className="w-full"
        size="sm"
        nativeButton={false}
        render={
          <a href="mailto:eduardo.t@omni.pro?subject=Solicitud%20de%20acceso%20SSO" />
        }
      >
        Solicitar acceso al administrador
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        nativeButton={false}
        render={<Link href="/login" />}
      >
        Iniciar sesión con otra cuenta
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Administrador del tenant: Eduardo Tirado · eduardo.t@omni.pro
      </p>
    </AuthCard>
  )
}
