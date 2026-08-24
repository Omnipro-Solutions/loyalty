"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Gift } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { assignPromotionToMemberAction } from "../actions/promotion-grants"
import type { AssignablePromotion } from "../lib/queries"
import { assignPromotionSchema } from "../schemas"

const formSchema = assignPromotionSchema.omit({ memberId: true })
type FormValues = z.input<typeof formSchema>

type SendPromotionDialogProps = {
  memberId: string
  promotions: AssignablePromotion[]
}

/**
 * "Enviar promoción" del Hero (05.3g): no hay motor de mensajería en este
 * proyecto, así que no envía nada — asigna a mano una promoción activa a
 * este socio (override que salta la elegibilidad por segmento/categoría de
 * `MemberPromotionsCard`). Mismo patrón de diálogo + RHF + `useAction` que
 * `InviteUserDialog`.
 */
export function SendPromotionDialog({
  memberId,
  promotions,
}: SendPromotionDialogProps) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message?: string }>()

  const {
    handleSubmit,
    control,
    register,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { promotionId: "", note: "" },
  })

  const values = useWatch({ control })
  const selected = promotions.find((p) => p.id === values.promotionId)

  const assign = useAction(assignPromotionToMemberAction, {
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
      setResult({ ok: false, message: "No se pudo asignar la promoción." }),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setResult(undefined)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Enviar promoción
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar promoción</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Habilita una promoción activa para este socio, sin importar si cumple
          la condición de segmento o categoría.
        </p>
        {result?.ok === false && (
          <Message
            variant="error"
            title="No se pudo asignar la promoción"
            description={result.message ?? "Intenta de nuevo."}
          />
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((formValues) =>
            assign.execute({ memberId, ...formValues })
          )}
        >
          <Field label="Promoción" required error={errors.promotionId?.message}>
            <Select
              value={values.promotionId}
              onValueChange={(v) => setValue("promotionId", v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una promoción">
                  {() => (selected ? selected.nombre : "")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {promotions.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.yaAsignada}>
                    {p.nombre} ({p.codigo})
                    {p.yaAsignada ? " · ya asignada" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nota (opcional)" error={errors.note?.message}>
            <Textarea
              placeholder="Ej. gesto de servicio por queja resuelta"
              {...register("note")}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={assign.isPending}>
              <Gift className="size-3.5" />
              Asignar promoción
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
