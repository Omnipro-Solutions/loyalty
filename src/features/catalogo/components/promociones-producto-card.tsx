import { ChevronRight, TicketPercent } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PromotionType } from "@/types/domain"

import type { PromocionRelacionada } from "../lib/promociones-relacionadas"

/** Duplicado a propósito de `features/promociones/lib/labels.ts` — features aisladas (CLAUDE.md §2). */
const TIPO_LABEL: Record<PromotionType, string> = {
  cantidad: "Cantidad",
  categoria: "Categoría",
  segmento: "Segmento",
  carrito: "Carrito",
  cupon: "Cupón",
  bundle: "Bundle",
}

const TIPO_DOT: Record<PromotionType, string> = {
  cantidad: "bg-data-teal",
  categoria: "bg-data-indigo",
  segmento: "bg-data-navy",
  carrito: "bg-data-coral",
  cupon: "bg-data-amber",
  bundle: "bg-data-indigo",
}

const ESTADO_LABEL: Record<PromocionRelacionada["estado"], string> = {
  borrador: "Borrador",
  programada: "Programada",
  activa: "Activa",
  finalizada: "Finalizada",
}

const ESTADO_DOT: Record<PromocionRelacionada["estado"], string> = {
  borrador: "bg-muted-foreground",
  programada: "bg-warning",
  activa: "bg-success",
  finalizada: "bg-border-strong",
}

function vigenciaResumen(promocion: PromocionRelacionada) {
  if (!promocion.vigenteHasta) return "Permanente"
  return `${formatDate(promocion.vigenteDesde)} – ${formatDate(promocion.vigenteHasta)}`
}

type PromocionesProductoCardProps = {
  promociones: PromocionRelacionada[]
}

/** Figma "Card · Promociones y reglas" (1216:4026), sección "03.3 · Catálogo · detalle de producto · v2". */
export function PromocionesProductoCard({
  promociones,
}: PromocionesProductoCardProps) {
  return (
    <div className="w-full rounded-[20px] bg-background shadow-form-section">
      <div className="flex items-start justify-between gap-4 px-6 py-[18px]">
        <div>
          <p className="text-[15px] font-semibold text-foreground">
            Promociones y reglas sobre este SKU
          </p>
          <p className="text-[13px] text-muted-foreground">
            {promociones.length === 0
              ? "Ninguna promoción impacta hoy el precio o los puntos de este producto"
              : `${promociones.length} promoción${promociones.length === 1 ? "" : "es"} impacta${promociones.length === 1 ? "" : "n"} el precio o los puntos de este producto`}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled className="shrink-0">
          Asignar promoción
        </Button>
      </div>

      {promociones.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          title="Sin promociones vinculadas"
          description="Créalas desde Promociones filtrando por la categoría de este producto para que aparezcan aquí."
          className="pt-0 pb-8"
        />
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.7fr)_42px] gap-2 border-t border-muted px-6 py-2.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Regla
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Mecánica
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Vigencia
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Alcance
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Estado
            </span>
            <span />
          </div>
          <div className="flex flex-col">
            {promociones.map((promocion) => (
              <Link
                key={promocion.id}
                href={`/promociones/${promocion.id}/editar`}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.7fr)_42px] items-center gap-2 border-t border-muted px-6 py-3 hover:bg-muted"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 size-2 shrink-0 rounded-full",
                      TIPO_DOT[promocion.tipo]
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {promocion.nombre}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      Promoción · {TIPO_LABEL[promocion.tipo]}
                    </p>
                  </div>
                </div>
                <span className="truncate text-xs text-secondary-foreground">
                  {promocion.mecanica}
                </span>
                <span className="truncate text-xs text-secondary-foreground">
                  {vigenciaResumen(promocion)}
                </span>
                <span className="truncate text-xs text-secondary-foreground">
                  {promocion.alcance}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-[7px] shrink-0 rounded-full",
                      ESTADO_DOT[promocion.estado]
                    )}
                  />
                  <span className="text-[11px] font-medium">
                    {ESTADO_LABEL[promocion.estado]}
                  </span>
                </span>
                <ChevronRight className="size-4 justify-self-end text-muted-foreground" />
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-muted px-6 py-3.5">
            <p className="text-xs text-muted-foreground">
              Mostrando {promociones.length} de {promociones.length} promociones
              que impactan este SKU
            </p>
            <Link
              href="/promociones"
              className="text-xs font-semibold text-primary"
            >
              Ver todas en Promociones →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
