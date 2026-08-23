import { formatCOP, formatDate } from "@/lib/format"

import {
  APPLY_TO_LABEL,
  CHANNEL_SCOPE_LABEL,
  CONDITION_FIELD_LABEL,
  BENEFIT_TYPE_LABEL,
  PROMOTION_TYPE_LABEL,
  USAGE_PERIOD_LABEL,
} from "../lib/labels"
import type { ConditionCategory, ConditionSegment } from "../lib/queries"
import type { PromotionValues } from "../schemas"

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-secondary-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function SummaryGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

type PromotionReviewSummaryProps = {
  values: Partial<PromotionValues>
  categories: ConditionCategory[]
  segments: ConditionSegment[]
}

/** Paso 5 "Resumen" del stepper — revisión de todo lo capturado antes de guardar (no diseñado en el Figma de la regla). */
export function PromotionReviewSummary({
  values,
  categories,
  segments,
}: PromotionReviewSummaryProps) {
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const segmentNameById = new Map(segments.map((s) => [s.id, s.name]))
  const conditions = values.conditions ?? []

  return (
    <div className="flex w-full flex-col gap-4">
      <SummaryGroup title="Identidad">
        <SummaryRow label="Nombre" value={values.name || "—"} />
        <SummaryRow label="Código" value={values.code || "—"} />
        <SummaryRow
          label="Tipo"
          value={values.type ? PROMOTION_TYPE_LABEL[values.type] : "—"}
        />
        <SummaryRow label="Prioridad" value={String(values.priority ?? "—")} />
        <SummaryRow label="Acumulable" value={values.stackable ? "Sí" : "No"} />
        <SummaryRow
          label="Canal"
          value={
            values.channelScope ? CHANNEL_SCOPE_LABEL[values.channelScope] : "—"
          }
        />
      </SummaryGroup>

      <SummaryGroup title="Condiciones (SI)">
        {conditions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sin condiciones — aplica a todos los clientes.
          </p>
        ) : (
          conditions.map((condition, index) => (
            <SummaryRow
              key={index}
              label={CONDITION_FIELD_LABEL[condition.campo]}
              value={
                condition.campo === "categoria"
                  ? condition.valor
                      .map((id) => categoryNameById.get(id) ?? id)
                      .join(", ") || "—"
                  : condition.campo === "segmento"
                    ? (segmentNameById.get(condition.valor) ?? condition.valor)
                    : condition.campo === "monto_carrito"
                      ? formatCOP(condition.valor)
                      : String(condition.valor)
              }
            />
          ))
        )}
      </SummaryGroup>

      <SummaryGroup title="Recompensa (ENTONCES)">
        <SummaryRow
          label="Beneficio"
          value={
            values.benefitType ? BENEFIT_TYPE_LABEL[values.benefitType] : "—"
          }
        />
        <SummaryRow
          label="Valor"
          value={
            values.benefitValue === undefined
              ? "—"
              : values.benefitType === "descuento_porcentual"
                ? `${values.benefitValue} %`
                : formatCOP(values.benefitValue)
          }
        />
        <SummaryRow
          label="Tope máximo"
          value={values.maxCap ? formatCOP(values.maxCap) : "Sin tope"}
        />
        <SummaryRow
          label="Aplicar sobre"
          value={values.applyTo ? APPLY_TO_LABEL[values.applyTo] : "—"}
        />
        <SummaryRow
          label="Usos por cliente"
          value={
            values.usesPerMember
              ? `${values.usesPerMember} ${values.usagePeriod ? USAGE_PERIOD_LABEL[values.usagePeriod] : ""}`
              : "Sin límite"
          }
        />
      </SummaryGroup>

      <SummaryGroup title="Vigencia">
        <SummaryRow
          label="Desde"
          value={values.validFrom ? formatDate(values.validFrom) : "—"}
        />
        <SummaryRow
          label="Hasta"
          value={
            values.validUntil ? formatDate(values.validUntil) : "Permanente"
          }
        />
        <SummaryRow
          label="Presupuesto asignado"
          value={formatCOP(values.assignedBudget ?? 0)}
        />
      </SummaryGroup>
    </div>
  )
}
