"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { CHANNEL_SCOPES, STORE_SCOPES, ROLES } from "@/types/domain"

import { createRoleAction } from "../actions/roles"
import { BASE_ROLE_LABELS } from "../lib/labels"
import { createRoleSchema } from "../schemas"

type CreateRoleFormValues = z.input<typeof createRoleSchema>

const STORE_SCOPE_LABEL: Record<string, string> = {
  todas: "Todas las tiendas",
  propia: "Solo su tienda",
}

const CHANNEL_SCOPE_LABEL: Record<string, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  pos_ecommerce: "POS + E-commerce",
}

/** Figma "Nuevo" (718:2896): el botón está diseñado, el modal no — mismo patrón diálogo + RHF del resto del repo. */
export function NewRoleDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    message?: string
  }>()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      baseRole: "lector",
      storeScope: "todas",
      channelScope: "pos_ecommerce",
    },
  })

  const values = useWatch({ control })

  const create = useAction(createRoleAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setOpen(false)
        reset()
        router.push(`/ajustes/equipo?tab=roles&rol=${data.id}`)
        return
      }
      setResult({ ok: false, message: data?.message })
    },
    onError: () =>
      setResult({ ok: false, message: "No se pudo crear el rol." }),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setResult(undefined)
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-3" />
        Nuevo
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo rol</DialogTitle>
        </DialogHeader>
        {result?.ok === false && (
          <Message
            variant="error"
            title="No se pudo crear el rol"
            description={result.message ?? "Intenta de nuevo."}
          />
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((formValues) => create.execute(formValues))}
        >
          <Field
            label="Nombre"
            required
            htmlFor="role-name"
            error={errors.name?.message}
          >
            <Input
              id="role-name"
              placeholder="Ej. Supervisor de zona"
              {...register("name")}
            />
          </Field>
          <Field
            label="Descripción"
            htmlFor="role-description"
            hint="Se muestra en la lista de roles."
          >
            <Textarea
              id="role-description"
              rows={2}
              {...register("description")}
            />
          </Field>
          <Field label="Basado en" required error={errors.baseRole?.message}>
            <Select
              value={values.baseRole}
              onValueChange={(v) =>
                setValue("baseRole", v as CreateRoleFormValues["baseRole"])
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: CreateRoleFormValues["baseRole"]) => BASE_ROLE_LABELS[v]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {BASE_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tiendas" required>
              <Select
                value={values.storeScope}
                onValueChange={(v) =>
                  setValue(
                    "storeScope",
                    v as CreateRoleFormValues["storeScope"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: CreateRoleFormValues["storeScope"]) =>
                      STORE_SCOPE_LABEL[v]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STORE_SCOPES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {STORE_SCOPE_LABEL[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Canal" required>
              <Select
                value={values.channelScope}
                onValueChange={(v) =>
                  setValue(
                    "channelScope",
                    v as CreateRoleFormValues["channelScope"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: CreateRoleFormValues["channelScope"]) =>
                      CHANNEL_SCOPE_LABEL[v]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_SCOPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CHANNEL_SCOPE_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field
            label="Descuento máximo (%)"
            htmlFor="role-discount"
            hint="Déjalo vacío para no fijar un tope."
            error={errors.maxDiscountPct?.message}
          >
            <Input
              id="role-discount"
              type="number"
              min={0}
              max={100}
              {...register("maxDiscountPct")}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              Crear rol
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
