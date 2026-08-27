import type {
  AccrualTiming,
  BalanceInitialState,
  BenefitType,
  EnrollmentRequirement,
  TriggerEvent,
} from "@/types/domain"

export const PROGRAM_RULE_IDS = [
  "S04",
  "S06",
  "S08",
  "S13",
  "S14",
  "S21",
  "S24",
] as const
export type ProgramRuleId = (typeof PROGRAM_RULE_IDS)[number]

/**
 * S13/S14 son las únicas que de verdad necesitan datos de servidor
 * (otras promociones activas, techo del programa). `simulatePromotionAction`
 * llama a `evaluateProgramRules` con el mismo `parsedInput` que ya usa para
 * las colisiones, pero ese `parsedInput` no trae todos los campos que
 * S04/S08/S21/S24 necesitan (ej. `registraUso`, `eventoGatillo`) — filtrar
 * a este set antes de devolver el resultado evita falsos positivos (y la
 * duplicación con las mismas reglas ya evaluadas en cliente con datos
 * completos, vía `PromotionSummaryCard`).
 */
export const SERVER_CONTEXT_RULE_IDS: ProgramRuleId[] = ["S13", "S14"]

/** El paso del asistente (índice de `STEPS` en `promotion-form.tsx`) donde se corrige cada regla. */
export const PROGRAM_RULE_STEP: Record<ProgramRuleId, number> = {
  S04: 4,
  // Paso "Economía", donde viven el contrato y el porcentaje del proveedor.
  S06: 5,
  S08: 2,
  S13: 4,
  S14: 4,
  S21: 2,
  S24: 2,
}

export type ProgramRuleIssue = {
  rule: ProgramRuleId
  message: string
  step: number
}

/**
 * Subconjunto de `PromotionValues` (lado formulario) — deliberadamente no
 * importa `../schemas` para poder aceptar también el `parsedInput` de
 * `simulatePromotionSchema` (lado servidor), que solo trae un recorte de
 * los mismos nombres de campo.
 */
export type ProgramRuleInput = {
  benefitType?: BenefitType
  benefitValue?: number
  stackable?: boolean
  exclusionGroup?: string
  priority?: number
  momentoAcreditacion?: AccrualTiming
  estadoInicial?: BalanceInitialState
  registraUso?: boolean
  eventoGatillo?: TriggerEvent
  requisitoAlta?: EnrollmentRequirement
  /** S06 — quién paga la promoción, y con qué respaldo documental. */
  financiador?: string
  contratoId?: string
  porcentajeCostoProveedor?: number
}

/** Otra promoción activa, ya reducida a los campos que S13/S14 necesitan. */
export type ProgramRuleActivePromotion = {
  id: string
  name: string
  priority: number
  exclusionGroup: string | null
  stackable: boolean
  benefitType: string
  benefitValue: number | null
}

export type ProgramRulesContext = {
  activePromotions?: ProgramRuleActivePromotion[]
  stackedDiscountCeilingPct?: number
}

const BALANCE_TIMING_BENEFIT_TYPES = new Set<BenefitType>([
  "multiplicador_puntos",
  "bono_puntos",
])

/**
 * Reglas de negocio de severidad "alta" (doc §"Reglas de negocio"): nunca
 * bloquean guardar/publicar, solo se muestran como advertencia en el panel
 * de revisión previa (07.1 "Resumen"). S13/S14 solo se evalúan cuando
 * `context.activePromotions`/`stackedDiscountCeilingPct` llegan (dependen
 * de datos del servidor); sin ellos simplemente no se emiten — el doc
 * (línea 861) contempla "declarado, todavía no evaluado" como estado
 * válido. S25 (duplicados) no vive aquí: ya la cubre el panel de
 * colisiones existente (`lib/collision.ts`), que es advisory desde su
 * origen.
 */
export function evaluateProgramRules(
  values: ProgramRuleInput,
  context: ProgramRulesContext = {}
): ProgramRuleIssue[] {
  const issues: ProgramRuleIssue[] = []
  const push = (rule: ProgramRuleId, message: string) =>
    issues.push({ rule, message, step: PROGRAM_RULE_STEP[rule] })

  // S06 · Financiada por un tercero sin contrato o sin porcentaje.
  //
  // Advierte, no bloquea: los dos datos se negocian con el proveedor y a
  // menudo llegan después de armar la promoción. Exigirlos para guardar
  // llevaba a inventarlos, que es peor que no tenerlos — un contrato
  // inventado se ve igual de completo que uno real.
  if (values.financiador && values.financiador !== "retailer") {
    const faltan = [
      !values.contratoId ? "el contrato" : null,
      values.porcentajeCostoProveedor === undefined
        ? "el porcentaje que absorbe"
        : null,
    ].filter(Boolean)
    if (faltan.length) {
      push(
        "S06",
        `La promoción la financia un tercero pero falta ${faltan.join(" y ")} — sin eso el costo no se puede repartir ni reclamar.`
      )
    }
  }

  if (values.stackable === false && !values.exclusionGroup) {
    push(
      "S04",
      "Esta promoción no es acumulable — declara un grupo de exclusión para que el motor sepa a cuáles bloquea."
    )
  }

  if (
    values.benefitType &&
    BALANCE_TIMING_BENEFIT_TYPES.has(values.benefitType) &&
    values.momentoAcreditacion === "diferido" &&
    values.estadoInicial !== "pendiente"
  ) {
    push(
      "S08",
      "Acreditación diferida con saldo inicial «disponible» — el socio podría gastar puntos antes de que cierre la ventana de devolución."
    )
  }

  if (values.benefitType === "envio_gratis" && !values.registraUso) {
    push(
      "S21",
      "Este beneficio no transaccional no registra uso — su costo queda sin poder defenderse."
    )
  }

  if (
    values.benefitType === "bono_puntos" &&
    values.eventoGatillo === "alta_socio" &&
    !values.requisitoAlta
  ) {
    push(
      "S24",
      "El bono por alta de socio no exige ningún requisito — podría otorgarse a cuentas incompletas."
    )
  }

  const activePromotions = context.activePromotions ?? []

  if (values.exclusionGroup && values.priority !== undefined) {
    const duplicate = activePromotions.find(
      (p) =>
        p.exclusionGroup === values.exclusionGroup &&
        p.priority === values.priority
    )
    if (duplicate) {
      push(
        "S13",
        `"${duplicate.name}" ya usa la prioridad ${duplicate.priority} en el grupo de exclusión "${values.exclusionGroup}" — el desempate queda al orden de evaluación del POS.`
      )
    }
  }

  if (
    values.stackable &&
    values.benefitType === "descuento_porcentual" &&
    context.stackedDiscountCeilingPct !== undefined
  ) {
    const stackedPct = activePromotions
      .filter((p) => p.stackable && p.benefitType === "descuento_porcentual")
      .reduce((sum, p) => sum + (p.benefitValue ?? 0), values.benefitValue ?? 0)
    if (stackedPct > context.stackedDiscountCeilingPct) {
      push(
        "S14",
        `Sumada a otras promociones acumulables activas, el descuento apilado llega a ${stackedPct}% — por encima del techo del programa (${context.stackedDiscountCeilingPct}%).`
      )
    }
  }

  return issues
}
