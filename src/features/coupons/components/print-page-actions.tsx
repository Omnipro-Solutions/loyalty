"use client"

import { useAction } from "next-safe-action/hooks"
import { useState } from "react"

import type { CouponPrintLayout } from "@/types/domain"

import { registerPrintJobAction } from "../actions/print"

type PrintPageActionsProps = {
  batchId: string
  couponIds: string[]
  layout: CouponPrintLayout
}

/** No printea: pinta la barra "no-print" con el botón real. `window.print()` corre después de registrar el trabajo, para que un job "ready" siempre corresponda a una impresión que de verdad se disparó. */
export function PrintPageActions({
  batchId,
  couponIds,
  layout,
}: PrintPageActionsProps) {
  const [error, setError] = useState<string>()

  const register = useAction(registerPrintJobAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setError(data?.message ?? "No se pudo registrar la impresión.")
        return
      }
      window.print()
    },
    onError: () => setError("No se pudo registrar la impresión."),
  })

  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Vista previa de impresión
        </p>
        <p className="text-xs text-muted-foreground">
          {couponIds.length} código{couponIds.length === 1 ? "" : "s"} · esta
          barra no se imprime.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <button
        type="button"
        disabled={register.isPending}
        onClick={() => register.execute({ batchId, couponIds, layout })}
        className="rounded-[10px] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {register.isPending ? "Registrando…" : "Imprimir"}
      </button>
    </div>
  )
}
