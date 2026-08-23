"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { CurrencyInput } from "@/components/form/currency-input"
import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Stepper } from "@/components/form/stepper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CHANNEL_SCOPES,
  APPLY_TO_OPTIONS,
  BENEFIT_TYPES,
  PROMOTION_TYPES,
  USAGE_PERIODS,
  type ChannelScope,
  type ApplyTo,
  type ConditionCombinator,
  type PromotionPublicationStatus,
  type BenefitType,
  type PromotionType,
  type UsagePeriod,
} from "@/types/domain"

import {
  updatePromotionAction,
  createPromotionAction,
} from "../actions/promotions"
import { ConditionsBuilder } from "./conditions-builder"
import { PromotionReviewSummary } from "./promotion-review-summary"
import { PromotionStepper } from "./promotion-stepper"
import { PromotionSummaryCard } from "./promotion-summary-card"
import {
  APPLY_TO_LABEL,
  CHANNEL_SCOPE_LABEL,
  BENEFIT_TYPE_LABEL,
  PROMOTION_TYPE_LABEL,
  USAGE_PERIOD_LABEL,
} from "../lib/labels"
import type {
  ConditionCategory,
  ConditionCity,
  Condition,
  Promotion,
  ConditionSegment,
} from "../lib/queries"
import { promotionSchema, type PromotionValues } from "../schemas"

const STEPS = [
  "Definición",
  "Condiciones",
  "Recompensa",
  "Vigencia",
  "Resumen",
] as const

const FIELDS_BY_STEP: (keyof PromotionValues)[][] = [
  ["name", "code", "type", "priority", "stackable", "channelScope"],
  ["conditionCombinator", "conditions"],
  [
    "benefitType",
    "benefitValue",
    "maxCap",
    "applyTo",
    "usesPerMember",
    "usagePeriod",
  ],
  ["validFrom", "validUntil", "assignedBudget"],
  [],
]

type PromotionFormProps = {
  categories: ConditionCategory[]
  cities: ConditionCity[]
  segments: ConditionSegment[]
  promotion?: Promotion
}

/**
 * Figma "07.1 · Regla · configuración" (633:658) adaptado a "crear/editar
 * promoción": el mock solo diseñó Definición + Condiciones + Recompensa (los
 * 3 cards aparecen juntos en un solo frame, pero el stepper marca Definición
 * como completada, Condiciones como el paso activo y Recompensa/Vigencia/
 * Resumen como pendientes) — se implementa como wizard real (un paso visible
 * a la vez, navegación libre por el stepper) en vez de una sola página larga,
 * ya que es lo que el propio stepper del diseño representa. "Vigencia"
 * (fechas + presupuesto) es diseño propio; "Resumen" es una revisión de todo
 * lo capturado (el Figma solo diseñó el panel lateral, no una pantalla de
 * revisión, pero el stepper sí lo contempla como paso final).
 */
export function PromotionForm({
  categories,
  cities,
  segments,
  promotion,
}: PromotionFormProps) {
  const router = useRouter()
  const [generalError, setGeneralError] = useState<string>()
  const [step, setStep] = useState(0)
  const isEditing = Boolean(promotion)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<PromotionValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: promotion
      ? {
          name: promotion.nombre,
          code: promotion.codigo,
          type: promotion.tipo as PromotionType,
          priority: promotion.prioridad,
          stackable: promotion.acumulable,
          channelScope: promotion.canal_aplicacion as ChannelScope,
          conditionCombinator:
            promotion.combinador_condiciones as ConditionCombinator,
          conditions: promotion.condiciones as PromotionValues["conditions"],
          benefitType: promotion.tipo_beneficio as BenefitType,
          benefitValue: promotion.valor_beneficio ?? 0,
          maxCap: promotion.tope_maximo ?? undefined,
          applyTo: promotion.aplicar_sobre as ApplyTo,
          usesPerMember: promotion.usos_por_cliente ?? undefined,
          usagePeriod: (promotion.usos_periodo as UsagePeriod) ?? undefined,
          assignedBudget: promotion.presupuesto_asignado,
          validFrom: promotion.vigente_desde,
          validUntil: promotion.vigente_hasta ?? undefined,
          publicationStatus:
            promotion.estado_publicacion as PromotionPublicationStatus,
        }
      : {
          name: "",
          code: "",
          type: "categoria",
          priority: 5,
          stackable: false,
          channelScope: "pos_ecommerce",
          conditionCombinator: "todas",
          conditions: [],
          benefitType: "descuento_porcentual",
          benefitValue: 10,
          applyTo: "subtotal_carrito",
          usagePeriod: "mes",
          assignedBudget: 0,
          validFrom: new Date().toISOString().slice(0, 10),
          publicationStatus: "borrador",
        },
  })

  const values = useWatch({ control })

  const create = useAction(createPromotionAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo crear la promoción.")
        return
      }
      router.push("/promociones")
    },
    onError: () => setGeneralError("No se pudo crear la promoción."),
  })

  const update = useAction(updatePromotionAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo guardar la promoción.")
        return
      }
      router.push("/promociones")
    },
    onError: () => setGeneralError("No se pudo guardar la promoción."),
  })

  const saving = create.isPending || update.isPending

  function save(publicationStatus: "activa" | "borrador") {
    return handleSubmit((formValues: PromotionValues) => {
      setGeneralError(undefined)
      if (promotion) {
        update.execute({
          id: promotion.id,
          ...formValues,
          publicationStatus,
        })
      } else {
        create.execute({ ...formValues, publicationStatus })
      }
    })
  }

  async function next() {
    const isValid = await trigger(FIELDS_BY_STEP[step])
    if (isValid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function previous() {
    setStep((s) => Math.max(s - 1, 0))
  }

  const hasNoEndDate = !values.validUntil

  return (
    <form className="flex w-full flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-2xl leading-7 font-semibold text-foreground">
            {isEditing ? "Editar promoción" : "Nueva promoción"}
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            Define identidad, condiciones, recompensa y vigencia de la
            promoción.
          </p>
        </div>
      </div>

      {generalError && (
        <Message
          variant="error"
          title="No se pudo guardar"
          description={generalError}
        />
      )}

      <PromotionStepper steps={STEPS} current={step} onStepClick={setStep} />

      <div className="flex w-full items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          {step === 0 && (
            <Section
              title="Identidad de la promoción"
              description="Cómo se identifica la promoción dentro del motor."
            >
              <Row>
                <Field
                  label="Nombre de la promoción"
                  htmlFor="name"
                  required
                  error={errors.name?.message}
                >
                  <Input
                    id="name"
                    placeholder="2x1 en Bebidas"
                    {...register("name")}
                  />
                </Field>
                <Field
                  label="Código"
                  htmlFor="code"
                  required
                  hint="Mayúsculas, números y guiones."
                  error={errors.code?.message}
                >
                  <Input
                    id="code"
                    placeholder="PROMO-2X1-BEB"
                    {...register("code")}
                    onChange={(e) =>
                      setValue("code", e.target.value.toUpperCase())
                    }
                  />
                </Field>
              </Row>
              <Row>
                <Field label="Tipo de promoción" htmlFor="type">
                  <Select
                    value={values.type}
                    onValueChange={(v) => setValue("type", v as PromotionType)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue>
                        {(v: PromotionType) => PROMOTION_TYPE_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PROMOTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {PROMOTION_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Prioridad" htmlFor="priority">
                  <Stepper
                    value={values.priority ?? 5}
                    onValueChange={(v) => setValue("priority", v)}
                    min={1}
                    max={10}
                  />
                </Field>
                <Field label="Acumulable" htmlFor="stackable">
                  <Select
                    value={values.stackable ? "si" : "no"}
                    onValueChange={(v) => setValue("stackable", v === "si")}
                  >
                    <SelectTrigger id="stackable">
                      <SelectValue>
                        {(v: "si" | "no") =>
                          v === "si" ? "Acumulable" : "No acumulable"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No acumulable</SelectItem>
                      <SelectItem value="si">Acumulable</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Canal de aplicación" htmlFor="channelScope">
                  <Select
                    value={values.channelScope}
                    onValueChange={(v) =>
                      setValue("channelScope", v as ChannelScope)
                    }
                  >
                    <SelectTrigger id="channelScope">
                      <SelectValue>
                        {(v: ChannelScope) => CHANNEL_SCOPE_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNEL_SCOPES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CHANNEL_SCOPE_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </Row>
            </Section>
          )}

          {step === 1 && (
            <Section
              title="Condiciones (SI)"
              description="Según el combinador elegido, todas o alguna condición debe cumplirse para activar la promoción."
            >
              <ConditionsBuilder
                control={control}
                onCombinatorChange={(v) => setValue("conditionCombinator", v)}
                categories={categories}
                cities={cities}
                segments={segments}
              />
            </Section>
          )}

          {step === 2 && (
            <Section
              title="Recompensa (ENTONCES)"
              description="Beneficio que entrega la promoción al cumplirse las condiciones."
            >
              <Row>
                <Field label="Tipo de beneficio" htmlFor="benefitType">
                  <Select
                    value={values.benefitType}
                    onValueChange={(v) =>
                      setValue("benefitType", v as BenefitType)
                    }
                  >
                    <SelectTrigger id="benefitType">
                      <SelectValue>
                        {(v: BenefitType) => BENEFIT_TYPE_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BENEFIT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {BENEFIT_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label={
                    values.benefitType === "descuento_porcentual"
                      ? "Valor (%)"
                      : "Valor"
                  }
                  htmlFor="benefitValue"
                  error={errors.benefitValue?.message}
                >
                  {values.benefitType === "descuento_porcentual" ? (
                    <Input
                      id="benefitValue"
                      type="number"
                      step="0.1"
                      {...register("benefitValue", { valueAsNumber: true })}
                    />
                  ) : (
                    <CurrencyInput
                      id="benefitValue"
                      {...register("benefitValue", {
                        valueAsNumber: true,
                      })}
                    />
                  )}
                </Field>
                <Field
                  label="Tope máximo (opcional)"
                  htmlFor="maxCap"
                  error={errors.maxCap?.message}
                >
                  <CurrencyInput
                    id="maxCap"
                    {...register("maxCap", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </Field>
              </Row>
              <Row>
                <Field label="Aplicar sobre" htmlFor="applyTo">
                  <Select
                    value={values.applyTo}
                    onValueChange={(v) => setValue("applyTo", v as ApplyTo)}
                  >
                    <SelectTrigger id="applyTo">
                      <SelectValue>
                        {(v: ApplyTo) => APPLY_TO_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {APPLY_TO_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {APPLY_TO_LABEL[o]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Usos por cliente (opcional)"
                  htmlFor="usesPerMember"
                >
                  <Stepper
                    value={values.usesPerMember ?? 0}
                    onValueChange={(v) =>
                      setValue("usesPerMember", v === 0 ? undefined : v)
                    }
                    min={0}
                    max={30}
                  />
                </Field>
                <Field label="Periodo" htmlFor="usagePeriod">
                  <Select
                    value={values.usagePeriod}
                    onValueChange={(v) =>
                      setValue("usagePeriod", v as UsagePeriod)
                    }
                  >
                    <SelectTrigger id="usagePeriod">
                      <SelectValue>
                        {(v: UsagePeriod) => USAGE_PERIOD_LABEL[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {USAGE_PERIODS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {USAGE_PERIOD_LABEL[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </Row>
            </Section>
          )}

          {step === 3 && (
            <Section
              title="Vigencia"
              description="Fechas de la campaña y presupuesto asignado."
            >
              <Row>
                <Field
                  label="Fecha de inicio"
                  htmlFor="validFrom"
                  required
                  error={errors.validFrom?.message}
                >
                  <Input
                    id="validFrom"
                    type="date"
                    {...register("validFrom")}
                  />
                </Field>
                <Field
                  label="Fecha de fin"
                  htmlFor="validUntil"
                  hint={
                    hasNoEndDate ? "Sin fecha de fin = permanente." : undefined
                  }
                >
                  <Input
                    id="validUntil"
                    type="date"
                    {...register("validUntil")}
                  />
                </Field>
                <Field
                  label="Presupuesto asignado"
                  htmlFor="assignedBudget"
                  error={errors.assignedBudget?.message}
                >
                  <CurrencyInput
                    id="assignedBudget"
                    {...register("assignedBudget", {
                      setValueAs: (v) => (v === "" ? 0 : Number(v)),
                    })}
                  />
                </Field>
              </Row>
            </Section>
          )}

          {step === 4 && (
            <Section
              title="Resumen"
              description="Revisa todo antes de guardar."
            >
              <PromotionReviewSummary
                values={values as Partial<PromotionValues>}
                categories={categories}
                segments={segments}
              />
            </Section>
          )}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={previous}
              disabled={step === 0}
            >
              Anterior
            </Button>
            {step < STEPS.length - 1 && (
              <Button type="button" onClick={next}>
                Siguiente
              </Button>
            )}
          </div>
        </div>

        <div className="flex w-[330px] shrink-0 flex-col gap-3.5">
          <PromotionSummaryCard
            excludeId={promotion?.id}
            conditions={(values.conditions ?? []) as Condition[]}
            segments={segments}
            channelScope={values.channelScope ?? "pos_ecommerce"}
            priority={values.priority ?? 5}
            onSave={(status) => save(status)()}
            saving={saving}
          />
        </div>
      </div>
    </form>
  )
}
