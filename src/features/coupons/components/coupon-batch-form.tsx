"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Message } from "@/components/form/message"
import type { CouponOrigin } from "@/types/domain"

import { emitCouponBatchAction } from "../actions/batches"
import type {
  AudienceOption,
  CatalogOption,
  MemberOption,
  ProductOption,
} from "../lib/queries"
import { stepRecap } from "../lib/recap"
import { stepsForOrigin, type CouponStepId } from "../lib/steps"
import { evaluateApprovalRequirement } from "../lib/thresholds"
import { couponBatchSchema, type CouponBatchValues } from "../schemas"
import { CouponStepper } from "./coupon-stepper"
import { StepAudience } from "./step-audience"
import { StepAuthorization } from "./step-authorization"
import { StepCoupon } from "./step-coupon"
import { StepFile } from "./step-file"
import { StepOrigin } from "./step-origin"
import { StepPoints } from "./step-points"
import { StepQuantity } from "./step-quantity"
import { StepRecipient } from "./step-recipient"
import { StepReview } from "./step-review"

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
}

function computeBlockers(
  values: Partial<CouponBatchValues>,
  approvalRequired: boolean
): string[] {
  const blockers: string[] = []
  if (!values.name) blockers.push("Falta el nombre de la emisión.")
  if (values.origin === "manual_customer" && !values.memberId)
    blockers.push("Elige el cliente titular.")
  if (
    values.origin === "points_redemption" &&
    (!values.memberId || !values.pointsCost)
  )
    blockers.push("Elige el cliente y los puntos del canje.")
  if (values.origin === "batch_audience" && !values.audienceSegmentId)
    blockers.push("Elige una audiencia.")
  if (values.origin === "batch_anonymous" && !values.requestedQuantity)
    blockers.push("Indica cuántos códigos generar.")
  if (values.origin === "csv_import" && !values.importRows?.length)
    blockers.push("Sube un archivo con al menos una fila.")
  if (values.discountType === "free_product" && !values.freeProductId)
    blockers.push("Elige el producto de regalo.")
  if (!values.issueReason) blockers.push("El motivo de emisión es obligatorio.")
  if (approvalRequired)
    blockers.push(
      "Esta emisión requiere doble aprobación — reduce la cantidad o el valor para emitir directamente."
    )
  return blockers
}

export function CouponBatchForm({
  audiences,
  products,
  stores,
  categories,
  promotions,
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
  // resto del módulo (`stepRecap`, `StepReview`, etc.) — fricción conocida
  // de react-hook-form v7 con arrays de objetos.
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

  const recap = Object.fromEntries(
    steps.map((s) => [
      s.id,
      stepRecap(s.id, values, {
        memberNameById: selectedMember
          ? new Map([[selectedMember.id, selectedMember.name]])
          : new Map(),
        audienceNameById: new Map(audiences.map((a) => [a.id, a.name])),
      }),
    ])
  )

  const approval = evaluateApprovalRequirement({
    requestedQuantity:
      origin === "batch_anonymous"
        ? (values.requestedQuantity ?? 0)
        : origin === "csv_import"
          ? (values.importRows?.length ?? 0)
          : origin === "batch_audience"
            ? (audiences.find((a) => a.id === values.audienceSegmentId)
                ?.estimatedCount ?? 0)
            : 1,
    discountType: values.discountType ?? "percentage",
    discountValue: values.discountValue ?? 0,
    pointsCost: values.pointsCost ?? null,
  })

  const blockers = computeBlockers(values, approval.required)

  async function next() {
    const ok = await trigger(STEP_FIELDS[steps[index].id])
    if (ok) setStepId(steps[index + 1].id)
  }
  function previous() {
    if (index > 0) setStepId(steps[index - 1].id)
  }

  function onSubmit(data: CouponBatchValues) {
    setGeneralError(undefined)
    emit.execute(data)
  }

  return (
    <form className="flex w-full items-start gap-5">
      <CouponStepper
        steps={steps}
        current={stepId}
        recap={recap}
        onStepClick={setStepId}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        {generalError && (
          <Message
            variant="error"
            title="No se pudo guardar"
            description={generalError}
          />
        )}

        {stepId === "origin" && (
          <StepOrigin value={origin} onChange={(v) => setValue("origin", v)} />
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
            onInternalReferenceChange={(v) => setValue("internalReference", v)}
          />
        )}

        {stepId === "review" && (
          <StepReview
            values={values}
            recipientLabel={selectedMember?.name}
            audienceLabel={
              audiences.find((a) => a.id === values.audienceSegmentId)?.name
            }
            blockers={blockers}
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
          {index < steps.length - 1 ? (
            <Button type="button" onClick={next}>
              Siguiente
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={blockers.length > 0 || emit.isPending}
            >
              {emit.isPending ? "Emitiendo…" : "Emitir cupones"}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
