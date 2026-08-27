"use client"

import { Check, CircleAlert, CircleX, Minus } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"

import {
  IMPORT_STEP_NAMES,
  type ColumnCheck,
  type ColumnCheckStatus,
  type ImportReport,
} from "../lib/promotion-import"

const STATUS_STYLE: Record<
  ColumnCheckStatus,
  { icon: typeof Check; fg: string; bg: string; label: string }
> = {
  ok: {
    icon: Check,
    fg: "text-success",
    bg: "bg-success-bg",
    label: "Cumple",
  },
  vacia: {
    icon: Minus,
    fg: "text-muted-foreground",
    bg: "bg-muted",
    label: "Sin datos",
  },
  ausente: {
    icon: Minus,
    fg: "text-muted-foreground",
    bg: "bg-muted",
    label: "No viene en el archivo",
  },
  error: {
    icon: CircleX,
    fg: "text-destructive",
    bg: "bg-destructive-bg",
    label: "Con errores",
  },
}

/** "4", "4, 7 y 9", "4, 7, 9 y 3 más" — las líneas exactas donde falló la columna. */
function formatRowNumbers(rows: number[]): string {
  const shown = rows.slice(0, 6)
  const rest = rows.length - shown.length
  const list =
    shown.length === 1
      ? String(shown[0])
      : `${shown.slice(0, -1).join(", ")} y ${shown.at(-1)}`
  return rest > 0 ? `${shown.join(", ")} y ${rest} más` : list
}

function CheckRow({ check }: { check: ColumnCheck }) {
  const style = STATUS_STYLE[check.status]
  const Icon = style.icon

  return (
    <div className="flex items-start gap-2 border-b border-border/60 py-1.5 text-xs last:border-0">
      <span
        className={cn(
          "mt-px flex size-4 shrink-0 items-center justify-center rounded-full",
          style.bg
        )}
      >
        <Icon className={cn("size-3", style.fg)} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-mono text-[11px] text-foreground">
          {check.key}
          {check.required && <span className="ml-1 text-destructive">*</span>}
        </span>
        {check.status === "error" && check.errorRows.length > 0 && (
          <span className="text-[11px] leading-4 text-destructive">
            Error en la línea {formatRowNumbers(check.errorRows)}
          </span>
        )}
        {check.status === "error" && check.errorRows.length === 0 && (
          <span className="text-[11px] leading-4 text-destructive">
            Columna obligatoria que el archivo no trae
          </span>
        )}
      </div>
      <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">
        {check.status === "ok"
          ? `${formatNumber(check.filled)} con dato`
          : style.label}
      </span>
    </div>
  )
}

type ImportColumnReportProps = { report: ImportReport }

/**
 * Informe por columna del paso "Validación": qué campos pasaron la
 * evaluación, cuáles vienen vacíos y en qué LÍNEAS falló cada uno. Agrupado
 * por los mismos 6 pasos del formulario de promociones, para poder
 * contrastar el archivo contra el wizard sin traducir nombres.
 *
 * Por defecto solo se despliegan los pasos con algo que corregir: con 96
 * columnas, mostrarlas todas abiertas escondería justo lo que falla.
 */
export function ImportColumnReport({ report }: ImportColumnReportProps) {
  const [openSteps, setOpenSteps] = useState<Set<string>>(
    () =>
      new Set(
        IMPORT_STEP_NAMES.filter((step) =>
          report.checks.some((c) => c.step === step && c.status === "error")
        )
      )
  )

  function toggle(step: string) {
    setOpenSteps((current) => {
      const next = new Set(current)
      if (next.has(step)) next.delete(step)
      else next.add(step)
      return next
    })
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-[12px] font-medium text-foreground">
        Evaluación por campo
      </p>

      {IMPORT_STEP_NAMES.map((step) => {
        // Solo las columnas que el archivo trae, más las obligatorias que
        // falten: listar las 96 del contrato convertiría el informe en ruido.
        const checks = report.checks.filter(
          (c) => c.step === step && (c.mapped || c.status === "error")
        )
        if (checks.length === 0) return null

        const errors = checks.filter((c) => c.status === "error").length
        const ok = checks.filter((c) => c.status === "ok").length
        const open = openSteps.has(step)

        return (
          <div
            key={step}
            className="overflow-hidden rounded-xl border border-border"
          >
            <button
              type="button"
              onClick={() => toggle(step)}
              aria-expanded={open}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left hover:bg-muted/50"
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full",
                  errors > 0 ? "bg-destructive-bg" : "bg-success-bg"
                )}
              >
                {errors > 0 ? (
                  <CircleAlert className="size-3 text-destructive" />
                ) : (
                  <Check className="size-3 text-success" />
                )}
              </span>
              <span className="flex-1 text-xs font-semibold text-foreground">
                {step}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {errors > 0
                  ? `${errors} con error · ${ok} cumplen`
                  : `${ok} de ${checks.length} con dato`}
              </span>
            </button>
            {open && (
              <div className="flex flex-col px-3.5 pb-2">
                {checks.map((check) => (
                  <CheckRow key={check.key} check={check} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {report.generalErrors.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-destructive/40 bg-destructive-bg px-3.5 py-2.5">
          <p className="text-[11px] font-semibold text-destructive">
            Reglas que cruzan varios campos
          </p>
          {report.generalErrors.map((error, index) => (
            <p key={index} className="text-[11px] leading-4 text-destructive">
              Línea {error.rowNumber} · {error.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
