"use client"

import { useAction } from "next-safe-action/hooks"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatRelativeTime } from "@/lib/format"

import { syncAudienceAction } from "../actions/sync"
import { ExportMembersButton } from "./export-members-button"
import type { Audience, AudienceMember } from "../lib/queries"

type AudienceHeroProps = {
  audience: Audience
  members: AudienceMember[]
  /** `clientes:editar` — sincronizar empuja la audiencia a los destinos conectados. */
  canSync: boolean
}

/** Figma "11.2 · Audiencia · detalle" (842:6218) — Hero. */
export function AudienceHero({
  audience,
  members,
  canSync,
}: AudienceHeroProps) {
  const sync = useAction(syncAudienceAction)

  return (
    <div className="flex w-full flex-col gap-5 rounded-xl border border-border bg-neutral-50 p-6">
      <div className="flex items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[0.66px] text-muted-foreground">
            {audience.codigo}
          </p>
          <p className="text-[22px] font-bold text-foreground">
            {audience.nombre}
          </p>
          {audience.descripcion && (
            <p className="text-sm text-secondary-foreground">
              {audience.descripcion}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-start gap-2">
            <Badge
              variant={audience.estado === "activa" ? "success" : "neutral"}
            >
              {audience.estado === "activa" ? "Activa" : "Pausada"}
            </Badge>
            <Badge
              variant={audience.sincronizado_con_ajo ? "success" : "neutral"}
            >
              {audience.sincronizado_con_ajo
                ? "Sincronizado con AJO"
                : "Sin sincronizar"}
            </Badge>
          </div>
          {audience.ultima_sincronizacion_en && (
            <p className="text-xs text-muted-foreground">
              Última sincronización:{" "}
              {formatRelativeTime(audience.ultima_sincronizacion_en)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {canSync && (
          <Button
            disabled={sync.isPending}
            onClick={() => sync.execute({ segmentId: audience.id })}
          >
            Sincronizar ahora
          </Button>
        )}
        <ExportMembersButton members={members} />
      </div>
    </div>
  )
}
