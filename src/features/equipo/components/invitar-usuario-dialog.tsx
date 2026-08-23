"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { UserPlus } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import type { z } from "zod"

import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { invitarUsuarioAction } from "../actions/invitaciones"
import type { RoleConConteo, TiendaOption } from "../lib/queries"
import { invitarUsuarioSchema } from "../schemas"

type InvitarUsuarioValues = z.input<typeof invitarUsuarioSchema>

type InvitarUsuarioDialogProps = {
  roles: RoleConConteo[]
  tiendas: TiendaOption[]
}

/** Figma "Invitar usuario" (720:3040): el botón está diseñado, el modal no — se construye siguiendo el patrón de diálogo + RHF ya usado en el resto del repo. */
export function InvitarUsuarioDialog({
  roles,
  tiendas,
}: InvitarUsuarioDialogProps) {
  const [open, setOpen] = useState(false)
  const [resultado, setResultado] = useState<{
    ok: boolean
    message?: string
  }>()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InvitarUsuarioValues>({
    resolver: zodResolver(invitarUsuarioSchema),
    defaultValues: { email: "", roleId: roles[0]?.id ?? "" },
  })

  const valores = useWatch({ control })
  const rolSeleccionado = roles.find((r) => r.id === valores.roleId)
  const requiereTienda = rolSeleccionado?.alcance_tiendas === "propia"

  const invitar = useAction(invitarUsuarioAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setOpen(false)
        reset()
        setResultado(undefined)
        return
      }
      setResultado({ ok: false, message: data?.message })
    },
    onError: () =>
      setResultado({ ok: false, message: "No se pudo enviar la invitación." }),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(siguiente) => {
        setOpen(siguiente)
        if (!siguiente) setResultado(undefined)
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlus className="size-3.5" />
        Invitar usuario
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
        </DialogHeader>
        {resultado?.ok === false && (
          <Message
            tipo="error"
            titulo="No se pudo enviar la invitación"
            descripcion={resultado.message ?? "Intenta de nuevo."}
          />
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => invitar.execute(values))}
        >
          <Field
            label="Correo corporativo"
            required
            htmlFor="invitar-email"
            error={errors.email?.message}
          >
            <Input
              id="invitar-email"
              type="email"
              placeholder="nombre@omni.pro"
              {...register("email")}
            />
          </Field>
          <Field label="Role" required error={errors.roleId?.message}>
            <Select
              value={valores.roleId}
              onValueChange={(v) => setValue("roleId", v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {requiereTienda && (
            <Field label="Tienda" required error={errors.tiendaId?.message}>
              <Select
                value={valores.tiendaId}
                onValueChange={(v) => setValue("tiendaId", v ?? undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una tienda" />
                </SelectTrigger>
                <SelectContent>
                  {tiendas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <DialogFooter>
            <Button type="submit" disabled={invitar.isPending}>
              Enviar invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
