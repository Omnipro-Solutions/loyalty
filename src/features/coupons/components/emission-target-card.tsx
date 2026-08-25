import { formatNumber } from "@/lib/format"

type EmissionTargetCardProps = {
  name: string
  originLabel: string
  audienceLabel?: string
  quantity: number
  /** Solo cuando la generación va a correr por lotes (`batch_audience`/`batch_anonymous` sobre el umbral de un chunk). */
  chunkCount?: number
}

/** Figma 13.3 "Card · Emisión destino" — la referencia real la asigna Postgres al guardar (`set_coupon_batch_reference`), así que aquí no se inventa un número. */
export function EmissionTargetCard({
  name,
  originLabel,
  audienceLabel,
  quantity,
  chunkCount,
}: EmissionTargetCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-background p-4 shadow-form-section">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          Emisión destino
        </p>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          Borrador
        </span>
      </div>

      <dl className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Referencia</dt>
          <dd className="font-medium text-muted-foreground italic">
            se asigna al guardar
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="truncate font-medium text-foreground">
            {name || "Sin nombre"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Origen</dt>
          <dd className="truncate font-medium text-foreground">
            {originLabel}
          </dd>
        </div>
        {audienceLabel && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Audiencia</dt>
            <dd className="truncate font-medium text-primary">
              {audienceLabel}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Códigos a generar</dt>
          <dd className="font-medium text-foreground">
            {formatNumber(quantity)}
          </dd>
        </div>
      </dl>

      {(chunkCount ?? 0) > 1 && (
        <p className="rounded-lg bg-warning-bg px-3 py-2 text-[11px] text-warning">
          Generación en segundo plano: {chunkCount} lotes. La emisión queda en
          «Generando».
        </p>
      )}
    </div>
  )
}
