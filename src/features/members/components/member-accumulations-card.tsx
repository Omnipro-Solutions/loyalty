import { Check, ChevronRight, Package } from "lucide-react"
import Link from "next/link"

import { RETURN_REASON_LABEL } from "@/config/return-reason"
import { formatNumber, formatShortDate, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import { ACCUMULATION_STATUS_LABEL as STATUS_LABEL } from "../lib/accumulation-labels"
import { SALES_CHANNEL_LABEL } from "../lib/labels"
import type {
  AccumulationMovement,
  AccumulationStatus,
  MemberAccumulationRow,
} from "../lib/queries"
import type { ReturnReason, SalesChannel } from "@/types/domain"

/**
 * El tono de cada estado. El copy vive en `accumulation-labels.ts`,
 * compartido con la tabla y el CSV.
 *
 * Acumular no es un estado semántico: es el avance de la marca, así que va
 * en la gama del acento y no en verde. El verde queda para lo que de verdad
 * codifica "salió bien" en el resto del portal, y aquí lo único que hace
 * falta distinguir es qué exige actuar —`por_reclamar`, con el acento
 * sólido, la única superficie saturada de la tarjeta— de lo que solo avanza
 * (`en_curso`, lavado de acento) y de lo que ya cerró (neutro). Los dos
 * semánticos que se quedan son los que no hablan de avance sino de riesgo:
 * la vigencia que se acaba y el presupuesto que no da.
 */
const STATUS_CLASS: Record<AccumulationStatus, string> = {
  por_reclamar: "bg-primary text-primary-foreground",
  por_vencer: "bg-warning-bg text-warning",
  en_curso: "bg-accent text-accent-foreground",
  completada: "bg-muted text-secondary-foreground",
  vencida: "bg-muted text-muted-foreground",
  interrumpida: "bg-muted text-muted-foreground",
  sin_presupuesto: "bg-destructive-bg text-destructive",
}

/**
 * Valor que ya no va a llegar. Se atenúan para no confundirse con una
 * acumulación viva. `completada` NO está aquí: cerró bien, y pintarla como
 * pérdida sería el mismo error que llamarla "vencida".
 */
const LOST: readonly AccumulationStatus[] = [
  "vencida",
  "interrumpida",
  "sin_presupuesto",
]

/**
 * Anillo de avance del ciclo. Es la pieza que hace legible la tarjeta de un
 * vistazo: el número grande es lo que FALTA, no lo que se lleva — porque la
 * pregunta del socio siempre es «¿cuánto me falta?».
 */
function ProgressRing({
  done,
  total,
  status,
}: {
  done: number
  total: number
  status: AccumulationStatus
}) {
  const size = 58
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // Un ciclo cumplido se pinta lleno aunque `done` sea 0: en `por_reclamar` y
  // `completada` el logro ya ocurrió, y un anillo vacío ahí diría lo
  // contrario de lo que pasó.
  const achieved = status === "por_reclamar" || status === "completada"
  const pct = achieved ? 1 : total > 0 ? done / total : 0
  const missing = Math.max(0, total - done)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="stroke-primary"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center leading-none">
        {achieved ? (
          <>
            <Check className="size-4 text-primary" />
            <span className="mt-0.5 text-[7px] font-semibold tracking-[0.02em] text-muted-foreground uppercase">
              {status === "por_reclamar" ? "lista" : "usada"}
            </span>
          </>
        ) : (
          <>
            <span className="text-[8px] font-medium text-muted-foreground">
              {missing === 1 ? "Falta" : "Faltan"}
            </span>
            <span className="text-[17px] font-bold text-foreground">
              {missing}
            </span>
            <span className="text-[7px] font-semibold tracking-[0.02em] text-primary uppercase">
              gratis
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * "Proceso": una pieza por nodo, con lo pagado debajo. Las que faltan van en
 * $0.00 y hueco — igual que en la cuenta del cliente final, donde el importe
 * en blanco es justo la señal de "esta todavía no la compraste".
 *
 * A la derecha, cuántas piezas DEL CICLO QUE SE PINTA están pagadas: es la
 * leyenda de los nodos de al lado, que si no hay que contar a ojo. Antes
 * decía «Lleva N · $X» —las piezas y el gasto de todos los ciclos— y eso
 * ahora vive rotulado en `CycleLedger` ("Lo logrado"): tenerlo en los dos
 * sitios era la duplicación que dejaba media tarjeta diciendo lo mismo dos
 * veces mientras el resto quedaba en blanco.
 */
function ProcessTrack({ payments }: { payments: number[] }) {
  const paid = payments.filter((amount) => amount > 0).length

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold text-secondary-foreground">
          Proceso
        </p>
        <p className="text-[10px] whitespace-nowrap text-muted-foreground">
          <span className="font-semibold text-foreground">
            {formatNumber(paid)} de {formatNumber(payments.length)}
          </span>{" "}
          del ciclo
        </p>
      </div>
      <div className="flex items-start">
        {payments.map((amount, index) => {
          const paid = amount > 0
          return (
            <div
              key={index}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    index === 0
                      ? "bg-transparent"
                      : paid
                        ? "bg-primary"
                        : "bg-muted"
                  )}
                />
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                    paid
                      ? "border-primary bg-primary"
                      : "border-border-strong bg-background"
                  )}
                >
                  {paid && <Check className="size-2 text-primary-foreground" />}
                </span>
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    index === payments.length - 1
                      ? "bg-transparent"
                      : payments[index + 1]! > 0
                        ? "bg-primary"
                        : "bg-muted"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[9.5px] tabular-nums",
                  paid ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {formatUSD(amount)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * De dónde salieron las piezas: las compras que las trajeron y las
 * devoluciones que las quitaron.
 *
 * Va plegado porque la respuesta corta —cuántas lleva— ya está arriba, y
 * porque la tarjeta vive en una rejilla de tres columnas. Se despliega
 * cuando la pregunta es la siguiente: «¿cuándo las compró?», «¿por qué bajó
 * de tres a dos?». Es un `<details>` nativo a propósito: no hace falta
 * estado ni convertir la tarjeta en Client Component para abrir una lista.
 *
 * El resumen dice SOLO el conteo. La primera versión añadía «afectada por
 * una devolución» y con eso se partía en dos líneas dentro de una tarjeta de
 * 300px — y encima repetía lo que la cabecera ya dice con «1 devuelta». El
 * punto ámbar de la fila es el que avisa, sin gastar una línea.
 *
 * Cada movimiento va en dos renglones (referencia arriba, fecha y canal
 * debajo) con las cifras a la derecha en `tabular-nums`: a este ancho, una
 * sola línea con referencia + fecha + canal + piezas + importe no cabe sin
 * romperse por donde no toca.
 */
function MovementsDetail({ movements }: { movements: AccumulationMovement[] }) {
  const compras = movements.filter((m) => m.tipo === "compra").length
  const devoluciones = movements.length - compras

  return (
    <details className="group">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md text-[10px] whitespace-nowrap text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3 shrink-0 transition-transform group-open:rotate-90" />
        {formatNumber(compras)} compra{compras === 1 ? "" : "s"}
        {devoluciones > 0 && (
          <span className="text-warning">
            · {formatNumber(devoluciones)} devolución
            {devoluciones === 1 ? "" : "es"}
          </span>
        )}
      </summary>

      <div className="mt-1.5 flex flex-col gap-1.5">
        {movements.map((movement, index) => {
          const devolucion = movement.tipo === "devolucion"
          const detalle = devolucion
            ? (RETURN_REASON_LABEL[movement.motivo as ReturnReason] ??
              movement.motivo)
            : movement.canal
              ? (SALES_CHANNEL_LABEL[movement.canal as SalesChannel] ??
                movement.canal)
              : null

          return (
            <div
              key={`${movement.referencia}-${String(index)}`}
              className="grid grid-cols-[6px_1fr_auto] items-start gap-x-2"
            >
              {/* El punto es lo que distingue de un vistazo lo que sumó de
                  lo que restó, sin repetirlo en palabras. */}
              <span
                className={cn(
                  "mt-[5px] size-1.5 rounded-full",
                  devolucion ? "bg-warning" : "bg-primary"
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="truncate font-mono text-[10px] leading-[13px] text-secondary-foreground">
                  {movement.referencia}
                </p>
                <p className="truncate text-[9.5px] leading-[12px] text-muted-foreground">
                  {formatShortDate(movement.fecha)}
                  {detalle ? ` · ${detalle}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-[10px] leading-[13px] font-semibold tabular-nums",
                    devolucion ? "text-warning" : "text-foreground"
                  )}
                >
                  {devolucion ? "−" : "+"}
                  {formatNumber(movement.piezas)} pza
                  {movement.piezas === 1 ? "" : "s"}
                </p>
                <p className="text-[9.5px] leading-[12px] whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatUSD(movement.importe)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </details>
  )
}

/** «1 pieza» / «3 piezas». Se repite en casi todas las celdas del ledger. */
function pieces(count: number): string {
  return `${formatNumber(count)} pieza${count === 1 ? "" : "s"}`
}

/**
 * La vigencia, dicha como fecha y no como cuenta atrás suelta: «hasta el 30
 * sep» es lo que se puede repetir al socio por teléfono. Los días se añaden
 * solo cuando quedan pocos, que es cuando el número importa más que la fecha.
 */
function deadlineLabel(row: MemberAccumulationRow): string {
  if (!row.vigenteHasta) return "Sin fecha límite"
  const fecha = formatShortDate(row.vigenteHasta)
  const dias = row.diasRestantes
  if (dias !== null && dias < 0) return `Venció el ${fecha}`
  return dias !== null && dias <= 30
    ? `Hasta el ${fecha} · ${formatNumber(dias)} d`
    : `Hasta el ${fecha}`
}

/**
 * "La promoción · Lo logrado · Lo que falta": la mecánica original, lo que el
 * socio ya puso, y lo que le queda por poner. Las tres a la misma altura y en
 * el mismo formato porque la pregunta del mostrador es una comparación —«¿de
 * qué era esta promo, cuánto lleva, cuánto le falta?»— y hasta ahora había
 * que reconstruirla juntando el anillo, los nodos del proceso y un pie que
 * gastaba media tarjeta para decir «Sigue acumulando», que no es un dato.
 *
 * Reemplaza a ese pie: nada de lo que decía se perdió —las piezas sin
 * reclamar y el ahorro son ahora "Lo que falta" y "Lo logrado"—, y encima
 * cabe el precio de la pieza, el nombre de la promoción (que la tarjeta no
 * mostraba en ningún lado cuando el producto tiene SKU) y lo que cuesta
 * cerrar el ciclo.
 *
 * Dos formas según el ancho, sin tocar el contenido: rótulo encima del valor
 * cuando es una banda horizontal, y rótulo a la izquierda / valor a la
 * derecha cuando es la columna de la derecha de la ficha — a ~300px, tres
 * celdas en fila no caben sin partir las cifras.
 */
function CycleLedger({
  row,
  lost,
}: {
  row: MemberAccumulationRow
  /** Ciclo que ya no va a avanzar: preguntar «cuánto falta» deja de tener sentido. */
  lost: boolean
}) {
  const earned = [
    row.piezasGratis > 0
      ? `${pieces(row.piezasGratis)} gratis · +${formatUSD(row.ahorro)}`
      : null,
    row.unidadesDevueltas > 0
      ? `${formatNumber(row.unidadesDevueltas)} devuelta${row.unidadesDevueltas === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean)

  const cells: {
    label: string
    value: string
    sub: string | null
    sub2: string | null
    tone?: "primary" | "muted"
  }[] = [
    {
      label: "La promoción",
      // `3x2`, no «lleva 3 paga 2»: es como se anuncia en la tienda y como lo
      // nombra quien atiende.
      value: `${formatNumber(row.compraCantidad)}x${formatNumber(row.pagaCantidad)}`,
      sub: `${pieces(row.piezasGratisPorCiclo)} gratis · ${formatUSD(row.precio)} c/u`,
      // El nombre de la promoción solo cuando hay SKU: sin él la ficha ya
      // se identifica por la promoción arriba (`row.sku ?? promocionCodigo`)
      // y `row.nombre` ES este mismo nombre — repetirlo dos veces en la
      // misma tarjeta gastaría la línea sin decir nada nuevo.
      sub2: row.sku ? row.promocionNombre : null,
    },
    {
      label: "Lo logrado",
      value: pieces(row.unidadesCompradas),
      sub: `${formatUSD(row.gastoAcumulado)} en compras`,
      sub2: earned.length > 0 ? earned.join(" · ") : "Sin pieza gratis todavía",
    },
    lost
      ? {
          label: "Lo que falta",
          value: "—",
          sub: "El ciclo ya no avanza",
          sub2: deadlineLabel(row),
          tone: "muted" as const,
        }
      : row.faltan > 0
        ? {
            label: "Lo que falta",
            value: pieces(row.faltan),
            // Lo que cuesta cerrarlo, al precio de referencia del producto: es
            // la cifra que convierte «te faltan 2» en una recomendación.
            sub: `≈ ${formatUSD(row.faltan * row.precio)} para la pieza gratis`,
            sub2: deadlineLabel(row),
          }
        : {
            label: "Lo que falta",
            // `faltan === 0` solo pasa con el ciclo cumplido y sin canjear
            // (ver `faltan` en `queries.ts`), así que aquí no falta nada:
            // falta que alguien la entregue.
            value: "Nada",
            sub: `${pieces(row.piezasPorReclamar)} list${row.piezasPorReclamar === 1 ? "a" : "as"} para entregar`,
            sub2: deadlineLabel(row),
            tone: "primary" as const,
          },
  ]

  return (
    <dl className="grid gap-x-5 gap-y-1.5 @2xl:grid-cols-3 @5xl:grid-cols-1 @5xl:gap-y-2">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="flex min-w-0 items-baseline justify-between gap-2 @2xl:flex-col @2xl:items-start @2xl:justify-start @2xl:gap-0.5 @5xl:flex-row @5xl:items-baseline @5xl:justify-between @5xl:gap-2"
        >
          <dt className="text-[9px] font-semibold tracking-[0.04em] whitespace-nowrap text-muted-foreground uppercase">
            {cell.label}
          </dt>
          <dd className="min-w-0 text-right @2xl:text-left @5xl:text-right">
            <p
              className={cn(
                "text-[11.5px] leading-[15px] font-semibold tabular-nums",
                cell.tone === "primary"
                  ? "text-primary"
                  : cell.tone === "muted"
                    ? "text-muted-foreground"
                    : "text-foreground"
              )}
            >
              {cell.value}
            </p>
            {cell.sub && (
              <p className="truncate text-[9.5px] leading-[13px] text-secondary-foreground tabular-nums">
                {cell.sub}
              </p>
            )}
            {cell.sub2 && (
              <p className="truncate text-[9.5px] leading-[13px] text-muted-foreground">
                {cell.sub2}
              </p>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * "Acumulaciones" — el avance del socio hacia la pieza gratis, SKU por SKU.
 * Réplica de lo que el cliente final ve en su cuenta (Benavides
 * "Acumulaciones"), aquí para que quien atiende pueda responder «¿cuánto me
 * falta?» sin hacer la cuenta.
 *
 * Solo cubre la mecánica `por_piezas` ("Pieza Gratis": 3x2, 2x1…). Las otras
 * del programa —10 % los lunes, 2do al 50 %, puntos— no acumulan hacia nada:
 * se aplican o no en el momento de la compra, y no tienen un "te falta" que
 * mostrar.
 */
export function MemberAccumulationsCard({
  accumulations,
  memberId,
}: {
  accumulations: MemberAccumulationRow[]
  /** Para enlazar a las compras que sostienen estos números. */
  memberId: string
}) {
  const ahorroTotal = accumulations.reduce((sum, a) => sum + a.ahorro, 0)
  // Lo que hay que decirle a esta persona si la tienes delante.
  const porReclamar = accumulations.reduce(
    (sum, a) => sum + a.piezasPorReclamar,
    0
  )

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex items-center gap-2.5">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-avatar-teal-bg">
          <Package className="size-3.5 text-avatar-teal-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              Acumulaciones
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {accumulations.length}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {porReclamar > 0
              ? `${porReclamar} pieza${porReclamar === 1 ? "" : "s"} ganada${porReclamar === 1 ? "" : "s"} sin reclamar`
              : "Avance hacia la pieza gratis, producto por producto"}
          </p>
        </div>
        {/* De dónde salen estas piezas. Era lo que no se podía ver en
            ninguna pantalla: los pedidos alimentan la acumulación y el socio
            —o quien lo atiende— no tenía forma de comprobar cuáles ya
            contaban ni cuándo se compraron. */}
        <Link
          href={`/ajustes/logs-sistema?socio=${memberId}&modulo=compras`}
          className="shrink-0 text-[10px] font-medium whitespace-nowrap text-primary hover:underline"
        >
          Ver sus compras
        </Link>
        {ahorroTotal > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-[9px] text-muted-foreground">Ahorro ganado</p>
            <p className="text-[13px] font-bold text-primary">
              +{formatUSD(ahorroTotal)}
            </p>
          </div>
        )}
      </div>

      {accumulations.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Este socio no ha empezado a acumular en ninguna promoción de pieza
          gratis.
        </p>
      ) : (
        // `auto-fit` en vez de un número fijo de columnas: con tres columnas
        // fijas, una sola acumulación se quedaba en un tercio del ancho y los
        // otros dos tercios en blanco. `auto-fit` colapsa las pistas vacías,
        // así que 1 ficha ocupa la fila entera, 2 la mitad cada una y 3+
        // vuelven a tercios, sin condicionar clases al `length`.
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-2.5">
          {accumulations.map((row) => {
            const lost = LOST.includes(row.estado)
            return (
              <div
                key={`${row.promocionId}-${row.productoId ?? "categoria"}`}
                className={cn(
                  // `@container`, no un breakpoint de viewport: esta misma
                  // ficha convive a un tercio de la rejilla y a fila completa
                  // (ver `auto-fit` arriba), y el ancho del viewport no
                  // distingue esos dos casos — el suyo sí.
                  "@container grid gap-x-5 gap-y-2.5 rounded-[13px] border px-3 py-2.5",
                  // Tres etapas, cada hijo colocado explícitamente para que
                  // el orden apilado no dependa de dónde caiga en la rejilla:
                  //
                  // · Angosta: una columna, todo apilado.
                  // · ≥42rem: identidad · proceso arriba, y la comparación
                  //   como banda horizontal de tres celdas debajo.
                  // · ≥64rem: la comparación sube a tercera columna y ocupa
                  //   el hueco donde antes solo había dos frases sueltas.
                  //
                  // Los movimientos se quedan SIEMPRE en su propia fila al
                  // final: desplegados necesitan el ancho entero, no una
                  // columna.
                  "@2xl:grid-cols-[minmax(260px,1fr)_minmax(0,1.6fr)] @2xl:items-center",
                  "@5xl:grid-cols-[minmax(260px,1fr)_minmax(0,1.5fr)_minmax(300px,1.15fr)]",
                  row.estado === "por_reclamar"
                    ? "border-primary/40 bg-accent/50"
                    : "border-border",
                  lost && "opacity-70"
                )}
              >
                <div className="flex items-start gap-2.5 @2xl:col-start-1 @2xl:row-start-1">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-muted">
                    {row.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.imagenUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Package className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-foreground">
                      {row.nombre}
                    </p>
                    {row.presentacion && (
                      <p className="line-clamp-2 text-[9.5px] leading-[13px] text-muted-foreground">
                        {row.presentacion}
                      </p>
                    )}
                    {/* Sin SKU cuando el ciclo mezcla toda una categoría: ahí
                      lo que identifica la acumulación es la promoción. */}
                    <p className="truncate font-mono text-[9px] text-muted-foreground">
                      {row.sku ?? row.promocionCodigo}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-medium",
                        STATUS_CLASS[row.estado]
                      )}
                    >
                      {STATUS_LABEL[row.estado]}
                      {row.estado === "por_vencer" && row.diasRestantes !== null
                        ? ` · ${row.diasRestantes} d`
                        : ""}
                    </span>
                  </div>
                  <ProgressRing
                    done={row.unidadesEnCiclo}
                    total={row.compraCantidad}
                    status={row.estado}
                  />
                </div>

                <div className="min-w-0 @2xl:col-start-2 @2xl:row-start-1">
                  <ProcessTrack payments={row.pagosEnCiclo} />
                </div>

                {/* El filete separa la comparación de lo de arriba: horizontal
                    cuando es banda (queda debajo del proceso) y vertical
                    cuando es columna, igual que hacía el pie que reemplaza. */}
                <div className="border-t border-border pt-2 @2xl:col-span-2 @2xl:col-start-1 @2xl:row-start-2 @5xl:col-span-1 @5xl:col-start-3 @5xl:row-start-1 @5xl:border-t-0 @5xl:border-l @5xl:pt-0 @5xl:pl-4">
                  <CycleLedger row={row} lost={lost} />
                </div>

                {row.movimientos.length > 0 && (
                  <div className="@2xl:col-span-2 @2xl:col-start-1 @2xl:row-start-3 @5xl:col-span-3 @5xl:row-start-2">
                    <MovementsDetail movements={row.movimientos} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
