import type { BenefitType, PromotionType } from "@/types/domain"

import type { PromotionValues } from "../schemas"

/**
 * Única fuente de verdad de qué campos pertenece a cada mecánica —
 * alimenta el paso "Configuración" (qué se valida con `trigger()` en
 * `promotion-form.tsx`), el `switch` de `MechanicConfigForm` (qué se
 * renderiza) y el null-out de `toRow()` en `actions/promotions.ts` (qué se
 * persiste). Mantener esto en 3 listas separadas es exactamente cómo se
 * terminan guardando valores de una mecánica anterior al cambiar de
 * elección en el paso "Mecánica" — un solo mapa evita que las 3 diverjan.
 *
 * `applyTo`/`maxCap` no aparecen aquí para ninguna mecánica salvo las 3 de
 * descuento variable — `promotion-form.tsx` los muestra solo para esas 3,
 * pero siguen agregándose explícitamente en el paso de validación (ver
 * `next()`), no a través de este mapa.
 */
export const MECHANIC_FIELDS: Record<BenefitType, (keyof PromotionValues)[]> = {
  descuento_porcentual: ["benefitValue", "maxCap", "applyTo"],
  descuento_monto_fijo: ["benefitValue", "maxCap", "applyTo"],
  descuento_escalonado: [
    "discountTiers",
    "thresholdType",
    "tierCalculationMode",
    "maxCap",
    "applyTo",
  ],
  envio_gratis: [
    "montoMinimoDisparo",
    "tipoBeneficioNoTransaccional",
    "validacionRequerida",
    "cupoDisponible",
    "registraUso",
  ],
  producto_gratis: [
    "productoCompradoId",
    "productoRegaloId",
    "cantidadRegalo",
    "cantidadMinimaComprada",
    "beneficioSobreRegaloPct",
  ],
  precio_fijo_bundle: ["productosBundleIds", "benefitValue"],
  por_piezas: [
    "compraCantidad",
    "pagaCantidad",
    "alcancePiezas",
    "productoCompradoId",
    "descuentoUnidadExtraPct",
    "mezclaEnUniverso",
  ],
  multiplicador_puntos: [
    "multiplicadorPuntos",
    "nivelesRequeridos",
    "maxCap",
    "modoResolucionMultiplicador",
    "tipoSaldo",
    "momentoAcreditacion",
    "estadoInicial",
  ],
  bono_puntos: [
    "bonoPuntos",
    "montoMinimoDisparo",
    "eventoGatillo",
    "momentoResolucion",
    "frecuenciaDisparo",
    "tipoSaldo",
    "momentoAcreditacion",
    "estadoInicial",
    "requisitoAlta",
    "elegibleEnInactividad",
  ],
  emitir_cupon: [
    "couponBatchId",
    "montoMinimoDisparo",
    "motivoEmision",
    "umbralPuntos",
    "duracionCuponDias",
    "eventoGatillo",
    "momentoResolucion",
    "frecuenciaDisparo",
    "momentoDebitoPuntos",
    "devolucionSiVence",
    "requisitoAlta",
    "elegibleEnInactividad",
  ],
  precio_especial: [
    "productoCompradoId",
    "precioPromocional",
    "precioReferencia",
    "hastaAgotarExistencias",
    "respetaPrecioMinimoLegal",
  ],
  cashback: [
    "tipoMonedero",
    "benefitValue",
    "disponibilidadDias",
    "vigenciaSaldoDias",
    "montoMinimoCanje",
  ],
  descuento_continuidad: [
    "discountTiers",
    "productoCompradoId",
    "ventanaContinuidadDias",
    "alRomperContinuidad",
    "acumulaRetroactivo",
    "efectoDevolucion",
    "criterioSeleccionPiezas",
  ],
}

/** Las 3 únicas mecánicas donde "Aplicar sobre"/"Tope máximo" tienen sentido (un % o $ variable). */
export const BENEFIT_TYPES_WITH_APPLY_TO: readonly BenefitType[] = [
  "descuento_porcentual",
  "descuento_monto_fijo",
  "descuento_escalonado",
]

/** Todos los campos propios de mecánica, de todas las mecánicas — para limpiarlos al cambiar de elección. */
export const ALL_MECHANIC_SPECIFIC_FIELDS: (keyof PromotionValues)[] = [
  ...new Set(Object.values(MECHANIC_FIELDS).flat()),
]

/**
 * Qué mecánicas tiene sentido ofrecer según el "Tipo de promoción" — sin
 * respaldo en `docs/promociones.md` (ahí `tipo` está documentado como "solo
 * una etiqueta visual, no conduce ninguna lógica real"); esta tabla es una
 * decisión de producto tomada a propósito para que el paso "Mecánica" no
 * muestre combinaciones incoherentes con el tipo elegido. Varias mecánicas
 * aparecen en más de un tipo donde de verdad aplican (ej. "Envío gratis"
 * en segmento y carrito) — no es una partición 1 a 1.
 */
export const PROMOTION_TYPE_MECHANICS: Record<PromotionType, BenefitType[]> = {
  cantidad: ["producto_gratis", "por_piezas", "descuento_escalonado"],
  categoria: [
    "descuento_porcentual",
    "descuento_monto_fijo",
    "descuento_escalonado",
    "envio_gratis",
    "precio_especial",
  ],
  segmento: [
    "multiplicador_puntos",
    "bono_puntos",
    "cashback",
    "descuento_continuidad",
    "envio_gratis",
  ],
  carrito: [
    "descuento_porcentual",
    "descuento_monto_fijo",
    "envio_gratis",
    "cashback",
    "emitir_cupon",
  ],
  cupon: ["emitir_cupon"],
  bundle: ["precio_fijo_bundle", "producto_gratis"],
}
