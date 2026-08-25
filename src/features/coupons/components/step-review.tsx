import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Section } from "@/components/form/section"
import { formatDate, formatNumber, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import { discountSummary } from "../lib/recap"
import { COUPON_ORIGIN_LABEL } from "../lib/labels"
import type { CouponBatchValues } from "../schemas"

type ReviewRow = { label: string; value: string }

function SummaryRow({ label, value }: ReviewRow) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-muted py-2 last:border-0">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className="text-[12px] font-medium text-foreground">{value}</p>
    </div>
  )
}

type StepReviewProps = {
  values: Partial<CouponBatchValues>
  recipientLabel?: string
  audienceLabel?: string
  blockers: string[]
  approvalRequired: boolean
}

/** Paso "Revisar y emitir" (doc §4.2): resumen completo + checklist de bloqueos. */
export function StepReview({
  values,
  recipientLabel,
  audienceLabel,
  blockers,
  approvalRequired,
}: StepReviewProps) {
  const rows: ReviewRow[] = [
    {
      label: "Origen",
      value: values.origin ? COUPON_ORIGIN_LABEL[values.origin] : "—",
    },
    { label: "Nombre", value: values.name || "—" },
    { label: "Descuento", value: discountSummary(values) },
  ]

  if (recipientLabel)
    rows.push({ label: "Destinatario", value: recipientLabel })
  if (audienceLabel) rows.push({ label: "Audiencia", value: audienceLabel })
  if (values.requestedQuantity)
    rows.push({
      label: "Cantidad",
      value: formatNumber(values.requestedQuantity),
    })
  if (values.importRows?.length)
    rows.push({
      label: "Filas importadas",
      value: formatNumber(values.importRows.length),
    })
  if (values.pointsCost)
    rows.push({
      label: "Puntos por cupón",
      value: formatNumber(values.pointsCost),
    })
  if (values.minPurchaseAmount)
    rows.push({
      label: "Monto mínimo",
      value: formatUSD(values.minPurchaseAmount),
    })
  rows.push({
    label: "Vigencia",
    value: values.validFrom
      ? `${formatDate(values.validFrom)} ${values.validTo ? `– ${formatDate(values.validTo)}` : "· sin fin"}`
      : "—",
  })

  return (
    <>
      <Section title="Resumen de la emisión">
        <div className="flex flex-col">
          {rows.map((row) => (
            <SummaryRow key={row.label} {...row} />
          ))}
        </div>
      </Section>

      <Section title="Checklist">
        {blockers.length === 0 ? (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            <p className="text-[13px] font-medium">
              {approvalRequired
                ? "Todo listo — al confirmar, se enviará a doble aprobación."
                : "Todo listo — puedes emitir esta emisión."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {blockers.map((message) => (
              <div
                key={message}
                className={cn("flex items-start gap-2 text-destructive")}
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <p className="text-[12px]">{message}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}
