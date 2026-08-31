"use client"

import { Braces, ChevronDown, Search } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { Pagination } from "@/components/data/pagination"
import { EmptyState } from "@/components/feedback/empty-state"
import { Segmented } from "@/components/filters/segmented"
import { Badge } from "@/components/ui/badge"
import {
  SYSTEM_LOG_MODULE_LABEL,
  SYSTEM_LOG_MODULES,
  type SystemLogEntry,
  type SystemLogSeverity,
} from "@/config/system-log"
import {
  buildCsvRows,
  downloadCsv,
  pickColumns,
  type CsvColumn,
} from "@/lib/csv"
import { formatDateTime, formatEventDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { ExportCsvButton } from "./export-csv-button"
import { ExportDialog } from "./export-dialog"

const PAGE_SIZE = 20

const GRID =
  "grid-cols-[132px_104px_150px_minmax(0,1.1fr)_minmax(0,1fr)_130px_28px]"

/** El tono del badge sale de la severidad, no del módulo: lo que hay que ver de un vistazo es si algo falló, no de qué tabla salió. */
const SEVERITY_VARIANT: Record<
  SystemLogSeverity,
  "success" | "neutral" | "warning" | "error"
> = {
  exito: "success",
  info: "neutral",
  alerta: "warning",
  error: "error",
}

const MODULE_OPTIONS = [
  { value: "todos", label: "Todos" },
  ...SYSTEM_LOG_MODULES.map((m) => ({
    value: m,
    label: SYSTEM_LOG_MODULE_LABEL[m],
  })),
]

const SEVERITY_LABEL: Record<SystemLogSeverity, string> = {
  exito: "Éxito",
  info: "Info",
  alerta: "Alerta",
  error: "Error",
}

const SYSTEM_LOG_EXPORT_FILENAME = "logs-sistema.csv"

/**
 * Sin Server Action: `entries` ya llegó completa al montar la página (≤300
 * filas, `listSystemEvents`) y el filtro por módulo/búsqueda ya corre en
 * cliente (ver el docblock de `SystemLog`) — exportar es solo tomar el mismo
 * array `filtered` que ya está en memoria y bajarlo a CSV, igual que
 * `AnalyticsExportButton` (`builder/canvas/`).
 */
const SYSTEM_LOG_EXPORT_COLUMNS: CsvColumn<SystemLogEntry>[] = [
  {
    key: "fecha",
    header: "Fecha",
    value: (e) => formatDateTime(e.ocurridoEn),
  },
  {
    key: "modulo",
    header: "Módulo",
    value: (e) => SYSTEM_LOG_MODULE_LABEL[e.modulo],
  },
  { key: "evento", header: "Evento", value: (e) => e.tipoLabel },
  {
    key: "severidad",
    header: "Severidad",
    value: (e) => SEVERITY_LABEL[e.severidad],
  },
  { key: "entidad", header: "Entidad", value: (e) => e.entidad },
  { key: "descripcion", header: "Descripción", value: (e) => e.titulo },
  {
    key: "socio_actor",
    header: "Socio / actor",
    value: (e) => e.socio ?? e.actor,
  },
  { key: "canal", header: "Canal", value: (e) => e.canal ?? "" },
  { key: "motivo", header: "Motivo", value: (e) => e.motivo ?? "" },
  { key: "detalle", header: "Detalle", value: (e) => e.detalle ?? "" },
]

const SYSTEM_LOG_EXPORT_COLUMN_OPTIONS = SYSTEM_LOG_EXPORT_COLUMNS.map((c) => ({
  key: c.key,
  label: c.header,
}))

/** Todas las keys de `SYSTEM_LOG_EXPORT_COLUMNS`, calculada una vez — la
 *  usan el estado inicial, "abrir diálogo" y "seleccionar todas". */
const SYSTEM_LOG_EXPORT_ALL_KEYS = SYSTEM_LOG_EXPORT_COLUMNS.map((c) => c.key)

const SYSTEM_LOG_EXPORT_HINT =
  "Exporta los eventos que coinciden con el módulo y la búsqueda actuales."

function EntryRow({
  entry,
  open,
  onToggle,
}: {
  entry: SystemLogEntry
  open: boolean
  onToggle: () => void
}) {
  const metadata = Object.entries(entry.metadatos)
  const expandable = metadata.length > 0 || !!entry.motivo || !!entry.detalle

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        role={expandable ? "button" : undefined}
        onClick={expandable ? onToggle : undefined}
        className={cn(
          "grid items-center gap-2.5 px-5 py-3 text-xs transition-colors",
          GRID,
          expandable && "cursor-pointer hover:bg-muted/60",
          open && "bg-muted/40"
        )}
      >
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatEventDate(entry.ocurridoEn)}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {SYSTEM_LOG_MODULE_LABEL[entry.modulo]}
        </span>
        <Badge
          variant={SEVERITY_VARIANT[entry.severidad]}
          className="w-fit shrink-0"
        >
          {entry.tipoLabel}
        </Badge>
        <span className="min-w-0 truncate font-medium text-foreground">
          {entry.entidadHref ? (
            <Link
              href={entry.entidadHref}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {entry.entidad}
            </Link>
          ) : (
            entry.entidad
          )}
        </span>
        <span className="min-w-0 truncate text-secondary-foreground">
          {entry.titulo}
        </span>
        <span className="min-w-0 truncate text-[11px] text-muted-foreground">
          {/* El socio manda sobre el actor cuando lo hay: en un evento
              transaccional, "a quién le pasó" es más útil que "quién lo
              ejecutó", que casi siempre es el motor. */}
          {entry.socio ?? entry.actor}
        </span>
        <span className="flex justify-end">
          {expandable && (
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          )}
        </span>
      </div>

      {open && expandable && (
        <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-5 py-3">
          {entry.detalle && (
            <p className="text-[11px] text-secondary-foreground">
              {entry.detalle}
            </p>
          )}
          {entry.motivo && (
            <p className="text-[11px] text-muted-foreground">
              Motivo: {entry.motivo}
            </p>
          )}
          {metadata.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                <Braces className="size-3" />
                Metadatos
              </span>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-4 gap-y-1">
                {metadata.map(([key, value]) => (
                  <span
                    key={key}
                    className="truncate font-mono text-[11px] text-muted-foreground"
                  >
                    {key}:{" "}
                    <span className="text-foreground">{String(value)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * La bitácora de los tres módulos en un solo hilo. El filtro por módulo y
 * la búsqueda son de cliente porque el conjunto ya viene acotado a las
 * últimas N filas: pedir al servidor por cada tecla sería más red para el
 * mismo resultado.
 *
 * Se filtra por módulo y NO por tipo de evento: los tipos son 9 + 19 + 5
 * entre los tres módulos, y una lista de 33 opciones no es un filtro, es
 * otro problema. La búsqueda cubre el caso puntual.
 */
export function SystemLog({ entries }: { entries: SystemLogEntry[] }) {
  const [modulo, setModulo] = useState("todos")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportSelectedKeys, setExportSelectedKeys] = useState<string[]>(
    SYSTEM_LOG_EXPORT_ALL_KEYS
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (modulo !== "todos" && e.modulo !== modulo) return false
      if (!q) return true
      return [e.entidad, e.titulo, e.tipoLabel, e.actor, e.socio, e.detalle]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    })
  }, [entries, modulo, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  function openExportDialog() {
    setExportSelectedKeys(SYSTEM_LOG_EXPORT_ALL_KEYS)
    setExportOpen(true)
  }

  function onConfirmExport() {
    downloadCsv(
      SYSTEM_LOG_EXPORT_FILENAME,
      buildCsvRows(
        pickColumns(SYSTEM_LOG_EXPORT_COLUMNS, exportSelectedKeys),
        filtered
      )
    )
    setExportOpen(false)
  }

  return (
    <div className="flex w-full flex-col rounded-[20px] bg-background shadow-form-section">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Segmented
          options={MODULE_OPTIONS}
          value={modulo}
          onValueChange={(v) => {
            setModulo(v)
            setPage(1)
          }}
        />
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2 sm:max-w-[320px] sm:flex-none">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por entidad, socio o evento…"
              aria-label="Buscar en la bitácora"
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <ExportCsvButton
            variant="compact"
            onExport={openExportDialog}
            hint={SYSTEM_LOG_EXPORT_HINT}
          />
        </div>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Exportar bitácora"
        entity={{ singular: "evento", plural: "eventos" }}
        total={filtered.length}
        totalPending={false}
        columns={SYSTEM_LOG_EXPORT_COLUMN_OPTIONS}
        selectedKeys={exportSelectedKeys}
        onToggleColumn={(key, checked) =>
          setExportSelectedKeys((prev) =>
            checked ? [...prev, key] : prev.filter((k) => k !== key)
          )
        }
        onToggleAll={(checked) =>
          setExportSelectedKeys(checked ? SYSTEM_LOG_EXPORT_ALL_KEYS : [])
        }
        onConfirm={onConfirmExport}
        pending={false}
      />

      {filtered.length === 0 ? (
        <div className="border-t border-border">
          <EmptyState
            icon={Search}
            title="Sin eventos"
            description={
              query
                ? "Ningún evento coincide con la búsqueda."
                : "Este módulo todavía no ha registrado actividad."
            }
          />
        </div>
      ) : (
        <>
          <div
            className={cn(
              "grid gap-2.5 border-y border-border bg-muted/40 px-5 py-2.5 text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase",
              GRID
            )}
          >
            <span>Fecha</span>
            <span>Módulo</span>
            <span>Evento</span>
            <span>Entidad</span>
            <span>Descripción</span>
            <span>Socio / actor</span>
            <span />
          </div>
          {visible.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              open={openId === entry.id}
              onToggle={() => setOpenId(openId === entry.id ? null : entry.id)}
            />
          ))}
          <div className="px-5 py-3.5">
            <Pagination
              total={filtered.length}
              pageSize={PAGE_SIZE}
              page={safePage}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  )
}
