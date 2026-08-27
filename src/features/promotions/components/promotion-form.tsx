"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch, type Resolver } from "react-hook-form"

import { Chip } from "@/components/filters/chip"
import { CurrencyInput } from "@/components/form/currency-input"
import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { OptionPicker } from "@/components/form/option-picker"
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
  APPLICATION_LEVELS,
  CHANNEL_SCOPES,
  APPLY_TO_OPTIONS,
  COST_NATURES,
  DAYS_OF_WEEK,
  FINANCIADORES,
  PRICE_BASES,
  PROMOTION_PUBLICATION_STATUSES,
  PROMOTION_TYPES,
  RX_APPLICABILITIES,
  SETTLEMENT_PERIODS,
  STACKING_MODES,
  type AccrualTiming,
  type ApplicationLevel,
  type BalanceInitialState,
  type BalanceType,
  type ChannelScope,
  type ApplyTo,
  type BxgyScope,
  type ContinuityBreakBehavior,
  type ContinuityWindowUnit,
  type CostNature,
  type DayOfWeek,
  type EnrollmentRequirement,
  type Financiador,
  type MultiplierResolutionMode,
  type NonTransactionalBenefitType,
  type PieceSelectionCriterion,
  type PointsDebitTiming,
  type PriceBasis,
  type PromotionPublicationStatus,
  type BenefitType,
  type DiscountTierCalculationMode,
  type DiscountTierThresholdType,
  type PromotionType,
  type ReturnEffect,
  type RxApplicability,
  type SettlementPeriod,
  type StackingMode,
  type TierName,
  type TriggerEvent,
  type TriggerFrequency,
  type TriggerResolutionMoment,
  type WalletValueType,
} from "@/types/domain"

import {
  updatePromotionAction,
  createPromotionAction,
} from "../actions/promotions"
import {
  BENEFIT_TYPES_WITH_APPLY_TO,
  MECHANIC_FIELDS,
  PROMOTION_TYPE_MECHANICS,
} from "../lib/mechanic-fields"
import { createPromotionDefaults } from "../lib/promotion-defaults"
import { ConditionsBuilder } from "./conditions-builder"
import { DiscountTiersBuilder } from "./discount-tiers-builder"
import { LimitsBuilder } from "./limits-builder"
import { MechanicConfigForm } from "./mechanic-config-form"
import { MechanicPicker, applyMechanicChange } from "./mechanic-picker"
import { PromotionReviewSummary } from "./promotion-review-summary"
import { PromotionRuleReading } from "./promotion-rule-reading"
import { PromotionStatusActions } from "./promotion-status-actions"
import { PromotionStepper } from "./promotion-stepper"
import { PromotionSummaryCard } from "./promotion-summary-card"
import {
  APPLICATION_LEVEL_LABEL,
  APPLY_TO_LABEL,
  CHANNEL_SCOPE_LABEL,
  BENEFIT_TYPE_LABEL,
  COST_NATURE_ACCOUNT_LABEL,
  COST_NATURE_LABEL,
  DAY_OF_WEEK_LABEL,
  FINANCIADOR_LABEL,
  PRICE_BASIS_LABEL,
  PROMOTION_PUBLICATION_STATUS_DESCRIPTION,
  PROMOTION_STATUS_LABEL,
  PROMOTION_TYPE_LABEL,
  RX_APPLICABILITY_LABEL,
  SETTLEMENT_PERIOD_LABEL,
  STACKING_MODE_LABEL,
} from "../lib/labels"
import { buildRuleReadingNames } from "../lib/rule-reading"
import {
  ALLOWED_STATUS_TRANSITIONS,
  isPromotionLocked,
  promotionStatus,
} from "../lib/status"
import type {
  ConditionNode,
  ConditionOptions,
  Promotion,
  ProductOption,
  SupplierOption,
} from "../lib/queries"
import { promotionSchema, type PromotionValues } from "../schemas"

const STEPS = [
  "Mecánica",
  "Condiciones",
  "Configuración",
  "Vigencia",
  "Límites",
  "Economía",
  "Resumen",
] as const

/**
 * Reemplaza el antiguo `FIELDS_BY_STEP` estático: el paso "Configuración"
 * (índice 2) depende de la mecánica elegida, así que sus campos se calculan
 * con `MECHANIC_FIELDS[benefitType]` en vez de una unión fija de los ~16
 * campos posibles (eso validaría campos de mecánicas que no están activas).
 */
function fieldsForStep(
  step: number,
  benefitType: BenefitType
): (keyof PromotionValues)[] {
  switch (step) {
    case 0:
      return [
        "name",
        "code",
        "type",
        "priority",
        "stackable",
        "channelScope",
        "benefitType",
      ]
    case 1:
      return ["conditions"]
    case 2:
      return [...MECHANIC_FIELDS[benefitType]]
    case 3:
      return ["validFrom", "validUntil", "daysOfWeek", "horaInicio", "horaFin"]
    case 4:
      return ["limites", "assignedBudget", "exclusionGroup", "stackingMode"]
    case 5:
      return [
        "naturalezaCosto",
        "financiador",
        "proveedorId",
        "contratoId",
        "porcentajeCostoProveedor",
        "periodoLiquidacion",
        "umbralAlertaPresupuestoPct",
        "nivelAplicacion",
        "aplicaSobrePrecio",
        "descuentoAcumulaPuntos",
        "aplicaARx",
        "aprobacionRegulatoria",
      ]
    default:
      return []
  }
}

type PromotionFormProps = {
  options: ConditionOptions
  products: ProductOption[]
  suppliers: SupplierOption[]
  promotion?: Promotion
  /**
   * Bitácora de la promoción, en el panel derecho debajo de las acciones.
   * Llega como slot ya renderizado (no como datos) porque su consulta vive
   * en el Server Component de la página — este formulario es de cliente.
   */
  historyCard?: React.ReactNode
}

/**
 * Figma "07.1 · Regla · configuración" (633:658) + "Mecánica" (725:3561) +
 * "07.5 · Paso 4 · Vigencia" (1399:6) + "07.6 · Paso 5 · Límites y
 * stacking" (1401:28), stepper `NavStepperRegla` compartido por todas
 * ellas — adaptados a "crear/editar promoción": wizard real de 7 pasos
 * (un paso visible a la vez, navegación libre por el stepper, bloqueada
 * hacia adelante mientras se crea si el paso actual no es válido — ver
 * `handleStepClick`) — Mecánica → Condiciones → Configuración → Vigencia
 * → Límites → Economía → Resumen. El propio stepper del Figma nunca
 * separa "Definición" de "Mecánica" — el paso 1 es un solo "Mecánica" que
 * incluye identidad (nombre/código/prioridad/canal) y el selector visual
 * de `BenefitType`; "Economía" y "Resumen" son diseño propio (el Figma no
 * los detalla, pero el stepper sí los contempla).
 */
export function PromotionForm({
  options,
  products,
  suppliers,
  promotion,
  historyCard,
}: PromotionFormProps) {
  const router = useRouter()
  const [generalError, setGeneralError] = useState<string>()
  const isEditing = Boolean(promotion)
  /**
   * Una promoción deja de ser editable en cuanto se publica: sus campos
   * pasan a ser de solo lectura (`<fieldset disabled>` más abajo) y lo
   * único que admite cambios es su estado. Por eso se abre directamente en
   * "Resumen", el paso donde vive el campo "Estado".
   */
  const locked = promotion ? isPromotionLocked(promotion) : false
  const [step, setStep] = useState(locked ? STEPS.length - 1 : 0)
  const savedStatus = promotion
    ? (promotion.estado_publicacion as PromotionPublicationStatus)
    : undefined

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<PromotionValues>({
    // El árbol recursivo de `conditions` (`ConditionGroupValues`, ver
    // schemas.ts) hace que `zodResolver` no logre fijar su tercer genérico
    // (`TFieldValues` queda sin resolver) — un cast explícito al `Resolver`
    // esperado evita el error en cascada "Two different types with this
    // name exist, but they are unrelated" en cada sitio que consume
    // `control`/`handleSubmit`.
    resolver: zodResolver(promotionSchema) as Resolver<PromotionValues>,
    defaultValues: promotion
      ? {
          name: promotion.nombre,
          code: promotion.codigo,
          type: promotion.tipo as PromotionType,
          priority: promotion.prioridad,
          stackable: promotion.acumulable,
          channelScope: promotion.canal_aplicacion as ChannelScope,
          conditions: promotion.condiciones as PromotionValues["conditions"],
          benefitType: promotion.tipo_beneficio as BenefitType,
          // `?? undefined`, no `?? 0`: en una promoción escalonada
          // `valor_beneficio` es `null` y ese campo ni se renderiza — con
          // `0` el `positive()` del schema fallaría en silencio y
          // bloquearía "Siguiente" sin mostrar ningún error visible.
          benefitValue: promotion.valor_beneficio ?? undefined,
          maxCap: promotion.tope_maximo ?? undefined,
          discountTiers:
            (promotion.escalones as PromotionValues["discountTiers"] | null) ??
            [],
          thresholdType:
            (promotion.umbral_tipo as DiscountTierThresholdType) ?? "unidades",
          tierCalculationMode:
            (promotion.modo_calculo as DiscountTierCalculationMode) ??
            "escalon_unico",
          // `aplicar_sobre` también guarda "producto"/"envio" para mecánicas
          // que no muestran este selector (ver `PRODUCT_LEVEL_BENEFIT_TYPES`
          // en `lib/to-row.ts`) — valores fuera del enum `ApplyTo` (que solo
          // tiene sentido para las 3 mecánicas de `BENEFIT_TYPES_WITH_APPLY_TO`).
          // Sin este fallback, reabrir esas promociones para editar deja
          // `applyTo` en un valor que el schema rechaza y bloquea "Guardar"
          // con un error genérico, sin tocar este campo en ningún paso.
          applyTo: (APPLY_TO_OPTIONS as readonly string[]).includes(
            promotion.aplicar_sobre
          )
            ? (promotion.aplicar_sobre as ApplyTo)
            : "subtotal_carrito",
          // por_piezas (BxGy)
          compraCantidad: promotion.compra_cantidad ?? undefined,
          pagaCantidad: promotion.paga_cantidad ?? undefined,
          alcancePiezas: (promotion.alcance_piezas as BxgyScope) ?? undefined,
          descuentoUnidadExtraPct:
            promotion.descuento_unidad_extra_pct ?? undefined,
          mezclaEnUniverso: promotion.mezcla_en_universo,
          // producto_gratis + por_piezas (alcance producto_especifico)
          productoCompradoId: promotion.producto_comprado_id ?? undefined,
          // producto_gratis
          productoRegaloId: promotion.producto_regalo_id ?? undefined,
          cantidadRegalo: promotion.cantidad_regalo ?? undefined,
          // producto_gratis (T05)
          cantidadMinimaComprada:
            promotion.cantidad_minima_comprada ?? undefined,
          beneficioSobreRegaloPct:
            promotion.beneficio_sobre_regalo_pct ?? undefined,
          // precio_fijo_bundle — `[]`, no `undefined`: `Multiselect` hace
          // `.filter()` sobre `value` y explota si llega `undefined`.
          productosBundleIds: promotion.productos_bundle_ids ?? [],
          // multiplicador_puntos
          multiplicadorPuntos: promotion.multiplicador_puntos ?? undefined,
          nivelesRequeridos:
            (promotion.niveles_requeridos as TierName[] | null) ?? [],
          modoResolucionMultiplicador:
            (promotion.modo_resolucion_multiplicador as MultiplierResolutionMode) ??
            "gana_mayor",
          // multiplicador_puntos + bono_puntos (S08, S10)
          tipoSaldo: promotion.tipo_saldo as BalanceType,
          momentoAcreditacion: promotion.momento_acreditacion as AccrualTiming,
          estadoInicial: promotion.estado_inicial as BalanceInitialState,
          // bono_puntos
          bonoPuntos: promotion.bono_puntos ?? undefined,
          // envio_gratis + bono_puntos + emitir_cupon
          montoMinimoDisparo: promotion.monto_minimo_disparo ?? undefined,
          // envio_gratis (T17)
          tipoBeneficioNoTransaccional:
            (promotion.tipo_beneficio_no_transaccional as NonTransactionalBenefitType) ??
            "envio_gratis",
          validacionRequerida: promotion.validacion_requerida ?? undefined,
          cupoDisponible: promotion.cupo_disponible ?? undefined,
          registraUso: promotion.registra_uso,
          // emitir_cupon
          couponBatchId: promotion.coupon_batch_id ?? undefined,
          motivoEmision: promotion.motivo_emision ?? undefined,
          // emitir_cupon (T14)
          umbralPuntos: promotion.umbral_puntos ?? undefined,
          duracionCuponDias: promotion.duracion_cupon_dias ?? undefined,
          // emitir_cupon (S09/S18)
          momentoDebitoPuntos:
            (promotion.momento_debito_puntos as PointsDebitTiming) ?? undefined,
          devolucionSiVence: promotion.devolucion_si_vence,
          // disparador transversal (T23) — bono_puntos / emitir_cupon
          eventoGatillo:
            (promotion.evento_gatillo as TriggerEvent) ?? undefined,
          momentoResolucion:
            (promotion.momento_resolucion as TriggerResolutionMoment) ??
            undefined,
          frecuenciaDisparo:
            (promotion.frecuencia_disparo as TriggerFrequency) ?? undefined,
          // S24 · bono por evento — bono_puntos / emitir_cupon
          requisitoAlta:
            (promotion.requisito_alta as EnrollmentRequirement) ?? undefined,
          elegibleEnInactividad: promotion.elegible_en_inactividad,
          // precio_especial (T03)
          precioPromocional: promotion.precio_promocional ?? undefined,
          precioReferencia: promotion.precio_referencia ?? undefined,
          hastaAgotarExistencias: promotion.hasta_agotar_existencias,
          respetaPrecioMinimoLegal: promotion.respeta_precio_minimo_legal,
          // cashback (T13)
          tipoMonedero: promotion.tipo_monedero as WalletValueType,
          disponibilidadDias: promotion.disponibilidad_dias ?? undefined,
          vigenciaSaldoDias: promotion.vigencia_saldo_dias ?? undefined,
          montoMinimoCanje: promotion.monto_minimo_canje ?? undefined,
          // descuento_continuidad
          ventanaContinuidadCantidad:
            promotion.ventana_continuidad_cantidad ?? undefined,
          ventanaContinuidadUnidad:
            (promotion.ventana_continuidad_unidad as ContinuityWindowUnit) ??
            "dias",
          alRomperContinuidad:
            (promotion.al_romper_continuidad as ContinuityBreakBehavior) ??
            undefined,
          acumulaRetroactivo: promotion.acumula_retroactivo,
          efectoDevolucion:
            (promotion.efecto_devolucion as ReturnEffect) ?? undefined,
          criterioSeleccionPiezas:
            (promotion.criterio_seleccion_piezas as PieceSelectionCriterion) ??
            undefined,
          validFrom: promotion.vigente_desde,
          validUntil: promotion.vigente_hasta ?? undefined,
          daysOfWeek: (promotion.dias_semana as DayOfWeek[] | null) ?? [],
          horaInicio: promotion.hora_inicio ?? undefined,
          horaFin: promotion.hora_fin ?? undefined,
          limites:
            (promotion.limites as PromotionValues["limites"] | null) ?? [],
          assignedBudget: promotion.presupuesto_asignado,
          exclusionGroup: promotion.grupo_exclusion ?? undefined,
          stackingMode:
            (promotion.modo_multiple as StackingMode) ?? "mejor_beneficio",
          naturalezaCosto: promotion.naturaleza_costo as CostNature,
          financiador: promotion.financiador as Financiador,
          proveedorId: promotion.proveedor_id ?? undefined,
          contratoId: promotion.contrato_id ?? undefined,
          porcentajeCostoProveedor:
            promotion.porcentaje_costo_proveedor ?? undefined,
          periodoLiquidacion:
            (promotion.periodo_liquidacion as SettlementPeriod) ?? undefined,
          umbralAlertaPresupuestoPct:
            promotion.umbral_alerta_presupuesto_pct ?? undefined,
          nivelAplicacion:
            (promotion.nivel_aplicacion as ApplicationLevel) ?? "ticket",
          aplicaSobrePrecio:
            (promotion.aplica_sobre_precio as PriceBasis) ?? "vigente",
          descuentoAcumulaPuntos: promotion.descuento_acumula_puntos,
          aplicaARx: (promotion.aplica_a_rx as RxApplicability) ?? "permitido",
          aprobacionRegulatoria: promotion.aprobacion_regulatoria,
          publicationStatus:
            promotion.estado_publicacion as PromotionPublicationStatus,
        }
      : createPromotionDefaults("descuento_porcentual"),
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

  const publicationStatus = values.publicationStatus ?? "borrador"

  /**
   * Guardar solo desde "Resumen": es el último paso y donde se elige con
   * qué estado se cierra el formulario, así que no tiene sentido poder
   * guardar antes de haberlo visto.
   */
  const canSave = step === STEPS.length - 1

  function save() {
    if (!canSave) return
    setGeneralError(undefined)
    void handleSubmit(
      (formValues: PromotionValues) => {
        if (promotion) {
          update.execute({ id: promotion.id, ...formValues })
        } else {
          create.execute(formValues)
        }
      },
      () => setGeneralError("Revisa los campos marcados antes de guardar.")
    )()
  }

  async function next() {
    // Bloqueada = nada que validar, los pasos son solo de consulta.
    if (locked) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
      return
    }
    const fields = fieldsForStep(
      step,
      values.benefitType ?? "descuento_porcentual"
    )
    const isValid = await trigger(fields)
    if (isValid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function previous() {
    setStep((s) => Math.max(s - 1, 0))
  }

  /**
   * El stepper permite saltar a cualquier paso con un click — sin esto,
   * al crear (no al editar, donde los datos ya existen y se asumen
   * válidos) se podía saltar directo a "Resumen"/"Guardar" sin haber
   * completado los campos obligatorios de los pasos anteriores, igual
   * que si nunca hubiera pasado por "Siguiente". Retroceder siempre se
   * permite; avanzar valida cada paso intermedio en orden y se detiene
   * en el primero que falle, igual que `next()`.
   */
  async function handleStepClick(target: number) {
    if (isEditing || target <= step) {
      setStep(target)
      return
    }
    for (let s = step; s < target; s++) {
      const fields = fieldsForStep(
        s,
        values.benefitType ?? "descuento_porcentual"
      )
      const isValid = await trigger(fields)
      if (!isValid) {
        setStep(s)
        return
      }
    }
    setStep(target)
  }

  const hasNoEndDate = !values.validUntil
  const isTiered = values.benefitType === "descuento_escalonado"
  // `root` cubre las incidencias que apuntan al árbol completo (las que
  // añade `refineByBenefitType` con `path: ["conditions"]`).
  const conditionsError =
    errors.conditions?.root?.message ?? errors.conditions?.message

  /**
   * Al crear, los cuatro estados son elegibles como estado inicial. Al
   * editar, solo los que admite la transición desde el estado guardado
   * (ninguno vuelve a `borrador` una vez publicada — ver `lib/status.ts`).
   */
  const statusOptions: readonly PromotionPublicationStatus[] = savedStatus
    ? [savedStatus, ...ALLOWED_STATUS_TRANSITIONS[savedStatus]]
    : PROMOTION_PUBLICATION_STATUSES

  const ruleReadingNames = buildRuleReadingNames({
    categories: options.categories,
    segments: options.segments,
    products,
    couponBatches: options.couponBatches,
    tiers: options.tiers,
    storeGroups: options.storeGroups,
  })

  return (
    <form className="flex w-full flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-2xl leading-7 font-semibold text-foreground">
            {locked
              ? "Detalle de la promoción"
              : isEditing
                ? "Editar promoción"
                : "Nueva promoción"}
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            {locked
              ? "Consulta la mecánica, condiciones, configuración, vigencia y límites guardados."
              : "Define mecánica, condiciones, configuración, vigencia y límites de la promoción."}
          </p>
        </div>
      </div>

      {locked && (
        <Message
          variant="info"
          title="Promoción publicada — campos de solo lectura"
          description="Una promoción ya creada solo admite cambios de estado. El resto de los campos se muestran tal como se guardaron."
        />
      )}

      {generalError && (
        <Message
          variant="error"
          title="No se pudo guardar"
          description={generalError}
        />
      )}

      <PromotionStepper
        steps={STEPS}
        current={step}
        onStepClick={handleStepClick}
      />

      <div className="flex w-full items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          {/*
            Fuera del `<fieldset disabled>` de abajo a propósito: es el único
            campo que sigue siendo editable cuando la promoción ya está
            publicada. Un `fieldset` deshabilitado deshabilita a TODOS sus
            descendientes y no hay forma de re-habilitar uno.
          */}
          {step === STEPS.length - 1 && (
            <Section
              title="Estado de la promoción"
              description={
                locked
                  ? "Lo único que se puede cambiar de una promoción ya creada — cada cambio pide un motivo y queda en la bitácora."
                  : "Con qué estado se cierra el formulario — es lo único editable después de crearla."
              }
            >
              {locked && promotion && savedStatus ? (
                <PromotionStatusActions
                  promotionId={promotion.id}
                  savedStatus={savedStatus}
                  displayStatus={promotionStatus(promotion)}
                />
              ) : (
                <Row>
                  <Field
                    label="Estado"
                    htmlFor="publicationStatus"
                    required
                    hint={
                      PROMOTION_PUBLICATION_STATUS_DESCRIPTION[
                        publicationStatus
                      ]
                    }
                    error={errors.publicationStatus?.message}
                    className="max-w-[300px]"
                  >
                    <Select
                      value={publicationStatus}
                      onValueChange={(v) =>
                        setValue(
                          "publicationStatus",
                          v as PromotionPublicationStatus
                        )
                      }
                    >
                      <SelectTrigger id="publicationStatus">
                        <SelectValue>
                          {(v: PromotionPublicationStatus) =>
                            PROMOTION_STATUS_LABEL[v]
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {PROMOTION_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </Row>
              )}
            </Section>
          )}

          <fieldset
            disabled={locked}
            className="flex min-w-0 flex-col gap-3.5 disabled:cursor-default"
          >
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
                      onValueChange={(v) => {
                        const nextType = v as PromotionType
                        setValue("type", nextType)
                        const allowed = PROMOTION_TYPE_MECHANICS[nextType]
                        const currentBenefit =
                          values.benefitType ?? "descuento_porcentual"
                        // Si la mecánica ya elegida no aplica al nuevo tipo, se
                        // cambia a la primera válida — mismo criterio de
                        // limpieza que un cambio manual de mecánica, para no
                        // dejar campos de la mecánica anterior a medio llenar.
                        if (!allowed.includes(currentBenefit)) {
                          const nextBenefit = allowed[0]
                          applyMechanicChange(nextBenefit, setValue)
                          setValue("benefitType", nextBenefit)
                        }
                      }}
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

            {step === 0 && (
              <MechanicPicker
                value={values.benefitType ?? "descuento_porcentual"}
                promotionType={values.type ?? "categoria"}
                onChange={(v) => setValue("benefitType", v)}
                setValue={setValue}
              />
            )}

            {step === 1 && (
              <Section
                title="Condiciones (SI)"
                description="Árbol de condiciones anidadas — grupos Y/O ilimitados, no un combinador único para toda la regla."
              >
                <ConditionsBuilder
                  control={control}
                  onChange={(next) => setValue("conditions", next)}
                  options={options}
                />
                {/*
                  Sin esto, una regla del schema sobre `conditions` (ej.:
                  `descuento_continuidad` exige una condición de producto)
                  bloqueaba "Siguiente" sin decir por qué — este paso no
                  mostraba ningún error propio del árbol.
                */}
                {conditionsError && (
                  <Message
                    variant="error"
                    title="Falta una condición"
                    description={conditionsError}
                  />
                )}
              </Section>
            )}

            {step === 2 && (
              <Section
                title="Configuración de la mecánica"
                description={`Beneficio que entrega "${BENEFIT_TYPE_LABEL[values.benefitType ?? "descuento_porcentual"]}" al cumplirse las condiciones.`}
              >
                {BENEFIT_TYPES_WITH_APPLY_TO.includes(
                  values.benefitType ?? "descuento_porcentual"
                ) ? (
                  <>
                    <Row>
                      {!isTiered && (
                        <Field
                          label={
                            values.benefitType === "descuento_porcentual"
                              ? "Valor (%)"
                              : "Valor"
                          }
                          htmlFor="benefitValue"
                          required
                          error={errors.benefitValue?.message}
                        >
                          {values.benefitType === "descuento_porcentual" ? (
                            <Input
                              id="benefitValue"
                              type="number"
                              step="0.1"
                              {...register("benefitValue", {
                                setValueAs: (v) =>
                                  v === "" ? undefined : Number(v),
                              })}
                            />
                          ) : (
                            <CurrencyInput
                              id="benefitValue"
                              {...register("benefitValue", {
                                setValueAs: (v) =>
                                  v === "" ? undefined : Number(v),
                              })}
                            />
                          )}
                        </Field>
                      )}
                      <Field
                        label="Tope máximo (opcional)"
                        htmlFor="maxCap"
                        error={errors.maxCap?.message}
                      >
                        <CurrencyInput
                          id="maxCap"
                          {...register("maxCap", {
                            setValueAs: (v) =>
                              v === "" ? undefined : Number(v),
                          })}
                        />
                      </Field>
                      <Field label="Aplicar sobre" htmlFor="applyTo">
                        <Select
                          value={values.applyTo}
                          onValueChange={(v) =>
                            setValue("applyTo", v as ApplyTo)
                          }
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
                    </Row>
                    {isTiered && (
                      <DiscountTiersBuilder
                        control={control}
                        register={register}
                        errors={errors}
                        onThresholdTypeChange={(v) =>
                          setValue("thresholdType", v)
                        }
                        onCalculationModeChange={(v) =>
                          setValue("tierCalculationMode", v)
                        }
                      />
                    )}
                  </>
                ) : (
                  <MechanicConfigForm
                    benefitType={values.benefitType ?? "descuento_porcentual"}
                    control={control}
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    products={products}
                    couponBatches={options.couponBatches}
                    onGoToConditionsStep={() => handleStepClick(1)}
                  />
                )}
              </Section>
            )}

            {step === 3 && (
              <Section
                title="Vigencia"
                description="Cuándo corre la regla — rango de fechas y, opcionalmente, días de la semana y horario."
              >
                <Row>
                  <Field
                    label="Vigente desde"
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
                    label="Vigente hasta"
                    htmlFor="validUntil"
                    hint={
                      hasNoEndDate
                        ? "Sin fecha de fin = permanente."
                        : undefined
                    }
                    error={errors.validUntil?.message}
                  >
                    <Input
                      id="validUntil"
                      type="date"
                      {...register("validUntil")}
                    />
                  </Field>
                </Row>
                <Field label="Días de la semana (opcional — vacío = todos los días)">
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const selected = values.daysOfWeek ?? []
                      const active = selected.includes(day)
                      return (
                        <Chip
                          key={day}
                          active={active}
                          onClick={() =>
                            setValue(
                              "daysOfWeek",
                              active
                                ? selected.filter((d) => d !== day)
                                : [...selected, day]
                            )
                          }
                        >
                          {DAY_OF_WEEK_LABEL[day]}
                        </Chip>
                      )
                    })}
                  </div>
                </Field>
                <Row>
                  <Field
                    label="Hora inicio (opcional)"
                    htmlFor="horaInicio"
                    error={errors.horaInicio?.message}
                  >
                    <Input
                      id="horaInicio"
                      type="time"
                      {...register("horaInicio")}
                    />
                  </Field>
                  <Field
                    label="Hora fin (opcional)"
                    htmlFor="horaFin"
                    error={errors.horaFin?.message}
                  >
                    <Input id="horaFin" type="time" {...register("horaFin")} />
                  </Field>
                </Row>
              </Section>
            )}

            {step === 4 && (
              <Section
                title="Límites y stacking"
                description="Cuánto se puede usar la regla y cómo se combina con otras promociones activas."
              >
                <Field
                  label="Límites de uso"
                  error={
                    errors.limites?.root?.message ?? errors.limites?.message
                  }
                  hint="Cada fila combina qué se cuenta, para quién, en qué ventana y qué pasa al exceder — L01–L23 del documento de modalidades son combinaciones de estas 4 decisiones."
                >
                  <LimitsBuilder
                    control={control}
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    benefitType={values.benefitType ?? "descuento_porcentual"}
                  />
                </Field>
                <Row>
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
                  <Field
                    label="Grupo de exclusión (opcional)"
                    htmlFor="exclusionGroup"
                    hint="Promociones con el mismo grupo no se combinan entre sí."
                    error={errors.exclusionGroup?.message}
                  >
                    <Input
                      id="exclusionGroup"
                      placeholder="descuentos_vitaminas"
                      {...register("exclusionGroup")}
                    />
                  </Field>
                  <Field label="Modo si hay múltiples" htmlFor="stackingMode">
                    <Select
                      value={values.stackingMode}
                      onValueChange={(v) =>
                        setValue("stackingMode", v as StackingMode)
                      }
                    >
                      <SelectTrigger id="stackingMode">
                        <SelectValue>
                          {(v: StackingMode) => STACKING_MODE_LABEL[v]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STACKING_MODES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {STACKING_MODE_LABEL[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </Row>
              </Section>
            )}

            {step === 5 && (
              <Section
                title="Economía"
                description="Naturaleza contable del costo y quién financia la promoción."
              >
                <Row>
                  <Field
                    label="Naturaleza del costo"
                    htmlFor="naturalezaCosto"
                    hint={`Cuenta: ${COST_NATURE_ACCOUNT_LABEL[values.naturalezaCosto ?? "margen_sacrificado"]}`}
                  >
                    <Select
                      value={values.naturalezaCosto}
                      onValueChange={(v) =>
                        setValue("naturalezaCosto", v as CostNature)
                      }
                    >
                      <SelectTrigger id="naturalezaCosto">
                        <SelectValue>
                          {(v: CostNature) => COST_NATURE_LABEL[v]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {COST_NATURES.map((n) => (
                          <SelectItem key={n} value={n}>
                            {COST_NATURE_LABEL[n]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label="¿Quién paga la promoción?"
                    htmlFor="financiador"
                  >
                    <Select
                      value={values.financiador}
                      onValueChange={(v) =>
                        setValue("financiador", v as Financiador)
                      }
                    >
                      <SelectTrigger id="financiador">
                        <SelectValue>
                          {(v: Financiador) => FINANCIADOR_LABEL[v]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {FINANCIADORES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {FINANCIADOR_LABEL[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </Row>

                {values.financiador && values.financiador !== "retailer" && (
                  <Row>
                    <Field
                      label="Proveedor"
                      htmlFor="proveedorId"
                      error={errors.proveedorId?.message}
                    >
                      <OptionPicker
                        id="proveedorId"
                        title="Proveedor"
                        description="Quién cofinancia la promoción."
                        placeholder="Elige un proveedor"
                        confirmLabel="Elegir proveedor"
                        options={suppliers.map((s) => ({
                          value: s.id,
                          label: s.name,
                        }))}
                        value={values.proveedorId}
                        onValueChange={(v) => setValue("proveedorId", v)}
                      />
                    </Field>
                    <Field
                      label="Contrato"
                      htmlFor="contratoId"
                      required
                      error={errors.contratoId?.message}
                    >
                      <Input
                        id="contratoId"
                        placeholder="Ej.: CTR-2026-014"
                        {...register("contratoId")}
                      />
                    </Field>
                    <Field
                      label="Porcentaje que absorbe el proveedor"
                      htmlFor="porcentajeCostoProveedor"
                      required
                      error={errors.porcentajeCostoProveedor?.message}
                    >
                      <Input
                        id="porcentajeCostoProveedor"
                        type="number"
                        min="0"
                        max="100"
                        {...register("porcentajeCostoProveedor", {
                          setValueAs: (v) => (v === "" ? undefined : Number(v)),
                        })}
                      />
                    </Field>
                    <Field
                      label="Liquidar al proveedor"
                      htmlFor="periodoLiquidacion"
                    >
                      <Select
                        value={values.periodoLiquidacion}
                        onValueChange={(v) =>
                          setValue("periodoLiquidacion", v as SettlementPeriod)
                        }
                      >
                        <SelectTrigger id="periodoLiquidacion">
                          <SelectValue>
                            {(v: SettlementPeriod) =>
                              SETTLEMENT_PERIOD_LABEL[v]
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {SETTLEMENT_PERIODS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {SETTLEMENT_PERIOD_LABEL[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </Row>
                )}

                <Row>
                  <Field
                    label="Avisar al consumir este % del presupuesto (opcional)"
                    htmlFor="umbralAlertaPresupuestoPct"
                    error={errors.umbralAlertaPresupuestoPct?.message}
                  >
                    <Input
                      id="umbralAlertaPresupuestoPct"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="80"
                      {...register("umbralAlertaPresupuestoPct", {
                        setValueAs: (v) => (v === "" ? undefined : Number(v)),
                      })}
                    />
                  </Field>
                </Row>

                <Row>
                  <Field
                    label="Nivel de aplicación"
                    htmlFor="nivelAplicacion"
                    hint="Sobre qué se calcula el beneficio (S01)."
                  >
                    <Select
                      value={values.nivelAplicacion}
                      onValueChange={(v) =>
                        setValue("nivelAplicacion", v as ApplicationLevel)
                      }
                    >
                      <SelectTrigger id="nivelAplicacion">
                        <SelectValue>
                          {(v: ApplicationLevel) => APPLICATION_LEVEL_LABEL[v]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {APPLICATION_LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {APPLICATION_LEVEL_LABEL[l]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label="Base de precio"
                    htmlFor="aplicaSobrePrecio"
                    hint="Sobre precio de lista o el vigente en el momento (S16)."
                  >
                    <Select
                      value={values.aplicaSobrePrecio}
                      onValueChange={(v) =>
                        setValue("aplicaSobrePrecio", v as PriceBasis)
                      }
                    >
                      <SelectTrigger id="aplicaSobrePrecio">
                        <SelectValue>
                          {(v: PriceBasis) => PRICE_BASIS_LABEL[v]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_BASES.map((b) => (
                          <SelectItem key={b} value={b}>
                            {PRICE_BASIS_LABEL[b]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label="El descuento acumula puntos"
                    htmlFor="descuentoAcumulaPuntos"
                  >
                    <Select
                      value={values.descuentoAcumulaPuntos ? "si" : "no"}
                      onValueChange={(v) =>
                        setValue("descuentoAcumulaPuntos", v === "si")
                      }
                    >
                      <SelectTrigger id="descuentoAcumulaPuntos">
                        <SelectValue>
                          {(v: "si" | "no") => (v === "si" ? "Sí" : "No")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="si">Sí</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </Row>

                <Row>
                  <Field
                    label="Aplicabilidad sobre productos con receta (Rx)"
                    htmlFor="aplicaARx"
                  >
                    <Select
                      value={values.aplicaARx}
                      onValueChange={(v) =>
                        setValue("aplicaARx", v as RxApplicability)
                      }
                    >
                      <SelectTrigger id="aplicaARx">
                        <SelectValue>
                          {(v: RxApplicability) => RX_APPLICABILITY_LABEL[v]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {RX_APPLICABILITIES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {RX_APPLICABILITY_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label="Aprobación regulatoria"
                    htmlFor="aprobacionRegulatoria"
                    hint="Obligatoria si toca productos con receta (S12)."
                    error={errors.aprobacionRegulatoria?.message}
                  >
                    <Select
                      value={values.aprobacionRegulatoria ? "si" : "no"}
                      onValueChange={(v) =>
                        setValue("aprobacionRegulatoria", v === "si")
                      }
                    >
                      <SelectTrigger id="aprobacionRegulatoria">
                        <SelectValue>
                          {(v: "si" | "no") =>
                            v === "si" ? "Aprobada" : "No aprobada"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No aprobada</SelectItem>
                        <SelectItem value="si">Aprobada</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </Row>
              </Section>
            )}

            {step === 6 && (
              <>
                <Section
                  title="Cómo lee el motor esta promoción"
                  description="La misma configuración, encadenada como la regla que se va a evaluar."
                >
                  <PromotionRuleReading
                    values={values as Partial<PromotionValues>}
                    names={ruleReadingNames}
                  />
                </Section>

                <Section
                  title="Resumen"
                  description="Todo lo capturado, campo por campo."
                >
                  <PromotionReviewSummary
                    values={values as Partial<PromotionValues>}
                    categories={options.categories}
                    segments={options.segments}
                    products={products}
                    couponBatches={options.couponBatches}
                    tiers={options.tiers}
                    storeGroups={options.storeGroups}
                    suppliers={suppliers}
                  />
                </Section>
              </>
            )}
          </fieldset>

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
            conditions={
              (values.conditions ?? {
                combinador: "todas",
                condiciones: [],
              }) as ConditionNode
            }
            segments={options.segments}
            channelScope={values.channelScope ?? "pos_ecommerce"}
            priority={values.priority ?? 5}
            values={values as Partial<PromotionValues>}
            publicationStatus={publicationStatus}
            onSave={save}
            canSave={canSave}
            saving={saving}
            locked={locked}
          />
          {historyCard}
        </div>
      </div>
    </form>
  )
}
