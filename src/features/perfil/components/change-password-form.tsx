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
  const [resultado, setResultado] = useState<{
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
      contrasenaActual: "",
      nuevaContrasena: "",
      confirmarContrasena: "",
    },
  })

  const cambiar = useAction(changePasswordAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setResultado({ ok: true })
        reset()
        return
      }
      setResultado({ ok: false, message: data?.message })
    },
    onError: () =>
      setResultado({
        ok: false,
        message: "No se pudo actualizar la contraseña.",
      }),
  })

  return (
    <Section
      title="Cambiar contraseña"
      description="Usa al menos 12 caracteres."
    >
      {resultado?.ok === false && (
        <Message
          variant="error"
          title="No se pudo cambiar la contraseña"
          description={resultado.message ?? "Intenta de nuevo."}
        />
      )}
      {resultado?.ok === true && (
        <Message
          variant="success"
          title="Contraseña actualizada"
          description="Tu contraseña se cambió correctamente."
        />
      )}

      <form
        className="flex flex-col gap-3.5"
        onSubmit={handleSubmit((values) => {
          setResultado(undefined)
          cambiar.execute(values)
        })}
      >
        <Field
          label="Contraseña actual"
          htmlFor="contrasena-actual"
          error={errors.contrasenaActual?.message}
        >
          <PasswordInput
            id="contrasena-actual"
            placeholder="Tu contraseña actual"
            {...register("contrasenaActual")}
          />
        </Field>
        <Field
          label="Nueva contraseña"
          htmlFor="nueva-contrasena"
          error={errors.nuevaContrasena?.message}
        >
          <PasswordInput
            id="nueva-contrasena"
            placeholder="Mínimo 12 caracteres"
            {...register("nuevaContrasena")}
          />
        </Field>
        <Field
          label="Confirmar nueva contraseña"
          htmlFor="confirmar-contrasena"
          error={errors.confirmarContrasena?.message}
        >
          <PasswordInput
            id="confirmar-contrasena"
            placeholder="Repite la nueva contraseña"
            {...register("confirmarContrasena")}
          />
        </Field>
        <Button type="submit" disabled={cambiar.isPending} className="w-fit">
          Actualizar contraseña
        </Button>
      </form>
    </Section>
  )
}
