"use client"

import { CheckCheck, CircleAlert, Lock, UserCheck } from "lucide-react"
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
import {
  waitingLevel,
  type ApprovalBlock,
  type WaitingLevel,
} from "@/lib/approval-flow"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DecisionReason } from "@/types/domain"

export type ApprovalDomain = "promociones" | "journeys" | "cupones"

export const DOMAIN_LABEL: Record<ApprovalDomain, string> = {
  promociones: "Promoción",
  journeys: "Regla",
  cupones: "Cupón",
}

/**
 * Un dato de los que hacen falta para decidir. Los arma la página desde el
 * dominio de cada fila: qué es «lo esencial» cambia entre una promoción
 * (mecánica, canal, vigencia, presupuesto) y una emisión de cupones
 * (cuántos, con qué descuento, a qué costo en puntos).
 */
export type InboxFact = { label: string; value: string }

/**
 * Por qué esta fila no se puede decidir. Alias de `ApprovalBlock`
 * (`lib/approval-flow.ts`), que es donde vive la regla: el tipo no se
 * redeclara aquí para que añadir un motivo nuevo no obligue a acordarse de
 * dos sitios.
 */
export type InboxBlock = ApprovalBlock

const BLOCK_LABEL: Record<InboxBlock, string> = {
  propia: "Es tu solicitud: la firma otra persona",
  sin_permiso: "Tu rol no aprueba este tipo",
}

const BLOCK_ICON: Record<InboxBlock, typeof Lock> = {
  propia: UserCheck,
  sin_permiso: Lock,
}

export type InboxRow = {
  domain: ApprovalDomain
  id: string
  title: string
  subtitle: string
  href: string
  requestedByName: string
  requestedAt: string
  /**
   * Por qué llegó aquí esta solicitud, ya traducido por la página.
   *
   * No es un código de enum porque los tres dominios no responden lo mismo:
   * en promociones y reglas es el motivo que ESCRIBIÓ quien pidió la firma
   * (`codigo_motivo`, obligatorio al solicitar); en cupones no hay motivo
   * escrito porque la aprobación no la pide una persona, la dispara un
   * umbral (`threshold_reasons`) — y entonces el «por qué» es qué umbral se
   * cruzó. Las dos cosas se leen igual de bien en la fila, y ninguna se
   * mostraba antes.
   */
  requestReason: { label: string; note: string | null } | null
  /** Lo que hay que saber para decidir sin abrir otra pestaña. */
  facts: InboxFact[]
  /** `null` cuando se puede decidir; si no, por qué no. */
  blocked: InboxBlock | null
  actions: ReactNode
}

type SkippedReason = "no_existe" | "ya_decidida" | "propia_solicitud"

const SKIPPED_LABEL: Record<SkippedReason, string> = {
  no_existe: "ya no existe",
  ya_decidida: "ya la decidió alguien",
  propia_solicitud: "es tu propia solicitud",
}

/** Cuánto lleva esperando, dicho con el tono que merece. */
const WAITING_CLASS: Record<WaitingLevel, string> = {
  reciente: "text-muted-foreground",
  espera: "text-warning",
  atascada: "text-destructive font-medium",
}

/** Cuántos títulos se listan en el diálogo antes de resumir el resto. */
const RECAP_LIMIT = 6

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
 * Tres cosas que la volvieron usable, y por qué:
 *
 *   · **Cada fila dice qué se decide.** Antes había que abrir la promoción
 *     en otra pestaña para saber si aprobarla; ahora la mecánica, el canal,
 *     la vigencia y el presupuesto están en la fila. Aprobar a ciegas era
 *     el resultado más probable del diseño anterior.
 *   · **Y por qué se pidió.** El motivo del solicitante es obligatorio al
 *     pedir la firma y no se mostraba en ninguna parte.
 *   · **Antes de decidir en bloque se ve la lista.** Confirmar «Aprobar 12»
 *     sin ver los doce nombres es exactamente el gesto que no queremos
 *     hacer fácil.
 *
 * Las filas no decidibles (las propias, o las de un dominio sin permiso) no
 * son seleccionables —es la misma regla de cuatro ojos que aplica el SQL,
 * dicha antes de que el servidor tenga que rechazarla— y ahora además dicen
 * por qué: una fila sin casilla y sin explicación se lee como un error de
 * la pantalla.
 */
export function ApprovalsInbox({ rows }: { rows: InboxRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null)
  /**
   * La decisión se toma en dos pasos: primero se mira QUÉ se decide,
   * después se firma con un motivo. Un solo formulario con la lista y el
   * motivo juntos se rellena de arriba abajo sin leer la lista — y en una
   * decisión en bloque eso es aprobar doce cosas sin ver ninguna.
   */
  const [step, setStep] = useState<1 | 2>(1)
  // Sin motivo preseleccionado: ver `DecisionReasonFields`.
  const [reasonCode, setReasonCode] = useState<DecisionReason | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<string>()

  const selectableRows = rows.filter((r) => r.blocked === null)
  const selectedRows = selectableRows.filter((r) => selected.has(key(r)))
  const allSelected =
    selectableRows.length > 0 && selectedRows.length === selectableRows.length

  const propias = rows.filter((r) => r.blocked === "propia").length
  const sinPermiso = rows.filter((r) => r.blocked === "sin_permiso").length

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

  /**
   * Selecciona todo lo decidible y abre el diálogo de una vez. Es el gesto
   * que la bandeja no ofrecía: seleccionar doce casillas para aprobar doce
   * cosas es trabajo manual, no una decisión. El paso 1 del diálogo sigue
   * mostrando la lista, así que sigue siendo deliberado — lo que se ahorra
   * son los doce clics, no la revisión.
   */
  function decideAll(next: "approved" | "rejected") {
    setSelected(new Set(selectableRows.map((r) => key(r))))
    openDecision(next)
  }

  function openDecision(next: "approved" | "rejected") {
    setStep(1)
    setReasonCode(null)
    setNote("")
    setError(undefined)
    setResult(undefined)
    setDecision(next)
  }

  async function confirm() {
    if (!decision) return
    if (!reasonCode) {
      setError("Elige un motivo para dejar constancia de la decisión.")
      return
    }
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
            "flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
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
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              {selectedRows.length > 0
                ? `${String(selectedRows.length)} seleccionada${selectedRows.length === 1 ? "" : "s"}`
                : `Seleccionar las ${String(selectableRows.length)} que puedes decidir`}
            </p>
            {/* Por qué el «todas» no son todas las de la lista. Sin esto, la
                cuenta parece un error de la pantalla. */}
            {(propias > 0 || sinPermiso > 0) && (
              <p className="text-[11px] text-muted-foreground">
                {[
                  propias > 0
                    ? `${String(propias)} ${propias === 1 ? "es tuya" : "son tuyas"}`
                    : null,
                  sinPermiso > 0
                    ? `${String(sinPermiso)} fuera de tu permiso`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {selectedRows.length > 0 ? (
              <>
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
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => decideAll("approved")}
              >
                <CheckCheck className="size-3.5" />
                Aprobar las {selectableRows.length}
              </Button>
            )}
          </div>
        </div>
      )}

      {rows.map((row) => {
        const espera = waitingLevel(row.requestedAt)
        const BlockIcon = row.blocked ? BLOCK_ICON[row.blocked] : null
        return (
          <div
            key={key(row)}
            className={cn(
              "flex flex-wrap items-start gap-3 rounded-xl border px-3.5 py-3",
              selected.has(key(row))
                ? "border-selected bg-accent/40"
                : "border-border",
              row.blocked && "bg-muted/30"
            )}
          >
            <div className="w-5 shrink-0 pt-0.5">
              {row.blocked && BlockIcon ? (
                <BlockIcon
                  className="size-3.5 text-muted-foreground"
                  aria-label={BLOCK_LABEL[row.blocked]}
                />
              ) : (
                <Checkbox
                  checked={selected.has(key(row))}
                  onCheckedChange={() => toggle(row)}
                  aria-label={`Seleccionar ${row.title}`}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
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
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {row.subtitle}
                  </span>
                )}
              </div>

              {/* Qué se decide. Va en la fila y no detrás de un clic porque
                  es la información que evita aprobar a ciegas. */}
              {row.facts.length > 0 && (
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {row.facts.map((fact, index) => (
                    <span key={fact.label}>
                      {index > 0 && " · "}
                      {fact.label}{" "}
                      <span className="font-medium text-secondary-foreground">
                        {fact.value}
                      </span>
                    </span>
                  ))}
                </p>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                <span className="text-muted-foreground">
                  Pidió {row.requestedByName}
                </span>
                <span className={WAITING_CLASS[espera]}>
                  {espera === "atascada" && (
                    <CircleAlert className="mr-0.5 inline size-3 align-[-2px]" />
                  )}
                  {formatRelativeTime(row.requestedAt)}
                </span>
                {row.requestReason && (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-secondary-foreground">
                    {row.requestReason.label}
                  </span>
                )}
                {row.blocked && (
                  <span className="text-muted-foreground italic">
                    {BLOCK_LABEL[row.blocked]}
                  </span>
                )}
              </div>

              {row.requestReason?.note && (
                <p className="mt-1 line-clamp-2 text-[11px] text-secondary-foreground">
                  «{row.requestReason.note}»
                </p>
              )}
            </div>

            <div className="w-[140px] shrink-0 text-right">{row.actions}</div>
          </div>
        )
      })}

      <Dialog
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
      >
        <DialogContent>
          <DialogHeader>
            <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              Paso {step} de 2 ·{" "}
              {step === 1 ? "Revisa qué decides" : "Firma la decisión"}
            </p>
            <DialogTitle>
              {decision === "approved" ? "Aprobar" : "Rechazar"}{" "}
              {selectedRows.length}{" "}
              {selectedRows.length === 1 ? "solicitud" : "solicitudes"}
            </DialogTitle>
            <DialogDescription>
              {decision === "approved"
                ? "Lo aprobado pasa a Activa en el momento, y quien lo pidió recibe una notificación con tu motivo."
                : "Lo rechazado vuelve a Borrador y se podrá editar de nuevo. Quien lo pidió recibe una notificación con tu motivo."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            /* La lista de lo que se va a decidir, siempre — también con una
               sola. Doce nombres detrás de un botón que dice «Aprobar 12»
               son doce decisiones que nadie vio. */
            <div className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-[10px] bg-muted px-3 py-2.5">
              {selectedRows.slice(0, RECAP_LIMIT).map((row) => (
                <div key={key(row)} className="min-w-0">
                  <div className="flex min-w-0 items-baseline gap-2 text-[11px]">
                    <span className="shrink-0 text-muted-foreground">
                      {DOMAIN_LABEL[row.domain]}
                    </span>
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {row.title}
                    </span>
                  </div>
                  {/* Aquí los datos SE PARTEN en varias líneas en vez de
                      truncarse: el paso se llama «revisa qué decides», y
                      esconder la mitad del presupuesto con puntos suspensivos
                      es justo lo contrario. En el diálogo sobra alto.

                      Y cada dato va como par etiqueta/valor, no como una
                      cadena unida por «·»: el propio valor lleva puntos
                      dentro («desde 07 sep 2026 · permanente») y con un solo
                      separador no se sabía dónde acaba un dato y empieza el
                      siguiente. */}
                  {row.facts.length > 0 && (
                    <div className="mt-0.5 flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-[10.5px]">
                      {row.facts.map((fact) => (
                        <span
                          key={fact.label}
                          className="text-muted-foreground"
                        >
                          {fact.label}{" "}
                          <span className="text-secondary-foreground">
                            {fact.value}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {selectedRows.length > RECAP_LIMIT && (
                <p className="text-[11px] text-muted-foreground">
                  y {selectedRows.length - RECAP_LIMIT} más
                </p>
              )}
            </div>
          ) : (
            decision && (
              <DecisionReasonFields
                decision={decision}
                reasonCode={reasonCode}
                onReasonCodeChange={setReasonCode}
                note={note}
                onNoteChange={setNote}
              />
            )
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
              onClick={() => (step === 1 ? setDecision(null) : setStep(1))}
            >
              {step === 1 ? "Cancelar" : "Atrás"}
            </Button>
            {step === 1 ? (
              <Button type="button" onClick={() => setStep(2)}>
                Continuar
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void confirm()}
                disabled={busy || !reasonCode}
              >
                {busy
                  ? "Guardando…"
                  : decision === "approved"
                    ? `Aprobar ${String(selectedRows.length)}`
                    : `Rechazar ${String(selectedRows.length)}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
