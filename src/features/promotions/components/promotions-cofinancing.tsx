import { formatNumber, formatUSD } from "@/lib/format"

import { SETTLEMENT_PERIOD_LABEL } from "../lib/labels"
import type { CofinancingRow } from "../lib/queries"

/**
 * Lo que hay que cobrarle a cada proveedor. El paso "Economía" del
 * formulario ya capturaba quién paga y en qué porcentaje, pero el panel no
 * consolidaba nada: había que abrir promoción por promoción justo cuando
 * llega el cierre del periodo, que es cuando menos tiempo hay.
 *
 * Dinero y piezas van juntos y separados a la vez, porque se liquidan
 * distinto: un 3x2 se repone en cajas y un descuento compartido se factura
 * en pesos. Consolidar solo el dinero obliga a volver a contar unidades a
 * mano.
 */
export function PromotionsCofinancing({ rows }: { rows: CofinancingRow[] }) {
  const totalProveedor = rows.reduce((a, r) => a + r.aCargoProveedor, 0)
  const totalPiezas = rows.reduce((a, r) => a + r.piezas, 0)

  return (
    <div className="flex h-full w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">
            Cofinanciación por proveedor
          </p>
          <p className="text-xs text-muted-foreground">
            Lo que se liquida con terceros: dinero y piezas
          </p>
        </div>
        {rows.length > 0 && (
          <div className="flex items-baseline gap-3 text-right">
            <div>
              <p className="text-[11px] text-muted-foreground">
                A cargo de terceros
              </p>
              <p className="text-base leading-5 font-semibold text-foreground">
                {formatUSD(totalProveedor)}
              </p>
            </div>
            {totalPiezas > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground">Piezas</p>
                <p className="text-base leading-5 font-semibold text-foreground">
                  {formatNumber(totalPiezas)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        /* Que no haya nada que liquidar es un resultado, no un vacío: dice
           que todo el gasto del filtro lo está poniendo el retailer. */
        <p className="text-[11px] text-muted-foreground">
          Ninguna promoción del filtro actual está cofinanciada — todo el costo
          lo asume el retailer.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted-foreground">
                <th className="py-2 text-left font-medium">Proveedor</th>
                <th className="py-2 text-right font-medium">Inversión</th>
                <th className="py-2 text-right font-medium">
                  A cargo del proveedor
                </th>
                <th className="py-2 text-right font-medium">
                  A cargo del retailer
                </th>
                <th className="py-2 text-right font-medium">Piezas</th>
                <th className="py-2 text-left font-medium">Liquidación</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.proveedorId ?? row.proveedor}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-foreground">
                      {row.proveedor}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.promociones}{" "}
                      {row.promociones === 1 ? "promoción" : "promociones"}
                      {row.contratos.length > 0 &&
                        ` · ${row.contratos.join(", ")}`}
                    </p>
                  </td>
                  <td className="py-2.5 text-right text-foreground">
                    {formatUSD(row.inversionTotal)}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-foreground">
                    {formatUSD(row.aCargoProveedor)}
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {formatUSD(row.aCargoRetailer)}
                  </td>
                  <td className="py-2.5 text-right text-foreground">
                    {row.piezas > 0 ? formatNumber(row.piezas) : "—"}
                  </td>
                  <td className="py-2.5 pl-3 text-muted-foreground">
                    {row.periodos.length > 0
                      ? row.periodos
                          .map((p) => SETTLEMENT_PERIOD_LABEL[p])
                          .join(", ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Las piezas solo cuentan donde hay algo físico que reponer. Sin
          esta nota, un "—" en una fila con dinero parece un dato faltante. */}
      {rows.some((r) => r.piezas > 0) && (
        <p className="text-[11px] text-muted-foreground">
          Las piezas solo se consolidan en promociones de costo de producto o de
          tercero — en un descuento de margen no hay unidad que reponer.
        </p>
      )}
    </div>
  )
}
