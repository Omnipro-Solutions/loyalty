"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Message } from "@/components/form/message"
import { formatNumber, formatShortDate, formatUSD } from "@/lib/format"
import type { CouponOrigin } from "@/types/domain"

import { requestApprovalAction } from "../actions/approvals"
import { emitCouponBatchAction } from "../actions/batches"
import { audienceModeShort, COUPON_ORIGIN_LABEL } from "../lib/labels"
import { sampleCode } from "../lib/code"
import {
  computeMissingFieldBlockers,
  evaluateEmitGate,
  EMIT_BLOCKER_COPY,
} from "../lib/emit-gate"
import type {
  AudienceOption,
  CatalogOption,
  MemberOption,
  ProductOption,
} from "../lib/queries"
import { voucherHeadline } from "../lib/recap"
import { stepsForOrigin, type CouponStepId } from "../lib/steps"
import { evaluateApprovalRequirement } from "../lib/thresholds"
import { couponBatchSchema, type CouponBatchValues } from "../schemas"
import { CouponStepper } from "./coupon-stepper"
import { CouponVoucher } from "./coupon-voucher"
import { EmissionTargetCard } from "./emission-target-card"
import { EmitChecklistCard } from "./emit-checklist-card"
import { StepAudience } from "./step-audience"
import { StepAuthorization } from "./step-authorization"
import { StepCoupon } from "./step-coupon"
import { StepFile } from "./step-file"
import { StepOrigin } from "./step-origin"
import { StepPoints } from "./step-points"
import { StepQuantity } from "./step-quantity"
import { StepRecipient } from "./step-recipient"
import { StepReview } from "./step-review"
import { useCouponVoucherPreview } from "./use-coupon-voucher-preview"

const STEP_FIELDS: Record<CouponStepId, (keyof CouponBatchValues)[]> = {
  origin: ["origin"],
  recipient: ["memberId"],
  audience: ["audienceSegmentId", "audienceMode"],
  quantity: ["requestedQuantity"],
  file: ["importRows"],
  points: ["pointsCost", "pointsChargeTiming"],
  coupon: [
    "name",
    "discountType",
    "discountValue",
    "freeProductId",
    "codePattern",
  ],
  authorization: ["issueReason"],
  review: [],
}

type CouponBatchFormProps = {
  audiences: AudienceOption[]
  products: ProductOption[]
  stores: CatalogOption[]
  categories: CatalogOption[]
  promotions: CatalogOption[]
  hasOtherApprovers: boolean
}

export function CouponBatchForm({
  audiences,
  products,
  stores,
  categories,
  promotions,
  hasOtherApprovers,
}: CouponBatchFormProps) {
  const router = useRouter()
  const [generalError, setGeneralError] = useState<string | undefined>()
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(
    null
  )

  const {
    control,
    trigger,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<CouponBatchValues>({
    resolver: zodResolver(couponBatchSchema),
    defaultValues: {
      origin: "manual_customer",
      name: "",
      discountType: "percentage",
      discountValue: 10,
      maxUsesPerCoupon: 1,
      maxCouponsPerPerson: 1,
      codePrefix: "",
      codePattern: "CUP-AAAA-NNNN",
      validFrom: new Date().toISOString().slice(0, 10),
      storeIds: [],
      categoryIds: [],
      deliveryChannels: [],
      issueReason: "",
    },
  })

  // Cast explícito: `useWatch` sin `name` infiere un tipo "deep partial"
  // (hasta los campos DENTRO de `importRows[]` quedan opcionales), distinto
  // del `Partial<CouponBatchValues>` (solo el primer nivel) que espera el
  // resto del módulo (`StepReview`, blockers, etc.) — fricción conocida de
  // react-hook-form v7 con arrays de objetos.
  const values = useWatch({ control }) as Partial<CouponBatchValues>
  const origin = (values.origin ?? "manual_customer") as CouponOrigin
  const steps = useMemo(() => stepsForOrigin(origin), [origin])
  const [rawStepId, setStepId] = useState<CouponStepId>("origin")
  const rawIndex = steps.findIndex((s) => s.id === rawStepId)
  // Red de seguridad derivada en el propio render (no en un efecto): si el
  // origen cambia y el paso actual ya no forma parte de la secuencia nueva,
  // se muestra "origin" sin necesidad de un setState en un useEffect.
  const stepId = rawIndex === -1 ? "origin" : rawStepId
  const index = rawIndex === -1 ? 0 : rawIndex

  const emit = useAction(emitCouponBatchAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo emitir la emisión.")
        return
      }
      router.push("/cupones")
    },
    onError: () => setGeneralError("No se pudo emitir la emisión."),
  })

  const requestApproval = useAction(requestApprovalAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(
          data?.message ?? "No se pudo enviar la emisión a aprobación."
        )
        return
      }
      router.push("/cupones/aprobaciones")
    },
    onError: () =>
      setGeneralError("No se pudo enviar la emisión a aprobación."),
  })

  const selectedAudience = audiences.find(
    (a) => a.id === values.audienceSegmentId
  )

  const quantity =
    origin === "batch_anonymous"
      ? (values.requestedQuantity ?? 0)
      : origin === "csv_import"
        ? (values.importRows?.length ?? 0)
        : origin === "batch_audience"
          ? (selectedAudience?.estimatedCount ?? 0)
          : 1

  const approval = evaluateApprovalRequirement({
    requestedQuantity: quantity,
    discountType: values.discountType ?? "percentage",
    discountValue: values.discountValue ?? 0,
    pointsCost: values.pointsCost ?? null,
  })

  const missingFieldBlockers = computeMissingFieldBlockers({
    origin,
    name: values.name ?? "",
    memberId: values.memberId,
    audienceSegmentId: values.audienceSegmentId,
    requestedQuantity: values.requestedQuantity,
    importRowCount: values.importRows?.length ?? 0,
    discountType: values.discountType ?? "percentage",
    discountValue: values.discountValue ?? 0,
    freeProductId: values.freeProductId,
    issueReason: values.issueReason ?? "",
  })

  // `latestApprovalStatus: null` es correcto para este formulario: siempre
  // crea un batch NUEVO (no hay `id` en `couponBatchSchema`), así que nunca
  // hay una solicitud previa que consultar — a diferencia de reabrir un
  // batch existente, que esta versión del asistente todavía no soporta.
  const gate = evaluateEmitGate({
    status: "draft",
    requiresApproval: approval.required,
    latestApprovalStatus: null,
    hasOtherApprovers,
    blockers: missingFieldBlockers,
  })

  function stepSummary(id: CouponStepId): string | undefined {
    switch (id) {
      case "origin":
        return COUPON_ORIGIN_LABEL[origin]
      case "recipient":
        return selectedMember?.name
      case "audience":
        return selectedAudience
          ? `${selectedAudience.name} · ${audienceModeShort(values.audienceMode ?? "dynamic")}${
              selectedAudience.estimatedCount != null
                ? ` · ${formatNumber(selectedAudience.estimatedCount)}`
                : ""
            }`
          : undefined
      case "quantity":
        return values.requestedQuantity
          ? `${formatNumber(values.requestedQuantity)} cupones`
          : undefined
      case "file":
        return values.importRows?.length
          ? `${formatNumber(values.importRows.length)} filas`
          : values.importFilename
      case "points":
        return values.pointsCost
          ? `${formatNumber(values.pointsCost)} pts`
          : undefined
      case "coupon": {
        if (!values.discountType) return undefined
        const { headline } = voucherHeadline(values)
        const range = values.validFrom
          ? `${formatShortDate(values.validFrom)}${values.validTo ? ` – ${formatShortDate(values.validTo)}` : ""}`
          : undefined
        return [headline, range].filter(Boolean).join(" · ")
      }
      case "authorization":
        return approval.required ? "Requiere doble aprobación" : undefined
      case "review":
        return missingFieldBlockers.length > 0
          ? `${missingFieldBlockers.length} bloqueo${missingFieldBlockers.length === 1 ? "" : "s"} pendiente${missingFieldBlockers.length === 1 ? "" : "s"}`
          : "Todo listo"
      default:
        return undefined
    }
  }

  const railSteps = steps.map((s) => ({ ...s, summary: stepSummary(s.id) }))

  const previewCode = sampleCode(
    values.codePattern || "CUP-AAAA-NNNN",
    values.codePrefix
  )
  const { qrSvg, barcodeSvg } = useCouponVoucherPreview(previewCode)
  const { headline, subtitle } = voucherHeadline(values)
  const validitySummary = values.validFrom
    ? `Válido del ${formatShortDate(values.validFrom)}${
        values.validTo ? ` al ${formatShortDate(values.validTo)}` : ""
      }${values.minPurchaseAmount ? ` · compra mínima ${formatUSD(values.minPurchaseAmount)}` : ""}`
    : "Completa la vigencia para ver el vale"

  const checklistItems = [
    ...(missingFieldBlockers.length === 0
      ? [{ message: "Origen, descuento y motivo completos" }]
      : missingFieldBlockers.map((code) => {
          const copy = EMIT_BLOCKER_COPY[code]
          const targetIndex = steps.findIndex((s) => s.id === copy.stepId)
          return {
            message: copy.message,
            action: {
              label: `Ir al paso ${targetIndex + 1}`,
              onClick: () => setStepId(copy.stepId as CouponStepId),
            },
          }
        })),
    ...(approval.required
      ? [
          hasOtherApprovers
            ? {
                message: `Requiere doble aprobación (${formatNumber(quantity)} códigos)`,
                action: {
                  label: "Solicitar",
                  onClick: () => setStepId("authorization"),
                },
              }
            : {
                message: EMIT_BLOCKER_COPY.no_other_approver.message,
                action: {
                  label: "Ver",
                  onClick: () => setStepId("authorization"),
                },
              },
        ]
      : []),
  ]

  async function next() {
    const ok = await trigger(STEP_FIELDS[steps[index].id])
    if (ok) setStepId(steps[index + 1].id)
  }
  function previous() {
    if (index > 0) setStepId(steps[index - 1].id)
  }

  function onSubmit(data: CouponBatchValues) {
    setGeneralError(undefined)
    if (gate.intent === "request_approval") {
      requestApproval.execute(data)
      return
    }
    emit.execute(data)
  }

  const isSubmitting = emit.isPending || requestApproval.isPending

  const isLastStep = index === steps.length - 1
  // Se basa en `approval.required`, no en `gate.intent`: aunque el gate
  // esté "blocked" (campos faltantes, o sin otro aprobador), la ACCIÓN que
  // esta emisión va a tomar en cuanto se desbloquee sigue siendo solicitar
  // aprobación, nunca emitir directo — "Emitir cupones" ahí sería engañoso.
  const nextLabel = isLastStep
    ? approval.required
      ? "Solicitar aprobación"
      : "Emitir cupones"
    : `Continuar a ${steps[index + 1].label.toLowerCase()}`

  return (
    <form className="flex w-full flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-foreground">
            Nueva emisión
          </p>
          <p className="text-xs text-muted-foreground">
            Paso {index + 1} de {steps.length} · Los cupones se generan al
            confirmar el último paso. Puedes guardar como borrador en cualquier
            momento.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled
            title="Guardar como borrador (próximamente)"
            className="rounded-[10px] border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-secondary-foreground opacity-50"
          >
            Guardar borrador
          </button>
          <Link
            href="/cupones"
            className="rounded-[10px] border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-secondary-foreground"
          >
            Cancelar
          </Link>
          {isLastStep ? (
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={gate.intent === "blocked" || isSubmitting}
            >
              {isSubmitting
                ? approval.required
                  ? "Enviando a aprobación…"
                  : "Emitiendo…"
                : nextLabel}
            </Button>
          ) : (
            <Button type="button" onClick={next}>
              {nextLabel}
            </Button>
          )}
        </div>
      </div>

      {generalError && (
        <Message
          variant="error"
          title="No se pudo guardar"
          description={generalError}
        />
      )}

      <div className="grid grid-cols-[260px_1fr_320px] items-start gap-5">
        <CouponStepper
          steps={railSteps}
          current={stepId}
          onStepClick={setStepId}
        />

        <div className="flex min-w-0 flex-col gap-3.5 rounded-2xl bg-background p-5 shadow-form-section">
          {stepId === "origin" && (
            <StepOrigin
              value={origin}
              onChange={(v) => setValue("origin", v)}
            />
          )}

          {stepId === "recipient" && (
            <StepRecipient
              memberId={values.memberId}
              memberLabel={selectedMember?.name}
              error={errors.memberId?.message}
              onChange={(member) => {
                setSelectedMember(member)
                setValue("memberId", member.id)
              }}
            />
          )}

          {stepId === "audience" && (
            <StepAudience
              audiences={audiences}
              segmentId={values.audienceSegmentId}
              mode={values.audienceMode}
              error={errors.audienceSegmentId?.message}
              onSegmentChange={(id) => setValue("audienceSegmentId", id)}
              onModeChange={(mode) => setValue("audienceMode", mode)}
            />
          )}

          {stepId === "quantity" && (
            <StepQuantity
              quantity={values.requestedQuantity}
              error={errors.requestedQuantity?.message}
              onChange={(q) => setValue("requestedQuantity", q)}
            />
          )}

          {stepId === "file" && (
            <StepFile
              filename={values.importFilename}
              rows={values.importRows}
              error={errors.importRows?.message}
              onChange={(filename, rows) => {
                setValue("importFilename", filename)
                setValue("importRows", rows)
              }}
              onRemove={() => {
                setValue("importFilename", undefined)
                setValue("importRows", undefined)
              }}
            />
          )}

          {stepId === "points" && (
            <StepPoints
              pointsCost={values.pointsCost}
              chargeTiming={values.pointsChargeTiming}
              error={errors.pointsCost?.message}
              onPointsCostChange={(v) => setValue("pointsCost", v)}
              onChargeTimingChange={(v) => setValue("pointsChargeTiming", v)}
            />
          )}

          {stepId === "coupon" && (
            <StepCoupon
              values={{
                name: values.name ?? "",
                discountType: values.discountType ?? "percentage",
                discountValue: values.discountValue ?? 0,
                discountCap: values.discountCap,
                freeProductId: values.freeProductId,
                minPurchaseAmount: values.minPurchaseAmount,
                maxUsesPerCoupon: values.maxUsesPerCoupon ?? 1,
                maxCouponsPerPerson: values.maxCouponsPerPerson ?? 1,
                codePrefix: values.codePrefix,
                codePattern: values.codePattern ?? "CUP-AAAA-NNNN",
                validFrom: values.validFrom ?? "",
                validTo: values.validTo,
                storeIds: values.storeIds ?? [],
                categoryIds: values.categoryIds ?? [],
                deliveryChannels: values.deliveryChannels ?? [],
                promotionId: values.promotionId,
              }}
              errors={{
                name: errors.name?.message,
                discountValue: errors.discountValue?.message,
                freeProductId: errors.freeProductId?.message,
                codePattern: errors.codePattern?.message,
                validFrom: errors.validFrom?.message,
              }}
              products={products}
              stores={stores}
              categories={categories}
              promotions={promotions}
              quantity={quantity > 0 ? quantity : undefined}
              onChange={(key, value) =>
                // `StepCoupon`'s `K` es un generic distinto del que
                // react-hook-form espera para `setValue` — mismo campo, dos
                // contextos genéricos que TS no reconcilia solo.
                setValue(
                  key as keyof CouponBatchValues,
                  value as CouponBatchValues[keyof CouponBatchValues]
                )
              }
            />
          )}

          {stepId === "authorization" && (
            <StepAuthorization
              issueReason={values.issueReason ?? ""}
              internalReference={values.internalReference}
              approval={approval}
              errors={{ issueReason: errors.issueReason?.message }}
              onIssueReasonChange={(v) => setValue("issueReason", v)}
              onInternalReferenceChange={(v) =>
                setValue("internalReference", v)
              }
            />
          )}

          {stepId === "review" && (
            <StepReview
              values={values}
              recipientLabel={selectedMember?.name}
              audienceLabel={selectedAudience?.name}
              blockers={gate.blockers.map(
                (code) => EMIT_BLOCKER_COPY[code].message
              )}
              approvalRequired={approval.required}
            />
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={previous}
              disabled={index === 0}
            >
              Anterior
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <CouponVoucher
            headline={headline}
            subtitle={subtitle}
            code={previewCode}
            qrSvg={qrSvg}
            barcodeSvg={barcodeSvg}
            validitySummary={validitySummary}
          />
          <EmissionTargetCard
            name={values.name ?? ""}
            originLabel={COUPON_ORIGIN_LABEL[origin]}
            audienceLabel={selectedAudience?.name}
            quantity={quantity}
            chunkCount={
              origin === "batch_audience" || origin === "batch_anonymous"
                ? Math.ceil(quantity / 500)
                : undefined
            }
          />
          <EmitChecklistCard items={checklistItems} />
        </div>
      </div>
    </form>
  )
}
