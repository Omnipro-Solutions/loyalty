import Link from "next/link"

import { formatNumber } from "@/lib/format"

import { ExportBatchCouponsButton } from "./export-batch-coupons-button"
import { ResendUnviewedDialog } from "./resend-unviewed-dialog"
import { COUPON_AUDIENCE_MODE_LABEL, formatActorAt } from "../lib/labels"
import type { CouponBatchListItem } from "../lib/queries"

type SampleCoupon = { code: string; memberNombre: string | null }

type BatchExpandedPanelProps = {
  batch: CouponBatchListItem
  sampleCoupons: SampleCoupon[]
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="truncate text-xs text-foreground">{value}</p>
    </div>
  )
}

/** Panel de la fila expandida (Figma 13.1): datos de la emisión, muestra de códigos y acciones. */
export function BatchExpandedPanel({
  batch,
  sampleCoupons,
}: BatchExpandedPanelProps) {
  const fields: { label: string; value: string }[] = []
  if (batch.audience_name) {
    fields.push({ label: "Audiencia", value: batch.audience_name })
  }
  if (batch.audience_mode) {
    fields.push({
      label: "Resolución",
      value:
        COUPON_AUDIENCE_MODE_LABEL[batch.audience_mode as "dynamic" | "frozen"],
    })
  }
  if (batch.audience_size_at_issue != null) {
    fields.push({
      label: "Tamaño al emitir",
      value: `${formatNumber(batch.audience_size_at_issue)} personas`,
    })
  }
  if (batch.issue_reason) {
    fields.push({ label: "Motivo", value: batch.issue_reason })
  }
  if (batch.authorized_by_profile && batch.authorized_at) {
    fields.push({
      label: "Autorizó",
      value: formatActorAt(
        batch.authorized_by_profile.nombre,
        batch.authorized_at
      ),
    })
  }
  if (batch.approved_by_profile && batch.approved_at) {
    fields.push({
      label: "Aprobó",
      value: `${formatActorAt(batch.approved_by_profile.nombre, batch.approved_at)} · doble aprobación`,
    })
  }

  const isLargeBatch = batch.requested_quantity > 500

  return (
    <div className="flex flex-col gap-4 border-t border-border bg-neutral-50 px-[51px] py-4">
      {fields.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">
            Datos de la emisión
          </p>
          <div className="grid grid-cols-5 gap-4">
            {fields.map((field) => (
              <DetailField key={field.label} {...field} />
            ))}
          </div>
        </div>
      )}

      {sampleCoupons.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              Muestra de códigos generados
            </p>
            <Link
              href={`/cupones?vista=coupons&ambito=batch&q=${encodeURIComponent(batch.reference)}`}
              className="text-xs font-medium text-primary"
            >
              Ver {formatNumber(batch.generated_count)} códigos →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleCoupons.map((coupon) => (
              <div
                key={coupon.code}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5"
              >
                <span className="font-mono text-[11px] font-medium text-foreground">
                  {coupon.code}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {coupon.memberNombre ?? "Al portador"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">
          Acciones de la emisión
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Link
          href={`/imprimir/cupones?emision=${batch.id}`}
          target="_blank"
          className="rounded-[10px] border border-border bg-background px-3.5 py-2 text-xs font-medium text-secondary-foreground"
        >
          Vista previa de impresión
        </Link>
        <ExportBatchCouponsButton batchId={batch.id} />
        <ResendUnviewedDialog batchId={batch.id} />
        {/* Fase 6 no la conecta: sin un evento propio en COUPON_EVENT_TYPES
            para "cierre de emisión", queda como próximamente en vez de
            improvisar uno. */}
        <button
          type="button"
          disabled
          title="Próximamente"
          className="rounded-[10px] border border-border bg-background px-3.5 py-2 text-xs font-medium text-secondary-foreground opacity-50"
        >
          Cerrar emisión
        </button>
        {isLargeBatch && (
          <span className="ml-auto rounded-full bg-warning-bg px-3 py-1.5 text-[11px] font-medium text-warning">
            Impresión de lotes grandes: se pedirá rango de códigos
          </span>
        )}
      </div>
    </div>
  )
}
