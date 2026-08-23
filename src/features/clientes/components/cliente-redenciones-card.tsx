"use client"

import { Download, History } from "lucide-react"
import { useMemo, useState } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatFechaHora,
  formatNumero,
  formatTiempoRelativo,
} from "@/lib/format"
import { cn } from "@/lib/utils"

import type { LedgerEntryConSaldo } from "../lib/queries"

const TIPO_LABEL: Record<string, string> = {
  acumulacion: "Acumulación",
  canje: "Canje",
  expiracion: "Expiración",
  ajuste: "Ajuste",
}

const CANAL_LABEL: Record<string, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  app: "App",
}

const PERIODOS = [
  { value: "hoy", etiqueta: "Hoy", dias: 1 },
  { value: "7d", etiqueta: "7D", dias: 7 },
  { value: "30d", etiqueta: "30D", dias: 30 },
  { value: "12m", etiqueta: "12M", dias: 365 },
] as const

type Periodo = (typeof PERIODOS)[number]["value"]

function celdaCsv(valor: string): string {
  return `"${valor.replaceAll('"', '""')}"`
}

type ClienteRedencionesCardProps = { movimientos: LedgerEntryConSaldo[] }

/** Figma "Card · Log de redenciones" (1125:4623) pixel-perfect, real: extracto de `points_ledger` con saldo acumulado calculado en memoria. */
export function ClienteRedencionesCard({
  movimientos,
}: ClienteRedencionesCardProps) {
  const [periodo, setPeriodo] = useState<Periodo>("30d")
  // Capturado una vez (no en cada render): `Date.now()` es impuro y React
  // exige que el cuerpo del componente sea determinista.
  const [ahora] = useState(() => Date.now())

  const filtrados = useMemo(() => {
    const dias = PERIODOS.find((p) => p.value === periodo)?.dias ?? 30
    const desde = ahora - dias * 86_400_000
    return movimientos.filter((m) => new Date(m.creado_en).getTime() >= desde)
  }, [movimientos, periodo, ahora])

  const neto = filtrados.reduce((acc, m) => acc + m.puntos, 0)

  function exportar() {
    const filas = [
      ["Cuándo", "Movimiento", "Canal", "Puntos", "Saldo"]
        .map(celdaCsv)
        .join(","),
      ...filtrados.map((m) =>
        [
          formatFechaHora(m.creado_en),
          TIPO_LABEL[m.tipo] ?? m.tipo,
          m.canal ? (CANAL_LABEL[m.canal] ?? m.canal) : "",
          String(m.puntos),
          String(m.saldoDespues),
        ]
          .map(celdaCsv)
          .join(",")
      ),
    ]
    const blob = new Blob([filas.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = "log-redenciones.csv"
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex items-center gap-2.5">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-avatar-amber-bg">
          <History className="size-3.5 text-avatar-amber-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              Log de redenciones
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumero(movimientos.length)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Movimientos del ledger de puntos
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-lg bg-muted p-[3px]">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriodo(p.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[10px] font-medium text-secondary-foreground",
                periodo === p.value &&
                  "bg-background font-semibold text-foreground"
              )}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportar}
          className="flex shrink-0 items-center gap-1.5 rounded-[9px] border border-border bg-background py-[7px] pr-3 pl-2.5 text-[11px] font-medium text-secondary-foreground"
        >
          <Download className="size-3" />
          Exportar
        </button>
      </div>

      {movimientos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Todavía no hay movimientos de puntos.
        </p>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-[14px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-accent hover:bg-accent">
                <TableHead className="w-20">CUÁNDO</TableHead>
                <TableHead>MOVIMIENTO</TableHead>
                <TableHead className="w-24">CANAL</TableHead>
                <TableHead className="w-16 text-right">PUNTOS</TableHead>
                <TableHead className="w-16 text-right">SALDO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Sin movimientos en este período.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="text-[11px] font-medium text-foreground">
                        {formatTiempoRelativo(m.creado_en)}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {formatFechaHora(m.creado_en)}
                      </p>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {m.origen ?? TIPO_LABEL[m.tipo] ?? m.tipo}
                    </TableCell>
                    <TableCell className="text-secondary-foreground">
                      {m.canal ? (CANAL_LABEL[m.canal] ?? m.canal) : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        m.puntos >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {m.puntos >= 0 ? "+" : ""}
                      {formatNumero(m.puntos)}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatNumero(m.saldoDespues)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filtrados.length > 0 && (
            <div className="flex items-center gap-2.5 bg-muted px-3.5 py-2.5">
              <p className="w-24 text-[11px] font-medium text-secondary-foreground">
                Neto del período
              </p>
              <p
                className={cn(
                  "flex-1 text-xs font-semibold",
                  neto >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {neto >= 0 ? "+" : ""}
                {formatNumero(neto)} pts
              </p>
              <p className="text-right text-[11px] font-semibold text-muted-foreground">
                saldo {formatNumero(filtrados[0]?.saldoDespues ?? 0)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
