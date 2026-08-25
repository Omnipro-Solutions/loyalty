"use client"

import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { APPROVAL_THRESHOLD_REASON_LABEL } from "../lib/labels"
import type { ApprovalRequirement } from "../lib/thresholds"

type StepAuthorizationProps = {
  issueReason: string
  internalReference: string | undefined
  approval: ApprovalRequirement
  errors: { issueReason?: string }
  onIssueReasonChange: (value: string) => void
  onInternalReferenceChange: (value: string) => void
}

/** Paso "Autorización" (doc §4.2, regla 7.2): motivo obligatorio + referencia interna, y el aviso de doble aprobación si supera umbrales (regla 7.3). */
export function StepAuthorization({
  issueReason,
  internalReference,
  approval,
  errors,
  onIssueReasonChange,
  onInternalReferenceChange,
}: StepAuthorizationProps) {
  return (
    <Section
      title="Autorización"
      description="Firma de auditoría: motivo, usuario, sello de tiempo e IP."
    >
      <Field
        label="Motivo de la emisión"
        error={errors.issueReason}
        required
        htmlFor="issue-reason"
      >
        <Textarea
          id="issue-reason"
          value={issueReason}
          onChange={(e) => onIssueReasonChange(e.target.value)}
          placeholder="Ej. Campaña de reactivación para socios inactivos"
          rows={3}
        />
      </Field>

      <Row>
        <Field
          label="Referencia interna (opcional)"
          htmlFor="internal-reference"
        >
          <Input
            id="internal-reference"
            value={internalReference ?? ""}
            onChange={(e) => onInternalReferenceChange(e.target.value)}
            placeholder="Ej. TCK-4821"
          />
        </Field>
      </Row>

      {approval.required && (
        <Message
          variant="warning"
          title="Requiere doble aprobación"
          description={`Esta emisión supera: ${approval.reasons
            .map((r) => APPROVAL_THRESHOLD_REASON_LABEL[r])
            .join(
              ", "
            )}. Al confirmar, se enviará a un segundo aprobador — la generación de códigos empieza recién cuando la apruebe.`}
        />
      )}
    </Section>
  )
}
