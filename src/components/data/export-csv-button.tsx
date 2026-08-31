"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { Download } from "lucide-react"

import { EXPORT_ROW_CAP } from "@/lib/csv"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Geometría byte-idéntica a los botones "Exportar" que reemplaza (05.1,
 * 06.1, 03.1, 04.1, 11.1) — no usa el primitivo `Button`: su `size="sm"` no
 * es esta geometría. `compact` es la del botón de export de un batch de
 * cupones (`px-3.5 py-2`, sin el `pr-3.5 pl-3` asimétrico).
 */
const buttonVariants = cva(
  "flex items-center gap-[7px] rounded-[10px] border border-border bg-background text-xs font-medium text-secondary-foreground disabled:opacity-50",
  {
    variants: {
      variant: {
        toolbar: "py-[9px] pr-3.5 pl-3",
        compact: "px-3.5 py-2",
      },
    },
    defaultVariants: { variant: "toolbar" },
  }
)

const DEFAULT_HINT = `Exporta el listado filtrado completo · máx. ${formatNumber(EXPORT_ROW_CAP)} filas`

type ExportCsvButtonProps = VariantProps<typeof buttonVariants> & {
  onExport: () => void
  pending?: boolean
  /** @default "Exportar" */
  label?: string
  /** Tooltip nativo — anuncia el tope de filas antes de pulsar. */
  hint?: string
  className?: string
}

/**
 * Botón de export compartido: presentacional puro, no sabe de columnas, de
 * Server Actions ni de CSV. Éxito/error/truncamiento se avisan con un toast
 * (`notifyExportStatus`, `@/components/feedback/export-toast`), disparado
 * por cada `ExportXButton` — este componente no renderiza feedback inline.
 */
export function ExportCsvButton({
  onExport,
  pending,
  label = "Exportar",
  variant,
  hint = DEFAULT_HINT,
  className,
}: ExportCsvButtonProps) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onExport}
      title={hint}
      className={cn(buttonVariants({ variant }), className)}
    >
      <Download className="size-3.5" />
      {pending ? "Exportando…" : label}
    </button>
  )
}
