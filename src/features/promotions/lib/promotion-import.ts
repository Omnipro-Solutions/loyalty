import { inferHeaderMapping, type ParsedCsv } from "@/lib/csv"
import {
  ACCRUAL_TIMINGS,
  APPLICATION_LEVELS,
  APPLY_TO_OPTIONS,
  BALANCE_INITIAL_STATES,
  BALANCE_TYPES,
  BENEFIT_TYPES,
  BXGY_SCOPES,
  CHANNEL_SCOPES,
  CONTINUITY_BREAK_BEHAVIORS,
  CONTINUITY_WINDOW_UNITS,
  COST_NATURES,
  DAYS_OF_WEEK,
  DISCOUNT_TIER_CALCULATION_MODES,
  DISCOUNT_TIER_THRESHOLD_TYPES,
  ENROLLMENT_REQUIREMENTS,
  FINANCIADORES,
  GENDERS,
  LIMIT_EXCESS_BEHAVIORS,
  LIMIT_SUBJECTS,
  LIMIT_UNITS,
  LIMIT_WINDOWS,
  MARITAL_STATUSES,
  MULTIPLIER_RESOLUTION_MODES,
  NON_TRANSACTIONAL_BENEFIT_TYPES,
  POINTS_DEBIT_TIMINGS,
  PRICE_BASES,
  PROMOTION_TYPES,
  RX_APPLICABILITIES,
  SETTLEMENT_PERIODS,
  STACKING_MODES,
  STORE_FORMATS,
  TIER_NAMES,
  TRIGGER_EVENTS,
  TRIGGER_FREQUENCIES,
  TRIGGER_RESOLUTION_MOMENTS,
  WALLET_VALUE_TYPES,
  type BenefitType,
  type ChannelScope,
  type PromotionType,
} from "@/types/domain"

import {
  BENEFIT_TYPE_LABEL,
  CHANNEL_SCOPE_LABEL,
  PROMOTION_TYPE_LABEL,
} from "./labels"
import { createPromotionDefaults } from "./promotion-defaults"
import {
  promotionSchema,
  type ConditionGroupValues,
  type PromotionValues,
} from "../schemas"

/**
 * Las 13 mecánicas del formulario, todas importables: los productos y las
 * emisiones de cupones se referencian por SKU/referencia, y los datos
 * multi-valor van en una celda (`escalones`, `limites`, `bundle_skus`,
 * `cond_*`). Cada una trae su propia plantilla con las columnas de los 6
 * pasos que le aplican — ver `buildMechanicTemplate`.
 *
 * Es `BENEFIT_TYPES` reordenado (no una copia parcial): el `satisfies` de
 * abajo más el `Record<ImportableBenefitType, …>` de las plantillas hacen
 * que añadir una mecánica al dominio rompa aquí hasta darle su formato.
 */
export const IMPORTABLE_BENEFIT_TYPES = [
  "descuento_porcentual",
  "descuento_monto_fijo",
  "descuento_escalonado",
  "envio_gratis",
  "producto_gratis",
  "por_piezas",
  "precio_especial",
  "precio_fijo_bundle",
  "multiplicador_puntos",
  "bono_puntos",
  "emitir_cupon",
  "cashback",
  "descuento_continuidad",
] as const satisfies readonly BenefitType[]
export type ImportableBenefitType = (typeof IMPORTABLE_BENEFIT_TYPES)[number]

/**
 * Mecánicas donde la columna `valor` del CSV significa el beneficio en sí.
 * En las demás el beneficio vive en sus propias columnas (`escalones`,
 * `precio_promocional`, `compra_cantidad`…) y `valor` debe ir vacía —
 * excepto `bono_puntos`/`multiplicador_puntos`, que la reusan pero la
 * escriben en otro campo del formulario.
 */
const BENEFIT_TYPES_WITH_IMPORT_VALUE: readonly ImportableBenefitType[] = [
  "descuento_porcentual",
  "descuento_monto_fijo",
  "precio_fijo_bundle",
  "cashback",
  "bono_puntos",
  "multiplicador_puntos",
]

type ImportColumnSpec = {
  key: string
  label: string
  required: boolean
  hint: string
  example: string
}

/** Contrato del CSV — única fuente de verdad: alimenta la plantilla, el mapeo de columnas, el parseo por fila y el CSV de errores. */
export const PROMOTION_IMPORT_COLUMNS = [
  {
    key: "nombre",
    label: "nombre",
    required: true,
    hint: "Nombre de la promoción",
    example: "Verano 20%",
  },
  {
    key: "codigo",
    label: "codigo",
    required: true,
    hint: "Solo mayúsculas, números y guiones",
    example: "VERANO20",
  },
  {
    key: "tipo",
    label: "tipo",
    required: true,
    hint: "cantidad · categoria · segmento · carrito · cupon · bundle",
    example: "categoria",
  },
  {
    key: "mecanica",
    label: "mecanica",
    required: true,
    // Derivada de la tupla: una lista escrita a mano se quedaba vieja en
    // cuanto una mecánica pasaba a ser importable.
    hint: IMPORTABLE_BENEFIT_TYPES.join(" · "),
    example: "descuento_porcentual",
  },
  {
    key: "valor",
    label: "valor",
    required: false,
    hint: "Solo en descuento %/monto, bundle, cashback, bono y multiplicador — en las demás va vacía",
    example: "20",
  },
  {
    key: "tope_maximo",
    label: "tope_maximo",
    required: false,
    hint: "Tope del beneficio, opcional",
    example: "",
  },
  {
    key: "desde",
    label: "desde",
    required: true,
    hint: "AAAA-MM-DD o DD/MM/AAAA",
    example: "2026-09-01",
  },
  {
    key: "hasta",
    label: "hasta",
    required: false,
    hint: "AAAA-MM-DD o DD/MM/AAAA",
    example: "2026-09-30",
  },
  {
    key: "prioridad",
    label: "prioridad",
    required: false,
    hint: "1 a 10, por defecto 5",
    example: "5",
  },
  {
    key: "presupuesto",
    label: "presupuesto",
    required: false,
    hint: "Presupuesto asignado, por defecto 0",
    example: "5000000",
  },
  {
    key: "acumulable",
    label: "acumulable",
    required: false,
    hint: "si/no, por defecto no",
    example: "no",
  },
  {
    key: "canal",
    label: "canal",
    required: false,
    hint: "pos · ecommerce · pos_ecommerce, por defecto pos_ecommerce",
    example: "pos_ecommerce",
  },
  // --- Paso 2 · Condiciones: una columna por campo de condición -------
  // Una columna por campo (y no una mega-columna `condiciones`) porque
  // es lo que un Excel sabe hacer: filtrar, ordenar y autocompletar por
  // columna. Todas admiten varios valores separados por `|`.
  {
    key: "cond_categorias",
    label: "cond_categorias",
    required: false,
    hint: "Nombres de categoría separados por |",
    example: "",
  },
  {
    key: "cond_productos",
    label: "cond_productos",
    required: false,
    hint: "SKUs separados por |",
    example: "",
  },
  {
    key: "cond_ciudad",
    label: "cond_ciudad",
    required: false,
    hint: "Nombre de ciudad con tiendas",
    example: "",
  },
  {
    key: "cond_segmento",
    label: "cond_segmento",
    required: false,
    hint: "Nombre de la audiencia",
    example: "",
  },
  {
    key: "cond_monto_minimo",
    label: "cond_monto_minimo",
    required: false,
    hint: "Monto mínimo del carrito",
    example: "",
  },
  {
    key: "cond_cupon",
    label: "cond_cupon",
    required: false,
    hint: "Referencia de la emisión de cupones",
    example: "",
  },
  {
    key: "cond_niveles",
    label: "cond_niveles",
    required: false,
    hint: "Niveles de lealtad separados por | (bronce · plata · oro · diamante)",
    example: "",
  },
  {
    key: "cond_provincias",
    label: "cond_provincias",
    required: false,
    hint: "Provincias del socio separadas por |",
    example: "",
  },
  {
    key: "cond_antiguedad_meses",
    label: "cond_antiguedad_meses",
    required: false,
    hint: "Antigüedad mínima del socio, en meses",
    example: "",
  },
  {
    key: "cond_edad_minima",
    label: "cond_edad_minima",
    required: false,
    hint: "Edad mínima del socio, en años",
    example: "",
  },
  {
    key: "cond_generos",
    label: "cond_generos",
    required: false,
    hint: "femenino · masculino · otro · prefiere_no_decir, separados por |",
    example: "",
  },
  {
    key: "cond_estados_civiles",
    label: "cond_estados_civiles",
    required: false,
    hint: "soltero · casado · union_libre · divorciado · viudo, separados por |",
    example: "",
  },
  {
    key: "cond_tiene_hijos",
    label: "cond_tiene_hijos",
    required: false,
    hint: "si/no — deja vacío para no filtrar",
    example: "",
  },
  {
    key: "cond_tiene_mascotas",
    label: "cond_tiene_mascotas",
    required: false,
    hint: "si/no — deja vacío para no filtrar",
    example: "",
  },
  {
    key: "cond_regiones_tienda",
    label: "cond_regiones_tienda",
    required: false,
    hint: "Regiones de tienda separadas por |",
    example: "",
  },
  {
    key: "cond_formatos_tienda",
    label: "cond_formatos_tienda",
    required: false,
    hint: "Formatos de tienda separados por |",
    example: "",
  },
  {
    key: "cond_marcas",
    label: "cond_marcas",
    required: false,
    hint: "Marcas de producto separadas por |",
    example: "",
  },
  {
    key: "cond_proveedores",
    label: "cond_proveedores",
    required: false,
    hint: "Proveedores/laboratorios separados por |",
    example: "",
  },
  {
    key: "cond_requiere_receta",
    label: "cond_requiere_receta",
    required: false,
    hint: "si/no — deja vacío para no filtrar",
    example: "",
  },
  // --- Paso 3 · Configuración de la mecánica ---------------------------
  {
    key: "aplicar_sobre",
    label: "aplicar_sobre",
    required: false,
    hint: "Descuentos — subtotal_carrito (por defecto) o envio",
    example: "",
  },
  {
    key: "escalones",
    label: "escalones",
    required: false,
    hint: "descuento_escalonado y descuento_continuidad — umbral=3;descuento=10 | umbral=6;descuento=15",
    example: "",
  },
  {
    key: "escalones_umbral",
    label: "escalones_umbral",
    required: false,
    hint: "descuento_escalonado — unidades (por defecto) o monto",
    example: "",
  },
  {
    key: "escalones_modo_calculo",
    label: "escalones_modo_calculo",
    required: false,
    hint: "descuento_escalonado — escalon_unico (por defecto) o acumulativo_por_tramo",
    example: "",
  },
  {
    key: "producto_sku",
    label: "producto_sku",
    required: false,
    hint: "SKU del producto comprado — precio_especial, producto_gratis, por_piezas",
    example: "",
  },
  {
    key: "precio_promocional",
    label: "precio_promocional",
    required: false,
    hint: "precio_especial — precio final del producto",
    example: "",
  },
  {
    key: "precio_referencia",
    label: "precio_referencia",
    required: false,
    hint: "precio_especial — precio antes de la promoción, opcional",
    example: "",
  },
  {
    key: "hasta_agotar_existencias",
    label: "hasta_agotar_existencias",
    required: false,
    hint: "precio_especial — si/no",
    example: "",
  },
  {
    key: "respeta_precio_minimo_legal",
    label: "respeta_precio_minimo_legal",
    required: false,
    hint: "precio_especial — si/no, por defecto si",
    example: "",
  },
  {
    key: "bundle_skus",
    label: "bundle_skus",
    required: false,
    hint: "precio_fijo_bundle — 2 o más SKUs separados por |",
    example: "",
  },
  {
    key: "producto_regalo_sku",
    label: "producto_regalo_sku",
    required: false,
    hint: "producto_gratis — SKU del producto que se regala",
    example: "",
  },
  {
    key: "cantidad_regalo",
    label: "cantidad_regalo",
    required: false,
    hint: "producto_gratis — unidades de regalo",
    example: "",
  },
  {
    key: "cantidad_minima_comprada",
    label: "cantidad_minima_comprada",
    required: false,
    hint: "producto_gratis — unidades mínimas de compra",
    example: "",
  },
  {
    key: "beneficio_regalo_pct",
    label: "beneficio_regalo_pct",
    required: false,
    hint: "producto_gratis — % de descuento sobre el regalo (100 = gratis)",
    example: "",
  },
  {
    key: "compra_cantidad",
    label: "compra_cantidad",
    required: false,
    hint: "por_piezas — piezas que se llevan",
    example: "",
  },
  {
    key: "paga_cantidad",
    label: "paga_cantidad",
    required: false,
    hint: "por_piezas — piezas que se pagan (menor que compra_cantidad)",
    example: "",
  },
  {
    key: "alcance_piezas",
    label: "alcance_piezas",
    required: false,
    hint: "por_piezas — mismo_producto · misma_categoria · producto_especifico",
    example: "",
  },
  {
    key: "descuento_unidad_extra_pct",
    label: "descuento_unidad_extra_pct",
    required: false,
    hint: "por_piezas — % de descuento en la unidad extra (100 = gratis)",
    example: "",
  },
  {
    key: "monto_minimo_disparo",
    label: "monto_minimo_disparo",
    required: false,
    hint: "envio_gratis, bono_puntos, emitir_cupon — monto mínimo que dispara el beneficio",
    example: "",
  },
  {
    key: "tipo_beneficio_no_transaccional",
    label: "tipo_beneficio_no_transaccional",
    required: false,
    hint: "envio_gratis — envio_gratis · servicio · acceso · atencion_preferente",
    example: "",
  },
  {
    key: "validacion_requerida",
    label: "validacion_requerida",
    required: false,
    hint: "envio_gratis — qué se valida para entregarlo",
    example: "",
  },
  {
    key: "cupo_disponible",
    label: "cupo_disponible",
    required: false,
    hint: "envio_gratis — cupo total disponible",
    example: "",
  },
  {
    key: "registra_uso",
    label: "registra_uso",
    required: false,
    hint: "envio_gratis — si/no, deja huella del uso",
    example: "",
  },
  {
    key: "multiplicador_niveles",
    label: "multiplicador_niveles",
    required: false,
    hint: "multiplicador_puntos — niveles que reciben el multiplicador, separados por |",
    example: "",
  },
  {
    key: "multiplicador_modo",
    label: "multiplicador_modo",
    required: false,
    hint: "multiplicador_puntos — gana_mayor (por defecto) o se_multiplican",
    example: "",
  },
  {
    key: "tipo_saldo",
    label: "tipo_saldo",
    required: false,
    hint: "Puntos — canjeable (por defecto) o calificador",
    example: "",
  },
  {
    key: "momento_acreditacion",
    label: "momento_acreditacion",
    required: false,
    hint: "Puntos — inmediato (por defecto) o diferido",
    example: "",
  },
  {
    key: "estado_inicial",
    label: "estado_inicial",
    required: false,
    hint: "Puntos — disponible (por defecto) o pendiente",
    example: "",
  },
  {
    key: "evento_gatillo",
    label: "evento_gatillo",
    required: false,
    hint: "bono_puntos y emitir_cupon — evento que dispara el beneficio",
    example: "",
  },
  {
    key: "momento_resolucion",
    label: "momento_resolucion",
    required: false,
    hint: "bono_puntos y emitir_cupon — cuándo se resuelve el disparador",
    example: "",
  },
  {
    key: "frecuencia_disparo",
    label: "frecuencia_disparo",
    required: false,
    hint: "bono_puntos y emitir_cupon — una_vez · cada_vez · periodica",
    example: "",
  },
  {
    key: "requisito_alta",
    label: "requisito_alta",
    required: false,
    hint: "bono_puntos y emitir_cupon — ninguno · perfil_completo · primera_compra",
    example: "",
  },
  {
    key: "elegible_en_inactividad",
    label: "elegible_en_inactividad",
    required: false,
    hint: "bono_puntos y emitir_cupon — si/no",
    example: "",
  },
  {
    key: "cupon_emision",
    label: "cupon_emision",
    required: false,
    hint: "emitir_cupon — referencia de la emisión plantilla",
    example: "",
  },
  {
    key: "cupon_motivo",
    label: "cupon_motivo",
    required: false,
    hint: "emitir_cupon — motivo de la emisión (mín. 5 caracteres)",
    example: "",
  },
  {
    key: "cupon_umbral_puntos",
    label: "cupon_umbral_puntos",
    required: false,
    hint: "emitir_cupon — puntos que financian el cupón",
    example: "",
  },
  {
    key: "cupon_duracion_dias",
    label: "cupon_duracion_dias",
    required: false,
    hint: "emitir_cupon — días de vigencia del cupón",
    example: "",
  },
  {
    key: "cupon_momento_debito",
    label: "cupon_momento_debito",
    required: false,
    hint: "emitir_cupon — al_emitir o al_redimir (obligatorio si hay umbral de puntos)",
    example: "",
  },
  {
    key: "cupon_devolucion_si_vence",
    label: "cupon_devolucion_si_vence",
    required: false,
    hint: "emitir_cupon — si/no",
    example: "",
  },
  {
    key: "tipo_monedero",
    label: "tipo_monedero",
    required: false,
    hint: "cashback — porcentaje (por defecto) o monto_fijo",
    example: "",
  },
  {
    key: "cashback_disponibilidad_dias",
    label: "cashback_disponibilidad_dias",
    required: false,
    hint: "cashback — días hasta que el saldo queda disponible",
    example: "",
  },
  {
    key: "cashback_vigencia_dias",
    label: "cashback_vigencia_dias",
    required: false,
    hint: "cashback — días de vigencia del saldo",
    example: "",
  },
  {
    key: "cashback_monto_minimo_canje",
    label: "cashback_monto_minimo_canje",
    required: false,
    hint: "cashback — monto mínimo para canjear el saldo",
    example: "",
  },
  {
    key: "continuidad_ventana_cantidad",
    label: "continuidad_ventana_cantidad",
    required: false,
    hint: "descuento_continuidad — cantidad de la ventana",
    example: "",
  },
  {
    key: "continuidad_ventana_unidad",
    label: "continuidad_ventana_unidad",
    required: false,
    hint: "descuento_continuidad — dias · semanas · meses · bimestres",
    example: "",
  },
  {
    key: "continuidad_al_romper",
    label: "continuidad_al_romper",
    required: false,
    hint: "descuento_continuidad — reiniciar · retroceder_un_escalon · mantener",
    example: "",
  },
  {
    key: "continuidad_evalua_historial",
    label: "continuidad_evalua_historial",
    required: false,
    hint: "descuento_continuidad — si/no, evalúa compras previas",
    example: "",
  },
  // --- Paso 4 · Vigencia ----------------------------------------------
  {
    key: "dias_semana",
    label: "dias_semana",
    required: false,
    hint: "Días separados por | (lunes · martes…). Vacío = todos los días",
    example: "",
  },
  {
    key: "hora_inicio",
    label: "hora_inicio",
    required: false,
    hint: "HH:MM, opcional",
    example: "",
  },
  {
    key: "hora_fin",
    label: "hora_fin",
    required: false,
    hint: "HH:MM, opcional",
    example: "",
  },
  // --- Paso 5 · Límites y stacking -------------------------------------
  // `limites` acepta varios registros: cada uno `clave=valor` separado por
  // `;`, y los registros entre sí por `|`.
  {
    key: "limites",
    label: "limites",
    required: false,
    hint: "unidad=piezas;sujeto=socio;ventana=mes_calendario;tope=3;exceder=descartar | …",
    example: "",
  },
  {
    key: "grupo_exclusion",
    label: "grupo_exclusion",
    required: false,
    hint: "Promociones del mismo grupo no se combinan entre sí",
    example: "",
  },
  {
    key: "modo_multiple",
    label: "modo_multiple",
    required: false,
    hint: "mejor_beneficio (por defecto) · mayor_prioridad · todas_acumulan",
    example: "",
  },
  // --- Paso 6 · Economía ------------------------------------------------
  {
    key: "naturaleza_costo",
    label: "naturaleza_costo",
    required: false,
    hint: "margen_sacrificado (por defecto) · costo_producto · costo_marketing · costo_financiero",
    example: "",
  },
  {
    key: "financiador",
    label: "financiador",
    required: false,
    hint: "retailer (por defecto) · proveedor · compartido",
    example: "",
  },
  {
    key: "proveedor",
    label: "proveedor",
    required: false,
    hint: "Nombre del proveedor que cofinancia — obligatorio si financiador no es retailer",
    example: "",
  },
  {
    key: "contrato",
    label: "contrato",
    required: false,
    hint: "Referencia del contrato con el proveedor",
    example: "",
  },
  {
    key: "porcentaje_costo_proveedor",
    label: "porcentaje_costo_proveedor",
    required: false,
    hint: "% del costo que absorbe el proveedor (0 a 100)",
    example: "",
  },
  {
    key: "periodo_liquidacion",
    label: "periodo_liquidacion",
    required: false,
    hint: "mensual · quincenal · por_campana",
    example: "",
  },
  {
    key: "umbral_alerta_presupuesto_pct",
    label: "umbral_alerta_presupuesto_pct",
    required: false,
    hint: "Avisar al consumir este % del presupuesto",
    example: "",
  },
  {
    key: "nivel_aplicacion",
    label: "nivel_aplicacion",
    required: false,
    hint: "ticket (por defecto) o linea",
    example: "",
  },
  {
    key: "aplica_sobre_precio",
    label: "aplica_sobre_precio",
    required: false,
    hint: "vigente (por defecto) o lista",
    example: "",
  },
  {
    key: "descuento_acumula_puntos",
    label: "descuento_acumula_puntos",
    required: false,
    hint: "si/no",
    example: "",
  },
  {
    key: "aplica_a_rx",
    label: "aplica_a_rx",
    required: false,
    hint: "permitido (por defecto) · excluido · solo_rx",
    example: "",
  },
  {
    key: "aprobacion_regulatoria",
    label: "aprobacion_regulatoria",
    required: false,
    hint: "si/no — obligatoria si toca productos con receta (S12)",
    example: "",
  },
] as const satisfies readonly ImportColumnSpec[]

/** Tope de filas por importación — acota el payload de la Server Action y el número de reintentos fila-por-fila en el peor caso. */
export const MAX_IMPORT_ROWS = 500

export type PromotionImportColumnKey =
  (typeof PROMOTION_IMPORT_COLUMNS)[number]["key"]
export type ColumnMapping = Partial<Record<PromotionImportColumnKey, number>>
export type RawImportRow = { rowNumber: number } & Record<
  PromotionImportColumnKey,
  string
>

// --- Normalización y heurística de mapeo de columnas ---------------------

/** minúsculas, sin acentos, espacios/guiones → `_` — mismo criterio para cabeceras de columna y valores de dominio (etiqueta o crudo, da igual cuál llegue). */
export function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
}

/**
 * Pistas por si la cabecera del archivo no coincide exacto con la columna.
 * Solo se declaran las que necesitan una regla especial: las demás caen a
 * una regex derivada de la propia clave, así que agregar una columna al
 * contrato no obliga a tocar este mapa (y no puede quedarse sin pista).
 */
const SPECIAL_HEADER_HINTS: Partial<Record<PromotionImportColumnKey, RegExp>> =
  {
    nombre: /nombre|name/i,
    codigo: /codigo|código|^code$/i,
    tipo: /^tipo$|^type$/i,
    mecanica: /mecanica|mecánica|benefit/i,
    valor: /^valor$|^value$/i,
    tope_maximo: /tope|max.*cap/i,
    desde: /desde|inicio|from/i,
    hasta: /hasta|termina|until/i,
    prioridad: /prioridad|priority/i,
    presupuesto: /presupuesto|budget/i,
    acumulable: /acumulable|stackable/i,
    canal: /canal|channel/i,
    cond_categorias: /^categor|cond.*categor/i,
    cond_ciudad: /ciudad|city/i,
    cond_segmento: /segmento|segment|audiencia/i,
    cond_monto_minimo: /monto.*minimo|monto_carrito|^carrito$/i,
    cond_productos: /cond.*(producto|sku)|^skus$/i,
    escalones: /^escalones$|tramos|tiers/i,
    producto_sku: /^producto_sku$|sku.*comprado/i,
    bundle_skus: /bundle/i,
    tipo_monedero: /monedero|wallet/i,
    limites: /^limites$|^límites$/i,
    proveedor: /^proveedor$/i,
    contrato: /^contrato$/i,
  }

/** `cantidad_minima_comprada` → /cantidad.*minima.*comprada/i — separadores flexibles, misma palabra clave. */
function hintFromKey(key: string): RegExp {
  return new RegExp(key.split("_").join(".*"), "i")
}

const HEADER_HINTS = Object.fromEntries(
  PROMOTION_IMPORT_COLUMNS.map((column) => [
    column.key,
    SPECIAL_HEADER_HINTS[column.key] ?? hintFromKey(column.key),
  ])
) as Record<PromotionImportColumnKey, RegExp>

/** Heurística por nombre de columna — coincidencia exacta normalizada primero, luego regex por pista. Mismo mecanismo que `features/coupons/lib/csv-import.ts` (`inferHeaderMapping` en `@/lib/csv`). */
export function inferImportMapping(headers: string[]): ColumnMapping {
  return inferHeaderMapping(
    headers,
    PROMOTION_IMPORT_COLUMNS.map((c) => c.key),
    HEADER_HINTS,
    normalizeToken
  )
}

export function missingRequiredColumns(
  mapping: ColumnMapping
): PromotionImportColumnKey[] {
  return PROMOTION_IMPORT_COLUMNS.filter(
    (c) => c.required && mapping[c.key] === undefined
  ).map((c) => c.key)
}

export function mapImportRows(
  parsed: ParsedCsv,
  mapping: ColumnMapping
): RawImportRow[] {
  return parsed.rows.map((row, i) => {
    const entry = { rowNumber: i + 2 } as RawImportRow
    for (const { key } of PROMOTION_IMPORT_COLUMNS) {
      const index = mapping[key]
      entry[key] = index !== undefined ? (row[index]?.trim() ?? "") : ""
    }
    return entry
  })
}

export function buildTemplateCsv(): string[][] {
  return [
    PROMOTION_IMPORT_COLUMNS.map((c) => c.label),
    PROMOTION_IMPORT_COLUMNS.map((c) => c.example),
  ]
}

// --- Plantillas por mecánica ----------------------------------------------

/** Paso 1 · Mecánica — identidad, común a toda promoción. */
const COMMON_TEMPLATE_COLUMNS = [
  "nombre",
  "codigo",
  "tipo",
  "mecanica",
  "prioridad",
  "acumulable",
  "canal",
] as const satisfies readonly PromotionImportColumnKey[]

/** Paso 4 · Vigencia — igual para todas. */
const VALIDITY_TEMPLATE_COLUMNS = [
  "desde",
  "hasta",
  "dias_semana",
  "hora_inicio",
  "hora_fin",
] as const satisfies readonly PromotionImportColumnKey[]

/** Paso 5 · Límites y stacking. */
const LIMITS_TEMPLATE_COLUMNS = [
  "limites",
  "presupuesto",
  "grupo_exclusion",
  "modo_multiple",
] as const satisfies readonly PromotionImportColumnKey[]

/** Paso 6 · Economía — el formulario lo pide para toda promoción, así que la plantilla también. */
const ECONOMY_TEMPLATE_COLUMNS = [
  "naturaleza_costo",
  "financiador",
  "proveedor",
  "contrato",
  "porcentaje_costo_proveedor",
  "periodo_liquidacion",
  "umbral_alerta_presupuesto_pct",
  "nivel_aplicacion",
  "aplica_sobre_precio",
  "descuento_acumula_puntos",
  "aplica_a_rx",
  "aprobacion_regulatoria",
] as const satisfies readonly PromotionImportColumnKey[]

/**
 * Paso 3 · Configuración: las columnas propias de cada mecánica, en el
 * mismo orden en que el formulario las pide. Es lo que hace que la
 * plantilla de "Envío gratis" no arrastre las de bundle o cupón.
 */
const MECHANIC_TEMPLATE_COLUMNS: Record<
  ImportableBenefitType,
  readonly PromotionImportColumnKey[]
> = {
  descuento_porcentual: ["valor", "aplicar_sobre", "tope_maximo"],
  descuento_monto_fijo: ["valor", "aplicar_sobre", "tope_maximo"],
  descuento_escalonado: [
    "escalones",
    "escalones_umbral",
    "escalones_modo_calculo",
    "aplicar_sobre",
    "tope_maximo",
  ],
  envio_gratis: [
    "monto_minimo_disparo",
    "tipo_beneficio_no_transaccional",
    "validacion_requerida",
    "cupo_disponible",
    "registra_uso",
  ],
  producto_gratis: [
    "producto_sku",
    "producto_regalo_sku",
    "cantidad_regalo",
    "cantidad_minima_comprada",
    "beneficio_regalo_pct",
  ],
  por_piezas: [
    "compra_cantidad",
    "paga_cantidad",
    "alcance_piezas",
    "producto_sku",
    "descuento_unidad_extra_pct",
  ],
  precio_especial: [
    "producto_sku",
    "precio_promocional",
    "precio_referencia",
    "hasta_agotar_existencias",
    "respeta_precio_minimo_legal",
  ],
  precio_fijo_bundle: ["bundle_skus", "valor"],
  multiplicador_puntos: [
    "valor",
    "multiplicador_niveles",
    "multiplicador_modo",
    "tipo_saldo",
    "momento_acreditacion",
    "estado_inicial",
    "tope_maximo",
  ],
  bono_puntos: [
    "valor",
    "monto_minimo_disparo",
    "evento_gatillo",
    "momento_resolucion",
    "frecuencia_disparo",
    "tipo_saldo",
    "momento_acreditacion",
    "estado_inicial",
    "requisito_alta",
    "elegible_en_inactividad",
  ],
  emitir_cupon: [
    "cupon_emision",
    "cupon_motivo",
    "monto_minimo_disparo",
    "cupon_umbral_puntos",
    "cupon_duracion_dias",
    "cupon_momento_debito",
    "cupon_devolucion_si_vence",
    "evento_gatillo",
    "momento_resolucion",
    "frecuencia_disparo",
    "requisito_alta",
    "elegible_en_inactividad",
  ],
  cashback: [
    "valor",
    "tipo_monedero",
    "cashback_disponibilidad_dias",
    "cashback_vigencia_dias",
    "cashback_monto_minimo_canje",
    "tope_maximo",
  ],
  descuento_continuidad: [
    "escalones",
    "continuidad_ventana_cantidad",
    "continuidad_ventana_unidad",
    "continuidad_al_romper",
    "continuidad_evalua_historial",
  ],
}

/** Paso 2 · Condiciones que la plantilla de cada mecánica trae de ejemplo. */
const MECHANIC_TEMPLATE_CONDITIONS: Record<
  ImportableBenefitType,
  readonly PromotionImportColumnKey[]
> = {
  descuento_porcentual: ["cond_categorias", "cond_monto_minimo"],
  descuento_monto_fijo: ["cond_monto_minimo"],
  // El caso que pidió el usuario: 3 escalones acotados por 3 categorías y
  // 10 SKUs a la vez — la prueba de que la condición admite multivalor.
  descuento_escalonado: ["cond_categorias", "cond_productos"],
  envio_gratis: ["cond_monto_minimo"],
  producto_gratis: ["cond_categorias"],
  por_piezas: ["cond_categorias"],
  precio_especial: ["cond_productos"],
  precio_fijo_bundle: [],
  multiplicador_puntos: ["cond_segmento", "cond_niveles"],
  bono_puntos: ["cond_segmento", "cond_monto_minimo"],
  emitir_cupon: ["cond_segmento"],
  cashback: ["cond_categorias", "cond_monto_minimo"],
  // `descuento_continuidad` exige alcance de producto (ver
  // `hasProductScopeCondition` en ../schemas.ts).
  descuento_continuidad: ["cond_categorias", "cond_productos"],
}

/** Datos reales del tenant con los que se rellena el ejemplo, para que la plantilla importe sin editar nada. */
export type TemplateSamples = {
  categories: string[]
  productSkus: string[]
  segment?: string
  city?: string
  /** Referencia de una emisión de cupones existente — `emitir_cupon` no se puede inventar. */
  couponBatch?: string
}

/** Marcadores cuando el tenant todavía no tiene datos de ese tipo — la plantilla se descarga igual, pero hay que reemplazarlos. */
const PLACEHOLDER = {
  category: "NOMBRE-DE-CATEGORIA",
  sku: "SKU-DEL-PRODUCTO",
  segment: "NOMBRE-DE-AUDIENCIA",
  couponBatch: "REFERENCIA-DE-EMISION",
}

function sample(values: string[], count: number, fallback: string): string {
  const picked = values.slice(0, count)
  return (picked.length > 0 ? picked : [fallback]).join("|")
}

/** Fechas del ejemplo: siempre futuras respecto a `today` — una plantilla con fechas vencidas no importa. */
function templateDates(today: string): { desde: string; hasta: string } {
  const year = Number(today.slice(0, 4))
  return { desde: `${year + 1}-01-01`, hasta: `${year + 1}-03-31` }
}

/**
 * Ejemplos de `limites`. Toda plantilla trae DOS registros, no uno: con uno
 * solo no se ve dónde termina un límite y empieza el siguiente, que es
 * justo lo que hay que entender de esta columna.
 *
 * Las 4 decisiones son las mismas del constructor del paso Límites:
 * qué se cuenta (`unidad`), para quién (`sujeto`), en qué ventana
 * (`ventana`) y qué pasa al exceder (`exceder`), más el `tope`.
 */
const LIMIT_EXAMPLES = {
  /** "2 piezas por ticket — al exceder, aplicar parcial": el tope por transacción. */
  piezasPorTicket:
    "unidad=piezas;sujeto=ticket;ventana=ticket;tope=2;exceder=aplicar_parcial",
  /** "1 vez por socio al mes calendario — al exceder, descartar": la frecuencia. */
  vecesPorSocioAlMes:
    "unidad=veces;sujeto=socio;ventana=mes_calendario;tope=1;exceder=descartar",
  /** Piezas por socio al mes — el que exige S03 al entregar producto físico. */
  piezasPorSocio: (tope: number) =>
    `unidad=piezas;sujeto=socio;ventana=mes_calendario;tope=${tope};exceder=descartar`,
} as const

/** Par por defecto: tope por ticket + frecuencia por socio. */
const DEFAULT_LIMITS = `${LIMIT_EXAMPLES.piezasPorTicket} | ${LIMIT_EXAMPLES.vecesPorSocioAlMes}`

/** Para las mecánicas que entregan producto físico: el límite que exige S03 + el tope por ticket. */
const PIECES_LIMIT = (tope: number) =>
  `${LIMIT_EXAMPLES.piezasPorSocio(tope)} | ${LIMIT_EXAMPLES.piezasPorTicket}`

/**
 * Valores de ejemplo por mecánica (paso 3 + lo que esa mecánica necesite de
 * los pasos 5 y 6). `samples` trae datos reales del tenant, así que la
 * plantilla descargada importa tal cual: es el mismo contrato que valida
 * `parseImportRow`, no un documento aparte que pueda quedar desincronizado.
 */
function mechanicExample(
  benefitType: ImportableBenefitType,
  samples: TemplateSamples
): Partial<Record<PromotionImportColumnKey, string>> {
  const skus = samples.productSkus
  switch (benefitType) {
    case "descuento_porcentual":
      return {
        valor: "15",
        aplicar_sobre: "subtotal_carrito",
        tope_maximo: "30000",
      }
    case "descuento_monto_fijo":
      return { valor: "10000", aplicar_sobre: "subtotal_carrito" }
    case "descuento_escalonado":
      return {
        // 3 escalones: "compra más, ahorra más" — el descuento crece con el
        // umbral, como exige `refineByBenefitType`.
        escalones:
          "umbral=3;descuento=10 | umbral=6;descuento=15 | umbral=12;descuento=20",
        escalones_umbral: "unidades",
        escalones_modo_calculo: "escalon_unico",
        aplicar_sobre: "subtotal_carrito",
      }
    case "envio_gratis":
      return {
        monto_minimo_disparo: "80000",
        tipo_beneficio_no_transaccional: "envio_gratis",
        validacion_requerida: "Ninguna",
        cupo_disponible: "500",
        registra_uso: "si",
      }
    case "producto_gratis":
      return {
        producto_sku: sample(skus, 1, PLACEHOLDER.sku),
        producto_regalo_sku: sample(skus.slice(1), 1, PLACEHOLDER.sku),
        cantidad_regalo: "1",
        cantidad_minima_comprada: "2",
        beneficio_regalo_pct: "100",
        limites: PIECES_LIMIT(4),
      }
    case "por_piezas":
      return {
        compra_cantidad: "3",
        paga_cantidad: "2",
        alcance_piezas: "misma_categoria",
        descuento_unidad_extra_pct: "100",
        limites: PIECES_LIMIT(6),
      }
    case "precio_especial":
      return {
        producto_sku: sample(skus, 1, PLACEHOLDER.sku),
        precio_promocional: "18900",
        precio_referencia: "24900",
        hasta_agotar_existencias: "si",
        respeta_precio_minimo_legal: "si",
        limites: PIECES_LIMIT(2),
      }
    case "precio_fijo_bundle":
      return { bundle_skus: sample(skus, 2, PLACEHOLDER.sku), valor: "45000" }
    case "multiplicador_puntos":
      return {
        valor: "2",
        multiplicador_niveles: "oro|diamante",
        multiplicador_modo: "gana_mayor",
        tipo_saldo: "canjeable",
        momento_acreditacion: "inmediato",
        estado_inicial: "disponible",
      }
    case "bono_puntos":
      return {
        valor: "500",
        monto_minimo_disparo: "60000",
        evento_gatillo: "compra_pagada",
        momento_resolucion: "cierre_ticket",
        frecuencia_disparo: "una_vez_ano",
        tipo_saldo: "canjeable",
        momento_acreditacion: "inmediato",
        estado_inicial: "disponible",
        requisito_alta: "ninguno",
        elegible_en_inactividad: "no",
      }
    case "emitir_cupon":
      return {
        cupon_emision: samples.couponBatch ?? PLACEHOLDER.couponBatch,
        cupon_motivo: "Cupón de bienvenida por compra",
        monto_minimo_disparo: "70000",
        cupon_duracion_dias: "30",
        cupon_devolucion_si_vence: "no",
        evento_gatillo: "compra_pagada",
        momento_resolucion: "cierre_ticket",
        frecuencia_disparo: "una_vez_ano",
        requisito_alta: "ninguno",
        elegible_en_inactividad: "no",
      }
    case "cashback":
      return {
        valor: "5",
        tipo_monedero: "porcentaje",
        cashback_disponibilidad_dias: "2",
        cashback_vigencia_dias: "90",
        cashback_monto_minimo_canje: "10000",
        tope_maximo: "25000",
      }
    case "descuento_continuidad":
      return {
        escalones:
          "umbral=1;descuento=20 | umbral=2;descuento=25 | umbral=3;descuento=30",
        continuidad_ventana_cantidad: "35",
        continuidad_ventana_unidad: "dias",
        continuidad_al_romper: "reiniciar",
        continuidad_evalua_historial: "no",
        limites: PIECES_LIMIT(2),
      }
  }
}

function conditionExample(
  column: PromotionImportColumnKey,
  benefitType: ImportableBenefitType,
  samples: TemplateSamples
): string {
  const wide =
    benefitType === "descuento_escalonado" ||
    benefitType === "descuento_continuidad"
  switch (column) {
    case "cond_categorias":
      // 3 categorías en las mecánicas de escalera (el caso pedido), 1 en el resto.
      return sample(samples.categories, wide ? 3 : 1, PLACEHOLDER.category)
    case "cond_productos":
      // 10 SKUs — el multivalor real de la condición.
      return sample(samples.productSkus, wide ? 10 : 1, PLACEHOLDER.sku)
    case "cond_segmento":
      return samples.segment ?? PLACEHOLDER.segment
    case "cond_niveles":
      return "oro|diamante"
    case "cond_ciudad":
      return samples.city ?? ""
    case "cond_monto_minimo":
      return "50000"
    default:
      return ""
  }
}

/** Paso 6 · Economía — mismos defaults que `createPromotionDefaults`, explícitos para que se vean y se puedan cambiar. */
const ECONOMY_EXAMPLE: Partial<Record<PromotionImportColumnKey, string>> = {
  naturaleza_costo: "margen_sacrificado",
  financiador: "retailer",
  umbral_alerta_presupuesto_pct: "80",
  nivel_aplicacion: "ticket",
  aplica_sobre_precio: "vigente",
  descuento_acumula_puntos: "si",
  aplica_a_rx: "permitido",
  aprobacion_regulatoria: "no",
}

export type MechanicTemplate = {
  benefitType: ImportableBenefitType
  columns: PromotionImportColumnKey[]
  /** Cabecera + una fila de ejemplo, listo para `downloadCsv`. */
  csv: string[][]
}

/**
 * Plantilla CSV de UNA mecánica, con las columnas de los 6 pasos del
 * formulario que le aplican — ni una menos (por eso arrastra Vigencia,
 * Límites y Economía) ni las de las otras 12 mecánicas. El ejemplo va
 * rellenado con datos reales del tenant.
 *
 * La comparten el botón de descarga y el test que verifica que cada
 * plantilla pasa `validateImportBatch` sin tocarla — que es lo que
 * garantiza que "el proceso de import espera esta estructura de datos".
 */
export function buildMechanicTemplate(
  benefitType: ImportableBenefitType,
  samples: TemplateSamples,
  today: string
): MechanicTemplate {
  const columns: PromotionImportColumnKey[] = [
    ...COMMON_TEMPLATE_COLUMNS,
    ...MECHANIC_TEMPLATE_CONDITIONS[benefitType],
    ...MECHANIC_TEMPLATE_COLUMNS[benefitType],
    ...VALIDITY_TEMPLATE_COLUMNS,
    ...LIMITS_TEMPLATE_COLUMNS,
    ...ECONOMY_TEMPLATE_COLUMNS,
  ]
  const { desde, hasta } = templateDates(today)
  const code = benefitType.toUpperCase().replace(/_/g, "-").slice(0, 20)

  const row: Partial<Record<PromotionImportColumnKey, string>> = {
    nombre: `Ejemplo · ${BENEFIT_TYPE_LABEL[benefitType]}`,
    codigo: `EJ-${code}`,
    tipo: TEMPLATE_PROMOTION_TYPE[benefitType],
    mecanica: benefitType,
    desde,
    hasta,
    prioridad: "5",
    presupuesto: "5000000",
    acumulable: "no",
    canal: "pos_ecommerce",
    // Antes del `mechanicExample`: las mecánicas que entregan producto
    // físico lo sobrescriben con el límite que exige S03.
    limites: DEFAULT_LIMITS,
    modo_multiple: "mejor_beneficio",
    ...ECONOMY_EXAMPLE,
    ...mechanicExample(benefitType, samples),
  }
  for (const column of MECHANIC_TEMPLATE_CONDITIONS[benefitType]) {
    row[column] = conditionExample(column, benefitType, samples)
  }

  // Sin duplicados: una mecánica puede declarar en su bloque una columna
  // que también está en los comunes (`tope_maximo`, `valor`).
  const unique = [...new Set(columns)]
  return {
    benefitType,
    columns: unique,
    csv: [unique, unique.map((column) => row[column] ?? "")],
  }
}

/** `tipo` coherente con la mecánica — es una etiqueta de negocio, no una regla del schema, pero un ejemplo incoherente confunde. */
const TEMPLATE_PROMOTION_TYPE: Record<ImportableBenefitType, PromotionType> = {
  descuento_porcentual: "categoria",
  descuento_monto_fijo: "carrito",
  descuento_escalonado: "cantidad",
  envio_gratis: "carrito",
  producto_gratis: "cantidad",
  por_piezas: "cantidad",
  precio_especial: "categoria",
  precio_fijo_bundle: "bundle",
  multiplicador_puntos: "segmento",
  bono_puntos: "segmento",
  emitir_cupon: "cupon",
  cashback: "carrito",
  descuento_continuidad: "cantidad",
}

// --- Parsers laxos de celda -----------------------------------------------

/**
 * Acepta `1500000`, `1.500.000`, `1500000,50` y `1500000.50`. Si aparecen
 * los dos separadores, el que quede más a la derecha es el decimal. Con uno
 * solo: 1-2 dígitos después es el separador decimal, 3+ es agrupador de
 * miles (`1.500` → 1500, `12,5` → 12.5).
 */
export function parseLooseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[\s$ ]/g, "")
  if (cleaned === "" || !/^-?[\d.,]+$/.test(cleaned)) return undefined

  const lastComma = cleaned.lastIndexOf(",")
  const lastDot = cleaned.lastIndexOf(".")
  let normalized = cleaned

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIndex = Math.max(lastComma, lastDot)
    const integerPart = cleaned.slice(0, decimalIndex).replace(/[.,]/g, "")
    const fractionPart = cleaned.slice(decimalIndex + 1)
    normalized = `${integerPart}.${fractionPart}`
  } else if (lastComma >= 0) {
    const fractionLength = cleaned.length - lastComma - 1
    normalized =
      fractionLength <= 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "")
  } else if (lastDot >= 0) {
    const fractionLength = cleaned.length - lastDot - 1
    normalized = fractionLength <= 2 ? cleaned : cleaned.replace(/\./g, "")
  }

  const value = Number(normalized)
  return Number.isFinite(value) ? value : undefined
}

const TRUE_TOKENS = new Set(["si", "s", "yes", "true", "1", "x"])
const FALSE_TOKENS = new Set(["no", "n", "false", "0", ""])

export function parseLooseBoolean(raw: string, fallback: boolean): boolean {
  const token = normalizeToken(raw)
  if (TRUE_TOKENS.has(token)) return true
  if (FALSE_TOKENS.has(token)) return false
  return fallback
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DMY_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function isValidCalendarDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1) return false
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  return day <= daysInMonth[month - 1]
}

/**
 * Acepta `AAAA-MM-DD` (la plantilla) y `DD/MM/AAAA`. Devuelve siempre un
 * string ISO, nunca construye un `Date` — `new Date("01/09/2026")` en
 * UTC-5 puede volver al 31 de agosto (corrimiento de huso horario), un bug
 * silencioso que una fecha-string nunca puede tener.
 */
export function parseImportDate(raw: string): string | undefined {
  const trimmed = raw.trim()
  const iso = ISO_DATE.exec(trimmed)
  if (iso) {
    const [, y, m, d] = iso
    return isValidCalendarDate(Number(y), Number(m), Number(d))
      ? trimmed
      : undefined
  }
  const dmy = DMY_DATE.exec(trimmed)
  if (dmy) {
    const [, d, m, y] = dmy
    if (!isValidCalendarDate(Number(y), Number(m), Number(d))) return undefined
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  return undefined
}

export function parseMultiValue(raw: string): string[] {
  return raw
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean)
}

/**
 * `3:10|6:15|12:20` → escalones `{umbral, beneficio_valor}`. El orden y el
 * "cada escalón da más que el anterior" NO se validan aquí: de eso ya se
 * encarga `refineByBenefitType` con el `promotionSchema` real, y duplicar
 * la regla sería tener dos versiones de la verdad.
 */
export function parseTiers(
  raw: string,
  onError: (message: string) => void
): { umbral: number; beneficio_valor: number }[] {
  const tiers: { umbral: number; beneficio_valor: number }[] = []
  for (const part of parseMultiValue(raw)) {
    // Dos formatos: el nombrado del resto del archivo
    // (`umbral=3;descuento=10`) y el atajo posicional `3:10`, que para dos
    // campos se lee mejor y ya estaba documentado.
    let umbralRaw: string | undefined
    let valorRaw: string | undefined
    if (part.includes("=")) {
      const record = parseRecords(part)[0] ?? {}
      umbralRaw = record.umbral
      valorRaw = record.descuento ?? record.valor ?? record.beneficio
    } else {
      const [first, second, ...rest] = part.split(":")
      if (rest.length === 0) {
        umbralRaw = first
        valorRaw = second
      }
    }

    const umbral =
      umbralRaw === undefined ? undefined : parseLooseNumber(umbralRaw)
    const beneficio_valor =
      valorRaw === undefined ? undefined : parseLooseNumber(valorRaw)
    if (umbral === undefined || beneficio_valor === undefined) {
      onError(
        `"${part}" no es un escalón válido — usa umbral=3;descuento=10 (o el atajo 3:10).`
      )
      continue
    }
    tiers.push({ umbral, beneficio_valor })
  }
  return tiers
}

/**
 * Registros dentro de una celda: `clave=valor` separados por `;`, y los
 * registros entre sí por `|`. Es el formato de `limites` — 5 decisiones por
 * fila y varias filas posibles, donde una lista posicional
 * (`piezas:socio:mes:3:descartar`) sería imposible de leer y de corregir en
 * una hoja de cálculo.
 */
export function parseRecords(raw: string): Record<string, string>[] {
  return parseMultiValue(raw).map((entry) => {
    const record: Record<string, string> = {}
    for (const pair of entry.split(";")) {
      const [key, ...rest] = pair.split("=")
      if (rest.length === 0) continue
      record[normalizeToken(key)] = rest.join("=").trim()
    }
    return record
  })
}

/** Una fila de `limites` — mismas 4 decisiones que el constructor del paso Límites. */
export function parseLimitRecords(
  raw: string,
  onError: (message: string) => void
): PromotionValues["limites"] {
  const limits: PromotionValues["limites"] = []
  for (const record of parseRecords(raw)) {
    const unidad = LIMIT_UNITS.find((u) => u === record.unidad)
    const sujeto = LIMIT_SUBJECTS.find((s) => s === record.sujeto)
    const ventana = LIMIT_WINDOWS.find((w) => w === record.ventana)
    const alExceder = LIMIT_EXCESS_BEHAVIORS.find(
      (b) => b === (record.exceder ?? record.al_exceder)
    )
    const tope = parseLooseNumber(record.tope ?? "")

    if (!unidad || !sujeto || !ventana || !alExceder || tope === undefined) {
      onError(
        'Cada límite necesita unidad, sujeto, ventana, tope y exceder — ej. "unidad=piezas;sujeto=socio;ventana=mes_calendario;tope=3;exceder=descartar".'
      )
      continue
    }
    const ventanaDias = parseLooseNumber(record.ventana_dias ?? "")
    limits.push({ unidad, sujeto, ventana, tope, alExceder, ventanaDias })
  }
  return limits
}

/** Lista de valores de una tupla cerrada: `oro|diamante`. */
function parseEnumList<T extends string>(
  raw: string,
  allowed: readonly T[],
  column: PromotionImportColumnKey,
  err: (column: PromotionImportColumnKey, message: string) => void
): T[] {
  const values: T[] = []
  for (const cell of parseMultiValue(raw)) {
    const match = allowed.find((value) => value === normalizeToken(cell))
    if (!match) {
      err(column, `Valor desconocido: "${cell}" (usa ${allowed.join(" · ")}).`)
    } else {
      values.push(match)
    }
  }
  return values
}

/**
 * Celda opcional que debe caer en una tupla cerrada del dominio
 * (`alcance_piezas`, `tipo_monedero`…). Vacía devuelve `undefined` para que
 * el default del formulario mande; con un valor fuera de la tupla, error en
 * su propia columna en vez de dejarlo caer al `superRefine` con un mensaje
 * genérico.
 */
function parseEnumCell<T extends string>(
  raw: string,
  allowed: readonly T[],
  column: PromotionImportColumnKey,
  err: (column: PromotionImportColumnKey, message: string) => void
): T | undefined {
  const cell = normalizeToken(raw)
  if (cell === "") return undefined
  const match = allowed.find((value) => value === cell)
  if (!match) {
    err(
      column,
      `Valor desconocido: "${raw.trim()}" (usa ${allowed.join(" · ")}).`
    )
  }
  return match
}

// --- Alias de dominio (valor crudo o etiqueta humana, cualquiera resuelve) ---

function buildAliasMap<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
  extra: Record<string, T> = {}
): Map<string, T> {
  const map = new Map<string, T>()
  for (const v of values) {
    map.set(normalizeToken(v), v)
    map.set(normalizeToken(labels[v]), v)
  }
  for (const [alias, v] of Object.entries(extra)) {
    map.set(normalizeToken(alias), v)
  }
  return map
}

function resolveAlias<T extends string>(
  map: Map<string, T>,
  raw: string
): T | undefined {
  return map.get(normalizeToken(raw))
}

const TIPO_ALIASES = buildAliasMap(PROMOTION_TYPES, PROMOTION_TYPE_LABEL)
const MECANICA_ALIASES = buildAliasMap(BENEFIT_TYPES, BENEFIT_TYPE_LABEL)
const CANAL_ALIASES = buildAliasMap(CHANNEL_SCOPES, CHANNEL_SCOPE_LABEL, {
  ambos: "pos_ecommerce",
  "pos+ecommerce": "pos_ecommerce",
})

// --- Catálogos para resolver nombre → id ----------------------------------

export type ImportProductRef = { id: string; sku: string }
export type ImportCouponBatchRef = {
  id: string
  name: string
  reference: string
}

export type ImportCatalogs = {
  categoryIdByName: Map<string, string>
  segmentIdByName: Map<string, string>
  /** normalizado → nombre real (el que guarda `tiendas.ciudad`) */
  cityNameByToken: Map<string, string>
  /** SKU normalizado → id del producto: el CSV referencia productos por SKU, nunca por uuid. */
  productIdBySku: Map<string, string>
  /** Referencia O nombre de la emisión → id, para `emitir_cupon`. */
  couponBatchIdByReference: Map<string, string>
  tierIdByName: Map<string, string>
  supplierIdByName: Map<string, string>
}

export type ImportCatalogSources = {
  categories: { id: string; name: string }[]
  segments: { id: string; name: string }[]
  cities: { city: string }[]
  products?: ImportProductRef[]
  couponBatches?: ImportCouponBatchRef[]
  tiers?: { id: string; name: string }[]
  suppliers?: { id: string; name: string }[]
}

export function buildImportCatalogs(
  categories: { id: string; name: string }[],
  segments: { id: string; name: string }[],
  cities: { city: string }[],
  products: ImportProductRef[] = [],
  extra: {
    couponBatches?: ImportCouponBatchRef[]
    tiers?: { id: string; name: string }[]
    suppliers?: { id: string; name: string }[]
  } = {}
): ImportCatalogs {
  const byName = (rows: { id: string; name: string }[]) =>
    new Map(rows.map((row) => [normalizeToken(row.name), row.id]))

  // Referencia y nombre apuntan al mismo id: el operador puede escribir
  // cualquiera de los dos y ambos identifican la emisión sin ambigüedad.
  const couponBatchIdByReference = new Map<string, string>()
  for (const batch of extra.couponBatches ?? []) {
    couponBatchIdByReference.set(normalizeToken(batch.reference), batch.id)
    couponBatchIdByReference.set(normalizeToken(batch.name), batch.id)
  }

  return {
    categoryIdByName: byName(categories),
    segmentIdByName: byName(segments),
    cityNameByToken: new Map(
      cities.map((c) => [normalizeToken(c.city), c.city])
    ),
    productIdBySku: new Map(products.map((p) => [normalizeToken(p.sku), p.id])),
    couponBatchIdByReference,
    tierIdByName: byName(extra.tiers ?? []),
    supplierIdByName: byName(extra.suppliers ?? []),
  }
}

/** Nombres de nivel → ids reales de `tiers` (la condición guarda el id, no el nombre). */
function resolveTierIds(
  raw: string,
  catalogs: ImportCatalogs,
  onError: (message: string) => void
): string[] {
  const ids: string[] = []
  for (const name of parseMultiValue(raw)) {
    const id = catalogs.tierIdByName.get(normalizeToken(name))
    if (!id) onError(`No existe el nivel "${name}".`)
    else ids.push(id)
  }
  return ids
}

function resolveSupplier(
  raw: string,
  catalogs: ImportCatalogs,
  onError: (message: string) => void
): string | undefined {
  const cell = raw.trim()
  if (cell === "") return undefined
  const id = catalogs.supplierIdByName.get(normalizeToken(cell))
  if (!id) onError(`No existe el proveedor "${cell}".`)
  return id
}

// --- Duplicados de código dentro del archivo ------------------------------

/** Fila → número de la primera fila con el mismo `codigo` (normalizado mayúsculas+trim), para las filas repetidas. Vacíos se ignoran (ya son error de campo requerido). */
export function findDuplicateCodes(rows: RawImportRow[]): Map<number, number> {
  const firstSeenAt = new Map<string, number>()
  const duplicates = new Map<number, number>()
  for (const row of rows) {
    const code = row.codigo.trim().toUpperCase()
    if (!code) continue
    const seenAt = firstSeenAt.get(code)
    if (seenAt !== undefined) duplicates.set(row.rowNumber, seenAt)
    else firstSeenAt.set(code, row.rowNumber)
  }
  return duplicates
}

// --- Parseo + validación por fila -----------------------------------------

export type ImportRowError = {
  column: PromotionImportColumnKey | null
  message: string
}
export type ImportFailure = {
  rowNumber: number
  row: RawImportRow
  errors: ImportRowError[]
}
export type ImportReadyRow = { rowNumber: number; values: PromotionValues }

/** Traduce un `path` de `promotionSchema` (las reglas cruzadas de S05/S06/etc.) de vuelta a la columna del CSV que lo originó, para que el error se vea en la tabla de validación en la columna correcta. */
const SCHEMA_FIELD_TO_COLUMN: Partial<
  Record<string, PromotionImportColumnKey>
> = {
  name: "nombre",
  code: "codigo",
  type: "tipo",
  priority: "prioridad",
  stackable: "acumulable",
  channelScope: "canal",
  benefitType: "mecanica",
  benefitValue: "valor",
  maxCap: "tope_maximo",
  bonoPuntos: "valor",
  multiplicadorPuntos: "valor",
  validFrom: "desde",
  validUntil: "hasta",
  assignedBudget: "presupuesto",
}

function mapSchemaPathToColumn(
  path: readonly PropertyKey[]
): PromotionImportColumnKey | null {
  const first = path[0]
  return typeof first === "string"
    ? (SCHEMA_FIELD_TO_COLUMN[first] ?? null)
    : null
}

/**
 * Parsea y valida una fila cruda. Estrategia en dos fases: primero se
 * decodifican las celdas (números/fechas/enums laxos, con error de columna
 * si la celda no se puede interpretar); si todas decodifican, se arma un
 * `PromotionValues` completo con `createPromotionDefaults` y se valida con
 * el **`promotionSchema` real** — así el importador nunca reimplementa las
 * reglas cruzadas del wizard (rango de porcentaje, `hasta` > `desde`,
 * regex de código…), solo hereda cualquier cambio futuro en `schemas.ts`.
 */
export function parseImportRow(
  row: RawImportRow,
  catalogs: ImportCatalogs
):
  | { ok: true; values: PromotionValues }
  | { ok: false; errors: ImportRowError[] } {
  const errors: ImportRowError[] = []
  const err = (column: PromotionImportColumnKey, message: string) =>
    errors.push({ column, message })

  const nombre = row.nombre.trim()
  if (nombre.length < 3) {
    err("nombre", "Ingresa el nombre de la promoción (mín. 3 caracteres).")
  }

  const codigo = row.codigo.trim().toUpperCase()
  if (codigo.length < 3 || !/^[A-Z0-9-]+$/.test(codigo)) {
    err(
      "codigo",
      "El código debe tener al menos 3 caracteres: solo mayúsculas, números y guiones."
    )
  }

  const tipo: PromotionType | undefined = resolveAlias(TIPO_ALIASES, row.tipo)
  if (!tipo) err("tipo", `Tipo desconocido: "${row.tipo}".`)

  const mecanicaRaw = resolveAlias(MECANICA_ALIASES, row.mecanica)
  let mecanica: ImportableBenefitType | undefined
  if (!mecanicaRaw) {
    err("mecanica", `Mecánica desconocida: "${row.mecanica}".`)
  } else if (
    !(IMPORTABLE_BENEFIT_TYPES as readonly string[]).includes(mecanicaRaw)
  ) {
    err(
      "mecanica",
      `"${BENEFIT_TYPE_LABEL[mecanicaRaw]}" no se puede importar por CSV — créala desde el asistente.`
    )
  } else {
    mecanica = mecanicaRaw as ImportableBenefitType
  }

  const valorCell = row.valor.trim()
  let valor: number | undefined
  if (valorCell !== "") {
    valor = parseLooseNumber(valorCell)
    if (valor === undefined) {
      err("valor", `No se pudo interpretar "${valorCell}" como número.`)
    }
  }
  if (mecanica && !BENEFIT_TYPES_WITH_IMPORT_VALUE.includes(mecanica)) {
    if (valorCell !== "") {
      err(
        "valor",
        `«${BENEFIT_TYPE_LABEL[mecanica]}» no usa la columna "valor" — deja esta columna vacía.`
      )
    }
  } else if (mecanica && valorCell === "") {
    err("valor", "Esta mecánica requiere un valor.")
  }

  const parseOptionalNumber = (
    raw: string,
    column: PromotionImportColumnKey
  ): number | undefined => {
    const cell = raw.trim()
    if (cell === "") return undefined
    const value = parseLooseNumber(cell)
    if (value === undefined) {
      err(column, `No se pudo interpretar "${cell}" como número.`)
    }
    return value
  }

  const topeMaximo = parseOptionalNumber(row.tope_maximo, "tope_maximo")
  const presupuesto = parseOptionalNumber(row.presupuesto, "presupuesto") ?? 0
  const prioridadRaw = parseOptionalNumber(row.prioridad, "prioridad")
  const prioridad = prioridadRaw !== undefined ? Math.round(prioridadRaw) : 5
  const montoMinimo = parseOptionalNumber(
    row.cond_monto_minimo,
    "cond_monto_minimo"
  )

  const desdeCell = row.desde.trim()
  let desde: string | undefined
  if (desdeCell === "") {
    err("desde", "Ingresa la fecha de inicio de vigencia.")
  } else {
    desde = parseImportDate(desdeCell)
    if (desde === undefined) {
      err(
        "desde",
        `No se pudo interpretar "${desdeCell}" como fecha (usa AAAA-MM-DD o DD/MM/AAAA).`
      )
    }
  }

  const hastaCell = row.hasta.trim()
  let hasta: string | undefined
  if (hastaCell !== "") {
    hasta = parseImportDate(hastaCell)
    if (hasta === undefined) {
      err("hasta", `No se pudo interpretar "${hastaCell}" como fecha.`)
    }
  }
  if (desde && hasta && hasta <= desde) {
    err("hasta", "Debe ser posterior a la fecha de inicio.")
  }

  const acumulable = parseLooseBoolean(row.acumulable, false)

  const canalCell = row.canal.trim()
  let canal: ChannelScope = "pos_ecommerce"
  if (canalCell !== "") {
    const resolved = resolveAlias(CANAL_ALIASES, canalCell)
    if (!resolved) err("canal", `Canal desconocido: "${canalCell}".`)
    else canal = resolved
  }

  const categoryNames = parseMultiValue(row.cond_categorias)
  const categoryIds: string[] = []
  for (const name of categoryNames) {
    const id = catalogs.categoryIdByName.get(normalizeToken(name))
    if (!id) err("cond_categorias", `No existe la categoría "${name}".`)
    else categoryIds.push(id)
  }

  const ciudadCell = row.cond_ciudad.trim()
  let ciudad: string | undefined
  if (ciudadCell !== "") {
    ciudad = catalogs.cityNameByToken.get(normalizeToken(ciudadCell))
    if (!ciudad) {
      err("cond_ciudad", `Ninguna tienda está en la ciudad "${ciudadCell}".`)
    }
  }

  const segmentoCell = row.cond_segmento.trim()
  let segmentoId: string | undefined
  if (segmentoCell !== "") {
    segmentoId = catalogs.segmentIdByName.get(normalizeToken(segmentoCell))
    if (!segmentoId) {
      err("cond_segmento", `No existe la audiencia "${segmentoCell}".`)
    }
  }

  /** SKU → id de producto, con error en la columna que lo trajo. */
  const resolveSkus = (
    raw: string,
    column: PromotionImportColumnKey
  ): string[] => {
    const ids: string[] = []
    for (const sku of parseMultiValue(raw)) {
      const id = catalogs.productIdBySku.get(normalizeToken(sku))
      if (!id) err(column, `No existe ningún producto con SKU "${sku}".`)
      else ids.push(id)
    }
    return ids
  }

  const resolveCouponBatch = (
    raw: string,
    column: PromotionImportColumnKey
  ): string | undefined => {
    const cell = raw.trim()
    if (cell === "") return undefined
    const id = catalogs.couponBatchIdByReference.get(normalizeToken(cell))
    if (!id) err(column, `No existe la emisión de cupones "${cell}".`)
    return id
  }

  const condProductIds = resolveSkus(row.cond_productos, "cond_productos")
  const productoCompradoId = resolveSkus(row.producto_sku, "producto_sku")[0]
  const productoRegaloId = resolveSkus(
    row.producto_regalo_sku,
    "producto_regalo_sku"
  )[0]
  const bundleIds = resolveSkus(row.bundle_skus, "bundle_skus")
  const condCouponBatchId = resolveCouponBatch(row.cond_cupon, "cond_cupon")
  const couponBatchId = resolveCouponBatch(row.cupon_emision, "cupon_emision")

  const escalones = parseTiers(row.escalones, (message) =>
    err("escalones", message)
  )
  const limites = parseLimitRecords(row.limites, (message) =>
    err("limites", message)
  )
  const diasSemana = parseEnumList(
    row.dias_semana,
    DAYS_OF_WEEK,
    "dias_semana",
    err
  )
  const nivelesRequeridos = parseEnumList(
    row.multiplicador_niveles,
    TIER_NAMES,
    "multiplicador_niveles",
    err
  )
  const condNiveles = resolveTierIds(row.cond_niveles, catalogs, (message) =>
    err("cond_niveles", message)
  )
  const condGeneros = parseEnumList(
    row.cond_generos,
    GENDERS,
    "cond_generos",
    err
  )
  const condEstadosCiviles = parseEnumList(
    row.cond_estados_civiles,
    MARITAL_STATUSES,
    "cond_estados_civiles",
    err
  )
  const condFormatos = parseEnumList(
    row.cond_formatos_tienda,
    STORE_FORMATS,
    "cond_formatos_tienda",
    err
  )

  /** Celda de tupla cerrada — `undefined` deja mandar al default del formulario. */
  const enumCell = <T extends string>(
    raw: string,
    allowed: readonly T[],
    column: PromotionImportColumnKey
  ) => parseEnumCell(raw, allowed, column, err)

  const boolCell = (raw: string): boolean | undefined =>
    raw.trim() === "" ? undefined : parseLooseBoolean(raw, false)

  const numberCell = (raw: string, column: PromotionImportColumnKey) =>
    parseOptionalNumber(raw, column)

  const values: PromotionValues = {
    ...createPromotionDefaults(mecanica ?? "descuento_porcentual"),
    // --- Paso 1 · Mecánica ---
    name: nombre,
    code: codigo,
    type: tipo ?? "categoria",
    priority: prioridad,
    stackable: acumulable,
    channelScope: canal,
    // --- Paso 2 · Condiciones (se arma abajo) ---
    conditions: { combinador: "todas", condiciones: [] },
    // --- Paso 3 · Configuración ---
    benefitValue: BENEFIT_TYPES_WITH_IMPORT_VALUE.includes(
      mecanica ?? "descuento_porcentual"
    )
      ? valor
      : undefined,
    maxCap: topeMaximo,
    applyTo:
      enumCell(row.aplicar_sobre, APPLY_TO_OPTIONS, "aplicar_sobre") ??
      "subtotal_carrito",
    discountTiers: escalones,
    thresholdType:
      enumCell(
        row.escalones_umbral,
        DISCOUNT_TIER_THRESHOLD_TYPES,
        "escalones_umbral"
      ) ?? "unidades",
    tierCalculationMode:
      enumCell(
        row.escalones_modo_calculo,
        DISCOUNT_TIER_CALCULATION_MODES,
        "escalones_modo_calculo"
      ) ?? "escalon_unico",
    productoCompradoId,
    productoRegaloId,
    cantidadRegalo: numberCell(row.cantidad_regalo, "cantidad_regalo"),
    cantidadMinimaComprada: numberCell(
      row.cantidad_minima_comprada,
      "cantidad_minima_comprada"
    ),
    beneficioSobreRegaloPct: numberCell(
      row.beneficio_regalo_pct,
      "beneficio_regalo_pct"
    ),
    productosBundleIds: bundleIds,
    compraCantidad: numberCell(row.compra_cantidad, "compra_cantidad"),
    pagaCantidad: numberCell(row.paga_cantidad, "paga_cantidad"),
    alcancePiezas: enumCell(row.alcance_piezas, BXGY_SCOPES, "alcance_piezas"),
    descuentoUnidadExtraPct: numberCell(
      row.descuento_unidad_extra_pct,
      "descuento_unidad_extra_pct"
    ),
    precioPromocional: numberCell(row.precio_promocional, "precio_promocional"),
    precioReferencia: numberCell(row.precio_referencia, "precio_referencia"),
    hastaAgotarExistencias: boolCell(row.hasta_agotar_existencias) ?? false,
    respetaPrecioMinimoLegal: boolCell(row.respeta_precio_minimo_legal) ?? true,
    montoMinimoDisparo: numberCell(
      row.monto_minimo_disparo,
      "monto_minimo_disparo"
    ),
    tipoBeneficioNoTransaccional:
      enumCell(
        row.tipo_beneficio_no_transaccional,
        NON_TRANSACTIONAL_BENEFIT_TYPES,
        "tipo_beneficio_no_transaccional"
      ) ?? "envio_gratis",
    validacionRequerida: row.validacion_requerida.trim() || undefined,
    cupoDisponible: numberCell(row.cupo_disponible, "cupo_disponible"),
    registraUso: boolCell(row.registra_uso) ?? false,
    multiplicadorPuntos:
      mecanica === "multiplicador_puntos" ? valor : undefined,
    nivelesRequeridos,
    modoResolucionMultiplicador:
      enumCell(
        row.multiplicador_modo,
        MULTIPLIER_RESOLUTION_MODES,
        "multiplicador_modo"
      ) ?? "gana_mayor",
    tipoSaldo:
      enumCell(row.tipo_saldo, BALANCE_TYPES, "tipo_saldo") ?? "canjeable",
    momentoAcreditacion:
      enumCell(
        row.momento_acreditacion,
        ACCRUAL_TIMINGS,
        "momento_acreditacion"
      ) ?? "inmediato",
    estadoInicial:
      enumCell(row.estado_inicial, BALANCE_INITIAL_STATES, "estado_inicial") ??
      "disponible",
    bonoPuntos: mecanica === "bono_puntos" ? valor : undefined,
    eventoGatillo: enumCell(
      row.evento_gatillo,
      TRIGGER_EVENTS,
      "evento_gatillo"
    ),
    momentoResolucion: enumCell(
      row.momento_resolucion,
      TRIGGER_RESOLUTION_MOMENTS,
      "momento_resolucion"
    ),
    frecuenciaDisparo: enumCell(
      row.frecuencia_disparo,
      TRIGGER_FREQUENCIES,
      "frecuencia_disparo"
    ),
    requisitoAlta: enumCell(
      row.requisito_alta,
      ENROLLMENT_REQUIREMENTS,
      "requisito_alta"
    ),
    elegibleEnInactividad: boolCell(row.elegible_en_inactividad) ?? false,
    couponBatchId,
    motivoEmision: row.cupon_motivo.trim() || undefined,
    umbralPuntos: numberCell(row.cupon_umbral_puntos, "cupon_umbral_puntos"),
    duracionCuponDias: numberCell(
      row.cupon_duracion_dias,
      "cupon_duracion_dias"
    ),
    momentoDebitoPuntos: enumCell(
      row.cupon_momento_debito,
      POINTS_DEBIT_TIMINGS,
      "cupon_momento_debito"
    ),
    devolucionSiVence: boolCell(row.cupon_devolucion_si_vence) ?? false,
    tipoMonedero:
      enumCell(row.tipo_monedero, WALLET_VALUE_TYPES, "tipo_monedero") ??
      "porcentaje",
    disponibilidadDias: numberCell(
      row.cashback_disponibilidad_dias,
      "cashback_disponibilidad_dias"
    ),
    vigenciaSaldoDias: numberCell(
      row.cashback_vigencia_dias,
      "cashback_vigencia_dias"
    ),
    montoMinimoCanje: numberCell(
      row.cashback_monto_minimo_canje,
      "cashback_monto_minimo_canje"
    ),
    ventanaContinuidadCantidad: numberCell(
      row.continuidad_ventana_cantidad,
      "continuidad_ventana_cantidad"
    ),
    ventanaContinuidadUnidad: enumCell(
      row.continuidad_ventana_unidad,
      CONTINUITY_WINDOW_UNITS,
      "continuidad_ventana_unidad"
    ),
    alRomperContinuidad: enumCell(
      row.continuidad_al_romper,
      CONTINUITY_BREAK_BEHAVIORS,
      "continuidad_al_romper"
    ),
    acumulaRetroactivo: boolCell(row.continuidad_evalua_historial) ?? false,
    // --- Paso 4 · Vigencia ---
    validFrom: desde ?? "",
    validUntil: hasta,
    daysOfWeek: diasSemana,
    horaInicio: row.hora_inicio.trim() || undefined,
    horaFin: row.hora_fin.trim() || undefined,
    // --- Paso 5 · Límites y stacking ---
    limites,
    assignedBudget: presupuesto,
    exclusionGroup: row.grupo_exclusion.trim() || undefined,
    stackingMode:
      enumCell(row.modo_multiple, STACKING_MODES, "modo_multiple") ??
      "mejor_beneficio",
    // --- Paso 6 · Economía ---
    naturalezaCosto:
      enumCell(row.naturaleza_costo, COST_NATURES, "naturaleza_costo") ??
      "margen_sacrificado",
    financiador:
      enumCell(row.financiador, FINANCIADORES, "financiador") ?? "retailer",
    proveedorId: resolveSupplier(row.proveedor, catalogs, (message) =>
      err("proveedor", message)
    ),
    contratoId: row.contrato.trim() || undefined,
    porcentajeCostoProveedor: numberCell(
      row.porcentaje_costo_proveedor,
      "porcentaje_costo_proveedor"
    ),
    periodoLiquidacion: enumCell(
      row.periodo_liquidacion,
      SETTLEMENT_PERIODS,
      "periodo_liquidacion"
    ),
    umbralAlertaPresupuestoPct: numberCell(
      row.umbral_alerta_presupuesto_pct,
      "umbral_alerta_presupuesto_pct"
    ),
    nivelAplicacion:
      enumCell(row.nivel_aplicacion, APPLICATION_LEVELS, "nivel_aplicacion") ??
      "ticket",
    aplicaSobrePrecio:
      enumCell(row.aplica_sobre_precio, PRICE_BASES, "aplica_sobre_precio") ??
      "vigente",
    descuentoAcumulaPuntos: boolCell(row.descuento_acumula_puntos) ?? true,
    aplicaARx:
      enumCell(row.aplica_a_rx, RX_APPLICABILITIES, "aplica_a_rx") ??
      "permitido",
    aprobacionRegulatoria: boolCell(row.aprobacion_regulatoria) ?? false,
    publicationStatus: "borrador",
  }

  if (errors.length > 0 || !tipo || !mecanica || desde === undefined) {
    return { ok: false, errors }
  }

  // El árbol se arma al final, en el orden en que el formulario lista los
  // campos, para que dos archivos con las mismas condiciones produzcan
  // exactamente el mismo `condiciones` jsonb.
  const condiciones: ConditionGroupValues["condiciones"] = []
  const pushList = (
    campo:
      | "categoria"
      | "producto"
      | "socio_nivel"
      | "socio_provincia"
      | "genero"
      | "estado_civil"
      | "tienda_region"
      | "tienda_formato"
      | "producto_marca"
      | "producto_proveedor",
    valor: string[]
  ) => {
    if (valor.length > 0) condiciones.push({ campo, valor })
  }

  pushList("categoria", categoryIds)
  pushList("producto", condProductIds)
  if (ciudad) condiciones.push({ campo: "tienda", valor: ciudad })
  if (segmentoId) condiciones.push({ campo: "segmento", valor: segmentoId })
  if (montoMinimo !== undefined) {
    condiciones.push({ campo: "monto_carrito", valor: montoMinimo })
  }
  if (condCouponBatchId) {
    condiciones.push({ campo: "cupon_codigo", valor: condCouponBatchId })
  }
  pushList("socio_nivel", condNiveles)
  pushList("socio_provincia", parseMultiValue(row.cond_provincias))
  const antiguedad = numberCell(
    row.cond_antiguedad_meses,
    "cond_antiguedad_meses"
  )
  if (antiguedad !== undefined) {
    condiciones.push({ campo: "socio_antiguedad", valor: antiguedad })
  }
  const edad = numberCell(row.cond_edad_minima, "cond_edad_minima")
  if (edad !== undefined) condiciones.push({ campo: "socio_edad", valor: edad })
  pushList("genero", condGeneros)
  pushList("estado_civil", condEstadosCiviles)
  const tieneHijos = boolCell(row.cond_tiene_hijos)
  if (tieneHijos !== undefined) {
    condiciones.push({ campo: "tiene_hijos", valor: tieneHijos })
  }
  const tieneMascotas = boolCell(row.cond_tiene_mascotas)
  if (tieneMascotas !== undefined) {
    condiciones.push({ campo: "tiene_mascotas", valor: tieneMascotas })
  }
  pushList("tienda_region", parseMultiValue(row.cond_regiones_tienda))
  pushList("tienda_formato", condFormatos)
  pushList("producto_marca", parseMultiValue(row.cond_marcas))
  pushList("producto_proveedor", parseMultiValue(row.cond_proveedores))
  const requiereReceta = boolCell(row.cond_requiere_receta)
  if (requiereReceta !== undefined) {
    condiciones.push({ campo: "producto_receta", valor: requiereReceta })
  }
  values.conditions = { combinador: "todas", condiciones }

  if (errors.length > 0) return { ok: false, errors }

  const parsed = promotionSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        column: mapSchemaPathToColumn(issue.path),
        message: issue.message,
      })),
    }
  }

  return { ok: true, values: parsed.data }
}

// --- Orquestación (compartida entre la previsualización y la Server Action) ---

export type ImportBatchResult = {
  ready: ImportReadyRow[]
  failures: ImportFailure[]
}

export function validateImportBatch(
  rows: RawImportRow[],
  catalogs: ImportCatalogs
): ImportBatchResult {
  const duplicates = findDuplicateCodes(rows)
  const ready: ImportReadyRow[] = []
  const failures: ImportFailure[] = []

  for (const row of rows) {
    const duplicateOf = duplicates.get(row.rowNumber)
    if (duplicateOf !== undefined) {
      failures.push({
        rowNumber: row.rowNumber,
        row,
        errors: [
          {
            column: "codigo",
            message: `Código repetido en el archivo (ya aparece en la fila ${duplicateOf}).`,
          },
        ],
      })
      continue
    }
    const result = parseImportRow(row, catalogs)
    if (result.ok) {
      ready.push({ rowNumber: row.rowNumber, values: result.values })
    } else {
      failures.push({ rowNumber: row.rowNumber, row, errors: result.errors })
    }
  }

  return { ready, failures: failures.sort((a, b) => a.rowNumber - b.rowNumber) }
}

// --- Informe de validación por columna -------------------------------------

/** Pasos del formulario, para agrupar el informe igual que el wizard. */
export const IMPORT_STEP_NAMES = [
  "Identidad",
  "Condiciones",
  "Configuración",
  "Vigencia",
  "Límites",
  "Economía",
] as const
export type ImportStepName = (typeof IMPORT_STEP_NAMES)[number]

/**
 * A qué paso del formulario pertenece cada columna. Se deriva de los mismos
 * grupos que arman las plantillas en vez de declararse una vez más por
 * columna: así una columna nueva ya cae en su paso sin tocar nada.
 */
export function columnStep(key: PromotionImportColumnKey): ImportStepName {
  if (key.startsWith("cond_")) return "Condiciones"
  if ((VALIDITY_TEMPLATE_COLUMNS as readonly string[]).includes(key)) {
    return "Vigencia"
  }
  if ((LIMITS_TEMPLATE_COLUMNS as readonly string[]).includes(key)) {
    return "Límites"
  }
  if ((ECONOMY_TEMPLATE_COLUMNS as readonly string[]).includes(key)) {
    return "Economía"
  }
  if ((COMMON_TEMPLATE_COLUMNS as readonly string[]).includes(key)) {
    return "Identidad"
  }
  return "Configuración"
}

export type ColumnCheckStatus = "ok" | "vacia" | "ausente" | "error"

export type ColumnCheck = {
  key: PromotionImportColumnKey
  required: boolean
  step: ImportStepName
  /** La columna existe en el archivo (mapeada a un índice). */
  mapped: boolean
  /** Filas con algún valor en esa columna. */
  filled: number
  /** Filas cuyo error apunta a esta columna. */
  errorRows: number[]
  status: ColumnCheckStatus
}

export type ImportReport = {
  totalRows: number
  readyRows: number
  failedRows: number
  /** Columnas obligatorias que el archivo no trae — bloquean la importación entera. */
  missingRequired: PromotionImportColumnKey[]
  checks: ColumnCheck[]
  /** Errores que no apuntan a ninguna columna concreta (reglas cruzadas del schema). */
  generalErrors: { rowNumber: number; message: string }[]
}

/**
 * Qué pasó con cada columna del archivo: si llegó, cuántas filas la
 * traen con valor y en qué líneas falló. Es lo que convierte "3 filas con
 * error" en "la columna `escalones` falló en las líneas 4, 7 y 9".
 *
 * Función pura sobre lo que ya calculó `validateImportBatch` — no vuelve a
 * validar nada, solo reorganiza el resultado por columna.
 */
export function buildImportReport(
  rows: RawImportRow[],
  mapping: ColumnMapping,
  batch: ImportBatchResult
): ImportReport {
  const errorRowsByColumn = new Map<PromotionImportColumnKey, Set<number>>()
  const generalErrors: { rowNumber: number; message: string }[] = []

  for (const failure of batch.failures) {
    for (const error of failure.errors) {
      if (error.column === null) {
        generalErrors.push({
          rowNumber: failure.rowNumber,
          message: error.message,
        })
        continue
      }
      const set = errorRowsByColumn.get(error.column) ?? new Set<number>()
      set.add(failure.rowNumber)
      errorRowsByColumn.set(error.column, set)
    }
  }

  const checks: ColumnCheck[] = PROMOTION_IMPORT_COLUMNS.map((column) => {
    const mapped = mapping[column.key] !== undefined
    const filled = rows.filter((row) => row[column.key].trim() !== "").length
    const errorRows = [...(errorRowsByColumn.get(column.key) ?? [])].sort(
      (a, b) => a - b
    )

    const status: ColumnCheckStatus =
      errorRows.length > 0
        ? "error"
        : !mapped
          ? column.required
            ? "error"
            : "ausente"
          : filled === 0
            ? "vacia"
            : "ok"

    return {
      key: column.key,
      required: column.required,
      step: columnStep(column.key),
      mapped,
      filled,
      errorRows,
      status,
    }
  })

  return {
    totalRows: rows.length,
    readyRows: batch.ready.length,
    failedRows: batch.failures.length,
    missingRequired: missingRequiredColumns(mapping),
    checks,
    generalErrors: generalErrors.sort((a, b) => a.rowNumber - b.rowNumber),
  }
}

export function buildFailuresCsv(failures: ImportFailure[]): string[][] {
  const header = [
    ...PROMOTION_IMPORT_COLUMNS.map((c) => c.label),
    "fila",
    "columna",
    "motivo",
  ]
  const rows = failures.map((f) => [
    ...PROMOTION_IMPORT_COLUMNS.map((c) => f.row[c.key]),
    String(f.rowNumber),
    [...new Set(f.errors.map((e) => e.column ?? ""))].filter(Boolean).join("|"),
    f.errors.map((e) => e.message).join(" · "),
  ])
  return [header, ...rows]
}
