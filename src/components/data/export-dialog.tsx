"use client"

import type { ReactNode } from "react"
import { Download, Loader2, TriangleAlert } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

export type ExportColumnOption = { key: string; label: string }

type ExportBannerState = "error" | "pending" | "empty" | "ready"

const BANNER_TONE_CLASSES: Record<ExportBannerState, string> = {
  error: "bg-destructive-bg text-destructive",
  pending: "bg-muted text-muted-foreground",
  empty: "bg-muted text-muted-foreground",
  ready: "bg-accent text-accent-foreground",
}

type ExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Para pluralizar el banner y el botón — `{singular:"cliente", plural:"clientes"}`. */
  entity: { singular: string; plural: string }
  /** `null` mientras `totalPending` o si `totalError`. */
  total: number | null
  totalPending: boolean
  totalError?: string
  columns: readonly ExportColumnOption[]
  selectedKeys: readonly string[]
  onToggleColumn: (key: string, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  onConfirm: () => void
  pending: boolean
}

/**
 * Diálogo de revisión previa a exportar (05.1/06.1/… "Exportar"): antes de
 * descargar, muestra cuántas filas matchean los filtros actuales y deja
 * elegir qué columnas incluir. Presentacional puro — cada `ExportXButton`
 * dueña el estado (columnas seleccionadas, resultado del preview) y decide
 * cuándo pedir el conteo (al abrir) y cuándo ejecutar el export real (al
 * confirmar).
 */
export function ExportDialog({
  open,
  onOpenChange,
  title,
  entity,
  total,
  totalPending,
  totalError,
  columns,
  selectedKeys,
  onToggleColumn,
  onToggleAll,
  onConfirm,
  pending,
}: ExportDialogProps) {
  const allSelected = selectedKeys.length === columns.length
  const selectedCount = new Set(selectedKeys).size
  const isEmpty = total === 0

  const state: ExportBannerState = totalError
    ? "error"
    : totalPending
      ? "pending"
      : isEmpty
        ? "empty"
        : "ready"

  let icon: ReactNode
  let text: ReactNode
  switch (state) {
    case "error":
      icon = <TriangleAlert className="size-4 shrink-0" />
      text = totalError
      break
    case "pending":
      icon = <Loader2 className="size-4 shrink-0 animate-spin" />
      text = "Calculando cuántas filas coinciden con los filtros…"
      break
    case "empty":
      icon = <Download className="size-4 shrink-0" />
      text = <>No hay {entity.plural} que coincidan con estos filtros.</>
      break
    case "ready":
      icon = <Download className="size-4 shrink-0" />
      text = (
        <>
          Vas a exportar{" "}
          <span className="font-semibold">
            {formatNumber(total ?? 0)}{" "}
            {total === 1 ? entity.singular : entity.plural}
          </span>
          .
        </>
      )
      break
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Elige qué columnas incluir en el archivo.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3.5 py-2.5",
            BANNER_TONE_CLASSES[state]
          )}
        >
          {icon}
          <p className="text-[13px] leading-[18px]">{text}</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Columnas a incluir
            </span>
            <span className="text-[11px] text-muted-foreground">
              {selectedCount}/{columns.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <label className="flex items-center gap-2.5 border-b border-border bg-muted/40 px-3 py-2.5">
              <Checkbox
                checked={allSelected}
                indeterminate={!allSelected && selectedCount > 0}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
              />
              <span className="text-[13px] leading-[18px] font-semibold text-foreground">
                Todas las columnas
              </span>
            </label>
            <div className="flex max-h-52 scrollbar-thin flex-col gap-0.5 overflow-y-auto p-1.5">
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center gap-2.5 rounded-md px-1.5 py-[7px] transition-colors hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedKeys.includes(column.key)}
                    onCheckedChange={(checked) =>
                      onToggleColumn(column.key, checked === true)
                    }
                  />
                  <span className="text-[13px] leading-[18px] text-secondary-foreground">
                    {column.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending || state !== "ready" || selectedCount === 0}
            onClick={onConfirm}
          >
            {pending
              ? "Exportando…"
              : total !== null && !totalError
                ? `Exportar ${formatNumber(total)}`
                : "Exportar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
