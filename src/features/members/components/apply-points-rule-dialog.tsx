"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Sparkles } from "lucide-react"
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
import { formatNumber } from "@/lib/format"

import { applyPointsAdjustmentAction } from "../actions/points-adjustments"
import { pointsAdjustmentSchema } from "../schemas"

const REASON_PRESETS = [
  "Bono de cortesía",
  "Corrección de saldo",
  "Compensación por incidencia",
] as const
const OTHER_REASON = "__otro__"

const DIRECTION_LABEL = { otorgar: "Otorgar puntos", restar: "Restar puntos" }

const formSchema = pointsAdjustmentSchema.omit({ memberId: true })
type FormValues = z.input<typeof formSchema>

type ApplyPointsRuleDialogProps = {
  memberId: string
  currentBalance: number
}

/**
 * "Aplicar regla" del Hero (05.3g): no existe motor de reglas en este
 * proyecto (`/reglas` es un placeholder de Fase 5) — el único alcance real
 * es un ajuste manual de puntos sobre `points_ledger` (tipo `'ajuste'`).
 * Mismo patrón de diálogo + RHF + `useAction` que `InviteUserDialog`.
 */
export function ApplyPointsRuleDialog({
  memberId,
  currentBalance,
}: ApplyPointsRuleDialogProps) {
  const [open, setOpen] = useState(false)
  const [customReason, setCustomReason] = useState(false)
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
    defaultValues: { direction: "otorgar", amount: 1, reason: "" },
  })

  const values = useWatch({ control })
  const amount = Number.isFinite(values.amount) ? Number(values.amount) : 0
  const delta = values.direction === "restar" ? -amount : amount
  const nextBalance = currentBalance + delta

  const apply = useAction(applyPointsAdjustmentAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setOpen(false)
        reset()
        setCustomReason(false)
        setResult(undefined)
        return
      }
      setResult({ ok: false, message: data?.message })
    },
    onError: () =>
      setResult({ ok: false, message: "No se pudo aplicar el ajuste." }),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setResult(undefined)
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>Aplicar regla</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicar regla de ajuste</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Otorga o resta puntos a mano — queda registrado en el log de
          redenciones como un ajuste, no como acumulación o canje.
        </p>
        {result?.ok === false && (
          <Message
            variant="error"
            title="No se pudo aplicar el ajuste"
            description={result.message ?? "Intenta de nuevo."}
          />
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((formValues) =>
            apply.execute({ memberId, ...formValues })
          )}
        >
          <Field label="Motivo" required error={errors.reason?.message}>
            <Select
              value={customReason ? OTHER_REASON : values.reason}
              onValueChange={(v) => {
                if (v === OTHER_REASON) {
                  setCustomReason(true)
                  setValue("reason", "")
                } else {
                  setCustomReason(false)
                  setValue("reason", v ?? "")
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo">
                  {(v: string) => (v === OTHER_REASON ? "Otro" : v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {REASON_PRESETS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER_REASON}>Otro</SelectItem>
              </SelectContent>
            </Select>
            {customReason && (
              <Input
                className="mt-2"
                placeholder="Describe el motivo"
                {...register("reason")}
              />
            )}
          </Field>
          <Field label="Tipo" required>
            <Select
              value={values.direction}
              onValueChange={(v) =>
                setValue(
                  "direction",
                  (v as FormValues["direction"]) ?? "otorgar"
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo">
                  {(v: keyof typeof DIRECTION_LABEL) => DIRECTION_LABEL[v]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="otorgar">Otorgar puntos</SelectItem>
                <SelectItem value="restar">Restar puntos</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Puntos" required error={errors.amount?.message}>
            <Input
              type="number"
              min={1}
              step={1}
              {...register("amount", { valueAsNumber: true })}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Nuevo saldo:{" "}
            <span className="font-semibold text-foreground">
              {formatNumber(Math.max(0, nextBalance))}
            </span>{" "}
            puntos
          </p>
          <DialogFooter>
            <Button type="submit" disabled={apply.isPending}>
              <Sparkles className="size-3.5" />
              Aplicar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
