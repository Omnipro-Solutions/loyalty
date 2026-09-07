"use client"

import {
  ArrowUpRight,
  BadgeCheck,
  IdCard,
  Mail,
  Phone,
  RotateCcw,
  ShoppingBag,
  Receipt,
  Store,
  Tag,
  Ticket,
  TriangleAlert,
  User,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import {
  PAYMENT_METHOD_ICON,
  PAYMENT_METHOD_LABEL,
} from "@/config/payment-method"
import { RETURN_REASON_LABEL } from "@/config/return-reason"
import { salesChannelPlaceLabel } from "@/config/sales-channel"
import type {
  SystemLogOrder,
  SystemLogOrderCoupon,
  SystemLogOrderLine,
} from "@/config/system-log"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  formatUSD,
} from "@/lib/format"
import { cn } from "@/lib/utils"

/** Un dato del bloque de cliente. Se omite entero cuando no hay valor: un campo con «—» ocupa lo mismo y no dice nada. */
function Field({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail
  label: string
  value: string | null
  href?: string
}) {
  if (!value) return null
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-[3px] size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          {label}
        </p>
        {href ? (
          <Link
            href={href}
            className="block truncate text-[12.5px] font-medium text-primary hover:underline"
          >
            {value}
          </Link>
        ) : (
          <p className="truncate text-[12.5px] font-medium text-foreground">
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

/** Una cifra del resumen. */
function Amount({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "warning"
}) {
  return (
    <div className="min-w-0 rounded-[10px] bg-muted px-3 py-2">
      <p className="text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "truncate text-[15px] font-bold tabular-nums",
          tone === "warning" ? "text-warning" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}

/**
 * Una fila de la cascada de cálculo: un concepto, de dónde sale y cuánto
 * mueve. Existe como componente porque las cinco filas —lista, promoción,
 * cupón, total, IVA— son la misma forma con distinto tono, y escribirlas
 * sueltas garantiza que se desalineen la primera vez que alguien toque una.
 */
function Line({
  icon: Icon,
  label,
  hint,
  value,
  tone = "default",
  strike = false,
}: {
  icon?: typeof Mail
  label: string
  hint?: string
  value: string
  tone?: "default" | "discount" | "muted"
  strike?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0">
      {Icon && (
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "discount" ? "text-success" : "text-muted-foreground"
          )}
        />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[12px]",
            tone === "muted"
              ? "text-secondary-foreground"
              : "font-medium text-foreground"
          )}
        >
          {label}
        </p>
        {hint && (
          <p className="truncate font-mono text-[9.5px] text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 text-[12.5px] font-semibold whitespace-nowrap tabular-nums",
          tone === "discount" && "text-success",
          tone === "muted" && "text-secondary-foreground",
          tone === "default" && "text-foreground",
          // Tachado en vez de oculto: el cupón existió, y esconderlo dejaría
          // la resta sin explicar.
          strike && "text-muted-foreground line-through"
        )}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Los descuentos agrupados por promoción. Dos líneas del mismo 3x2 son UNA
 * fila en la cascada: quien cuadra el ticket cuadra por promoción, no por
 * SKU —el detalle por SKU ya está arriba, en la tabla de productos.
 */
function promotionRows(lineas: SystemLogOrderLine[]) {
  const porCodigo = new Map<
    string,
    { codigo: string; nombre: string; descuento: number }
  >()
  for (const linea of lineas) {
    if (!linea.promocion || linea.descuento <= 0) continue
    const previa = porCodigo.get(linea.promocion.codigo)
    porCodigo.set(linea.promocion.codigo, {
      codigo: linea.promocion.codigo,
      nombre: linea.promocion.nombre,
      descuento: (previa?.descuento ?? 0) + linea.descuento,
    })
  }
  return [...porCodigo.values()]
}

/** Los términos del cupón, cuando dicen algo: «· 20 %», «· US$ 8.000». */
function couponTermsLabel(cupon: SystemLogOrderCoupon): string {
  if (cupon.tipoDescuento === "percentage") {
    return ` · ${formatPercent(cupon.valor / 100)}`
  }
  if (cupon.tipoDescuento === "fixed_amount") {
    return ` · ${formatUSD(cupon.valor)}`
  }
  return ""
}

const ORDER_STATUS_VARIANT: Record<string, "success" | "neutral" | "warning"> =
  {
    completado: "success",
    devuelto: "warning",
    cancelado: "neutral",
  }

/**
 * El detalle completo de una compra o de una devolución, en un modal.
 *
 * El panel plegable de la fila (`OrderLogDetail`) responde «qué se llevó» y
 * nada más, porque vive dentro de una tabla y ahí no hay sitio para más. Las
 * otras cuatro preguntas que llegan al mostrador —quién compró, cuánto pagó
 * de cada cosa, con qué medio, y si esta devolución fue total o parcial—
 * obligaban a saltar a la ficha del socio y volver, cuando estaban.
 *
 * Y una que no estaba en ninguna parte: CON QUÉ se pagó
 * (`20260907180000_pedido_pagos.sql`). Es la que decide un reembolso, porque
 * vuelve por el mismo medio con el que se cobró.
 *
 * En una devolución el modal habla de las dos cosas a la vez, y por eso no
 * se dividió en dos componentes: lo que volvió (las líneas, el importe, el
 * motivo) solo se entiende contra la compra original (su total, sus medios
 * de pago). Un modal de devolución sin la compra al lado es justo el que
 * hace cuadrar mal la caja.
 */
export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: {
  order: SystemLogOrder
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const devolucion = order.devolucion
  const Icon = devolucion ? RotateCcw : ShoppingBag

  const pagado = order.pagos.reduce((sum, pago) => sum + pago.importe, 0)
  /**
   * Lo que de verdad se cobró. `order.total` es el BRUTO a precio de lista
   * —`pedidos.total` no cambió de significado para no mover LTV, ticket
   * promedio ni RFM (ver `20260907190000_pedido_desglose_comercial.sql`)— y
   * lo cobrado se lee restando. En una devolución la resta se hace sobre lo
   * que volvió: es el reembolso.
   */
  const cobrado = order.total - order.descuentoTotal
  const reembolso = devolucion
    ? devolucion.totalDevuelto - order.descuentoTotal
    : 0
  /**
   * El descuadre solo se juzga en una compra. En una devolución los pagos
   * son los de la compra ORIGINAL —el reembolso vuelve por ahí— pero
   * `descuentoTotal` ya es el de lo devuelto, no el de esa compra: restarlos
   * entre sí compararía dos tickets distintos y avisaría de un descuadre que
   * no existe. Ahí los medios se muestran como referencia y nada más.
   */
  const descuadre = !devolucion && order.pagos.length > 0 ? cobrado - pagado : 0
  const parcial =
    !!devolucion && devolucion.totalDevuelto < order.total && order.total > 0

  const descuentoLineas = order.lineas.reduce((sum, l) => sum + l.descuento, 0)
  const hayDescuento = descuentoLineas > 0 || order.cupones.length > 0
  // La tasa solo se nombra cuando es UNA. En una farmacia un mismo ticket
  // mezcla medicamentos (excluidos) con dermocosmética al 19 %, y poner
  // «IVA incluido (19 %)» sobre esa suma sería falso.
  const tasas = new Set(
    order.lineas.filter((l) => l.impuestoTasa > 0).map((l) => l.impuestoTasa)
  )
  const tasaUnica = tasas.size === 1 ? [...tasas][0] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          {/* `pr-8` reserva el hueco del botón de cerrar del `DialogContent`
              (`absolute top-4 right-4`, 32px): sin él el badge de estado se
              mete debajo de la X. Mismo criterio que `EntityPicker`. */}
          <div className="flex items-start gap-2.5 pr-8">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                devolucion ? "bg-warning-bg" : "bg-accent"
              )}
            >
              <Icon
                className={cn(
                  "size-4",
                  devolucion ? "text-warning" : "text-accent-foreground"
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">
                {devolucion
                  ? `Devolución ${devolucion.numero}`
                  : `Compra ${order.numeroPedido}`}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-1.5">
                {order.fecha && <span>{formatDateTime(order.fecha)}</span>}
                <span>·</span>
                {order.tienda && <Store className="size-3 shrink-0" />}
                <span>
                  {order.tienda
                    ? `${order.tienda} · ${salesChannelPlaceLabel(order.canal)}`
                    : salesChannelPlaceLabel(order.canal)}
                </span>
                {devolucion && (
                  <>
                    <span>·</span>
                    <span className="font-mono">
                      sobre {order.numeroPedido}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
            {order.estado && (
              <Badge
                variant={ORDER_STATUS_VARIANT[order.estado] ?? "neutral"}
                className="shrink-0 capitalize"
              >
                {order.estado}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* El scroll va aquí y no en el `DialogContent`: la cabecera se queda
            quieta mientras se recorre una compra de veinte líneas. */}
        <div className="-mr-2 flex max-h-[65vh] scrollbar-thin flex-col gap-4 overflow-y-auto pr-2">
          {/* ── Montos ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {/* Lo cobrado, no el bruto: es la cifra contra la que cuadran los
                medios de pago y la que se reembolsa. El precio de lista y lo
                que lo bajó están abajo, en la cascada. */}
            {/* En una devolución la referencia es el BRUTO de la compra
                original —es contra ese número contra el que se juzga si la
                devolución fue total o parcial—; en una compra, lo cobrado. */}
            <Amount
              label={devolucion ? "Total compra" : "Total cobrado"}
              value={formatUSD(devolucion ? order.total : cobrado)}
            />
            {devolucion && (
              <Amount
                label="Reembolso"
                value={`−${formatUSD(reembolso)}`}
                tone="warning"
              />
            )}
            <Amount
              label={devolucion ? "Piezas devueltas" : "Piezas"}
              value={formatNumber(order.piezas)}
            />
            <Amount
              label="Productos"
              value={formatNumber(order.lineas.length)}
            />
          </div>

          {devolucion && (
            <div className="flex flex-col gap-1.5 rounded-[10px] border border-warning/40 bg-warning-bg/50 px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-[12px] text-secondary-foreground">
                  Motivo:{" "}
                  <span className="font-semibold text-foreground">
                    {RETURN_REASON_LABEL[devolucion.motivo]}
                  </span>
                </span>
                {/* Total o parcial: es lo que decide si el pedido queda
                    cerrado o sigue vivo, y lo que nadie puede deducir de un
                    importe suelto. */}
                <span className="text-[11px] font-medium text-warning">
                  {parcial
                    ? `Devolución parcial · quedan ${formatUSD(order.total - devolucion.totalDevuelto)} de la compra`
                    : "Devolución total"}
                </span>
              </div>
              {devolucion.nota && (
                <p className="text-[11.5px] text-secondary-foreground">
                  «{devolucion.nota}»
                </p>
              )}
            </div>
          )}

          {/* ── Cliente ────────────────────────────────────────────── */}
          {order.socio && (
            <section className="flex flex-col gap-2">
              <h3 className="text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                Cliente
              </h3>
              <div className="grid gap-2.5 rounded-[10px] border border-border px-3 py-2.5 sm:grid-cols-2">
                <Field
                  icon={User}
                  label="Socio"
                  value={order.socio.nombre}
                  href={`/clientes/${order.socio.id}`}
                />
                <Field
                  icon={BadgeCheck}
                  label="Nivel"
                  value={
                    order.socio.nivel
                      ? order.socio.nivel.charAt(0).toUpperCase() +
                        order.socio.nivel.slice(1)
                      : null
                  }
                />
                <Field
                  icon={IdCard}
                  label="Documento"
                  value={order.socio.documento}
                />
                <Field icon={Mail} label="Correo" value={order.socio.email} />
                <Field
                  icon={Phone}
                  label="Teléfono"
                  value={order.socio.telefono}
                />
              </div>
            </section>
          )}

          {/* ── Productos ──────────────────────────────────────────── */}
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                {devolucion ? "Lo que volvió" : "Lo que se llevó"}
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {formatNumber(order.piezas)} pieza
                {order.piezas === 1 ? "" : "s"} en{" "}
                {formatNumber(order.lineas.length)} producto
                {order.lineas.length === 1 ? "" : "s"}
              </span>
            </div>

            {order.lineas.length === 0 ? (
              <p className="rounded-[10px] border border-border px-3 py-2.5 text-[11.5px] text-muted-foreground">
                Sin líneas registradas.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-[10px] border border-border">
                <div className="min-w-[420px]">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-border bg-muted/60 px-3 py-1.5 text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                    <span>Producto</span>
                    <span className="text-right">Precio</span>
                    <span className="text-right">Cant.</span>
                    <span className="text-right">Subtotal</span>
                  </div>
                  {order.lineas.map((linea, index) => (
                    <div
                      key={`${linea.sku ?? "sin-sku"}-${String(index)}`}
                      className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-3 border-b border-border px-3 py-1.5 last:border-b-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] text-foreground">
                          {linea.nombre}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          {linea.sku && (
                            <span className="truncate font-mono text-[9.5px] text-muted-foreground">
                              {linea.sku}
                            </span>
                          )}
                          {/* Qué promoción tocó ESTE SKU y cuánto le quitó.
                              Va pegado al producto y no en una columna: es
                              lo que explica por qué el subtotal de arriba no
                              es lo que se cobró por esta línea. */}
                          {linea.promocion && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-px text-[9px] font-medium text-accent-foreground">
                              <Tag className="size-2.5" />
                              <span className="font-mono">
                                {linea.promocion.codigo}
                              </span>
                              {linea.descuento > 0 && (
                                <span>−{formatUSD(linea.descuento)}</span>
                              )}
                            </span>
                          )}
                          {/* Solo se dice cuando es 0: en una farmacia lo
                              informativo es que el medicamento está
                              EXCLUIDO, no que la crema lleva el 19 % de
                              siempre. */}
                          {linea.impuestoTasa === 0 && (
                            <span className="text-[9px] text-muted-foreground">
                              Excluido de IVA
                            </span>
                          )}
                        </span>
                      </span>
                      {/* El precio unitario es lo que hace comprobable el
                          subtotal sin dividir a mano. */}
                      <span className="text-right text-[11px] text-muted-foreground tabular-nums">
                        {formatUSD(linea.precioUnitario)}
                      </span>
                      <span className="text-right text-[11.5px] text-secondary-foreground tabular-nums">
                        ×{formatNumber(linea.cantidad)}
                      </span>
                      <span className="text-right text-[12px] font-semibold text-foreground tabular-nums">
                        {formatUSD(linea.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Cómo se calculó ────────────────────────────────────── */}
          {/* La aritmética completa, en el orden en que la caja la hace. Sin
              esto el modal muestra un total y pide fe: con la cascada, cada
              resta tiene nombre y se puede comprobar contra el ticket. */}
          {(hayDescuento || order.impuestoTotal > 0) && (
            <section className="flex flex-col gap-2">
              <h3 className="text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                {!hayDescuento
                  ? "Impuestos"
                  : devolucion
                    ? "Cómo se calcula el reembolso"
                    : "Cómo se calculó"}
              </h3>
              <div className="flex flex-col rounded-[10px] border border-border">
                {hayDescuento && (
                  <Line
                    label={
                      devolucion
                        ? "Devuelto a precio de lista"
                        : "Subtotal (lista)"
                    }
                    value={formatUSD(
                      devolucion ? devolucion.totalDevuelto : order.total
                    )}
                  />
                )}

                {/* Una fila por promoción, no una suma: «−US$ 27.400» sin
                    decir cuál lo hizo es el número que nadie puede
                    auditar. */}
                {promotionRows(order.lineas).map((fila) => (
                  <Line
                    key={fila.codigo}
                    icon={Tag}
                    label={fila.nombre}
                    hint={fila.codigo}
                    value={`−${formatUSD(fila.descuento)}`}
                    tone="discount"
                  />
                ))}

                {order.cupones.map((cupon) => (
                  <Line
                    key={cupon.codigo}
                    icon={Ticket}
                    label="Cupón"
                    hint={`${cupon.codigo}${couponTermsLabel(cupon)}`}
                    value={`−${formatUSD(cupon.descuento)}`}
                    tone={devolucion ? "muted" : "discount"}
                    /* En una devolución el cupón se muestra pero NO se resta:
                       descontó sobre el pedido entero y nada dice qué parte
                       tocaba a las líneas que volvieron. */
                    strike={!!devolucion}
                  />
                ))}

                {hayDescuento && (
                  <div className="flex items-center justify-between gap-2 bg-muted/40 px-3 py-2">
                    <span className="text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                      {devolucion ? "Reembolso" : "Total cobrado"}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] font-bold tabular-nums",
                        devolucion ? "text-warning" : "text-foreground"
                      )}
                    >
                      {devolucion
                        ? `−${formatUSD(reembolso)}`
                        : formatUSD(cobrado)}
                    </span>
                  </div>
                )}

                {/* El IVA no suma: ya venía dentro del precio al público. Por
                  eso se dice «incluido» y va debajo del total, no encima. */}
                {order.impuestoTotal > 0 && (
                  <Line
                    icon={Receipt}
                    label="IVA incluido"
                    hint={
                      tasaUnica !== null
                        ? `${formatPercent(tasaUnica)} sobre lo cobrado`
                        : "tasas mixtas en el ticket"
                    }
                    value={formatUSD(order.impuestoTotal)}
                    tone="muted"
                  />
                )}
              </div>
            </section>
          )}

          {/* ── Cómo se pagó ───────────────────────────────────────── */}
          <section className="flex flex-col gap-2">
            <h3 className="text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
              {devolucion ? "Cómo se pagó la compra" : "Cómo se pagó"}
            </h3>

            {order.pagos.length === 0 ? (
              /* Se dice, no se esconde: una sección vacía sin explicación se
                 lee como una pantalla rota. */
              <p className="rounded-[10px] border border-border px-3 py-2.5 text-[11.5px] text-muted-foreground">
                Sin medio de pago registrado para esta compra.
              </p>
            ) : (
              <div className="flex flex-col rounded-[10px] border border-border">
                {order.pagos.map((pago) => {
                  const PagoIcon = PAYMENT_METHOD_ICON[pago.metodo]
                  return (
                    <div
                      key={pago.metodo}
                      className="flex items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0"
                    >
                      <PagoIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-foreground">
                          {PAYMENT_METHOD_LABEL[pago.metodo]}
                        </p>
                        {(pago.referencia !== null || pago.puntos !== null) && (
                          <p className="truncate font-mono text-[9.5px] text-muted-foreground">
                            {pago.referencia ??
                              `${formatNumber(pago.puntos ?? 0)} puntos`}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[12.5px] font-semibold whitespace-nowrap text-foreground tabular-nums">
                        {formatUSD(pago.importe)}
                      </span>
                    </div>
                  )
                })}

                {/* La suma solo aparece cuando hay pago partido: con un solo
                    medio repetiría el total de arriba. */}
                {order.pagos.length > 1 && (
                  <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-1.5">
                    <span className="text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                      Suma de los medios
                    </span>
                    <span className="text-[12px] font-bold text-foreground tabular-nums">
                      {formatUSD(pagado)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* El descuadre se avisa en vez de dejar que el lector reste: es
                el único caso en que estas cifras no se pueden dar por
                buenas. No hay constraint en la base que lo impida a
                propósito (ver la migración) — se ve aquí. */}
            {Math.abs(descuadre) >= 0.01 && (
              <p className="flex items-start gap-1.5 rounded-[10px] border border-destructive/40 bg-destructive-bg/50 px-3 py-2 text-[11px] text-destructive">
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
                Los medios registrados suman {formatUSD(pagado)} y se cobraron{" "}
                {formatUSD(cobrado)}:{" "}
                {descuadre > 0
                  ? `faltan ${formatUSD(descuadre)} por registrar.`
                  : `hay ${formatUSD(Math.abs(descuadre))} de más.`}
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * El disparador del modal, con su propio estado.
 *
 * Vive dentro del panel plegable de la fila (`OrderLogDetail`), no en la
 * fila: en la última columna competía con el chevron y metía un botón con
 * borde en una tabla que no tiene ninguno. Desplegado, el panel ya respondió
 * «qué se llevó» y esto es el paso siguiente —el recibo completo—, así que
 * se lee como continuación y no como una segunda acción de la fila. Misma
 * forma que el «Ver la promoción» de `PromotionLogDetail`.
 *
 * Se lleva el `useState` aquí y no a la tabla del log para que la fila no
 * tenga que saber qué modal existe: `SystemLog` solo decide si hay una
 * compra que mostrar.
 */
export function OrderDetailButton({ order }: { order: SystemLogOrder }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className="flex w-fit items-center gap-1 text-[11px] font-medium text-primary hover:underline"
      >
        Ver el detalle completo
        <ArrowUpRight className="size-3" />
      </button>
      <OrderDetailDialog order={order} open={open} onOpenChange={setOpen} />
    </>
  )
}
