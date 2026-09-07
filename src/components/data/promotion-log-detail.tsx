import { ArrowUpRight } from "lucide-react"

import {
  EVALUATION_DISCARD_LABEL,
  EVALUATION_DISCARD_REASONS,
  type EvaluationDiscardReason,
  type SystemLogEvaluation,
  type SystemLogPromotion,
} from "@/config/system-log"
import {
  PROMOTION_TYPE_COLOR,
  PROMOTION_TYPE_ICON,
} from "@/config/promotion-type"
import { formatNumber, formatShortDate, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  BenefitType,
  ChannelScope,
  PromotionPublicationStatus,
} from "@/types/domain"

const DAY_MS = 86_400_000

const CHANNEL_LABEL: Record<ChannelScope, string> = {
  pos: "Tiendas físicas",
  ecommerce: "E-commerce",
  pos_ecommerce: "Todos los canales",
}

const STATUS_LABEL: Record<PromotionPublicationStatus, string> = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente de aprobación",
  activa: "Activa",
  inactiva: "Inactiva",
  finalizada: "Finalizada",
}

const STATUS_CLASS: Record<PromotionPublicationStatus, string> = {
  borrador: "bg-muted text-muted-foreground",
  pendiente_aprobacion: "bg-warning-bg text-warning",
  activa: "bg-success-bg text-success",
  inactiva: "bg-muted text-muted-foreground",
  finalizada: "bg-muted text-muted-foreground",
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS)
}

/** "quedan 18 días · hasta 20 sep 2026" — mismo formato que 05.3g, para que la misma promoción se lea igual en las dos pantallas. */
function validityLabel(promotion: SystemLogPromotion): string {
  const start = new Date(promotion.vigenteDesde).getTime()
  if (start > Date.now()) {
    const days = daysUntil(promotion.vigenteDesde)
    return `empieza en ${String(days)} día${days === 1 ? "" : "s"} · ${formatShortDate(promotion.vigenteDesde)}`
  }
  if (!promotion.vigenteHasta) {
    return `desde ${formatShortDate(promotion.vigenteDesde)} · permanente`
  }
  const days = daysUntil(promotion.vigenteHasta)
  if (days < 0) return `terminó el ${formatShortDate(promotion.vigenteHasta)}`
  return `quedan ${String(days)} día${days === 1 ? "" : "s"} · hasta ${formatShortDate(promotion.vigenteHasta)}`
}

/**
 * Cuánto de la ventana de vigencia ya transcurrió. Es lo que la barra
 * dibuja: en el log lo que se pregunta es «¿esto sigue vivo?», y una fecha
 * suelta no lo responde de un vistazo.
 */
function elapsedPct(promotion: SystemLogPromotion): number | null {
  if (!promotion.vigenteHasta) return null
  const from = new Date(promotion.vigenteDesde).getTime()
  const to = new Date(promotion.vigenteHasta).getTime()
  if (to <= from) return null
  return Math.min(100, Math.max(0, ((Date.now() - from) / (to - from)) * 100))
}

/**
 * La mecánica en los términos en que el socio la entiende. "Cantidad" no le
 * dice a nadie qué tiene que comprar; "3x2 · lleva 3, paga 2" sí.
 *
 * Solo `por_piezas` tiene términos numéricos que valga la pena desplegar —
 * el resto se nombra y ya, porque su condición vive en el árbol de
 * condiciones de la promoción y no en dos columnas.
 */
const BENEFIT_LABEL: Record<BenefitType, string> = {
  descuento_porcentual: "Descuento %",
  descuento_monto_fijo: "Descuento fijo",
  envio_gratis: "Envío gratis",
  producto_gratis: "Producto gratis",
  precio_fijo_bundle: "Precio de paquete",
  descuento_escalonado: "Descuento escalonado",
  por_piezas: "Pieza gratis",
  multiplicador_puntos: "Multiplicador de puntos",
  bono_puntos: "Bono de puntos",
  emitir_cupon: "Emisión de cupón",
  precio_especial: "Precio especial",
  cashback: "Cashback",
  descuento_continuidad: "Descuento por continuidad",
}

function mechanicLabel(promotion: SystemLogPromotion): string {
  const { tipoBeneficio, compraCantidad, pagaCantidad } = promotion
  if (tipoBeneficio === "por_piezas" && compraCantidad && pagaCantidad) {
    return `${String(compraCantidad)}x${String(pagaCantidad)} · lleva ${String(compraCantidad)}, paga ${String(pagaCantidad)}`
  }
  return BENEFIT_LABEL[tipoBeneficio]
}

/**
 * Qué se evaluó en ESTA compra, traducido de los metadatos del evento. Es la
 * pregunta que el log dejaba sin responder: la tarjeta decía cuál es la
 * mecánica, pero no cuántas piezas llevaba el socio ni cuántas le faltaban
 * para el siguiente regalo.
 */
function evaluationLabel(
  promotion: SystemLogPromotion,
  metadata: Record<string, unknown>
): string | null {
  if (promotion.tipoBeneficio !== "por_piezas") return null
  const compra = promotion.compraCantidad
  const paga = promotion.pagaCantidad
  const piezas = metadata.piezas_compradas
  if (!compra || !paga || typeof piezas !== "number") return null

  const gratisPorCiclo = compra - paga
  const ciclos = Math.floor(piezas / compra)
  const sobrantes = piezas % compra
  const faltan = sobrantes === 0 ? compra : compra - sobrantes

  const ganado =
    ciclos > 0
      ? `${String(ciclos * gratisPorCiclo)} gratis`
      : "todavía ninguna gratis"
  const resto =
    sobrantes === 0
      ? `el siguiente ciclo empieza de cero: faltan ${String(compra)}`
      : `${String(sobrantes)} suelta${sobrantes === 1 ? "" : "s"}, faltan ${String(faltan)} para el siguiente`

  return `${String(piezas)} pieza${piezas === 1 ? "" : "s"} en el carrito → ${ganado}. ${resto[0]?.toUpperCase()}${resto.slice(1)}.`
}

/**
 * Lo que el motor evaluó, leído de los `metadatos` del evento.
 *
 * Se parsea a la defensiva —campo por campo, con su `typeof`— porque esto no
 * es una columna con tipo: es jsonb que escribe el motor, y un evento viejo
 * (o uno que venga de otra versión del motor) puede traer cualquier cosa o
 * no traer nada. Devuelve `null` cuando no hay NADA que contar, para no
 * pintar una caja vacía.
 */
function parseEvaluation(
  metadata: Record<string, unknown>
): SystemLogEvaluation | null {
  const ticket = typeof metadata.ticket === "string" ? metadata.ticket : null
  const montoCarrito =
    typeof metadata.monto_carrito === "number" ? metadata.monto_carrito : null
  const piezasCarrito =
    typeof metadata.piezas_carrito === "number" ? metadata.piezas_carrito : null

  const candidatas = (
    Array.isArray(metadata.candidatas) ? metadata.candidatas : []
  ).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return []
    const fila = raw as Record<string, unknown>
    if (typeof fila.codigo !== "string") return []
    const motivo = fila.motivo
    return [
      {
        codigo: fila.codigo,
        aplicada: fila.aplicada === true,
        motivo:
          typeof motivo === "string" &&
          EVALUATION_DISCARD_REASONS.includes(motivo as EvaluationDiscardReason)
            ? (motivo as EvaluationDiscardReason)
            : null,
      },
    ]
  })

  if (
    !ticket &&
    montoCarrito === null &&
    piezasCarrito === null &&
    candidatas.length === 0
  ) {
    return null
  }
  return { ticket, montoCarrito, piezasCarrito, candidatas }
}

/**
 * La consulta del carrito: qué mandó la caja y qué hizo el motor con las
 * demás promociones vigentes.
 *
 * Es el hueco que el log tenía y que ninguna otra pantalla cubre: se
 * registraba el desenlace (se aplicó / se rechazó) pero no la deliberación,
 * así que «¿por qué no le dio el 3x2?» solo se podía responder comparando la
 * promoción con el ticket a mano. Con `modo_multiple`, `acumulable`,
 * `limites` y presupuesto de por medio, hay media docena de razones posibles
 * y adivinar cuál fue no es un método.
 */
function EvaluationBlock({ evaluation }: { evaluation: SystemLogEvaluation }) {
  const { ticket, montoCarrito, piezasCarrito, candidatas } = evaluation
  const resumen = [
    montoCarrito !== null ? `carrito de ${formatUSD(montoCarrito)}` : null,
    piezasCarrito !== null
      ? `${formatNumber(piezasCarrito)} pieza${piezasCarrito === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-1.5 rounded-[9px] bg-muted px-2.5 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          Lo que preguntó la caja
        </span>
        {ticket && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {ticket}
          </span>
        )}
      </div>
      {resumen.length > 0 && (
        <p className="text-[11px] text-secondary-foreground">
          {resumen.join(" · ")}
        </p>
      )}
      {candidatas.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {/* La que ganó y las que perdieron, en la misma lista: el orden lo
              pone el motor, y verlas juntas es lo que explica la decisión. */}
          {candidatas.map((candidata) => (
            <div
              key={candidata.codigo}
              className="flex items-baseline justify-between gap-2 text-[11px]"
            >
              <span className="min-w-0 truncate font-mono text-[10px] text-secondary-foreground">
                {candidata.codigo}
              </span>
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap",
                  candidata.aplicada
                    ? "font-medium text-primary"
                    : "text-muted-foreground"
                )}
              >
                {candidata.aplicada
                  ? "Aplicada"
                  : candidata.motivo
                    ? EVALUATION_DISCARD_LABEL[candidata.motivo]
                    : "Descartada"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type Fact = { label: string; value: string }

/**
 * La promoción del evento, resuelta. Reemplaza el volcado de `metadatos` que
 * había antes para estas filas: un `promocion_id` en crudo no dice si la
 * promoción sigue viva, con qué mecánica corre ni cuánto presupuesto le
 * queda, que es lo que se busca cuando se abre un log.
 *
 * Vive en `components` y no en `features/promotions` porque el log cruza
 * tres features y ninguna puede importar de otra (CLAUDE.md §2) — mismo
 * motivo por el que `SystemLog` está aquí.
 */
export function PromotionLogDetail({
  promotion,
  name,
  href,
  metadata,
}: {
  promotion: SystemLogPromotion
  name: string
  href: string | null
  /** Los metadatos del evento — es de donde sale qué se evaluó en esta compra. */
  metadata: Record<string, unknown>
}) {
  const Icon = PROMOTION_TYPE_ICON[promotion.tipo]
  const color = PROMOTION_TYPE_COLOR[promotion.tipo]
  const elapsed = elapsedPct(promotion)
  const budgetPct =
    promotion.presupuestoAsignado > 0
      ? Math.min(
          100,
          (promotion.presupuestoConsumido / promotion.presupuestoAsignado) * 100
        )
      : null

  const evaluation = evaluationLabel(promotion, metadata)
  const evaluacionCarrito = parseEvaluation(metadata)

  const facts: Fact[] = [
    { label: "Mecánica", value: mechanicLabel(promotion) },
    { label: "Canal", value: CHANNEL_LABEL[promotion.canal] },
    { label: "Canjes", value: formatNumber(promotion.canjes) },
    {
      label: "Presupuesto",
      value:
        promotion.presupuestoAsignado > 0
          ? `${formatUSD(promotion.presupuestoConsumido)} de ${formatUSD(promotion.presupuestoAsignado)}`
          : "sin tope",
    },
  ]

  return (
    <div className="flex flex-col gap-2.5 rounded-[13px] border border-border bg-background px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-[8px]",
            color.bg
          )}
        >
          <Icon className={cn("size-3.5", color.fg)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-foreground">
            {name}
          </p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {promotion.codigo}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
              STATUS_CLASS[promotion.estadoPublicacion]
            )}
          >
            {STATUS_LABEL[promotion.estadoPublicacion]}
          </span>
          <span className="text-[9.5px] font-medium whitespace-nowrap text-muted-foreground">
            {validityLabel(promotion)}
          </span>
        </div>
      </div>

      {elapsed !== null && (
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`Vigencia transcurrida: ${String(Math.round(elapsed))} %`}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${String(elapsed)}%` }}
          />
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-x-4 gap-y-1.5">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <p className="text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
              {fact.label}
            </p>
            <p className="truncate text-[11.5px] text-foreground">
              {fact.value}
            </p>
          </div>
        ))}
      </div>

      {evaluation && (
        <p className="rounded-[9px] bg-accent px-2.5 py-2 text-[11px] leading-[16px] text-accent-foreground">
          {evaluation}
        </p>
      )}

      {evaluacionCarrito && <EvaluationBlock evaluation={evaluacionCarrito} />}

      {budgetPct !== null && (
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`Presupuesto consumido: ${String(Math.round(budgetPct))} %`}
        >
          <div
            className={cn(
              "h-full rounded-full",
              budgetPct >= 90 ? "bg-destructive" : "bg-success"
            )}
            style={{ width: `${String(budgetPct)}%` }}
          />
        </div>
      )}

      {href && (
        <a
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="flex w-fit items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Ver la promoción
          <ArrowUpRight className="size-3" />
        </a>
      )}
    </div>
  )
}
