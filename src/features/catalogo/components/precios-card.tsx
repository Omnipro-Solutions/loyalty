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

import {
  deltaVsBase,
  estadoVigencia,
  type EstadoVigencia,
} from "../lib/precios"
import type { PrecioProducto } from "../lib/queries"

const ESTADO_LABEL: Record<EstadoVigencia, string> = {
  vigente: "Vigente",
  programada: "Programada",
  finalizada: "Finalizada",
}

const ESTADO_BADGE: Record<EstadoVigencia, string> = {
  vigente: "bg-success-bg text-success",
  programada: "bg-accent text-accent-foreground",
  finalizada: "bg-muted text-muted-foreground",
}

function formatVigencia(precio: PrecioProducto): string {
  const desde = formatDate(precio.vigente_desde)
  return precio.vigente_hasta
    ? `${desde} – ${formatDate(precio.vigente_hasta)}`
    : `Desde ${desde}`
}

type PreciosCardProps = { precios: PrecioProducto[] }

/**
 * Figma "Card · Precios" (1213:4026) — solo para visualizar, sin gestión de
 * listas ni la fila de promoción del mock (depende de Promociones, que no
 * existe todavía).
 */
export function PreciosCard({ precios }: PreciosCardProps) {
  const base = precios.find((p) => p.es_base) ?? precios[0]

  return (
    <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-[20px] bg-background shadow-form-section">
      <div className="flex flex-col gap-0.5 px-6 pt-[22px] pb-4">
        <p className="text-[15px] font-semibold text-foreground">Precios</p>
        <p className="text-xs text-muted-foreground">
          {precios.length}{" "}
          {precios.length === 1 ? "lista configurada" : "listas configuradas"} ·
          moneda COP
        </p>
      </div>
      {precios.length === 0 ? (
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
            {precios.map((precio) => {
              const delta = precio.es_base
                ? null
                : deltaVsBase(precio.precio, base?.precio ?? precio.precio)
              const estado = estadoVigencia(precio)
              return (
                <TableRow key={precio.id}>
                  <TableCell className="font-medium text-foreground">
                    {precio.nombre_lista}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {precio.canal}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {formatCOP(precio.precio)}
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
                    {formatVigencia(precio)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        ESTADO_BADGE[estado]
                      )}
                    >
                      {ESTADO_LABEL[estado]}
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
