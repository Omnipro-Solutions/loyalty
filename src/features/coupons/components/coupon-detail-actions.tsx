"use client"

import Link from "next/link"
import { useState } from "react"

import { cn } from "@/lib/utils"
import type { CouponOrigin } from "@/types/domain"

import { ExtendValidityDialog } from "./extend-validity-dialog"
import { ResendCouponDialog } from "./resend-coupon-dialog"
import { VoidCouponDialog } from "./void-coupon-dialog"

/** Los 4 botones de la cabecera solo varían en color (normal/destructivo) y en si están deshabilitados — un solo helper en vez de 4 constantes casi idénticas. */
function actionButtonClass({
  destructive = false,
  disabled = false,
}: {
  destructive?: boolean
  disabled?: boolean
}) {
  return cn(
    "rounded-[10px] border bg-background px-3.5 py-2.5 text-sm font-medium",
    destructive
      ? "border-destructive/40 text-destructive"
      : "border-border text-secondary-foreground",
    disabled
      ? "opacity-50"
      : destructive
        ? "transition-colors hover:bg-destructive-bg"
        : "transition-colors hover:bg-accent"
  )
}

type CouponDetailActionsProps = {
  couponId: string
  couponCode: string
  batchId: string
  sequence: number
  origin: CouponOrigin
  canRefundPoints: boolean
  currentValidTo: string | null
  canEmitir: boolean
  canAnular: boolean
  canImprimir: boolean
  isCancelled: boolean
}

/** Cabecera de acciones de `/cupones/[id]` (13.4). */
export function CouponDetailActions({
  couponId,
  couponCode,
  batchId,
  sequence,
  origin,
  canRefundPoints,
  currentValidTo,
  canEmitir,
  canAnular,
  canImprimir,
  isCancelled,
}: CouponDetailActionsProps) {
  const [openDialog, setOpenDialog] = useState<
    "resend" | "extend" | "void" | null
  >(null)

  const emitirTitle = isCancelled
    ? "El cupón ya está anulado"
    : "No tienes permiso"
  const anularTitle = isCancelled
    ? "El cupón ya está anulado"
    : "No tienes permiso para anular"

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      {canImprimir ? (
        <Link
          href={`/imprimir/cupones?emision=${batchId}&desde=${sequence}&hasta=${sequence}&layout=single_page`}
          target="_blank"
          className={actionButtonClass({})}
        >
          Imprimir
        </Link>
      ) : (
        <button
          type="button"
          disabled
          title="No tienes permiso para imprimir"
          className={actionButtonClass({ disabled: true })}
        >
          Imprimir
        </button>
      )}
      <button
        type="button"
        disabled={!canEmitir}
        title={canEmitir ? undefined : emitirTitle}
        className={actionButtonClass({ disabled: !canEmitir })}
        onClick={() => setOpenDialog("resend")}
      >
        Reenviar
      </button>
      <button
        type="button"
        disabled={!canEmitir}
        title={canEmitir ? undefined : emitirTitle}
        className={actionButtonClass({ disabled: !canEmitir })}
        onClick={() => setOpenDialog("extend")}
      >
        Extender
      </button>
      <button
        type="button"
        disabled={!canAnular}
        title={canAnular ? undefined : anularTitle}
        className={actionButtonClass({
          destructive: true,
          disabled: !canAnular,
        })}
        onClick={() => setOpenDialog("void")}
      >
        Anular
      </button>

      <ResendCouponDialog
        open={openDialog === "resend"}
        onOpenChange={(open) => setOpenDialog(open ? "resend" : null)}
        couponId={couponId}
        couponCode={couponCode}
      />
      <ExtendValidityDialog
        open={openDialog === "extend"}
        onOpenChange={(open) => setOpenDialog(open ? "extend" : null)}
        couponId={couponId}
        couponCode={couponCode}
        currentValidTo={currentValidTo}
      />
      <VoidCouponDialog
        open={openDialog === "void"}
        onOpenChange={(open) => setOpenDialog(open ? "void" : null)}
        couponId={couponId}
        couponCode={couponCode}
        canRefundPoints={canRefundPoints}
        origin={origin}
      />
    </div>
  )
}
