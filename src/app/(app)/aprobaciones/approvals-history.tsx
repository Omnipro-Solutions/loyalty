"use client"

import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  APPROVAL_STATUS_LABEL,
  DECISION_REASON_LABEL,
} from "@/lib/approval-flow"
import {
  formatDateTime,
  formatEventDate,
  formatRelativeTime,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ApprovalStatus, DecisionReason } from "@/types/domain"

import { DOMAIN_LABEL, type ApprovalDomain } from "./approvals-inbox"

export type HistoryRow = {
  domain: ApprovalDomain
  id: string
  title: string
  subtitle: string
  href: string
  status: ApprovalStatus
  /** Quién pidió la firma, cuándo, y con qué motivo. */
  requestedByName: string
  requestedAt: string
  requestReasonLabel: string | null
  requestNote: string | null
  /** Quién la decidió, cuándo, y con qué motivo. */
  decidedByName: string | null
  decidedAt: string | null
  decisionReason: DecisionReason | null
  decisionNote: string | null
  /**
   * La firmó quien la pidió (`approver_id = requested_by`). Es la huella que
   * deja una autoaprobación, y el historial es el único sitio donde alguien
   * la va a buscar: sin decirlo, una fila firmada por una sola persona se lee
   * igual que una firmada por dos.
   */
  selfApproved: boolean
}

/**
 * El tono sale del desenlace, igual que en la bitácora del sistema el tono
 * sale de la severidad y no del módulo: lo que hay que ver de un vistazo es
 * qué pasó con la solicitud.
 */
const STATUS_VARIANT: Record<
  ApprovalStatus,
  "success" | "neutral" | "warning" | "error"
> = {
  approved: "success",
  rejected: "error",
  withdrawn: "warning",
  pending: "neutral",
}

/**
 * Mismas siete columnas que `SystemLog` y en el mismo orden —cuándo, de qué
 * módulo, qué pasó, sobre qué, por qué, quién, y el chevron— para que las
 * dos bitácoras del portal se lean con el mismo gesto. Los anchos fijos
 * suman 544px y las dos columnas de texto son `minmax(0,…)`: sin el `min-w`
 * la rejilla las llevaría a 0 en vez de desbordar, y con él la tabla
 * scrollea en horizontal como una sola unidad.
 */
const GRID =
  "grid-cols-[132px_104px_120px_minmax(0,1.1fr)_minmax(0,1fr)_130px_28px] min-w-[900px]"

/**
 * El historial de decisiones de la bandeja, con la estructura de las demás
 * vistas de log del portal (`components/data/system-log.tsx`).
 *
 * Antes era una lista de una línea por decisión: estado, quién y cuándo. Se
 * veía lo que pasó y no por qué — y en un flujo de doble aprobación el «por
 * qué» son DOS motivos, el de quien pidió y el de quien firmó, que es justo
 * lo que alguien viene a buscar aquí seis meses después. Ahora la fila se
 * despliega con las dos mitades de la conversación.
 */
export function ApprovalsHistory({ rows }: { rows: HistoryRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto">
      <div
        className={cn(
          "grid items-center gap-2.5 bg-muted px-5 py-2.5 text-[10px] font-semibold tracking-[0.4px] text-muted-foreground uppercase",
          GRID
        )}
      >
        <span>Cuándo</span>
        <span>Tipo</span>
        <span>Resultado</span>
        <span>Solicitud</span>
        <span>Motivo</span>
        <span>Decidió</span>
        <span />
      </div>

      {rows.map((row) => {
        const key = `${row.domain}-${row.id}`
        const open = openId === key
        const motivo = row.decisionReason
          ? DECISION_REASON_LABEL[row.decisionReason]
          : null

        return (
          <div
            key={key}
            className="w-fit min-w-full border-b border-border last:border-b-0"
          >
            <div
              role="button"
              onClick={() => setOpenId(open ? null : key)}
              className={cn(
                "grid cursor-pointer items-center gap-2.5 px-5 py-3 text-xs transition-colors hover:bg-muted/60",
                GRID,
                open && "bg-muted/40"
              )}
            >
              <span className="font-mono text-[11px] text-muted-foreground">
                {row.decidedAt ? formatEventDate(row.decidedAt) : "—"}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {DOMAIN_LABEL[row.domain]}
              </span>
              <Badge
                variant={STATUS_VARIANT[row.status]}
                className="w-fit shrink-0"
              >
                {APPROVAL_STATUS_LABEL[row.status]}
              </Badge>
              <span className="min-w-0 truncate font-medium text-foreground">
                <Link
                  href={row.href}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  {row.title}
                </Link>
              </span>
              <span className="min-w-0 truncate text-secondary-foreground">
                {motivo ?? "—"}
              </span>
              <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                {row.decidedByName ?? "—"}
                {row.selfApproved && (
                  <span className="ml-1.5 rounded-full bg-warning-bg px-1.5 py-px text-[9.5px] font-medium text-warning">
                    autoaprobada
                  </span>
                )}
              </span>
              <span className="flex justify-end">
                <ChevronDown
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform",
                    open && "rotate-180"
                  )}
                />
              </span>
            </div>

            {open && (
              <div className="flex flex-col gap-2.5 border-t border-border bg-muted/30 px-5 py-3">
                {/* Las dos mitades, en el orden en que ocurrieron: primero
                    lo que se pidió, después lo que se decidió. */}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-[10px] bg-background px-3 py-2.5">
                    <p className="text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                      Lo pidió
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium text-foreground">
                      {row.requestedByName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(row.requestedAt)} ·{" "}
                      {formatRelativeTime(row.requestedAt)}
                    </p>
                    {row.requestReasonLabel && (
                      <p className="mt-1.5 text-[11px] text-secondary-foreground">
                        Motivo: {row.requestReasonLabel}
                      </p>
                    )}
                    {row.requestNote && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        «{row.requestNote}»
                      </p>
                    )}
                  </div>

                  <div className="rounded-[10px] bg-background px-3 py-2.5">
                    <p className="text-[9.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                      {row.status === "withdrawn" ? "La retiró" : "La firmó"}
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium text-foreground">
                      {row.decidedByName ?? "—"}
                    </p>
                    {row.selfApproved && (
                      <p className="text-[11px] font-medium text-warning">
                        La firmó quien la pidió (autoaprobación)
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {row.decidedAt
                        ? `${formatDateTime(row.decidedAt)} · ${formatRelativeTime(row.decidedAt)}`
                        : "sin fecha registrada"}
                    </p>
                    {motivo && (
                      <p className="mt-1.5 text-[11px] text-secondary-foreground">
                        Motivo: {motivo}
                      </p>
                    )}
                    {row.decisionNote && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        «{row.decisionNote}»
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {row.subtitle && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {row.subtitle}
                    </span>
                  )}
                  <Link
                    href={row.href}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Ver {DOMAIN_LABEL[row.domain].toLowerCase()}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
