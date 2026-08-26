import { z } from "zod"

import {
  ACCRUAL_TIMINGS,
  APPLICATION_LEVELS,
  CHANNEL_SCOPES,
  APPLY_TO_OPTIONS,
  BALANCE_INITIAL_STATES,
  BALANCE_TYPES,
  BXGY_SCOPES,
  CONDITION_COMBINATORS,
  CONTINUITY_BREAK_BEHAVIORS,
  CONTINUITY_WINDOW_UNITS,
  COST_NATURES,
  DAYS_OF_WEEK,
  DISCOUNT_TIER_CALCULATION_MODES,
  DISCOUNT_TIER_THRESHOLD_TYPES,
  ENROLLMENT_REQUIREMENTS,
  FINANCIADORES,
  LIMIT_EXCESS_BEHAVIORS,
  LIMIT_SUBJECTS,
  LIMIT_UNITS,
  LIMIT_WINDOWS,
  MULTIPLIER_RESOLUTION_MODES,
  NON_TRANSACTIONAL_BENEFIT_TYPES,
  PIECE_SELECTION_CRITERIA,
  POINTS_DEBIT_TIMINGS,
  PRICE_BASES,
  PROMOTION_PUBLICATION_STATUSES,
  PROMOTION_STATUS_CHANGE_REASONS,
  BENEFIT_TYPES,
  PROMOTION_TYPES,
  RETURN_EFFECTS,
  RX_APPLICABILITIES,
  SETTLEMENT_PERIODS,
  STACKING_MODES,
  TIER_NAMES,
  TRIGGER_EVENTS,
  TRIGGER_FREQUENCIES,
  TRIGGER_RESOLUTION_MOMENTS,
  WALLET_VALUE_TYPES,
  type ConditionCombinator,
} from "@/types/domain"

import { flattenConditionTree } from "./lib/condition-tree"

export const conditionSchema = z.discriminatedUnion("campo", [
  z.object({
    campo: z.literal("categoria"),
    valor: z.array(z.string().uuid()).min(1, "Elige al menos una categoría"),
  }),
  // Referencia directa a `productos.id` (no un atributo del producto como
  // `categoria`/`producto_marca`) — para acotar la promoción a uno o
  // varios SKU puntuales desde el árbol de condiciones.
  z.object({
    campo: z.literal("producto"),
    valor: z.array(z.string().uuid()).min(1, "Elige al menos un producto"),
  }),
  z.object({
    campo: z.literal("tienda"),
    valor: z.string().min(1, "Elige una ciudad"),
  }),
  z.object({
    campo: z.literal("segmento"),
    valor: z.string().min(1),
  }),
  z.object({
    campo: z.literal("monto_carrito"),
    valor: z.number().nonnegative(),
  }),
  // T15 · "Cupón con código" — referencia una `coupon_batch` existente
  // (su `code_pattern`/`max_uses_per_coupon` ya viven en el módulo de
  // Cupones); la promoción solo declara que exige ese código como
  // condición de entrada, no que lo emite (eso es `emitir_cupon`).
  z.object({
    campo: z.literal("cupon_codigo"),
    valor: z.string().uuid("Elige una emisión de cupones"),
  }),
  // --- Atributos del socio, tienda y producto (dominios "Cliente" /
  // "Tienda" / "Producto" del selector) — cada uno respaldado por una
  // columna real (`members`/`tiers`, `tiendas`, `productos`), sin motor
  // de evaluación en vivo, igual que el resto del módulo.
  z.object({
    campo: z.literal("socio_nivel"),
    valor: z.array(z.string().uuid()).min(1, "Elige al menos un nivel"),
  }),
  z.object({
    campo: z.literal("socio_provincia"),
    valor: z.array(z.string()).min(1, "Elige al menos una provincia"),
  }),
  z.object({
    campo: z.literal("socio_antiguedad"),
    valor: z.number().int().nonnegative(),
  }),
  z.object({
    campo: z.literal("socio_edad"),
    valor: z.number().int().nonnegative(),
  }),
  // Atributos demográficos del socio — los mismos que ya muestra el
  // detalle de cliente (`member-hero.tsx`, "Ver más"). `genero`/
  // `estado_civil` en array plano (no `z.enum`), mismo criterio que
  // `socio_provincia`/`tienda_formato`: la forma acotada la impone el
  // selector en la UI, no el schema.
  z.object({
    campo: z.literal("genero"),
    valor: z.array(z.string()).min(1, "Elige al menos un género"),
  }),
  z.object({
    campo: z.literal("estado_civil"),
    valor: z.array(z.string()).min(1, "Elige al menos un estado civil"),
  }),
  z.object({
    campo: z.literal("tiene_hijos"),
    valor: z.boolean(),
  }),
  z.object({
    campo: z.literal("tiene_mascotas"),
    valor: z.boolean(),
  }),
  z.object({
    campo: z.literal("tienda_region"),
    valor: z.array(z.string()).min(1, "Elige al menos una región"),
  }),
  z.object({
    campo: z.literal("tienda_formato"),
    valor: z.array(z.string()).min(1, "Elige al menos un formato"),
  }),
  z.object({
    campo: z.literal("producto_marca"),
    valor: z.array(z.string()).min(1, "Elige al menos una marca"),
  }),
  z.object({
    campo: z.literal("producto_proveedor"),
    valor: z.array(z.string()).min(1, "Elige al menos un proveedor"),
  }),
  // `productos.requiere_receta` (docs/promociones.md §8) — booleano real
  // del catálogo, mismo patrón que `tiene_hijos`/`tiene_mascotas`.
  z.object({
    campo: z.literal("producto_receta"),
    valor: z.boolean(),
  }),
])

/**
 * Árbol de condiciones (docs: paso "Condiciones (SI)" del Figma
 * "07.2 · Paso 2 · Condiciones · árbol", 1395:6) — grupos Y/O anidados sin
 * límite de profundidad. Una hoja es exactamente `conditionSchema` de
 * arriba, sin cambios; lo único nuevo es el grupo, que se distingue de una
 * hoja ESTRUCTURALMENTE (tiene `condiciones`) — mismo criterio que ya usa
 * `features/builder/inspector/condition-preview.ts` para su propio árbol
 * de `segments.condiciones` (no se importa, aislamiento entre features).
 * `z.lazy` + anotación explícita `z.ZodType<T>` porque zod necesita la
 * ayuda para inferir un tipo auto-referenciado — mismo idioma que ya usa
 * el repo en `features/builder/inspector/actions.ts`.
 */
export type ConditionGroupValues = {
  combinador: ConditionCombinator
  condiciones: ConditionNodeValues[]
}
export type ConditionNodeValues = ConditionValues | ConditionGroupValues

const conditionGroupSchema: z.ZodType<ConditionGroupValues> = z.lazy(() =>
  z.object({
    combinador: z.enum(CONDITION_COMBINATORS),
    condiciones: z
      .array(z.union([conditionSchema, conditionGroupSchema]))
      .max(8, "Máximo 8 condiciones o subgrupos directos por grupo"),
  })
)

/** Máximo de escalones por promoción — mismo espíritu que `conditions.max(8)`. */
export const MAX_DISCOUNT_TIERS = 6

/** Máximo de SKU en un bundle a precio fijo. */
export const MAX_BUNDLE_PRODUCTS = 10

/** Los 23 límites del documento de modalidades — tope práctico, no una regla de negocio. */
export const MAX_LIMITS = 23

/**
 * Un límite (paso "Límites", docs/modalidades-promocion-contexto.md
 * L01–L23) son 4 decisiones independientes — ver
 * `features/promotions/lib/limits.ts` para el porqué de cada una.
 * `ventanaDias` solo tiene sentido con `ventana: "rolling"`, así que se
 * valida cruzado abajo en vez de ser requerido en la forma.
 */
const limitSchema = z
  .object({
    unidad: z.enum(LIMIT_UNITS),
    sujeto: z.enum(LIMIT_SUBJECTS),
    ventana: z.enum(LIMIT_WINDOWS),
    ventanaDias: z.number().int().positive().optional(),
    tope: z.number().positive("Ingresa un tope mayor a 0"),
    alExceder: z.enum(LIMIT_EXCESS_BEHAVIORS),
  })
  .superRefine((v, ctx) => {
    if (v.ventana === "rolling" && v.ventanaDias === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["ventanaDias"],
        message: "Ingresa cuántos días tiene la ventana",
      })
    }
  })

/**
 * Un escalón del descuento escalonado transaccional (docs/promociones.md
 * §7.1a). Claves en español porque este objeto ES el payload jsonb de
 * `promociones.escalones` — mismo criterio que `campo`/`valor` en
 * `conditionSchema`, que viaja a `condiciones` sin mapear. `beneficio_valor`
 * siempre es un porcentaje en esta versión (no hay `beneficio_tipo` por
 * escalón todavía).
 */
const discountTierSchema = z.object({
  umbral: z
    .number("Ingresa el umbral")
    .positive("El umbral debe ser mayor a 0"),
  beneficio_valor: z
    .number("Ingresa el descuento")
    .positive("El descuento debe ser mayor a 0")
    .max(100, "El porcentaje va de 1 a 100"),
})

/**
 * Mecánicas con un valor único (`benefitValue`) — las demás lo dejan
 * `undefined` porque su beneficio vive en campos propios (escalones,
 * multiplicador, puntos, cupón...). `precio_fijo_bundle` sí lo usa: es el
 * precio fijo del combo. `cashback` también: es el monto/porcentaje del
 * saldo devuelto (`tipoMonedero` decide cuál de los dos es).
 */
const BENEFIT_TYPES_WITH_SINGLE_VALUE = [
  "descuento_porcentual",
  "descuento_monto_fijo",
  "precio_fijo_bundle",
  "cashback",
] as const

/**
 * Objeto plano, NO `z.discriminatedUnion` por `benefitType`: una unión
 * discriminada rompería `keyof PromotionValues` (que `FIELDS_BY_STEP` de
 * `promotion-form.tsx` necesita para `trigger(step.fields)`), los
 * `defaultValues` y el tipo de `errors`. Lo que varía por mecánica se
 * valida en `refineByBenefitType` (abajo), no en la forma del tipo — mismo
 * patrón que `features/coupons/schemas.ts` con `refineByOrigin`.
 */
const promotionBaseSchema = z.object({
  name: z.string().min(3, "Ingresa el nombre de la promoción"),
  code: z
    .string()
    .min(3, "Ingresa un código")
    .regex(/^[A-Z0-9-]+$/, "Solo mayúsculas, números y guiones"),
  type: z.enum(PROMOTION_TYPES),
  priority: z.number().int().min(1).max(10),
  stackable: z.boolean(),
  channelScope: z.enum(CHANNEL_SCOPES),
  conditions: conditionGroupSchema,
  benefitType: z.enum(BENEFIT_TYPES),
  // Opcional en la forma: solo 3 mecánicas lo requieren (ver
  // `BENEFIT_TYPES_WITH_SINGLE_VALUE` y `refineByBenefitType`).
  benefitValue: z.number().positive("Ingresa un valor mayor a 0").optional(),
  maxCap: z.number().positive().optional(),
  applyTo: z.enum(APPLY_TO_OPTIONS),

  // descuento_escalonado (docs §7.1a)
  discountTiers: z.array(discountTierSchema).max(MAX_DISCOUNT_TIERS),
  thresholdType: z.enum(DISCOUNT_TIER_THRESHOLD_TYPES),
  tierCalculationMode: z.enum(DISCOUNT_TIER_CALCULATION_MODES),

  // por_piezas (BxGy)
  compraCantidad: z
    .number("Ingresa cuántas unidades hay que comprar")
    .int("Debe ser un número entero")
    .positive()
    .optional(),
  pagaCantidad: z
    .number("Ingresa cuántas unidades se pagan")
    .int("Debe ser un número entero")
    .positive()
    .optional(),
  alcancePiezas: z.enum(BXGY_SCOPES).optional(),
  descuentoUnidadExtraPct: z
    .number("Ingresa el % de descuento")
    .positive()
    .max(100, "El porcentaje va de 1 a 100")
    .optional(),
  // por_piezas (S22): si distintos SKU del universo pueden mezclarse para
  // completar "compra N", o si tienen que ser todas el mismo producto.
  // Opcional y sin control en el formulario (decisión del usuario, ver
  // `bxgy-form.tsx`): `toRow` lo persiste con `true`, el mismo default que
  // la columna `mezcla_en_universo`.
  mezclaEnUniverso: z.boolean().optional(),

  // producto_gratis + por_piezas (alcance producto_especifico) + precio_especial (T03)
  productoCompradoId: z.string().uuid().optional(),
  // producto_gratis
  productoRegaloId: z.string().uuid().optional(),
  cantidadRegalo: z
    .number("Ingresa la cantidad de regalo")
    .int("Debe ser un número entero")
    .positive()
    .optional(),
  // producto_gratis (T05 · N+M cruzado): mínimo de compra y beneficio
  // parcial en el regalo — sin esto, `producto_gratis` solo modela "compra
  // 1, regala 100%".
  cantidadMinimaComprada: z
    .number("Ingresa la cantidad mínima")
    .int("Debe ser un número entero")
    .positive()
    .optional(),
  beneficioSobreRegaloPct: z
    .number("Ingresa el % de beneficio sobre el regalo")
    .positive()
    .max(100, "El porcentaje va de 1 a 100")
    .optional(),

  // precio_fijo_bundle
  productosBundleIds: z.array(z.string().uuid()).max(MAX_BUNDLE_PRODUCTS),

  // multiplicador_puntos
  multiplicadorPuntos: z
    .number("Ingresa el multiplicador")
    .positive("El multiplicador debe ser mayor a 0")
    .optional(),
  nivelesRequeridos: z.array(z.enum(TIER_NAMES)),
  // multiplicador_puntos (T12): cómo se resuelve si otro multiplicador
  // también aplica al mismo SKU — "gana_mayor" es el default seguro, el
  // documento marca "exponencial" (se multiplican entre sí) como la
  // opción de mayor riesgo del catálogo, nunca implícita.
  modoResolucionMultiplicador: z.enum(MULTIPLIER_RESOLUTION_MODES),

  // multiplicador_puntos + bono_puntos (S08, S10 · saldo y acreditación):
  // canjeable vs calificador, y si la acreditación es inmediata o
  // diferida — diferida implica saldo inicial "pendiente" (ver
  // `refineCompliance`).
  tipoSaldo: z.enum(BALANCE_TYPES),
  momentoAcreditacion: z.enum(ACCRUAL_TIMINGS),
  estadoInicial: z.enum(BALANCE_INITIAL_STATES),

  // bono_puntos
  bonoPuntos: z
    .number("Ingresa los puntos de bono")
    .int("Debe ser un número entero")
    .positive()
    .optional(),

  // envio_gratis + bono_puntos + emitir_cupon (monto mínimo que dispara el beneficio)
  montoMinimoDisparo: z.number().positive().optional(),

  // envio_gratis, como "beneficio no transaccional" (T17): el envío
  // gratis es solo uno de los 4 sub-tipos que el documento agrupa bajo
  // esta modalidad.
  tipoBeneficioNoTransaccional: z.enum(NON_TRANSACTIONAL_BENEFIT_TYPES),
  validacionRequerida: z.string().optional(),
  cupoDisponible: z
    .number()
    .int("Debe ser un número entero")
    .positive()
    .optional(),
  // envio_gratis (S21): un beneficio no transaccional no deja huella en
  // ningún pedido — sin este campo, no queda registro de que ocurrió.
  registraUso: z.boolean(),

  // emitir_cupon
  couponBatchId: z.string().uuid().optional(),
  motivoEmision: z
    .string()
    .min(5, "Describe el motivo en al menos 5 caracteres")
    .optional(),
  // emitir_cupon (T14 · cupón por umbral de puntos): disparador alterno
  // al monto de carrito, y duración propia del cupón emitido.
  umbralPuntos: z
    .number("Ingresa el umbral de puntos")
    .int("Debe ser un número entero")
    .positive()
    .optional(),
  duracionCuponDias: z
    .number("Ingresa la duración en días")
    .int("Debe ser un número entero")
    .positive()
    .optional(),
  // emitir_cupon (S09/S18): cuándo se debita el saldo de puntos que
  // financia el cupón, y qué pasa con ese saldo si el cupón vence sin
  // usarse — requerido cuando el cupón se dispara por `umbralPuntos`
  // (ver `refineByBenefitType`).
  momentoDebitoPuntos: z.enum(POINTS_DEBIT_TIMINGS).optional(),
  devolucionSiVence: z.boolean(),

  // Disparador transversal (T23) — declarado para `bono_puntos` y
  // `emitir_cupon`, las 2 mecánicas con un concepto real de "disparo"
  // distinto al monto de carrito. El disparo real (que algo lo evalúe en
  // el momento del evento) es motor de evaluación, fuera de alcance.
  eventoGatillo: z.enum(TRIGGER_EVENTS).optional(),
  momentoResolucion: z.enum(TRIGGER_RESOLUTION_MOMENTS).optional(),
  frecuenciaDisparo: z.enum(TRIGGER_FREQUENCIES).optional(),
  // S24 · bono por evento: qué exige el alta del socio para calificar, y
  // si un socio inactivo sigue siendo elegible (ej. campañas de
  // reactivación son justamente para inactivos).
  requisitoAlta: z.enum(ENROLLMENT_REQUIREMENTS).optional(),
  elegibleEnInactividad: z.boolean(),

  // precio_especial (T03) — reusa `productoCompradoId` (el SKU con precio
  // especial) y `benefitValue` no aplica aquí: el precio ES el valor, no
  // un descuento sobre otra base.
  precioPromocional: z
    .number("Ingresa el precio especial")
    .positive("El precio debe ser mayor a 0")
    .optional(),
  precioReferencia: z.number().positive().optional(),
  hastaAgotarExistencias: z.boolean(),
  respetaPrecioMinimoLegal: z.boolean(),

  // cashback (T13) — el monto/porcentaje del cashback reusa `benefitValue`
  // (mismo campo que ya usan los 2 tipos de descuento).
  tipoMonedero: z.enum(WALLET_VALUE_TYPES),
  disponibilidadDias: z
    .number()
    .int("Debe ser un número entero")
    .positive()
    .optional(),
  vigenciaSaldoDias: z
    .number()
    .int("Debe ser un número entero")
    .positive()
    .optional(),
  montoMinimoCanje: z.number().positive().optional(),

  // descuento_continuidad — escalera de continuidad (reusa `discountTiers`
  // de arriba: aquí `umbral` es el ordinal de compra consecutiva, 1, 2,
  // 3…, no unidades/monto del carrito).
  // Ventana como cantidad + unidad (días/semanas/meses/bimestres): "2
  // meses" y "60 días" no son la misma regla, aunque hoy se aproximen igual.
  ventanaContinuidadCantidad: z
    .number("Ingresa la cantidad de la ventana de continuidad")
    .int("Debe ser un número entero")
    .positive()
    .max(365)
    .optional(),
  ventanaContinuidadUnidad: z.enum(CONTINUITY_WINDOW_UNITS).optional(),
  alRomperContinuidad: z.enum(CONTINUITY_BREAK_BEHAVIORS).optional(),
  // Si la racha evalúa el historial de compras anterior al inicio de la
  // promoción (antes rotulado "acumula compras retroactivas" — misma
  // semántica, enunciada como la pregunta que se hace el operador).
  acumulaRetroactivo: z.boolean(),
  // `efectoDevolucion`/`criterioSeleccionPiezas` ya no tienen control en el
  // formulario (decisión del usuario: fuera el bloque "casos especiales"),
  // así que tampoco se exigen — quedan opcionales y `toRow` los persiste
  // como `null`. Ver `continuity-form.tsx`.
  efectoDevolucion: z.enum(RETURN_EFFECTS).optional(),
  criterioSeleccionPiezas: z.enum(PIECE_SELECTION_CRITERIA).optional(),

  validFrom: z.string().min(1, "Elige la fecha de inicio"),
  validUntil: z.string().optional(),
  // Vigencia (07.5, 1399:6) — vacío/sin selección = todos los días, sin horario = todo el día.
  daysOfWeek: z.array(z.enum(DAYS_OF_WEEK)).max(7),
  horaInicio: z.string().optional(),
  horaFin: z.string().optional(),

  // Límites y stacking (07.6, 1401:28) — antes 3 campos sueltos
  // (usesPerMember/usagePeriod/totalUsesPerPeriod), ahora un constructor de
  // filas: L01–L23 son combinaciones de las mismas 4 dimensiones.
  limites: z.array(limitSchema).max(MAX_LIMITS),
  assignedBudget: z.number().nonnegative(),
  exclusionGroup: z.string().max(60, "Máximo 60 caracteres").optional(),
  stackingMode: z.enum(STACKING_MODES),

  // Economía (paso "Economía", F01–F11 + S06) — naturaleza contable del
  // costo y quién lo financia. El bloque de proveedor (proveedorId/
  // contratoId/porcentajeCostoProveedor/periodoLiquidacion) solo se pide
  // cuando `financiador !== "retailer"` (ver `refineEconomics`).
  naturalezaCosto: z.enum(COST_NATURES),
  financiador: z.enum(FINANCIADORES),
  proveedorId: z.string().optional(),
  contratoId: z.string().optional(),
  porcentajeCostoProveedor: z.number().min(0).max(100).optional(),
  periodoLiquidacion: z.enum(SETTLEMENT_PERIODS).optional(),
  umbralAlertaPresupuestoPct: z.number().min(0).max(100).optional(),

  // Base de cálculo (S01, S16) — sobre qué monto se calcula el
  // descuento, y si ese monto sigue acumulando puntos.
  nivelAplicacion: z.enum(APPLICATION_LEVELS),
  aplicaSobrePrecio: z.enum(PRICE_BASES),
  descuentoAcumulaPuntos: z.boolean(),

  // Cumplimiento (S12) — sin `productos.requiere_receta` todavía (ver
  // docs/promociones.md §8), esta es una declaración manual del operador,
  // no una derivada del catálogo real.
  aplicaARx: z.enum(RX_APPLICABILITIES),
  aprobacionRegulatoria: z.boolean(),

  publicationStatus: z.enum(PROMOTION_PUBLICATION_STATUSES),
})

/**
 * Campos de condición que acotan la promoción a un conjunto de productos.
 * `producto_marca` y `categoria` son los dos alcances "por familia";
 * `producto` es el SKU puntual. Cualquiera de los tres sirve para decir "a
 * qué productos aplica esta regla".
 */
const PRODUCT_SCOPE_CONDITION_FIELDS = [
  "producto",
  "producto_marca",
  "categoria",
] as const

function hasProductScopeCondition(conditions: ConditionGroupValues): boolean {
  return flattenConditionTree(conditions).some((condition) =>
    PRODUCT_SCOPE_CONDITION_FIELDS.some((field) => field === condition.campo)
  )
}

/**
 * REGLA INVIOLABLE (igual que `refineByOrigin` en
 * `features/coupons/schemas.ts`): toda incidencia lleva `path` a un campo
 * listado en `MECHANIC_FIELDS`/lo que valida el paso "Configuración" de
 * `promotion-form.tsx`. Sin `path`, `trigger()` no la ve y el paso se deja
 * pasar con datos inválidos.
 */
function refineByBenefitType(
  v: z.infer<typeof promotionBaseSchema>,
  ctx: z.RefinementCtx
) {
  const need = (cond: boolean, path: (string | number)[], message: string) => {
    if (cond) ctx.addIssue({ code: "custom", path, message })
  }
  const type = v.benefitType

  // --- benefitValue: solo 3 mecánicas lo requieren ---
  need(
    (BENEFIT_TYPES_WITH_SINGLE_VALUE as readonly string[]).includes(type) &&
      v.benefitValue === undefined,
    ["benefitValue"],
    "Ingresa un valor mayor a 0"
  )
  need(
    type === "descuento_porcentual" &&
      v.benefitValue !== undefined &&
      v.benefitValue > 100,
    ["benefitValue"],
    "El porcentaje va de 1 a 100"
  )

  // --- descuento_escalonado ---
  if (type === "descuento_escalonado") {
    need(
      v.discountTiers.length < 2,
      ["discountTiers"],
      "Un descuento escalonado necesita al menos 2 escalones"
    )
    const seenUmbrales = new Set<number>()
    v.discountTiers.forEach((tier, index) => {
      need(
        v.thresholdType === "unidades" && !Number.isInteger(tier.umbral),
        ["discountTiers", index, "umbral"],
        "En unidades el umbral debe ser un número entero"
      )
      need(
        seenUmbrales.has(tier.umbral),
        ["discountTiers", index, "umbral"],
        "Ya existe un escalón con este umbral"
      )
      seenUmbrales.add(tier.umbral)
    })
    // "Compra más, ahorra más": a mayor umbral, mayor descuento — si no
    // crece, el escalón alto nunca conviene y el cliente no tiene
    // incentivo real.
    const ordered = v.discountTiers
      .map((tier, index) => ({ ...tier, index }))
      .sort((a, b) => a.umbral - b.umbral)
    ordered.forEach((tier, i) => {
      if (i === 0) return
      need(
        tier.beneficio_valor <= ordered[i - 1].beneficio_valor,
        ["discountTiers", tier.index, "beneficio_valor"],
        "Cada escalón debe dar más descuento que el anterior"
      )
    })
  }

  // --- por_piezas (BxGy) ---
  if (type === "por_piezas") {
    need(
      v.compraCantidad === undefined || v.compraCantidad < 2,
      ["compraCantidad"],
      "Debe ser al menos 2 unidades"
    )
    need(
      v.pagaCantidad === undefined,
      ["pagaCantidad"],
      "Ingresa cuántas unidades se pagan"
    )
    if (
      v.compraCantidad !== undefined &&
      v.pagaCantidad !== undefined &&
      v.pagaCantidad >= v.compraCantidad
    ) {
      need(true, ["pagaCantidad"], "Debe ser menor que la cantidad de compra")
    }
    need(v.alcancePiezas === undefined, ["alcancePiezas"], "Elige un alcance")
    need(
      v.alcancePiezas === "producto_especifico" &&
        v.productoCompradoId === undefined,
      ["productoCompradoId"],
      "Elige el producto"
    )
    need(
      v.alcancePiezas === "misma_categoria" &&
        !flattenConditionTree(v.conditions).some(
          (c) => c.campo === "categoria"
        ),
      ["alcancePiezas"],
      "Agrega una condición de categoría en el paso Condiciones para poder elegir este alcance"
    )
    need(
      v.descuentoUnidadExtraPct === undefined,
      ["descuentoUnidadExtraPct"],
      "Ingresa el % de descuento en la unidad extra"
    )
    // S03 · crítica: entregar producto físico exige límite por período —
    // `por_piezas` siempre entrega piezas físicas.
    need(
      !v.limites.some((l) => l.unidad === "piezas"),
      ["limites"],
      "Entregar piezas exige un límite de piezas en el paso Límites (S03)"
    )
  }

  // --- producto_gratis ---
  if (type === "producto_gratis") {
    need(
      v.productoCompradoId === undefined,
      ["productoCompradoId"],
      "Elige el producto comprado"
    )
    need(
      v.productoRegaloId === undefined,
      ["productoRegaloId"],
      "Elige el producto de regalo"
    )
    need(
      v.cantidadRegalo === undefined,
      ["cantidadRegalo"],
      "Ingresa la cantidad de regalo"
    )
    // T05 · N+M cruzado: mínimo de compra y beneficio parcial en el
    // regalo — declarados explícitamente, nunca implícitos en "1" / "100%".
    need(
      v.cantidadMinimaComprada === undefined,
      ["cantidadMinimaComprada"],
      "Ingresa cuántas unidades hay que comprar como mínimo"
    )
    need(
      v.beneficioSobreRegaloPct === undefined,
      ["beneficioSobreRegaloPct"],
      "Ingresa el % de beneficio sobre el producto de regalo"
    )
    // S02 · crítica: las piezas gratis no pueden superar (ni igualar) a
    // las requeridas, salvo que el mínimo sea 1 (ej. "2ª unidad gratis").
    need(
      v.cantidadMinimaComprada !== undefined &&
        v.cantidadRegalo !== undefined &&
        v.cantidadMinimaComprada !== 1 &&
        v.cantidadRegalo >= v.cantidadMinimaComprada,
      ["cantidadRegalo"],
      "Las piezas de regalo deben ser menos que la cantidad mínima comprada"
    )
    // S03 · crítica: entregar producto físico exige límite por período.
    need(
      !v.limites.some((l) => l.unidad === "piezas"),
      ["limites"],
      "Entregar un producto físico exige un límite de piezas en el paso Límites (S03)"
    )
  }

  // --- precio_fijo_bundle ---
  if (type === "precio_fijo_bundle") {
    need(
      v.productosBundleIds.length < 2,
      ["productosBundleIds"],
      "Un bundle necesita al menos 2 productos"
    )
  }

  // --- multiplicador_puntos ---
  if (type === "multiplicador_puntos") {
    need(
      v.multiplicadorPuntos === undefined,
      ["multiplicadorPuntos"],
      "Ingresa el multiplicador"
    )
  }

  // --- bono_puntos ---
  if (type === "bono_puntos") {
    need(
      v.bonoPuntos === undefined,
      ["bonoPuntos"],
      "Ingresa los puntos de bono"
    )
  }

  // --- emitir_cupon ---
  if (type === "emitir_cupon") {
    need(
      v.couponBatchId === undefined,
      ["couponBatchId"],
      "Elige la emisión plantilla"
    )
    need(
      v.motivoEmision === undefined,
      ["motivoEmision"],
      "Describe el motivo en al menos 5 caracteres"
    )
    // S09/S18 · crítica: si el cupón se financia con puntos (umbral de
    // puntos como disparador), la promoción declara cuándo se debitan.
    need(
      v.umbralPuntos !== undefined && v.momentoDebitoPuntos === undefined,
      ["momentoDebitoPuntos"],
      "Declara cuándo se debitan los puntos que financian el cupón"
    )
  }

  // --- precio_especial (T03) ---
  if (type === "precio_especial") {
    need(
      v.productoCompradoId === undefined,
      ["productoCompradoId"],
      "Elige el producto con precio especial"
    )
    need(
      v.precioPromocional === undefined,
      ["precioPromocional"],
      "Ingresa el precio especial"
    )
    need(
      v.precioPromocional !== undefined &&
        v.precioReferencia !== undefined &&
        v.precioPromocional >= v.precioReferencia,
      ["precioPromocional"],
      "Debe ser menor que el precio de referencia"
    )
    // "El máximo de piezas por cliente es obligatorio, no una
    // precaución" — sin tope, un precio especial es canal de abasto para
    // terceros. Se exige como una fila del constructor de límites (Fase
    // 1), no un campo dedicado — L03/L18 ya cubren exactamente esto.
    need(
      !v.limites.some((l) => l.unidad === "piezas" && l.sujeto === "socio"),
      ["limites"],
      "Un precio especial exige un límite de piezas por socio en el paso Límites"
    )
  }

  // --- cashback (T13) ---
  if (type === "cashback") {
    need(
      v.benefitValue !== undefined &&
        v.tipoMonedero === "porcentaje" &&
        v.benefitValue > 100,
      ["benefitValue"],
      "El porcentaje va de 1 a 100"
    )
  }

  // --- descuento_continuidad (escalera de continuidad) ---
  if (type === "descuento_continuidad") {
    need(
      v.discountTiers.length < 2,
      ["discountTiers"],
      "Una escalera de continuidad necesita al menos 2 escalones"
    )
    // Mismo criterio "compra más, ahorra más" que `descuento_escalonado`,
    // más la regla propia de esta mecánica: los escalones son compras
    // consecutivas (1, 2, 3…), no umbrales libres — un hueco o un umbral
    // repetido no es interpretable como "compra N".
    const ordered = v.discountTiers
      .map((tier, index) => ({ ...tier, index }))
      .sort((a, b) => a.umbral - b.umbral)
    ordered.forEach((tier, i) => {
      need(
        !Number.isInteger(tier.umbral),
        ["discountTiers", tier.index, "umbral"],
        "El ordinal de compra debe ser un número entero"
      )
      need(
        tier.umbral !== i + 1,
        ["discountTiers", tier.index, "umbral"],
        "Los escalones deben ser compras consecutivas sin huecos: 1, 2, 3…"
      )
      if (i > 0) {
        need(
          tier.beneficio_valor <= ordered[i - 1].beneficio_valor,
          ["discountTiers", tier.index, "beneficio_valor"],
          "Cada compra consecutiva debe dar más descuento que la anterior"
        )
      }
    })
    need(
      v.ventanaContinuidadCantidad === undefined,
      ["ventanaContinuidadCantidad"],
      "Ingresa la cantidad de la ventana de continuidad"
    )
    need(
      v.ventanaContinuidadUnidad === undefined,
      ["ventanaContinuidadUnidad"],
      "Elige la unidad de la ventana (días, semanas, meses…)"
    )
    need(
      v.alRomperContinuidad === undefined,
      ["alRomperContinuidad"],
      "Elige qué pasa al exceder la ventana de continuidad"
    )
    // Una escalera de continuidad premia la recompra de ALGO concreto, así
    // que su alcance de producto no puede quedar abierto a todo el
    // catálogo: exige al menos una condición de producto, marca o
    // categoría. El `path` es `conditions` (paso 2) a propósito — es el
    // campo que valida ese paso, así que `trigger()` sí ve el error (misma
    // regla inviolable que documenta `refineByBenefitType`).
    need(
      !hasProductScopeCondition(v.conditions),
      ["conditions"],
      "Una escalera de continuidad aplica a productos: agrega en el paso Condiciones al menos una condición de producto, marca o categoría"
    )
    // Análogo a S03 (`por_piezas`/`producto_gratis`): sin un tope de piezas
    // por socio, una escalera de continuidad no tiene techo de unidades.
    need(
      !v.limites.some((l) => l.unidad === "piezas" && l.sujeto === "socio"),
      ["limites"],
      "Una escalera de continuidad exige un límite de piezas por socio en el paso Límites"
    )
  }
}

/**
 * S06 · "Financiada por proveedor exige contrato y porcentaje" — a
 * diferencia de `refineByBenefitType`, no depende de la mecánica sino de
 * `financiador`. Solo valida campos del propio formulario (nunca datos
 * externos, ej. costo de producto) — mismo criterio que el resto de este
 * archivo.
 */
function refineEconomics(
  v: z.infer<typeof promotionBaseSchema>,
  ctx: z.RefinementCtx
) {
  const need = (cond: boolean, path: (string | number)[], message: string) => {
    if (cond) ctx.addIssue({ code: "custom", path, message })
  }
  if (v.financiador !== "retailer") {
    // `!v.contratoId`, no `=== undefined`: el input de texto de este campo
    // no tiene `setValueAs`, así que un campo vacío nunca tocado llega como
    // `""` a react-hook-form, no como `undefined` — comparar solo contra
    // `undefined` deja este required-si-no-retailer sin efecto real.
    need(
      !v.contratoId,
      ["contratoId"],
      "Ingresa el contrato con el financiador"
    )
    need(
      v.porcentajeCostoProveedor === undefined,
      ["porcentajeCostoProveedor"],
      "Ingresa el porcentaje que absorbe el proveedor"
    )
  }
}

/**
 * Reglas de negocio transversales (S01-S25) que no dependen de la
 * mecánica ni del financiador — las críticas del documento que sí cruzan
 * campos (las demás críticas, ej. S01/S10/S16, se cumplen con solo tener
 * el campo, sin relación que validar). Las reglas "alta" (S04, S08, S13,
 * S14, S21…) son asesoras por diseño del propio documento ("las de
 * prioridad alta advierten pero dejan continuar") — viven en
 * `lib/program-rules.ts` para el panel de revisión, no aquí.
 */
function refineCompliance(
  v: z.infer<typeof promotionBaseSchema>,
  ctx: z.RefinementCtx
) {
  const need = (cond: boolean, path: (string | number)[], message: string) => {
    if (cond) ctx.addIssue({ code: "custom", path, message })
  }
  // S05 · la vigencia debe terminar después de empezar.
  need(
    !!v.validUntil && v.validUntil <= v.validFrom,
    ["validUntil"],
    "Debe ser posterior a la fecha de inicio"
  )
  // S12 · aplicar a receta exige validación regulatoria.
  need(
    v.aplicaARx !== "permitido" && !v.aprobacionRegulatoria,
    ["aprobacionRegulatoria"],
    "Esta promoción toca productos con receta — confirma la aprobación regulatoria"
  )
}

export const promotionSchema = promotionBaseSchema
  .superRefine(refineByBenefitType)
  .superRefine(refineEconomics)
  .superRefine(refineCompliance)
export type PromotionValues = z.infer<typeof promotionSchema>
export type ConditionValues = z.infer<typeof conditionSchema>
export type DiscountTierValues = z.infer<typeof discountTierSchema>
export type LimitValues = z.infer<typeof limitSchema>

export const updatePromotionSchema = promotionBaseSchema
  .extend({ id: z.string().uuid() })
  .superRefine(refineByBenefitType)
  .superRefine(refineEconomics)
  .superRefine(refineCompliance)

/**
 * Una promoción publicada ya no admite cambios en sus campos — el estado es
 * lo único editable, así que su actualización tiene su propio esquema
 * mínimo en vez de reusar `updatePromotionSchema` (que exigiría reenviar el
 * formulario entero y volvería a validar mecánica/economía de datos que no
 * se están tocando). Las transiciones válidas las decide el servidor con
 * `canTransitionStatus`.
 */
export const updatePromotionStatusSchema = z
  .object({
    id: z.string().uuid(),
    publicationStatus: z.enum(PROMOTION_PUBLICATION_STATUSES),
    reasonCode: z.enum(PROMOTION_STATUS_CHANGE_REASONS),
    reasonNote: z.string().trim().max(280, "Máximo 280 caracteres").optional(),
  })
  .superRefine((v, ctx) => {
    // "Otro" sin nota no explica nada — y el motivo es justo lo que hace
    // auditable la bitácora.
    if (v.reasonCode === "otro" && !v.reasonNote) {
      ctx.addIssue({
        code: "custom",
        path: ["reasonNote"],
        message: "Describe el motivo",
      })
    }
  })

export const simulatePromotionSchema = z.object({
  excludeId: z.string().uuid().optional(),
  conditions: z.array(conditionSchema),
  channelScope: z.enum(CHANNEL_SCOPES),
  priority: z.number().int().min(1).max(10),
  benefitType: z.enum(BENEFIT_TYPES).optional(),
  benefitValue: z.number().optional(),
  stackable: z.boolean().optional(),
  exclusionGroup: z.string().optional(),
})
