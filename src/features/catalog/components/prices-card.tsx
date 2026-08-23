import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCOP, formatDate, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import { deltaVsBase, validityStatus, type ValidityStatus } from "../lib/prices"
import type { ProductPrice } from "../lib/queries"

const STATUS_LABEL: Record<ValidityStatus, string> = {
  vigente: "Vigente",
  programada: "Programada",
  finalizada: "Finalizada",
}

const STATUS_BADGE: Record<ValidityStatus, string> = {
  vigente: "bg-success-bg text-success",
  programada: "bg-accent text-accent-foreground",
  finalizada: "bg-muted text-muted-foreground",
}

function formatValidity(price: ProductPrice): string {
  const from = formatDate(price.vigente_desde)
  return price.vigente_hasta
    ? `${from} – ${formatDate(price.vigente_hasta)}`
    : `Desde ${from}`
}

type PricesCardProps = { prices: ProductPrice[] }

/**
 * Figma "Card · Precios" (1213:4026) — solo para visualizar, sin gestión de
 * listas ni la fila de promoción del mock (depende de Promociones, que no
 * existe todavía).
 */
export function PricesCard({ prices }: PricesCardProps) {
  const base = prices.find((p) => p.es_base) ?? prices[0]

  return (
    <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-[20px] bg-background shadow-form-section">
      <div className="flex flex-col gap-0.5 px-6 pt-[22px] pb-4">
        <p className="text-[15px] font-semibold text-foreground">Precios</p>
        <p className="text-xs text-muted-foreground">
          {prices.length}{" "}
          {prices.length === 1 ? "lista configurada" : "listas configuradas"} ·
          moneda COP
        </p>
      </div>
      {prices.length === 0 ? (
        <p className="px-6 pb-6 text-xs text-muted-foreground">
          Sin precios configurados todavía.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>LISTA DE PRECIO</TableHead>
              <TableHead>CANAL</TableHead>
              <TableHead>PRECIO</TableHead>
              <TableHead>Δ VS BASE</TableHead>
              <TableHead>VIGENCIA</TableHead>
              <TableHead>ESTADO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((price) => {
              const delta = price.es_base
                ? null
                : deltaVsBase(price.precio, base?.precio ?? price.precio)
              const status = validityStatus(price)
              return (
                <TableRow key={price.id}>
                  <TableCell className="font-medium text-foreground">
                    {price.nombre_lista}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {price.canal}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {formatCOP(price.precio)}
                  </TableCell>
                  <TableCell>
                    {delta === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={cn(
                          delta < 0
                            ? "text-success"
                            : delta > 0
                              ? "text-warning"
                              : "text-muted-foreground"
                        )}
                      >
                        {delta > 0 ? "+" : ""}
                        {formatPercent(delta)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {formatValidity(price)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        STATUS_BADGE[status]
                      )}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
