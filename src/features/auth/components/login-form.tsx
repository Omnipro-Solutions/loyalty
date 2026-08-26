"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import type { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { PasswordInput } from "@/components/form/password-input"
import { AuthCard } from "@/components/layout/auth-card"

import { loginAction } from "../actions/login"
import { requestPasswordResetAction } from "../actions/password-reset"
import { loginSchema, passwordResetSchema } from "../schemas"
import { SsoProviderButtons } from "./sso-provider-buttons"

type LoginValues = z.input<typeof loginSchema>
type PasswordResetValues = z.input<typeof passwordResetSchema>

export function LoginForm({
  samlEnabled,
  initialError,
}: {
  samlEnabled: boolean
  initialError?: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "recuperar">("login")
  const [generalError, setGeneralError] = useState<string>()
  const [linkError] = useState(initialError)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberDevice: false },
  })
  const rememberDevice = useWatch({ control, name: "rememberDevice" })

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<PasswordResetValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: "" },
  })

  const login = useAction(loginAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo iniciar sesión.")
        return
      }
      router.push(data.needsVerification ? "/verificacion" : "/resumen")
    },
    onError: () =>
      setGeneralError("No se pudo iniciar sesión. Intenta de nuevo."),
  })

  const reset = useAction(requestPasswordResetAction, {
    onSuccess: () => setMode("login"),
  })

  if (mode === "recuperar") {
    return (
      <AuthCard>
        <div className="flex flex-col gap-1.5">
          <p className="text-2xl leading-8 font-semibold text-foreground">
            Recuperar contraseña
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            Te enviaremos un enlace para restablecerla si el correo existe.
          </p>
        </div>
        {reset.hasSucceeded && (
          <Message
            variant="success"
            title="Revisa tu correo"
            description="Si el correo existe, recibirás un enlace para restablecer tu contraseña."
          />
        )}
        <form
          className="flex flex-col gap-2.5"
          onSubmit={handleResetSubmit((values) => reset.execute(values))}
        >
          <Field
            label="Correo corporativo"
            htmlFor="reset-email"
            error={resetErrors.email?.message}
          >
            <Input
              id="reset-email"
              type="email"
              placeholder="elena@etter.com"
              {...registerReset("email")}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={reset.isPending}>
            Enviar enlace
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="text-center text-xs font-medium text-primary"
        >
          Volver a iniciar sesión
        </button>
      </AuthCard>
    )
  }

  return (
    <AuthCard className="gap-3.5">
      <div className="flex flex-col gap-1">
        <p className="text-xl leading-7 font-semibold text-foreground">
          Iniciar sesión
        </p>
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          Accede al panel de promociones de Etter.
        </p>
      </div>

      {linkError && !generalError && (
        <Message
          variant="error"
          title="Enlace inválido"
          description={linkError}
        />
      )}

      {generalError && (
        <Message
          variant="error"
          title="No se pudo iniciar sesión"
          description={generalError}
        />
      )}

      <form
        className="flex flex-col gap-2.5"
        onSubmit={handleSubmit((values) => {
          setGeneralError(undefined)
          login.execute(values)
        })}
      >
        <Field
          label="Correo corporativo"
          htmlFor="email"
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            placeholder="elena@etter.com"
            {...register("email")}
          />
        </Field>

        <div className="flex w-full flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <Label
              htmlFor="password"
              className="text-xs leading-[17px] font-medium text-muted-foreground"
            >
              Contraseña
            </Label>
            <span className="text-xs leading-[17px] font-medium text-destructive">
              *
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setMode("recuperar")}
              className="text-xs leading-[18px] font-medium text-primary"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <PasswordInput
            id="password"
            placeholder="Tu contraseña"
            {...register("password")}
          />
          <p
            className={
              errors.password
                ? "text-[11px] leading-[15px] text-destructive"
                : "text-[11px] leading-[15px] text-muted-foreground"
            }
          >
            {errors.password?.message ?? "Mínimo 12 caracteres"}
          </p>
        </div>

        <label className="flex items-center gap-2.5">
          <Checkbox
            checked={rememberDevice ?? false}
            onCheckedChange={(checked) =>
              setValue("rememberDevice", checked === true)
            }
          />
          <span className="text-[13px] leading-[18px] text-secondary-foreground">
            Recordar este dispositivo por 30 días
          </span>
        </label>

        <Button type="submit" disabled={login.isPending} className="w-full">
          Continuar
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <p className="text-xs text-muted-foreground">o</p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <SsoProviderButtons samlEnabled={samlEnabled} />

      <p className="text-center text-[11px] leading-4 text-muted-foreground">
        Al continuar aceptas la política de uso interno de omni.
      </p>
    </AuthCard>
  )
}
