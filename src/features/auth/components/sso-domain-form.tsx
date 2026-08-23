"use client"

import { useAction } from "next-safe-action/hooks"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthCard } from "@/components/layout/auth-card"
import { MicrosoftLogo } from "@/components/icons/microsoft-logo"
import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"

import { lookupSsoProviderAction } from "../actions/sso"

export function SsoDomainForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [notFound, setNotFound] = useState(false)

  const lookup = useAction(lookupSsoProviderAction, {
    onSuccess: ({ data }) => setNotFound(!data?.found),
  })

  const detectado = lookup.result.data?.found ? lookup.result.data : undefined

  return (
    <AuthCard>
      <Badge
        variant="info"
        className="w-fit rounded-full px-2.5 py-[5px] text-xs"
      >
        Paso 1 de 2 · SSO
      </Badge>

      <div className="flex flex-col gap-1.5">
        <p className="text-2xl leading-8 font-semibold text-foreground">
          Acceso con SSO corporativo
        </p>
        <p className="text-sm text-muted-foreground">
          Ingresa tu correo corporativo. Te dirigiremos al proveedor de
          identidad configurado por tu organización.
        </p>
      </div>

      <Field label="Correo corporativo" htmlFor="sso-email">
        <Input
          id="sso-email"
          type="email"
          placeholder="elena.marin@omni.pro"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setNotFound(false)
          }}
          className={detectado ? "border-2 border-primary" : undefined}
        />
      </Field>

      {notFound && (
        <Message
          variant="error"
          title="No encontramos tu organización"
          description="Ese dominio de correo no tiene un proveedor de identidad configurado."
        />
      )}

      {detectado && (
        <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-neutral-50 p-3.5">
          <span className="flex shrink-0 items-center justify-center rounded-[10px] border border-border bg-background p-2">
            <MicrosoftLogo className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">
              Microsoft Entra ID
            </p>
            <p className="text-xs text-muted-foreground">
              {detectado.domain} · Omni Retail Group
            </p>
          </div>
          <Badge variant="success" className="shrink-0 rounded-full">
            Verificado
          </Badge>
        </div>
      )}

      {detectado ? (
        <Button
          className="flex w-full items-center gap-2"
          onClick={() =>
            router.push(`/sso/redirigiendo?email=${encodeURIComponent(email)}`)
          }
        >
          <MicrosoftLogo className="size-4" />
          Continuar con Microsoft
        </Button>
      ) : (
        <Button
          className="w-full"
          disabled={lookup.isPending || !email}
          onClick={() => lookup.execute({ email })}
        >
          Continuar
        </Button>
      )}

      <div className="flex flex-col items-center gap-2 text-center text-[13px]">
        {detectado && (
          <button
            type="button"
            onClick={() => {
              setEmail("")
              lookup.reset()
            }}
            className="font-medium text-primary"
          >
            Usar otro proveedor de identidad
          </button>
        )}
        <Link href="/login" className="text-muted-foreground">
          Volver al inicio de sesión con contraseña
        </Link>
      </div>
    </AuthCard>
  )
}
