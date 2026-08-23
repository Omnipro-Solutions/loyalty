import { AvatarInitials } from "@/components/layout/avatar-initials"

import { TIENDA_ESTADO_LABEL, TIENDA_FORMATO_LABEL } from "../lib/labels"
import type { TiendaValues } from "../schemas"

function KV({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="truncate font-medium text-foreground">{valor}</span>
    </div>
  )
}

type ResumenTiendaCardProps = { valores: Partial<TiendaValues> }

/** Figma "Card · Resumen" (1241:3978): vista previa en vivo mientras se llena el formulario. */
export function ResumenTiendaCard({ valores }: ResumenTiendaCardProps) {
  const nombre = valores.nombre?.trim() || "Nombre de la tienda"
  const ubicacion = [valores.colonia, valores.ciudad, valores.codigoPostal]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-background px-5 py-5 shadow-form-section">
      <p className="text-sm font-semibold text-foreground">Resumen</p>
      <div className="flex items-center gap-3 rounded-2xl bg-muted p-3.5">
        <AvatarInitials
          name={nombre}
          size={36}
          bgClassName="bg-avatar-indigo-bg"
          fgClassName="text-avatar-indigo-fg"
          textClassName="text-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {nombre}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {ubicacion || "—"}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <KV etiqueta="ID de tienda" valor={valores.codigoTienda || "—"} />
        <KV
          etiqueta="Formato"
          valor={valores.formato ? TIENDA_FORMATO_LABEL[valores.formato] : "—"}
        />
        <KV
          etiqueta="Estado"
          valor={valores.estado ? TIENDA_ESTADO_LABEL[valores.estado] : "—"}
        />
        <KV etiqueta="País" valor={valores.pais || "—"} />
      </div>
    </div>
  )
}
