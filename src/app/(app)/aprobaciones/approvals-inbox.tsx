"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"

import { DecisionReasonFields } from "@/components/form/decision-reason-fields"
import { Message } from "@/components/form/message"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { decideWorkflowApprovalsAction } from "@/features/builder/canvas/approvals"
import { decideCouponApprovalsAction } from "@/features/coupons/actions/approvals"
import { decidePromotionApprovalsAction } from "@/features/promotions/actions/approvals"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  APPROVAL_REASONS,
  REJECTION_REASONS,
  type DecisionReason,
} from "@/types/domain"

export type ApprovalDomain = "promociones" | "journeys" | "cupones"

export const DOMAIN_LABEL: Record<ApprovalDomain, string> = {
  promociones: "Promoción",
  journeys: "Regla",
  cupones: "Cupón",
}

export type InboxRow = {
  domain: ApprovalDomain
  id: string
  title: string
  subtitle: string
  href: string
  requestedByName: string
  requestedAt: string
  /** `false` cuando es la propia solicitud o el rol no tiene `aprobar` sobre ese dominio: la fila no entra en la selección. */
  selectable: boolean
  actions: ReactNode
}

type SkippedReason = "no_existe" | "ya_decidida" | "propia_solicitud"

const SKIPPED_LABEL: Record<SkippedReason, string> = {
  no_existe: "ya no existe",
  ya_decidida: "ya la decidió alguien",
  propia_solicitud: "es tu propia solicitud",
}

/**
 * Bandeja de doble aprobación con selección múltiple. La decisión en bloque
 * es lo que la aprobación obligatoria volvió imprescindible: activar 12
 * promociones crea 12 solicitudes, y decidirlas de una en una son 12 viajes
 * al servidor.
 *
 * Una selección puede mezclar dominios, así que el envío se agrupa por
 * dominio y llama a la acción de cada uno — son tres RPC distintas porque
 * cada una mueve una tabla distinta (`promociones`, `workflows`,
 * `coupon_batch`), no por capricho.
 *
 * Las filas no decidibles (las propias, o las de un dominio sin permiso) no
 * son seleccionables: es la misma regla de cuatro ojos que aplica el SQL,
 * dicha antes de que el servidor tenga que rechazarla.
 */
export function ApprovalsInbox({ rows }: { rows: InboxRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null)
  const [reasonCode, setReasonCode] = useState<DecisionReason>(
    APPROVAL_REASONS[0]
  )
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<string>()

  const selectableRows = rows.filter((r) => r.selectable)
  const selectedRows = selectableRows.filter((r) => selected.has(key(r)))
  const allSelected =
    selectableRows.length > 0 && selectedRows.length === selectableRows.length

  function key(row: Pick<InboxRow, "domain" | "id">) {
    return `${row.domain}:${row.id}`
  }

  function toggle(row: InboxRow) {
    setSelected((prev) => {
      const next = new Set(prev)
      const k = key(row)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function toggleAll() {
    setSelected(
      allSelected ? new Set() : new Set(selectableRows.map((r) => key(r)))
    )
  }

  function openDecision(next: "approved" | "rejected") {
    setReasonCode(
      next === "approved" ? APPROVAL_REASONS[0] : REJECTION_REASONS[0]
    )
    setNote("")
    setError(undefined)
    setResult(undefined)
    setDecision(next)
  }

  async function confirm() {
    if (!decision) return
    if (reasonCode === "otro" && !note.trim()) {
      setError("Explica el motivo para poder guardarlo.")
      return
    }
    setBusy(true)
    setError(undefined)

    const payload = {
      decision,
      reasonCode,
      note: note.trim() || undefined,
    }
    const byDomain: Record<ApprovalDomain, string[]> = {
      promociones: [],
      journeys: [],
      cupones: [],
    }
    for (const row of selectedRows) byDomain[row.domain].push(row.id)

    // Secuencial y no en paralelo: aprobar una emisión de cupones dispara la
    // generación de sus códigos, y lanzar los tres dominios a la vez pondría
    // esa carga a competir con las otras dos escrituras.
    let decided = 0
    const skipped: string[] = []
    try {
      for (const [domain, ids] of Object.entries(byDomain) as [
        ApprovalDomain,
        string[],
      ][]) {
        if (!ids.length) continue
        const run = {
          promociones: decidePromotionApprovalsAction,
          journeys: decideWorkflowApprovalsAction,
          cupones: decideCouponApprovalsAction,
        }[domain]
        const res = await run({ approvalIds: ids, ...payload })
        const data = res?.data
        if (!data?.ok) {
          setError(data?.message ?? "No se pudo completar la decisión.")
          setBusy(false)
          return
        }
        decided += data.decided
        for (const s of data.skipped) {
          skipped.push(SKIPPED_LABEL[s.reason as SkippedReason] ?? s.reason)
        }
      }
    } catch {
      setError("No se pudo completar la decisión.")
      setBusy(false)
      return
    }

    setBusy(false)
    setDecision(null)
    setSelected(new Set())
    setResult(
      skipped.length
        ? `${String(decided)} ${decided === 1 ? "decidida" : "decididas"}. ${String(skipped.length)} se omitieron: ${[...new Set(skipped)].join(", ")}.`
        : `${String(decided)} ${decided === 1 ? "solicitud decidida" : "solicitudes decididas"}.`
    )
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2.5">
      {result && (
        <Message variant="success" title="Listo" description={result} />
      )}

      {selectableRows.length > 0 && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
            selectedRows.length > 0
              ? "border-selected bg-accent"
              : "border-border bg-background"
          )}
        >
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label="Seleccionar todas las que puedes decidir"
          />
          <p className="text-xs font-medium text-foreground">
            {selectedRows.length > 0
              ? `${String(selectedRows.length)} seleccionada${selectedRows.length === 1 ? "" : "s"}`
              : `Seleccionar las ${String(selectableRows.length)} que puedes decidir`}
          </p>
          {selectedRows.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openDecision("rejected")}
              >
                Rechazar {selectedRows.length}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => openDecision("approved")}
              >
                Aprobar {selectedRows.length}
              </Button>
            </div>
          )}
        </div>
      )}

      {rows.map((row) => (
        <div
          key={key(row)}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3.5 py-3",
            selected.has(key(row))
              ? "border-selected bg-accent/40"
              : "border-border"
          )}
        >
          <div className="w-5 shrink-0">
            {row.selectable && (
              <Checkbox
                checked={selected.has(key(row))}
                onCheckedChange={() => toggle(row)}
                aria-label={`Seleccionar ${row.title}`}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                {DOMAIN_LABEL[row.domain]}
              </span>
              <Link
                href={row.href}
                className="truncate text-[13px] font-medium text-foreground hover:underline"
              >
                {row.title}
              </Link>
              {row.subtitle && (
                <span className="truncate text-xs text-muted-foreground">
                  {row.subtitle}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Solicitó {row.requestedByName} ·{" "}
              {formatRelativeTime(row.requestedAt)}
            </p>
          </div>
          <div className="w-[140px] shrink-0 text-right">{row.actions}</div>
        </div>
      ))}

      <Dialog
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approved" ? "Aprobar" : "Rechazar"}{" "}
              {selectedRows.length}{" "}
              {selectedRows.length === 1 ? "solicitud" : "solicitudes"}
            </DialogTitle>
            <DialogDescription>
              {decision === "approved"
                ? "Lo aprobado pasa a Activa en el momento. El motivo queda en la bitácora de cada una junto a tu nombre y la fecha."
                : "Lo rechazado vuelve a Borrador y se podrá editar de nuevo. El motivo queda en la bitácora de cada una."}
            </DialogDescription>
          </DialogHeader>

          {decision && (
            <DecisionReasonFields
              decision={decision}
              reasonCode={reasonCode}
              onReasonCodeChange={setReasonCode}
              note={note}
              onNoteChange={setNote}
            />
          )}

          {error && (
            <Message
              variant="error"
              title="No se pudo completar"
              description={error}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDecision(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
            >
              {busy
                ? "Guardando…"
                : decision === "approved"
                  ? "Aprobar"
                  : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
