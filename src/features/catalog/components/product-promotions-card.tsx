import { ChevronRight, TicketPercent } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PromotionType } from "@/types/domain"

import type { RelatedPromotion } from "../lib/related-promotions"

/** Duplicado a propósito de `features/promotions/lib/labels.ts` — features aisladas (CLAUDE.md §2). */
const TYPE_LABEL: Record<PromotionType, string> = {
  cantidad: "Cantidad",
  categoria: "Categoría",
  segmento: "Segmento",
  carrito: "Carrito",
  cupon: "Cupón",
  bundle: "Bundle",
}

const TYPE_DOT: Record<PromotionType, string> = {
  cantidad: "bg-data-teal",
  categoria: "bg-data-indigo",
  segmento: "bg-data-navy",
  carrito: "bg-data-coral",
  cupon: "bg-data-amber",
  bundle: "bg-data-indigo",
}

const STATUS_LABEL: Record<RelatedPromotion["status"], string> = {
  borrador: "Borrador",
  programada: "Programada",
  activa: "Activa",
  inactiva: "Inactiva",
  finalizada: "Finalizada",
}

const STATUS_DOT: Record<RelatedPromotion["status"], string> = {
  borrador: "bg-muted-foreground",
  programada: "bg-warning",
  activa: "bg-success",
  inactiva: "bg-destructive",
  finalizada: "bg-border-strong",
}

function validitySummary(promotion: RelatedPromotion) {
  if (!promotion.validTo) return "Permanente"
  return `${formatDate(promotion.validFrom)} – ${formatDate(promotion.validTo)}`
}

type ProductPromotionsCardProps = {
  promotions: RelatedPromotion[]
}

/** Figma "Card · Promociones y reglas" (1216:4026), sección "03.3 · Catálogo · detalle de producto · v2". */
export function ProductPromotionsCard({
  promotions,
}: ProductPromotionsCardProps) {
  return (
    <div className="w-full rounded-[20px] bg-background shadow-form-section">
      <div className="flex items-start justify-between gap-4 px-6 py-[18px]">
        <div>
          <p className="text-[15px] font-semibold text-foreground">
            Promociones y reglas sobre este SKU
          </p>
          <p className="text-[13px] text-muted-foreground">
            {promotions.length === 0
              ? "Ninguna promoción impacta hoy el precio o los puntos de este producto"
              : `${promotions.length} promoción${promotions.length === 1 ? "" : "es"} impacta${promotions.length === 1 ? "" : "n"} el precio o los puntos de este producto`}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled className="shrink-0">
          Asignar promoción
        </Button>
      </div>

      {promotions.length === 0 ? (
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
            {promotions.map((promotion) => (
              <Link
                key={promotion.id}
                href={`/promociones/${promotion.id}/editar`}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.7fr)_42px] items-center gap-2 border-t border-muted px-6 py-3 hover:bg-muted"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 size-2 shrink-0 rounded-full",
                      TYPE_DOT[promotion.type]
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {promotion.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      Promoción · {TYPE_LABEL[promotion.type]}
                    </p>
                  </div>
                </div>
                <span className="truncate text-xs text-secondary-foreground">
                  {promotion.mechanic}
                </span>
                <span className="truncate text-xs text-secondary-foreground">
                  {validitySummary(promotion)}
                </span>
                <span className="truncate text-xs text-secondary-foreground">
                  {promotion.scope}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-[7px] shrink-0 rounded-full",
                      STATUS_DOT[promotion.status]
                    )}
                  />
                  <span className="text-[11px] font-medium">
                    {STATUS_LABEL[promotion.status]}
                  </span>
                </span>
                <ChevronRight className="size-4 justify-self-end text-muted-foreground" />
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-muted px-6 py-3.5">
            <p className="text-xs text-muted-foreground">
              Mostrando {promotions.length} de {promotions.length} promociones
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
