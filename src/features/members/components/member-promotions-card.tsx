import { Gift } from "lucide-react"

import { formatCOP, formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  PROMOTION_TYPE_COLOR,
  PROMOTION_TYPE_ICON,
  PROMOTION_TYPE_LABEL,
} from "../lib/promotion-type"
import type { MemberPromotionRow, PurchaseBehavior } from "../lib/queries"

const DAY_MS = 86_400_000

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS)
}

const CHANNEL_LABEL: Record<string, string> = {
  pos: "tiendas físicas",
  ecommerce: "e-commerce",
  pos_ecommerce: "todos los canales",
}

/** "Segmento · regla RULE-VIP-15", "Cantidad · coincide con tu historial de compra"… (05.3g "Promociones activas") — solo anota con datos reales del socio, nunca inventa una coincidencia. */
function conditionDetail(
  promotion: MemberPromotionRow,
  behavior: PurchaseBehavior
): string {
  const typeLabel = PROMOTION_TYPE_LABEL[promotion.tipo]
  const condition = promotion.condition
  if (!condition) {
    return `${typeLabel} · ${CHANNEL_LABEL[promotion.canalAplicacion] ?? "todos los clientes"}`
  }
  if (condition.campo === "segmento") {
    return `${typeLabel} · regla ${promotion.codigo}`
  }
  if (condition.campo === "categoria") {
    return `${typeLabel} · ${condition.matchesPurchaseHistory ? "coincide con tu historial de compra" : "categoría del catálogo"}`
  }
  if (condition.campo === "monto_carrito") {
    const ticket =
      behavior.totalOrders > 0
        ? ` · su ticket medio es ${formatCOP(behavior.averageTicket)}`
        : ""
    return `${typeLabel} · Aplica desde ${formatCOP(condition.threshold)}${ticket}`
  }
  return `${typeLabel} · ${condition.valor}`
}

type StatusPill = { label: string; variant: "success" | "warning" | "neutral" }

function statusPill(promotion: MemberPromotionRow): StatusPill {
  if (promotion.status === "programada") {
    return { label: "Programada", variant: "neutral" }
  }
  if (promotion.vigenteHasta && daysUntil(promotion.vigenteHasta) <= 7) {
    return { label: "Por vencer", variant: "warning" }
  }
  return { label: "Disponible", variant: "success" }
}

function countdownLabel(promotion: MemberPromotionRow): string {
  if (promotion.status === "programada") {
    const days = daysUntil(promotion.vigenteDesde)
    return `en ${days} día${days === 1 ? "" : "s"} · ${formatShortDate(promotion.vigenteDesde)}`
  }
  if (!promotion.vigenteHasta) return "permanente"
  const days = daysUntil(promotion.vigenteHasta)
  return `en ${Math.max(0, days)} día${days === 1 ? "" : "s"} · hasta ${formatShortDate(promotion.vigenteHasta)}`
}

const PILL_CLASS: Record<StatusPill["variant"], string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-muted text-muted-foreground",
}

type MemberPromotionsCardProps = {
  promotions: MemberPromotionRow[]
  behavior: PurchaseBehavior
}

/**
 * Figma "Card · Promociones activas" (1125:4724) pixel-perfect, real con
 * matices: `listActivePromotionsForMember` ya filtró por vigencia y por
 * segmento real — aquí solo se arma el texto/badge/countdown a partir de
 * eso y de `behavior` (ticket medio, categoría dominante). No se verifica
 * `usos_por_cliente`: no existe tabla de canjes por socio en este proyecto.
 * `assignedManually` marca las que vienen de `member_promociones`
 * ("Enviar promoción" del Hero) en vez de la elegibilidad por
 * segmento/categoría de arriba.
 */
export function MemberPromotionsCard({
  promotions,
  behavior,
}: MemberPromotionsCardProps) {
  const disponibles = promotions.filter((p) => p.status === "activa").length
  const programadas = promotions.filter((p) => p.status === "programada").length

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex items-center gap-2.5">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-avatar-coral-bg">
          <Gift className="size-3.5 text-avatar-coral-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              Promociones activas
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {promotions.length}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Disponibles para canjear hoy · no incluye históricas
          </p>
        </div>
      </div>

      {promotions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Ninguna promoción activa aplica a este socio hoy.
        </p>
      ) : (
        <>
          <div className="flex w-full flex-col gap-2.5">
            {promotions.map((promotion) => {
              const Icon = PROMOTION_TYPE_ICON[promotion.tipo]
              const color = PROMOTION_TYPE_COLOR[promotion.tipo]
              const pill = statusPill(promotion)
              const budgetPct =
                promotion.presupuestoAsignado > 0
                  ? Math.min(
                      100,
                      (promotion.presupuestoConsumido /
                        promotion.presupuestoAsignado) *
                        100
                    )
                  : null
              return (
                <div
                  key={promotion.id}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-[13px] px-3 py-2.5",
                    pill.variant === "warning"
                      ? "bg-warning-bg"
                      : "bg-neutral-50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-[8px]",
                        color.bg
                      )}
                    >
                      <Icon className={cn("size-3.5", color.fg)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-foreground">
                        {promotion.nombre}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {conditionDetail(promotion, behavior)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
                          PILL_CLASS[pill.variant]
                        )}
                      >
                        {pill.label}
                      </span>
                      <span
                        className={cn(
                          "text-[9.5px] font-medium whitespace-nowrap",
                          pill.variant === "warning"
                            ? "text-warning"
                            : "text-muted-foreground"
                        )}
                      >
                        {countdownLabel(promotion)}
                      </span>
                      {promotion.assignedManually && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-medium whitespace-nowrap text-accent-foreground">
                          Asignada manualmente
                        </span>
                      )}
                    </div>
                  </div>
                  {budgetPct !== null && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-2.5 rounded-[10px] bg-accent px-3 py-2.5">
            <p className="flex-1 text-[10px] leading-[15px] text-accent-foreground">
              {disponibles} disponible{disponibles === 1 ? "" : "s"} hoy
              {programadas > 0
                ? ` y ${programadas} programada${programadas === 1 ? "" : "s"}`
                : ""}
              . El histórico de canjes vive en el log de redenciones.
            </p>
            <a
              href="#log-de-redenciones"
              className="shrink-0 text-[10px] font-medium whitespace-nowrap text-primary hover:underline"
            >
              Ver histórico
            </a>
          </div>
        </>
      )}
    </div>
  )
}
