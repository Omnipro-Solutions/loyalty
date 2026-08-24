"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { PasswordInput } from "@/components/form/password-input"
import { AuthCard } from "@/components/layout/auth-card"

import { setNewPasswordAction } from "../actions/password-reset"
import { setPasswordSchema } from "../schemas"

type SetPasswordValues = z.input<typeof setPasswordSchema>

/** Formulario compartido por /restablecer-contrasena y /activar-cuenta — mismo `updateUser`, distinta copia. */
export function SetPasswordForm({
  title,
  description,
  submitLabel,
}: {
  title: string
  description: string
  submitLabel: string
}) {
  const router = useRouter()
  const [generalError, setGeneralError] = useState<string>()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const setPassword = useAction(setNewPasswordAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo guardar la contraseña.")
        return
      }
      router.push("/resumen")
    },
    onError: () =>
      setGeneralError("No se pudo guardar la contraseña. Intenta de nuevo."),
  })

  return (
    <AuthCard>
      <div className="flex flex-col gap-1.5">
        <p className="text-2xl leading-8 font-semibold text-foreground">
          {title}
        </p>
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          {description}
        </p>
      </div>

      {generalError && (
        <Message
          variant="error"
          title="No se pudo continuar"
          description={generalError}
        />
      )}

      <form
        className="flex flex-col gap-2.5"
        onSubmit={handleSubmit((values) => {
          setGeneralError(undefined)
          setPassword.execute(values)
        })}
      >
        <Field
          label="Nueva contraseña"
          htmlFor="password"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            placeholder="Mínimo 12 caracteres"
            {...register("password")}
          />
        </Field>
        <Field
          label="Confirmar contraseña"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            placeholder="Repite la contraseña"
            {...register("confirmPassword")}
          />
        </Field>
        <Button
          type="submit"
          disabled={setPassword.isPending}
          className="w-full"
        >
          {submitLabel}
        </Button>
      </form>
    </AuthCard>
  )
}
