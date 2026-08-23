"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/layout/auth-card"
import { MicrosoftLogo } from "@/components/icons/microsoft-logo"

import { startAzureOAuthRedirect } from "../lib/oauth"

const PASOS = [
  {
    titulo: "Correo corporativo verificado",
    detalle: (email: string) => email,
  },
  {
    titulo: "Redirección al proveedor de identidad",
    detalle: () => "login.microsoftonline.com",
  },
  {
    titulo: "Validación de sesión, rol y permisos",
    detalle: () => "Omni Retail Group",
  },
] as const

const REDIRECT_DELAY_MS = 1600

export function SsoRedirectCard({ email }: { email: string }) {
  const router = useRouter()
  // Arranca en el paso 2: el correo ya se verificó antes de llegar a esta
  // pantalla (01.3), así que el paso 1 nace "hecho" (Figma 1145:5111).
  const [pasoActivo, setPasoActivo] = useState(2)

  useEffect(() => {
    const stepTimer = setTimeout(() => setPasoActivo(3), REDIRECT_DELAY_MS / 2)
    const redirectTimer = setTimeout(() => {
      void startAzureOAuthRedirect()
    }, REDIRECT_DELAY_MS)
    return () => {
      clearTimeout(stepTimer)
      clearTimeout(redirectTimer)
    }
  }, [])

  return (
    <AuthCard className="gap-3">
      <div className="flex w-fit items-center justify-center rounded-2xl border border-border bg-neutral-50 p-3">
        <MicrosoftLogo className="size-6" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xl leading-[1.4] font-semibold text-foreground">
          Redirigiendo a Microsoft Entra ID
        </p>
        <p className="text-sm text-muted-foreground">
          Te estamos llevando al portal de tu organización para verificar tu
          identidad. No cierres esta ventana.
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out"
          style={{ width: pasoActivo >= 3 ? "90%" : "55%" }}
        />
      </div>

      <div className="flex w-full flex-col gap-2.5 rounded-xl border border-border bg-neutral-50 p-3">
        {PASOS.map((paso, i) => {
          const index = i + 1
          const estado =
            index < pasoActivo
              ? "hecho"
              : index === pasoActivo
                ? "activo"
                : "pendiente"
          return (
            <div key={paso.titulo} className="flex items-center gap-2.5">
              <span
                className={
                  estado === "hecho"
                    ? "size-[18px] shrink-0 rounded-full bg-success"
                    : estado === "activo"
                      ? "size-[18px] shrink-0 rounded-full bg-primary"
                      : "size-[18px] shrink-0 rounded-full border-2 border-border"
                }
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <p
                  className={
                    estado === "pendiente"
                      ? "text-[13px] text-muted-foreground"
                      : "text-[13px] font-medium text-foreground"
                  }
                >
                  {paso.titulo}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {paso.detalle(email)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <p className="w-full rounded-lg bg-accent px-3 py-2 text-xs font-medium text-accent-foreground">
        Conexión cifrada · OIDC / SAML 2.0 · La contraseña nunca pasa por Omni.
      </p>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => router.push("/login")}
      >
        Cancelar y volver al login
      </Button>
    </AuthCard>
  )
}
