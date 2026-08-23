import { AvatarInitials } from "@/components/layout/avatar-initials"

import { STORE_STATUS_LABEL, STORE_FORMAT_LABEL } from "../lib/labels"
import type { StoreValues } from "../schemas"

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  )
}

type StoreSummaryCardProps = { values: Partial<StoreValues> }

/** Figma "Card · Resumen" (1241:3978): vista previa en vivo mientras se llena el formulario. */
export function StoreSummaryCard({ values }: StoreSummaryCardProps) {
  const name = values.name?.trim() || "Nombre de la tienda"
  const location = [values.neighborhood, values.city, values.postalCode]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-background px-5 py-5 shadow-form-section">
      <p className="text-sm font-semibold text-foreground">Resumen</p>
      <div className="flex items-center gap-3 rounded-2xl bg-muted p-3.5">
        <AvatarInitials
          name={name}
          size={36}
          bgClassName="bg-avatar-indigo-bg"
          fgClassName="text-avatar-indigo-fg"
          textClassName="text-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {location || "—"}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <KV label="ID de tienda" value={values.storeCode || "—"} />
        <KV
          label="Formato"
          value={values.format ? STORE_FORMAT_LABEL[values.format] : "—"}
        />
        <KV
          label="Estado"
          value={values.status ? STORE_STATUS_LABEL[values.status] : "—"}
        />
        <KV label="País" value={values.country || "—"} />
      </div>
    </div>
  )
}
