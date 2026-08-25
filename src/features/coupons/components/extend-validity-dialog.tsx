"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatShortDate } from "@/lib/format"

import { extendValidityAction } from "../actions/coupons"
import { extendValiditySchema } from "../schemas"

const extendValidityFormSchema = extendValiditySchema.omit({ couponId: true })
type ExtendValidityValues = z.input<typeof extendValidityFormSchema>

type ExtendValidityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  couponId: string
  couponCode: string
  currentValidTo: string | null
}

export function ExtendValidityDialog({
  open,
  onOpenChange,
  couponId,
  couponCode,
  currentValidTo,
}: ExtendValidityDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExtendValidityValues>({
    resolver: zodResolver(extendValidityFormSchema),
    defaultValues: { validTo: currentValidTo?.slice(0, 10) ?? "" },
  })

  const extend = useAction(extendValidityAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        onOpenChange(false)
        reset()
      }
    },
  })
  const errorMessage = extend.result.serverError
    ? "No se pudo extender la vigencia."
    : extend.result.data?.ok === false
      ? (extend.result.data.message ?? "Intenta de nuevo.")
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          extend.reset()
          reset()
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Extender vigencia de {couponCode}</DialogTitle>
          <DialogDescription>
            {currentValidTo
              ? `Vigente hasta el ${formatShortDate(currentValidTo)}. Elige la nueva fecha de vencimiento.`
              : "Elige la nueva fecha de vencimiento."}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Message
            variant="error"
            title="No se pudo extender la vigencia"
            description={errorMessage}
          />
        )}

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((formValues) =>
            extend.execute({ couponId, ...formValues })
          )}
        >
          <Field
            label="Nueva fecha de vencimiento"
            required
            htmlFor="extend-valid-to"
            error={errors.validTo?.message}
          >
            <Input id="extend-valid-to" type="date" {...register("validTo")} />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={extend.isPending}>
              Extender vigencia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
