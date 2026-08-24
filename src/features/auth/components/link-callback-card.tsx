"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

import { AuthCard } from "@/components/layout/auth-card"

import { establishSessionAction } from "../actions/session"

const NEXT_PATH_BY_TYPE: Record<string, string> = {
  invite: "/activar-cuenta",
  recovery: "/restablecer-contrasena",
}

/**
 * Landing del flujo implícito de Supabase Auth (invite/recovery en plan
 * Free sin SMTP propio, ver DEPLOY.md 4.1): Auth verifica el token en su
 * propio `/verify` y redirige aquí con los tokens de sesión en el
 * fragmento de la URL (`#access_token=...`) — el fragmento nunca llega al
 * servidor, así que la sesión de cookies se establece desde el cliente.
 */
export function LinkCallbackCard() {
  const router = useRouter()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const params = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")
    const next = NEXT_PATH_BY_TYPE[params.get("type") ?? ""]

    if (params.get("error") || !accessToken || !refreshToken || !next) {
      router.replace("/login?error=enlace_invalido")
      return
    }

    establishSessionAction({ accessToken, refreshToken }).then((result) => {
      router.replace(result?.data?.ok ? next : "/login?error=enlace_invalido")
    })
  }, [router])

  return (
    <AuthCard>
      <div className="flex flex-col gap-1.5">
        <p className="text-2xl leading-8 font-semibold text-foreground">
          Verificando tu enlace…
        </p>
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          Un momento, te llevamos a la siguiente pantalla.
        </p>
      </div>
    </AuthCard>
  )
}
