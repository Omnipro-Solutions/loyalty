import { FileText, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Integration } from "../lib/catalog"
import {
  CONNECTION_STATUS_DOT,
  CONNECTION_STATUS_LABEL,
  type ConnectionStatus,
} from "../lib/connections"

type IntegrationCardProps = {
  integration: Integration
  selected: boolean
  onSelect: () => void
  /** Cuando la integración ya está conectada, reemplaza el chip "Configurar" por su estado real. */
  status?: ConnectionStatus
}

/** Figma "Card · Adobe Journey Optimizer" y análogas (1264:4218). */
export function IntegrationCard({
  integration,
  selected,
  onSelect,
  status,
}: IntegrationCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-[186px] flex-col items-start gap-2.5 rounded-[14px] border bg-background px-3 pt-3 pb-2.5 text-left transition-colors",
        selected
          ? "border-[1.6px] border-primary shadow-form-section"
          : "border-muted hover:border-border-strong"
      )}
    >
      <div className="flex w-full items-center gap-2.5">
        <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[9px] border border-muted bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 26px, no vale next/image. */}
          <img src={integration.logo} alt="" className="size-[26px]" />
        </div>
        <p className="min-w-0 flex-1 truncate text-[11.5px] leading-4 font-semibold text-foreground">
          {integration.name}
        </p>
      </div>
      <div className="h-px w-full bg-muted" />
      <div className="flex w-full items-center gap-2">
        {status ? (
          <span className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold text-border-strong">
            <span
              className={cn(
                "size-[6px] rounded-full",
                CONNECTION_STATUS_DOT[status]
              )}
            />
            {CONNECTION_STATUS_LABEL[status]}
          </span>
        ) : (
          <span className="rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold text-border-strong">
            Configurar
          </span>
        )}
        <span className="h-px flex-1" />
        <FileText className="size-3.5 text-border-strong" />
        <MoreHorizontal className="size-3.5 text-border-strong" />
      </div>
    </button>
  )
}
