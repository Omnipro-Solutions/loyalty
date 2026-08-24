import { MoreHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Integration } from "@/config/integrations-catalog"
import {
  CONNECTION_STATUS_LABEL,
  type ConnectionStatus,
} from "@/config/integrations-connections"
import { cn } from "@/lib/utils"

type IntegrationCardProps = {
  integration: Integration
  selected: boolean
  onSelect: () => void
  /** Presente solo cuando la integración ya está conectada — controla el interruptor de estado. */
  status?: ConnectionStatus
}

/**
 * Rediseño de tarjeta pedido por producto (fuera del Figma "Card · Adobe
 * Journey Optimizer" 1264:4218): ícono + nombre + menú arriba, la
 * `description` completa (no el `subtitle`, muy genérico) más sus `tags` como
 * info relevante de la integración, y una fila inferior con acción "Ver
 * integración" + interruptor de estado, en vez del chip "Configurar"/estado
 * que traía el archivo. El botón y el interruptor son visuales (no controles
 * reales anidados dentro del `<button>` de la tarjeta) porque, igual que
 * "Configurar", todavía no hay backend detrás — la tarjeta completa sigue
 * siendo la única superficie de selección.
 */
export function IntegrationCard({
  integration,
  selected,
  onSelect,
  status,
}: IntegrationCardProps) {
  const isActive = status === "activa"

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-[228px] flex-col items-start gap-2.5 rounded-2xl border bg-background p-3.5 text-left transition-colors",
        selected
          ? "border-[1.6px] border-primary shadow-form-section"
          : "border-muted hover:border-border-strong"
      )}
    >
      <div className="flex w-full items-start gap-2.5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-muted bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 26px, no vale next/image. */}
          <img src={integration.logo} alt="" className="size-[26px]" />
        </div>
        <p
          title={integration.name}
          className="min-w-0 flex-1 truncate pt-1.5 text-[13px] leading-[18px] font-semibold text-foreground"
        >
          {integration.name}
        </p>
        <MoreHorizontal
          aria-hidden
          className="mt-1.5 size-4 shrink-0 text-muted-foreground"
        />
      </div>

      <p
        title={integration.description}
        className="line-clamp-2 text-[11px] leading-[16px] text-muted-foreground"
      >
        {integration.description}
      </p>

      <div className="flex flex-wrap gap-1">
        {integration.tags.map((tag) => (
          <Badge
            key={tag}
            variant="neutral"
            className="h-auto px-2 py-[3px] text-[9.5px] font-medium"
          >
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex w-full items-center justify-between gap-2">
        <span
          className="rounded-lg border border-border-strong/50 px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground"
          title="Disponible en una próxima fase"
        >
          Ver integración
        </span>
        <span
          aria-hidden
          title={status ? CONNECTION_STATUS_LABEL[status] : "Sin conectar"}
          className={cn(
            "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
            isActive ? "bg-primary" : "bg-input"
          )}
        >
          <span
            className={cn(
              "block size-3.5 rounded-full bg-background shadow-xs transition-transform",
              isActive ? "translate-x-[12px]" : "translate-x-0.5"
            )}
          />
        </span>
      </div>
    </button>
  )
}
