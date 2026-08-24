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

import { inviteUserAction } from "../actions/invitations"
import type { RoleWithCount, StoreOption } from "../lib/queries"
import { inviteUserSchema } from "../schemas"

type InviteUserValues = z.input<typeof inviteUserSchema>

type InviteUserDialogProps = {
  roles: RoleWithCount[]
  stores: StoreOption[]
}

/** Figma "Invitar usuario" (720:3040): el botón está diseñado, el modal no — se construye siguiendo el patrón de diálogo + RHF ya usado en el resto del repo. */
export function InviteUserDialog({ roles, stores }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{
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
  } = useForm<InviteUserValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: "", roleId: roles[0]?.id ?? "" },
  })

  const values = useWatch({ control })
  const selectedRole = roles.find((r) => r.id === values.roleId)
  const requiresStore = selectedRole?.alcance_tiendas === "propia"

  const invite = useAction(inviteUserAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setOpen(false)
        reset()
        setResult(undefined)
        return
      }
      setResult({ ok: false, message: data?.message })
    },
    onError: () =>
      setResult({ ok: false, message: "No se pudo enviar la invitación." }),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setResult(undefined)
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
        {result?.ok === false && (
          <Message
            variant="error"
            title="No se pudo enviar la invitación"
            description={result.message ?? "Intenta de nuevo."}
          />
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((formValues) => invite.execute(formValues))}
        >
          <Field
            label="Correo corporativo"
            required
            htmlFor="invite-email"
            error={errors.email?.message}
          >
            <Input
              id="invite-email"
              type="email"
              placeholder="nombre@etter.com"
              {...register("email")}
            />
          </Field>
          <Field label="Role" required error={errors.roleId?.message}>
            <Select
              value={values.roleId}
              onValueChange={(v) => setValue("roleId", v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol">
                  {(v: string) => roles.find((r) => r.id === v)?.nombre ?? v}
                </SelectValue>
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
          {requiresStore && (
            <Field label="Tienda" required error={errors.storeId?.message}>
              <Select
                value={values.storeId}
                onValueChange={(v) => setValue("storeId", v ?? undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una tienda">
                    {(v: string) => stores.find((s) => s.id === v)?.nombre ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <DialogFooter>
            <Button type="submit" disabled={invite.isPending}>
              Enviar invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
