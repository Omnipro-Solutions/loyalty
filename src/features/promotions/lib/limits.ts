import type { LimitValues } from "../schemas"

/**
 * El paso "Límites" (docs/modalidades-promocion-contexto.md L01–L23) deja de
 * ser 3 campos sueltos (`usesPerMember`/`usagePeriod`/`totalUsesPerPeriod`)
 * para ser un constructor de filas: cada límite del documento es una
 * combinación de las mismas 4 dimensiones — cuenta (`unidad`), sujeto,
 * ventana y comportamiento al exceder. Este módulo es puro (sin UI, sin
 * red) — mismo espíritu que `lib/condition-tree.ts` y `lib/tiered-discount.ts`.
 */

/** Fila nueva por defecto al presionar "+ Añadir límite" — el invariante 8 del documento exige que `alExceder` nunca quede implícito. */
export function defaultLimitRow(): LimitValues {
  return {
    unidad: "veces",
    sujeto: "socio",
    ventana: "mes_calendario",
    tope: 1,
    alExceder: "descartar",
  }
}

/** Agrega una fila (o una plantilla sugerida) al final. */
export function withLimitAdded(
  limits: LimitValues[],
  template?: LimitValues
): LimitValues[] {
  return [...limits, template ?? defaultLimitRow()]
}

/** Reemplaza la fila en `index` — usado por cada `LimitRow` al editar un campo. */
export function withLimitReplaced(
  limits: LimitValues[],
  index: number,
  next: LimitValues
): LimitValues[] {
  return limits.map((limit, i) => (i === index ? next : limit))
}

/** Quita la fila en `index`. */
export function withLimitRemoved(
  limits: LimitValues[],
  index: number
): LimitValues[] {
  return limits.filter((_, i) => i !== index)
}

/**
 * Plantillas de un clic para el paso Límites, sugeridas según la mecánica
 * elegida — atajo, no un campo obligatorio más. Sin entrada específica cae
 * al genérico (L01: veces por socio / mes calendario), que sirve para
 * cualquier mecánica.
 */
export const GENERIC_LIMIT_TEMPLATES: LimitValues[] = [
  {
    unidad: "veces",
    sujeto: "socio",
    ventana: "mes_calendario",
    tope: 1,
    alExceder: "descartar",
  },
  {
    unidad: "presupuesto",
    sujeto: "promocion",
    ventana: "campana",
    tope: 1000,
    alExceder: "alertar_continuar",
  },
]

const MECHANIC_LIMIT_TEMPLATES: Record<string, LimitValues[]> = {
  producto_gratis: [
    {
      unidad: "piezas",
      sujeto: "socio",
      ventana: "mes_calendario",
      tope: 3,
      alExceder: "aplicar_parcial",
    },
  ],
  por_piezas: [
    {
      unidad: "piezas",
      sujeto: "ticket",
      ventana: "ticket",
      tope: 6,
      alExceder: "aplicar_parcial",
    },
  ],
  emitir_cupon: [
    {
      unidad: "cupones",
      sujeto: "socio",
      ventana: "mes_calendario",
      tope: 1,
      alExceder: "descartar",
    },
  ],
  multiplicador_puntos: [
    {
      unidad: "puntos",
      sujeto: "ticket",
      ventana: "ticket",
      tope: 500,
      alExceder: "aplicar_parcial",
    },
  ],
  // "Máximo 2 piezas por cliente cada 30 días" del caso de referencia
  // (docs/promociones.md) — sin este tope, una escalera de continuidad no
  // tiene techo de unidades por período.
  descuento_continuidad: [
    {
      unidad: "piezas",
      sujeto: "socio",
      ventana: "rolling",
      ventanaDias: 30,
      tope: 2,
      alExceder: "aplicar_parcial",
    },
  ],
}

/** Sugerencias de la mecánica elegida, con el genérico siempre al final. */
export function limitTemplatesFor(benefitType: string): LimitValues[] {
  return [
    ...(MECHANIC_LIMIT_TEMPLATES[benefitType] ?? []),
    ...GENERIC_LIMIT_TEMPLATES,
  ]
}
