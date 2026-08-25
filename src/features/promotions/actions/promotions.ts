"use server"

import { revalidatePath } from "next/cache"

import { promotionsActionClient } from "./action-client"
import { detectCollisions } from "../lib/collision"
import {
  MECHANIC_FIELDS,
  BENEFIT_TYPES_WITH_APPLY_TO,
} from "../lib/mechanic-fields"
import { hasPermission } from "../lib/permissions"
import {
  evaluateProgramRules,
  SERVER_CONTEXT_RULE_IDS,
} from "../lib/program-rules"
import {
  getTotalStores,
  listConditionCities,
  listActivePromotions,
} from "../lib/queries"
import {
  updatePromotionSchema,
  promotionSchema,
  simulatePromotionSchema,
  type PromotionValues,
} from "../schemas"
import { getProgramParameters } from "@/lib/program-parameters"
import type { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database.types"

/**
 * Mapea el formulario a la fila real. Cada columna específica de mecánica
 * se guarda solo si pertenece a `MECHANIC_FIELDS[benefitType]` — si no, se
 * fuerza a `null`. Es el segundo seguro (el primero es que
 * `MechanicPicker.onValueChange` ya limpia el formulario al cambiar de
 * mecánica) contra que queden valores de una mecánica anterior: RHF no
 * desregistra campos de inputs que dejaron de montarse.
 */
/** Mecánicas donde el beneficio recae sobre un producto puntual, no el carrito completo. */
const PRODUCT_LEVEL_BENEFIT_TYPES = new Set<PromotionValues["benefitType"]>([
  "producto_gratis",
  "precio_fijo_bundle",
  "por_piezas",
])

function toRow(values: PromotionValues) {
  const relevant = new Set(MECHANIC_FIELDS[values.benefitType] ?? [])
  const has = (field: keyof PromotionValues) => relevant.has(field)

  return {
    nombre: values.name,
    codigo: values.code,
    tipo: values.type,
    prioridad: values.priority,
    acumulable: values.stackable,
    canal_aplicacion: values.channelScope,
    condiciones: values.conditions as unknown as Json,
    tipo_beneficio: values.benefitType,
    valor_beneficio: has("benefitValue") ? (values.benefitValue ?? null) : null,
    tope_maximo: has("maxCap") ? (values.maxCap ?? null) : null,
    // `aplicar_sobre` es `not null` en la base — para las mecánicas donde
    // el campo no se muestra, se fuerza el valor correcto en vez de dejar
    // el default genérico "subtotal_carrito" guardado por accidente.
    aplicar_sobre: BENEFIT_TYPES_WITH_APPLY_TO.includes(values.benefitType)
      ? values.applyTo
      : values.benefitType === "envio_gratis"
        ? "envio"
        : PRODUCT_LEVEL_BENEFIT_TYPES.has(values.benefitType)
          ? "producto"
          : "subtotal_carrito",
    // Mismo cast que `condiciones` — sin mapeo de claves porque las
    // claves del jsonb ya están en español (ver schemas.ts).
    escalones: has("discountTiers")
      ? (values.discountTiers as unknown as Json)
      : null,
    umbral_tipo: has("thresholdType") ? values.thresholdType : null,
    modo_calculo: has("tierCalculationMode")
      ? values.tierCalculationMode
      : null,
    compra_cantidad: has("compraCantidad")
      ? (values.compraCantidad ?? null)
      : null,
    paga_cantidad: has("pagaCantidad") ? (values.pagaCantidad ?? null) : null,
    alcance_piezas: has("alcancePiezas")
      ? (values.alcancePiezas ?? null)
      : null,
    descuento_unidad_extra_pct: has("descuentoUnidadExtraPct")
      ? (values.descuentoUnidadExtraPct ?? null)
      : null,
    mezcla_en_universo: has("mezclaEnUniverso")
      ? values.mezclaEnUniverso
      : true,
    producto_comprado_id: has("productoCompradoId")
      ? (values.productoCompradoId ?? null)
      : null,
    producto_regalo_id: has("productoRegaloId")
      ? (values.productoRegaloId ?? null)
      : null,
    cantidad_regalo: has("cantidadRegalo")
      ? (values.cantidadRegalo ?? null)
      : null,
    cantidad_minima_comprada: has("cantidadMinimaComprada")
      ? (values.cantidadMinimaComprada ?? null)
      : null,
    beneficio_sobre_regalo_pct: has("beneficioSobreRegaloPct")
      ? (values.beneficioSobreRegaloPct ?? null)
      : null,
    productos_bundle_ids: has("productosBundleIds")
      ? values.productosBundleIds
      : null,
    multiplicador_puntos: has("multiplicadorPuntos")
      ? (values.multiplicadorPuntos ?? null)
      : null,
    niveles_requeridos:
      has("nivelesRequeridos") && values.nivelesRequeridos.length > 0
        ? values.nivelesRequeridos
        : null,
    modo_resolucion_multiplicador: has("modoResolucionMultiplicador")
      ? values.modoResolucionMultiplicador
      : null,
    tipo_saldo: has("tipoSaldo") ? values.tipoSaldo : "canjeable",
    momento_acreditacion: has("momentoAcreditacion")
      ? values.momentoAcreditacion
      : "inmediato",
    estado_inicial: has("estadoInicial") ? values.estadoInicial : "disponible",
    bono_puntos: has("bonoPuntos") ? (values.bonoPuntos ?? null) : null,
    monto_minimo_disparo: has("montoMinimoDisparo")
      ? (values.montoMinimoDisparo ?? null)
      : null,
    tipo_beneficio_no_transaccional: has("tipoBeneficioNoTransaccional")
      ? values.tipoBeneficioNoTransaccional
      : "envio_gratis",
    validacion_requerida: has("validacionRequerida")
      ? values.validacionRequerida || null
      : null,
    cupo_disponible: has("cupoDisponible")
      ? (values.cupoDisponible ?? null)
      : null,
    registra_uso: has("registraUso") ? values.registraUso : false,
    coupon_batch_id: has("couponBatchId")
      ? (values.couponBatchId ?? null)
      : null,
    motivo_emision: has("motivoEmision")
      ? (values.motivoEmision ?? null)
      : null,
    umbral_puntos: has("umbralPuntos") ? (values.umbralPuntos ?? null) : null,
    duracion_cupon_dias: has("duracionCuponDias")
      ? (values.duracionCuponDias ?? null)
      : null,
    momento_debito_puntos: has("momentoDebitoPuntos")
      ? (values.momentoDebitoPuntos ?? null)
      : null,
    devolucion_si_vence: has("devolucionSiVence")
      ? values.devolucionSiVence
      : false,
    evento_gatillo: has("eventoGatillo")
      ? (values.eventoGatillo ?? null)
      : null,
    momento_resolucion: has("momentoResolucion")
      ? (values.momentoResolucion ?? null)
      : null,
    frecuencia_disparo: has("frecuenciaDisparo")
      ? (values.frecuenciaDisparo ?? null)
      : null,
    requisito_alta: has("requisitoAlta")
      ? (values.requisitoAlta ?? null)
      : null,
    elegible_en_inactividad: has("elegibleEnInactividad")
      ? values.elegibleEnInactividad
      : false,
    precio_promocional: has("precioPromocional")
      ? (values.precioPromocional ?? null)
      : null,
    precio_referencia: has("precioReferencia")
      ? (values.precioReferencia ?? null)
      : null,
    hasta_agotar_existencias: has("hastaAgotarExistencias")
      ? values.hastaAgotarExistencias
      : false,
    respeta_precio_minimo_legal: has("respetaPrecioMinimoLegal")
      ? values.respetaPrecioMinimoLegal
      : true,
    tipo_monedero: has("tipoMonedero") ? values.tipoMonedero : "porcentaje",
    disponibilidad_dias: has("disponibilidadDias")
      ? (values.disponibilidadDias ?? null)
      : null,
    vigencia_saldo_dias: has("vigenciaSaldoDias")
      ? (values.vigenciaSaldoDias ?? null)
      : null,
    monto_minimo_canje: has("montoMinimoCanje")
      ? (values.montoMinimoCanje ?? null)
      : null,
    vigente_desde: values.validFrom,
    vigente_hasta: values.validUntil || null,
    dias_semana: values.daysOfWeek.length > 0 ? values.daysOfWeek : null,
    hora_inicio: values.horaInicio || null,
    hora_fin: values.horaFin || null,
    limites: values.limites as unknown as Json,
    presupuesto_asignado: values.assignedBudget,
    grupo_exclusion: values.exclusionGroup || null,
    modo_multiple: values.stackingMode,
    naturaleza_costo: values.naturalezaCosto,
    financiador: values.financiador,
    // El bloque de proveedor solo existe cuando el financiador es un
    // tercero — con `financiador: "retailer"` se null-ea aunque el
    // formulario los haya llegado a poblar (ej. al volver de "compartido").
    proveedor:
      values.financiador === "retailer" ? null : values.proveedor || null,
    contrato_id:
      values.financiador === "retailer" ? null : values.contratoId || null,
    porcentaje_costo_proveedor:
      values.financiador === "retailer"
        ? null
        : (values.porcentajeCostoProveedor ?? null),
    periodo_liquidacion:
      values.financiador === "retailer"
        ? null
        : (values.periodoLiquidacion ?? null),
    umbral_alerta_presupuesto_pct: values.umbralAlertaPresupuestoPct ?? null,
    autorizacion_venta_bajo_costo: values.autorizacionVentaBajoCosto,
    nivel_aplicacion: values.nivelAplicacion,
    aplica_sobre_precio: values.aplicaSobrePrecio,
    descuento_acumula_puntos: values.descuentoAcumulaPuntos,
    aplica_a_rx: values.aplicaARx,
    aprobacion_regulatoria: values.aprobacionRegulatoria,
    simulacion_ejecutada: values.simulacionEjecutada,
    estado_publicacion: values.publicationStatus,
  }
}

const BELOW_COST_MESSAGE =
  "El precio especial queda por debajo del costo de adquisición — autoriza la venta bajo costo en el paso Economía (F12)."

/**
 * F12, crítica: "ninguna promoción vende por debajo del costo sin
 * autorización". Es la única regla del documento que exige un dato que
 * hoy no vive en `promociones` (`productos.costo_unitario`), así que no
 * puede ser un `superRefine` puro de `schemas.ts` — se recalcula aquí,
 * siempre en servidor, igual que el resto de checks de negocio de esta
 * Server Action.
 */
async function violatesSellingBelowCost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: PromotionValues
): Promise<boolean> {
  if (
    values.benefitType !== "precio_especial" ||
    values.autorizacionVentaBajoCosto ||
    values.precioPromocional === undefined ||
    !values.productoCompradoId
  ) {
    return false
  }
  const { data: product } = await supabase
    .from("productos")
    .select("costo_unitario")
    .eq("id", values.productoCompradoId)
    .maybeSingle()
  return (
    product?.costo_unitario !== null &&
    product?.costo_unitario !== undefined &&
    values.precioPromocional < product.costo_unitario
  )
}

export const createPromotionAction = promotionsActionClient
  .inputSchema(promotionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const requiredAction =
      parsedInput.publicationStatus === "activa" ? "aprobar" : "crear"
    if (!hasPermission(ctx.permissionsSet, "promociones", requiredAction)) {
      return {
        ok: false as const,
        message:
          requiredAction === "aprobar"
            ? "No tienes permiso para activar promociones — guárdala como borrador."
            : "No tienes permiso para crear promociones.",
      }
    }

    if (await violatesSellingBelowCost(ctx.supabase, parsedInput)) {
      return { ok: false as const, message: BELOW_COST_MESSAGE }
    }

    const { data, error } = await ctx.supabase
      .from("promociones")
      .insert({ org_id: ctx.orgId, ...toRow(parsedInput) })
      .select("id")
      .single()

    if (error || !data) {
      const message =
        error?.code === "23505"
          ? "Ya existe una promoción con ese código."
          : "No se pudo crear la promoción."
      return { ok: false as const, message }
    }

    revalidatePath("/promociones")
    return { ok: true as const, id: data.id as string }
  })

export const updatePromotionAction = promotionsActionClient
  .inputSchema(updatePromotionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const requiredAction =
      parsedInput.publicationStatus === "activa" ? "aprobar" : "editar"
    if (!hasPermission(ctx.permissionsSet, "promociones", requiredAction)) {
      return {
        ok: false as const,
        message:
          requiredAction === "aprobar"
            ? "No tienes permiso para activar promociones — guárdala como borrador."
            : "No tienes permiso para editar promociones.",
      }
    }

    if (await violatesSellingBelowCost(ctx.supabase, parsedInput)) {
      return { ok: false as const, message: BELOW_COST_MESSAGE }
    }

    const { id, ...values } = parsedInput
    const { error } = await ctx.supabase
      .from("promociones")
      .update(toRow(values))
      .eq("id", id)

    if (error) {
      const message =
        error.code === "23505"
          ? "Ya existe una promoción con ese código."
          : "No se pudo guardar la promoción."
      return { ok: false as const, message }
    }

    revalidatePath("/promociones")
    revalidatePath(`/promociones/${id}/editar`)
    return { ok: true as const, id }
  })

export const simulatePromotionAction = promotionsActionClient
  .inputSchema(simulatePromotionSchema)
  .action(async ({ parsedInput }) => {
    const [activePromotions, cities, totalStores, programParameters] =
      await Promise.all([
        listActivePromotions(parsedInput.excludeId),
        listConditionCities(),
        getTotalStores(),
        getProgramParameters(),
      ])

    const storeCondition = parsedInput.conditions.find(
      (c) => c.campo === "tienda"
    )
    const impactedStores = storeCondition
      ? (cities.find((c) => c.city === storeCondition.valor)?.totalStores ?? 0)
      : totalStores

    const collisions = detectCollisions(
      {
        conditions: parsedInput.conditions,
        channelScope: parsedInput.channelScope,
        priority: parsedInput.priority,
      },
      activePromotions
    )

    // Solo S13/S14 salen de aquí: son las únicas que de verdad necesitan
    // datos de servidor. El resto de `evaluateProgramRules` (S04/S08/S21/
    // S24) ya las cubre `PromotionSummaryCard` en cliente con los valores
    // completos del formulario — este `parsedInput` no trae campos como
    // `registraUso`/`eventoGatillo`, así que evaluarlas aquí daría falsos
    // positivos además de duplicar la advertencia.
    const advisories = evaluateProgramRules(
      {
        benefitType: parsedInput.benefitType,
        benefitValue: parsedInput.benefitValue,
        stackable: parsedInput.stackable,
        exclusionGroup: parsedInput.exclusionGroup,
        priority: parsedInput.priority,
      },
      {
        activePromotions: activePromotions.map((p) => ({
          id: p.id,
          name: p.nombre,
          priority: p.prioridad,
          exclusionGroup: p.grupo_exclusion,
          stackable: p.acumulable,
          benefitType: p.tipo_beneficio,
          benefitValue: p.valor_beneficio,
        })),
        stackedDiscountCeilingPct: programParameters.techoDescuentoApiladoPct,
      }
    ).filter((issue) => SERVER_CONTEXT_RULE_IDS.includes(issue.rule))

    return { ok: true as const, impactedStores, collisions, advisories }
  })
