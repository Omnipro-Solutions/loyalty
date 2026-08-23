"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthCard } from "@/components/layout/auth-card"
import { Message } from "@/components/form/message"

import { verifyBackupCodeAction, verifyTotpAction } from "../actions/mfa"
import { TotpCodeInput } from "./totp-code-input"

const CODE_WINDOW_SECONDS = 30

type VerificationCardProps =
  | { mode: "error"; message: string }
  | { mode: "verify"; factorId: string }
  | { mode: "enroll"; factorId: string; qrCode: string; secret: string }

export function VerificationCard(props: VerificationCardProps) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [noVolverAPedirCodigo, setNoVolverAPedirCodigo] = useState(false)
  const [metodoAlterno, setMetodoAlterno] = useState(false)
  const [backupCode, setBackupCode] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(CODE_WINDOW_SECONDS)
  const [backupCodesToReveal, setBackupCodesToReveal] = useState<string[]>()
  const [errorGeneral, setErrorGeneral] = useState<string>()

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? CODE_WINDOW_SECONDS : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const verify = useAction(verifyTotpAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setErrorGeneral(data?.message ?? "Código incorrecto.")
        return
      }
      if (data.backupCodes?.length) {
        setBackupCodesToReveal(data.backupCodes)
      } else {
        router.push("/resumen")
      }
    },
    onError: () => setErrorGeneral("No se pudo verificar el código."),
  })

  const verifyBackup = useAction(verifyBackupCodeAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setErrorGeneral(data?.message ?? "Código de respaldo inválido.")
        return
      }
      router.push("/resumen")
    },
    onError: () =>
      setErrorGeneral("No se pudo verificar el código de respaldo."),
  })

  if (props.mode === "error") {
    return (
      <AuthCard>
        <Message
          tipo="error"
          titulo="No se pudo continuar"
          descripcion={props.message}
        />
        <Button className="w-full" onClick={() => router.push("/login")}>
          Volver al inicio de sesión
        </Button>
      </AuthCard>
    )
  }

  if (backupCodesToReveal) {
    return (
      <AuthCard>
        <div className="flex flex-col gap-1.5">
          <p className="text-2xl leading-8 font-semibold text-foreground">
            Guarda tus códigos de respaldo
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            Cada código sirve una sola vez si pierdes acceso a tu app de
            autenticación. No volverás a verlos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-4 font-mono text-sm text-foreground">
          {backupCodesToReveal.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <Button className="w-full" onClick={() => router.push("/resumen")}>
          Ya los guardé, continuar
        </Button>
      </AuthCard>
    )
  }

  const factorId = props.factorId

  return (
    <AuthCard className="gap-3">
      <Badge
        variant="info"
        className="w-fit rounded-full px-2.5 py-[5px] text-xs"
      >
        {props.mode === "enroll"
          ? "Verificación en dos pasos · Opcional"
          : "Paso 2 de 2 · Verificación"}
      </Badge>

      <div className="flex flex-col gap-1">
        <p className="text-xl leading-7 font-semibold text-foreground">
          {props.mode === "enroll"
            ? "Protege tu cuenta con 2FA"
            : "Verifica tu identidad"}
        </p>
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          {props.mode === "enroll"
            ? "Es opcional: puedes activarlo ahora escaneando el QR con tu app de autenticación, o hacerlo más tarde."
            : "Ingresa el código de 6 dígitos de tu app de autenticación (Google Authenticator, Authy o 1Password)."}
        </p>
      </div>

      {props.mode === "enroll" && (
        <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-neutral-50 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URI de Supabase, no un asset optimizable */}
          <img
            src={props.qrCode}
            alt="Código QR para enrolar la app de autenticación"
            className="size-20 shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[11px] leading-[14px] text-muted-foreground">
              ¿No puedes escanear? Ingresa este código manualmente:
            </p>
            <p className="rounded-lg bg-background px-2.5 py-1 font-mono text-[11px] break-all text-foreground">
              {props.secret}
            </p>
          </div>
        </div>
      )}

      {errorGeneral && (
        <Message
          tipo="error"
          titulo="Verificación fallida"
          descripcion={errorGeneral}
        />
      )}

      {metodoAlterno ? (
        <>
          <input
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value)}
            placeholder="XXXX-XXXX"
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-center font-mono text-lg text-foreground outline-none focus-visible:border-2 focus-visible:border-primary"
          />
          <Button
            className="w-full"
            disabled={verifyBackup.isPending || backupCode.length < 6}
            onClick={() => {
              setErrorGeneral(undefined)
              verifyBackup.execute({ code: backupCode, noVolverAPedirCodigo })
            }}
          >
            Verificar con código de respaldo
          </Button>
        </>
      ) : (
        <>
          <TotpCodeInput
            value={code}
            onChange={setCode}
            disabled={verify.isPending}
          />

          <div className="flex items-center gap-2 text-xs">
            <p className="flex-1 text-muted-foreground">
              El código expira en 00:{String(secondsLeft).padStart(2, "0")}
            </p>
            <button
              type="button"
              onClick={() => setSecondsLeft(CODE_WINDOW_SECONDS)}
              className="font-medium text-primary"
            >
              Reenviar código
            </button>
          </div>

          <label className="flex items-center gap-2.5 rounded-[10px] bg-muted px-3.5 py-2">
            <Checkbox
              checked={noVolverAPedirCodigo}
              onCheckedChange={(checked) =>
                setNoVolverAPedirCodigo(checked === true)
              }
            />
            <span className="text-[13px] leading-[18px] text-secondary-foreground">
              No volver a pedir código en este dispositivo
            </span>
          </label>

          <Button
            className="w-full"
            disabled={verify.isPending || code.length < 6}
            onClick={() => {
              setErrorGeneral(undefined)
              verify.execute({ factorId, code, noVolverAPedirCodigo })
            }}
          >
            {props.mode === "enroll"
              ? "Activar y entrar"
              : "Verificar y entrar"}
          </Button>

          {props.mode === "enroll" && (
            <button
              type="button"
              onClick={() => router.push("/resumen")}
              className="text-center text-xs font-medium text-primary"
            >
              Ahora no, continuar sin 2FA
            </button>
          )}
        </>
      )}

      {props.mode === "verify" && (
        <div className="flex flex-col items-center gap-1.5 text-center">
          <button
            type="button"
            onClick={() => setMetodoAlterno((v) => !v)}
            className="text-xs font-medium text-primary"
          >
            {metodoAlterno
              ? "Volver al código de mi app"
              : "¿Problemas con tu app? Usa un método alternativo"}
          </button>
          <p className="text-[11px] leading-4 text-muted-foreground">
            <span
              title="Requiere Advanced MFA - Phone (add-on de pago en Supabase)"
              className="cursor-not-allowed"
            >
              SMS al •••• 4821
            </span>
            {"  ·  Código de respaldo  ·  "}
            <a href="mailto:eduardo.t@omni.pro" className="underline">
              Contactar a soporte
            </a>
          </p>
        </div>
      )}
    </AuthCard>
  )
}
