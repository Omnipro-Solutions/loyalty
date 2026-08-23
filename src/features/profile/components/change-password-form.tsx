"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { PasswordInput } from "@/components/form/password-input"
import { Section } from "@/components/form/section"

import { changePasswordAction } from "../actions/change-password"
import { changePasswordSchema } from "../schemas"

type ChangePasswordValues = z.input<typeof changePasswordSchema>

export function ChangePasswordForm() {
  const [result, setResult] = useState<{
    ok: boolean
    message?: string
  }>()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const changePassword = useAction(changePasswordAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setResult({ ok: true })
        reset()
        return
      }
      setResult({ ok: false, message: data?.message })
    },
    onError: () =>
      setResult({
        ok: false,
        message: "No se pudo actualizar la contraseña.",
      }),
  })

  return (
    <Section
      title="Cambiar contraseña"
      description="Usa al menos 12 caracteres."
    >
      {result?.ok === false && (
        <Message
          variant="error"
          title="No se pudo cambiar la contraseña"
          description={result.message ?? "Intenta de nuevo."}
        />
      )}
      {result?.ok === true && (
        <Message
          variant="success"
          title="Contraseña actualizada"
          description="Tu contraseña se cambió correctamente."
        />
      )}

      <form
        className="flex flex-col gap-3.5"
        onSubmit={handleSubmit((values) => {
          setResult(undefined)
          changePassword.execute(values)
        })}
      >
        <Field
          label="Contraseña actual"
          htmlFor="contrasena-actual"
          error={errors.currentPassword?.message}
        >
          <PasswordInput
            id="contrasena-actual"
            placeholder="Tu contraseña actual"
            {...register("currentPassword")}
          />
        </Field>
        <Field
          label="Nueva contraseña"
          htmlFor="nueva-contrasena"
          error={errors.newPassword?.message}
        >
          <PasswordInput
            id="nueva-contrasena"
            placeholder="Mínimo 12 caracteres"
            {...register("newPassword")}
          />
        </Field>
        <Field
          label="Confirmar nueva contraseña"
          htmlFor="confirmar-contrasena"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmar-contrasena"
            placeholder="Repite la nueva contraseña"
            {...register("confirmPassword")}
          />
        </Field>
        <Button
          type="submit"
          disabled={changePassword.isPending}
          className="w-fit"
        >
          Actualizar contraseña
        </Button>
      </form>
    </Section>
  )
}
