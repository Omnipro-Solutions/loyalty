import { RefreshCw, UserCog, Radar, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber, formatShortDate, formatTime } from "@/lib/format"

import { avatarPalette } from "../lib/avatar-palette"
import type { MemberAudienceRow } from "../lib/queries"

type MemberAudiencesCardProps = { audiences: MemberAudienceRow[] }

/**
 * Figma "Card · Audiencias activas" (1125:4791) pixel-perfect, real:
 * `segment_members` × `segments` para este socio — es una muestra curada
 * (ver comentario de `listMemberAudiences`), no el universo completo, pero
 * cada fila es una membresía real. La columna ORIGEN del Figma
 * ("POS Centro"/"Modelo IA"/…) no tiene respaldo en `segments` —
 * `sincronizado_con_ajo` es el proxy real más cercano.
 */
export function MemberAudiencesCard({ audiences }: MemberAudiencesCardProps) {
  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex items-center gap-2.5">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-avatar-violet-bg">
          <Users className="size-3.5 text-avatar-violet-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              Audiencias activas
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {audiences.length}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Segmentos dinámicos que la incluyen hoy
          </p>
        </div>
      </div>

      {audiences.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Este socio no pertenece a ninguna audiencia activa por ahora.
        </p>
      ) : (
        <div className="flex max-h-[280px] scrollbar-thin flex-col overflow-auto rounded-[14px]">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-accent hover:bg-accent">
                <TableHead>AUDIENCIA</TableHead>
                <TableHead className="w-24">ORIGEN</TableHead>
                <TableHead className="w-20 text-right">TAMAÑO</TableHead>
                <TableHead className="w-24">ACTUALIZADA</TableHead>
                <TableHead className="w-20">ESTADO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audiences.map((audience) => {
                const palette = avatarPalette(audience.id)
                const OriginIcon = audience.sincronizadoConAjo
                  ? RefreshCw
                  : UserCog
                return (
                  <TableRow key={audience.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className={`flex size-7 shrink-0 items-center justify-center rounded-[9px] ${palette.bg}`}
                        >
                          <Radar className={`size-3.5 ${palette.fg}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-foreground">
                            {audience.nombre}
                          </p>
                          <p className="truncate font-mono text-[9px] text-muted-foreground">
                            {audience.codigo}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <OriginIcon className="size-3 shrink-0 text-muted-foreground" />
                        <span className="truncate text-[10px] text-muted-foreground">
                          {audience.sincronizadoConAjo ? "AJO" : "Manual"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-[12px] font-semibold text-foreground">
                        {audience.conteoEstimado !== null
                          ? formatNumber(audience.conteoEstimado)
                          : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        clientes
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-[10px] font-medium text-foreground">
                        {formatShortDate(audience.actualizadaEn)}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground">
                        {formatTime(audience.actualizadaEn)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          audience.estado === "activa" ? "success" : "neutral"
                        }
                      >
                        {audience.estado === "activa" ? "Activa" : "Pausada"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
