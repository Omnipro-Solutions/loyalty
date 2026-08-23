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
import { ALCANCE_CANALES, ALCANCE_TIENDAS, ROLES } from "@/types/domain"

import { crearRolAction } from "../actions/roles"
import { ROL_BASE_LABELS } from "../lib/labels"
import { crearRolSchema } from "../schemas"

type CrearRolFormValues = z.input<typeof crearRolSchema>

const ALCANCE_TIENDAS_LABEL: Record<string, string> = {
  todas: "Todas las tiendas",
  propia: "Solo su tienda",
}

const ALCANCE_CANAL_LABEL: Record<string, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  pos_ecommerce: "POS + E-commerce",
}

/** Figma "Nuevo" (718:2896): el botón está diseñado, el modal no — mismo patrón diálogo + RHF del resto del repo. */
export function NuevoRolDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [resultado, setResultado] = useState<{
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
  } = useForm<CrearRolFormValues>({
    resolver: zodResolver(crearRolSchema),
    defaultValues: {
      nombre: "",
      rolBase: "lector",
      alcanceTiendas: "todas",
      alcanceCanal: "pos_ecommerce",
    },
  })

  const valores = useWatch({ control })

  const crear = useAction(crearRolAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setOpen(false)
        reset()
        router.push(`/ajustes/equipo?tab=roles&rol=${data.id}`)
        return
      }
      setResultado({ ok: false, message: data?.message })
    },
    onError: () =>
      setResultado({ ok: false, message: "No se pudo crear el rol." }),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(siguiente) => {
        setOpen(siguiente)
        if (!siguiente) setResultado(undefined)
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
        {resultado?.ok === false && (
          <Message
            tipo="error"
            titulo="No se pudo crear el rol"
            descripcion={resultado.message ?? "Intenta de nuevo."}
          />
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => crear.execute(values))}
        >
          <Field
            label="Nombre"
            required
            htmlFor="rol-nombre"
            error={errors.nombre?.message}
          >
            <Input
              id="rol-nombre"
              placeholder="Ej. Supervisor de zona"
              {...register("nombre")}
            />
          </Field>
          <Field
            label="Descripción"
            htmlFor="rol-descripcion"
            hint="Se muestra en la lista de roles."
          >
            <Textarea
              id="rol-descripcion"
              rows={2}
              {...register("descripcion")}
            />
          </Field>
          <Field label="Basado en" required error={errors.rolBase?.message}>
            <Select
              value={valores.rolBase}
              onValueChange={(v) =>
                setValue("rolBase", v as CrearRolFormValues["rolBase"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROL_BASE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tiendas" required>
              <Select
                value={valores.alcanceTiendas}
                onValueChange={(v) =>
                  setValue(
                    "alcanceTiendas",
                    v as CrearRolFormValues["alcanceTiendas"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALCANCE_TIENDAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {ALCANCE_TIENDAS_LABEL[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Canal" required>
              <Select
                value={valores.alcanceCanal}
                onValueChange={(v) =>
                  setValue(
                    "alcanceCanal",
                    v as CrearRolFormValues["alcanceCanal"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALCANCE_CANALES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ALCANCE_CANAL_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field
            label="Descuento máximo (%)"
            htmlFor="rol-descuento"
            hint="Déjalo vacío para no fijar un tope."
            error={errors.descuentoMaximoPct?.message}
          >
            <Input
              id="rol-descuento"
              type="number"
              min={0}
              max={100}
              {...register("descuentoMaximoPct")}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={crear.isPending}>
              Crear rol
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
