import { RotateCcw, ShoppingBag, Store, Tag } from "lucide-react"

import { RETURN_REASON_LABEL } from "@/config/return-reason"
import { salesChannelPlaceLabel } from "@/config/sales-channel"
import type { SystemLogOrder } from "@/config/system-log"
import { formatNumber, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import { OrderDetailButton } from "./order-detail-dialog"

/**
 * El desglose de una compra —o de una devolución— dentro del log.
 *
 * Por qué existe: `pedidos` y `pedido_items` alimentaban las acumulaciones,
 * el comportamiento de compra, el valor comercial y media analítica sin que
 * hubiera UNA pantalla donde se vieran las filas. Un socio al que la ficha
 * le dice "faltan 2 piezas" no tenía forma de saber cuáles ya llevaba, ni
 * cuándo las compró, ni a qué precio.
 *
 * Las líneas van con su cantidad y su importe porque es lo que hace
 * auditable una acumulación: tres cajas del mismo SKU en un pedido son tres
 * piezas del ciclo 3x2, y verlas una por una es lo que explica el número
 * grande de la tarjeta.
 *
 * En una devolución las líneas son lo que VOLVIÓ, y el importe devuelto se
 * muestra contra el total de la compra original: una devolución parcial que
 * se lea como total es justo el error que hace cuadrar mal la caja.
 */
export function OrderLogDetail({ order }: { order: SystemLogOrder }) {
  const devolucion = order.devolucion
  const Icon = devolucion ? RotateCcw : ShoppingBag

  return (
    <div className="flex flex-col gap-2.5 rounded-[13px] border border-border bg-background px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-[8px]",
            devolucion ? "bg-warning-bg" : "bg-accent"
          )}
        >
          <Icon
            className={cn(
              "size-3.5",
              devolucion ? "text-warning" : "text-accent-foreground"
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-foreground">
            {devolucion
              ? `Devolución de ${order.numeroPedido}`
              : `Compra ${order.numeroPedido}`}
          </p>
          <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
            {order.tienda && <Store className="size-2.5 shrink-0" />}
            {order.tienda
              ? `${order.tienda} · ${salesChannelPlaceLabel(order.canal)}`
              : salesChannelPlaceLabel(order.canal)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9.5px] text-muted-foreground">
            {devolucion ? "Devuelto" : "Total"}
          </p>
          <p
            className={cn(
              "text-[12.5px] font-bold whitespace-nowrap",
              devolucion ? "text-warning" : "text-foreground"
            )}
          >
            {devolucion
              ? `−${formatUSD(devolucion.totalDevuelto)}`
              : formatUSD(order.total)}
          </p>
        </div>
      </div>

      {devolucion && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-[9px] bg-muted px-2.5 py-2">
          <span className="text-[11px] text-secondary-foreground">
            Motivo:{" "}
            <span className="font-medium text-foreground">
              {RETURN_REASON_LABEL[devolucion.motivo]}
            </span>
          </span>
          {/* El total de la compra original al lado del importe devuelto: es
              lo único que dice si esta devolución fue total o parcial. */}
          <span className="font-mono text-[10px] text-muted-foreground">
            {devolucion.numero} · compra de {formatUSD(order.total)}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            {devolucion ? "Lo que volvió" : "Lo que se llevó"}
          </span>
          <span className="text-[9.5px] text-muted-foreground">
            {formatNumber(order.piezas)} pieza
            {order.piezas === 1 ? "" : "s"}
          </span>
        </div>
        {order.lineas.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Sin líneas registradas.
          </p>
        ) : (
          <div className="flex flex-col">
            {order.lineas.map((linea, index) => (
              <div
                key={`${linea.sku ?? "sin-sku"}-${String(index)}`}
                className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 border-b border-border py-1 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] text-foreground">
                    {linea.nombre}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-1.5">
                    {linea.sku && (
                      <span className="truncate font-mono text-[9.5px] text-muted-foreground">
                        {linea.sku}
                      </span>
                    )}
                    {/* El código de la promoción y nada más: el importe que
                        quitó vive en el modal. Aquí lo que se busca es ver
                        de un vistazo qué líneas del ticket iban en promo. */}
                    {linea.promocion && (
                      <span className="inline-flex items-center gap-1 truncate font-mono text-[9px] text-accent-foreground">
                        <Tag className="size-2.5 shrink-0" />
                        {linea.promocion.codigo}
                      </span>
                    )}
                  </span>
                </span>
                {/* La cantidad va en su propia columna y en tabular: es la
                    que se cuenta contra el ciclo de la promoción. */}
                <span className="text-[11px] text-secondary-foreground tabular-nums">
                  ×{formatNumber(linea.cantidad)}
                </span>
                <span className="text-[11.5px] font-medium text-foreground tabular-nums">
                  {formatUSD(linea.subtotal)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* La resta, en una sola línea. El panel no puede llevar la cascada
          entera —vive dentro de una tabla— pero sí puede decir por qué el
          total de arriba no es lo que se cobró, que es la pregunta que deja
          abierta un descuento invisible. */}
      {(order.descuentoTotal > 0 || order.impuestoTotal > 0) && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[9px] bg-muted px-2.5 py-1.5 text-[10px] text-muted-foreground">
          {order.descuentoTotal > 0 && (
            <span>
              Descuentos{" "}
              <span className="font-medium text-success tabular-nums">
                −{formatUSD(order.descuentoTotal)}
              </span>
            </span>
          )}
          {order.cupones.length > 0 && (
            <span className="truncate font-mono">
              {order.cupones.map((c) => c.codigo).join(" · ")}
            </span>
          )}
          {order.impuestoTotal > 0 && (
            <span>
              IVA incl.{" "}
              <span className="tabular-nums">
                {formatUSD(order.impuestoTotal)}
              </span>
            </span>
          )}
          <span className="ml-auto">
            {devolucion ? "Reembolso" : "Cobrado"}{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatUSD(
                devolucion
                  ? devolucion.totalDevuelto - order.descuentoTotal
                  : order.total - order.descuentoTotal
              )}
            </span>
          </span>
        </div>
      )}

      {/* El cierre del panel: el desglose ya respondió «qué se llevó», y lo
          que queda —cliente, medios de pago, impuestos, cupones— es el
          recibo completo, que no cabe dentro de una tabla. Misma forma que
          el «Ver la promoción» de `PromotionLogDetail`. */}
      <OrderDetailButton order={order} />
    </div>
  )
}
