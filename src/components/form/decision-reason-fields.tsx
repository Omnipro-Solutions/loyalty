"use client"

import { Field } from "@/components/form/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DECISION_REASON_LABEL } from "@/lib/approval-flow"
import {
  APPROVAL_REASONS,
  DECISION_REASONS_REQUIRING_NOTE,
  REJECTION_REASONS,
  type DecisionReason,
} from "@/types/domain"

type DecisionReasonFieldsProps = {
  decision: "approved" | "rejected"
  reasonCode: DecisionReason
  onReasonCodeChange: (value: DecisionReason) => void
  note: string
  onNoteChange: (value: string) => void
}

/**
 * Motivo + nota de una decisión de doble aprobación. Vive en `components` y
 * no en una feature porque lo usan los tres dominios (promociones, reglas y
 * cupones) y la bandeja común de `/aprobaciones` — si cada uno tuviera el
 * suyo, la misma decisión se pediría distinta según de dónde se tomara.
 *
 * Solo campos: quién ejecuta la acción y con qué schema la valida es cosa de
 * cada feature (`decideApprovalsSchema`), que aplica la misma regla de
 * `otro` exige nota.
 */
export function DecisionReasonFields({
  decision,
  reasonCode,
  onReasonCodeChange,
  note,
  onNoteChange,
}: DecisionReasonFieldsProps) {
  // Aprobar «por error de configuración» no significa nada, y rechazar
  // «porque cumple la política», tampoco: cada decisión ofrece su subconjunto.
  const options = decision === "approved" ? APPROVAL_REASONS : REJECTION_REASONS
  const noteRequired = DECISION_REASONS_REQUIRING_NOTE.includes(reasonCode)

  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Motivo de la decisión" htmlFor="decisionReason" required>
        <Select
          value={reasonCode}
          onValueChange={(v) => onReasonCodeChange(v as DecisionReason)}
        >
          <SelectTrigger id="decisionReason">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((reason) => (
              <SelectItem key={reason} value={reason}>
                {DECISION_REASON_LABEL[reason]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label={noteRequired ? "Nota" : "Nota (opcional)"}
        htmlFor="decisionNote"
        required={noteRequired}
      >
        <Textarea
          id="decisionNote"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder={
            noteRequired
              ? "Explica el motivo — queda en la bitácora"
              : "Se guarda junto a tu nombre y la fecha"
          }
        />
      </Field>
    </div>
  )
}
