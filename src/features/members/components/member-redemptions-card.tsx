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
import { formatDateTime, formatNumber, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { LedgerEntryWithBalance } from "../lib/queries"

const TYPE_LABEL: Record<string, string> = {
  acumulacion: "Acumulación",
  canje: "Canje",
  expiracion: "Expiración",
  ajuste: "Ajuste",
}

const CHANNEL_LABEL: Record<string, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  app: "App",
}

const PERIODS = [
  { value: "hoy", label: "Hoy", days: 1 },
  { value: "7d", label: "7D", days: 7 },
  { value: "30d", label: "30D", days: 30 },
  { value: "12m", label: "12M", days: 365 },
] as const

type Period = (typeof PERIODS)[number]["value"]

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

type MemberRedemptionsCardProps = { entries: LedgerEntryWithBalance[] }

/** Figma "Card · Log de redenciones" (1125:4623) pixel-perfect, real: extracto de `points_ledger` con saldo acumulado calculado en memoria. */
export function MemberRedemptionsCard({ entries }: MemberRedemptionsCardProps) {
  const [period, setPeriod] = useState<Period>("30d")
  // Capturado una vez (no en cada render): `Date.now()` es impuro y React
  // exige que el cuerpo del componente sea determinista.
  const [now] = useState(() => Date.now())

  const filtered = useMemo(() => {
    const days = PERIODS.find((p) => p.value === period)?.days ?? 30
    const since = now - days * 86_400_000
    return entries.filter((m) => new Date(m.creado_en).getTime() >= since)
  }, [entries, period, now])

  const net = filtered.reduce((acc, m) => acc + m.puntos, 0)

  function exportCsv() {
    const rows = [
      ["Cuándo", "Movimiento", "Canal", "Puntos", "Saldo"]
        .map(csvCell)
        .join(","),
      ...filtered.map((m) =>
        [
          formatDateTime(m.creado_en),
          TYPE_LABEL[m.tipo] ?? m.tipo,
          m.canal ? (CHANNEL_LABEL[m.canal] ?? m.canal) : "",
          String(m.puntos),
          String(m.balanceAfter),
        ]
          .map(csvCell)
          .join(",")
      ),
    ]
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "log-redenciones.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      id="log-de-redenciones"
      className="flex h-full w-full scroll-mt-6 flex-col gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section"
    >
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
              {formatNumber(entries.length)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Movimientos del ledger de puntos
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-lg bg-muted p-[3px]">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[10px] font-medium text-secondary-foreground",
                period === p.value &&
                  "bg-background font-semibold text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="flex shrink-0 items-center gap-1.5 rounded-[9px] border border-border bg-background py-[7px] pr-3 pl-2.5 text-[11px] font-medium text-secondary-foreground"
        >
          <Download className="size-3" />
          Exportar
        </button>
      </div>

      {entries.length === 0 ? (
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Sin movimientos en este período.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="text-[11px] font-medium text-foreground">
                        {formatRelativeTime(m.creado_en)}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {formatDateTime(m.creado_en)}
                      </p>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {m.origen ?? TYPE_LABEL[m.tipo] ?? m.tipo}
                    </TableCell>
                    <TableCell className="text-secondary-foreground">
                      {m.canal ? (CHANNEL_LABEL[m.canal] ?? m.canal) : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        m.puntos >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {m.puntos >= 0 ? "+" : ""}
                      {formatNumber(m.puntos)}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatNumber(m.balanceAfter)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filtered.length > 0 && (
            <div className="flex items-center gap-2.5 bg-muted px-3.5 py-2.5">
              <p className="w-24 text-[11px] font-medium text-secondary-foreground">
                Neto del período
              </p>
              <p
                className={cn(
                  "flex-1 text-xs font-semibold",
                  net >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {net >= 0 ? "+" : ""}
                {formatNumber(net)} pts
              </p>
              <p className="text-right text-[11px] font-semibold text-muted-foreground">
                saldo {formatNumber(filtered[0]?.balanceAfter ?? 0)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
