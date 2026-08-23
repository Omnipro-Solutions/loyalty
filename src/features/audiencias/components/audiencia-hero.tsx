"use client"

import { useAction } from "next-safe-action/hooks"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatRelativeTime } from "@/lib/format"

import { sincronizarAudienciaAction } from "../actions/sincronizar"
import { ExportarMiembrosButton } from "./exportar-miembros-button"
import type { Audiencia, MiembroAudiencia } from "../lib/queries"

type AudienciaHeroProps = { audiencia: Audiencia; miembros: MiembroAudiencia[] }

/** Figma "11.2 · Audiencia · detalle" (842:6218) — Hero. */
export function AudienciaHero({ audiencia, miembros }: AudienciaHeroProps) {
  const sincronizar = useAction(sincronizarAudienciaAction)

  return (
    <div className="flex w-full flex-col gap-5 rounded-xl border border-border bg-neutral-50 p-6">
      <div className="flex items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[0.66px] text-muted-foreground">
            {audiencia.codigo}
          </p>
          <p className="text-[22px] font-bold text-foreground">
            {audiencia.nombre}
          </p>
          {audiencia.descripcion && (
            <p className="text-sm text-secondary-foreground">
              {audiencia.descripcion}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-start gap-2">
            <Badge
              variant={audiencia.estado === "activa" ? "success" : "neutral"}
            >
              {audiencia.estado === "activa" ? "Activa" : "Pausada"}
            </Badge>
            <Badge
              variant={audiencia.sincronizado_con_ajo ? "success" : "neutral"}
            >
              {audiencia.sincronizado_con_ajo
                ? "Sincronizado con AJO"
                : "Sin sincronizar"}
            </Badge>
          </div>
          {audiencia.ultima_sincronizacion_en && (
            <p className="text-xs text-muted-foreground">
              Última sincronización:{" "}
              {formatRelativeTime(audiencia.ultima_sincronizacion_en)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          disabled={sincronizar.isPending}
          onClick={() => sincronizar.execute({ segmentId: audiencia.id })}
        >
          Sincronizar ahora
        </Button>
        <ExportarMiembrosButton miembros={miembros} />
      </div>
    </div>
  )
}
