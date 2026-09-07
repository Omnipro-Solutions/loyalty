import Link from "next/link"

import { AppPage } from "@/components/layout/app-page"
import { NoAccess } from "@/components/feedback/no-access"
import { AccumulationsTable } from "@/features/members/components/accumulations-table"
import { ExportAccumulationsButton } from "@/features/members/components/export-accumulations-button"
import { ACCUMULATION_STATUS_LABEL } from "@/features/members/lib/accumulation-labels"
import {
  ACCUMULATION_STATUSES,
  type AccumulationStatus,
} from "@/features/members/lib/accumulation-statuses"
import { listAccumulations } from "@/features/members/lib/queries"
import { formatNumber, formatUSD } from "@/lib/format"
import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { cn } from "@/lib/utils"

/**
 * "Acumulaciones" — quién está a punto de ganarse una pieza gratis, en toda
 * la organización. Vive como pestaña de Clientes y no como sección propia
 * porque sus filas son personas: comparte el universo, hereda
 * `clientes:exportar` y no añade una entrada al menú.
 *
 * El export cuelga de aquí y no de `/clientes` a propósito: el diálogo
 * muestra un conteo previo, y colgarlo del listado de socios haría que ese
 * número contradijera la tabla que se está viendo.
 */
export default async function AccumulationsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const permissions = await getSessionPermissions()
  if (!allows(permissions, "clientes", "ver")) {
    return <NoAccess action="ver" moduleLabel="Clientes y audiencias" />
  }

  const { estado } = await searchParams
  const activo = ACCUMULATION_STATUSES.includes(estado as AccumulationStatus)
    ? (estado as AccumulationStatus)
    : null

  const rows = await listAccumulations(activo ? { estados: [activo] } : {})
  const todas = activo ? await listAccumulations({}) : rows

  const porReclamar = todas.filter((r) => r.estado === "por_reclamar").length
  const ahorroPendiente = todas
    .filter((r) => r.estado === "por_reclamar")
    .reduce((sum, r) => sum + r.ahorro, 0)

  return (
    <AppPage breadcrumb="Comercial  ›  Clientes" title="Acumulaciones">
      <div className="flex flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
                Acumulaciones
              </p>
              <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
                {formatNumber(rows.length)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {porReclamar > 0
                ? `${formatNumber(porReclamar)} pieza${porReclamar === 1 ? "" : "s"} ganada${porReclamar === 1 ? "" : "s"} sin reclamar · ${formatUSD(ahorroPendiente)} pendiente de entregar`
                : "Avance de los socios hacia su pieza gratis"}
            </p>
          </div>
          {allows(permissions, "clientes", "exportar") && (
            <ExportAccumulationsButton
              filters={activo ? { estados: [activo] } : {}}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 px-5 pb-3.5">
          {[null, ...ACCUMULATION_STATUSES].map((s) => {
            const count = s
              ? todas.filter((r) => r.estado === s).length
              : todas.length
            return (
              <Link
                key={s ?? "todas"}
                href={s ? `?estado=${s}` : "/clientes/acumulaciones"}
                aria-current={activo === s ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                  activo === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {s ? ACCUMULATION_STATUS_LABEL[s] : "Todas"}
                <span className="ml-1.5 tabular-nums opacity-70">
                  {formatNumber(count)}
                </span>
              </Link>
            )
          })}
        </div>

        <AccumulationsTable rows={rows} />
      </div>
    </AppPage>
  )
}
