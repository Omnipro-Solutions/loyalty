import { EVENT_DOMAIN_LABEL, EVENT_DOMAINS } from "@/config/event-catalog"
import type { BuilderNodeType } from "@/types/domain"

/**
 * Obligatoriedad condicional: un campo que solo hace falta cuando OTRO campo
 * del mismo bloque tiene cierto valor.
 *
 * Existe porque `required: true` es estático y hay bloques donde eso no
 * alcanza: `emitir_cupon` necesita titular, vigencia y costo en puntos solo
 * si va a CREAR el cupón (`modo = 'emitir'`), y el momento del cargo solo si
 * ese costo es mayor que cero. Declararlo aquí en vez de a mano en el schema
 * mantiene una sola fuente de verdad: `SimpleConfigForm` la usa para decidir
 * qué va en "obligatorios" y qué en "Opcional", y `specsSchema` la usa para
 * validar — antes esa lista vivía duplicada en `schemas.ts`.
 */
export type FieldRequirement = {
  /** Clave del campo del que depende. */
  key: string
  /** Obligatorio cuando ese campo vale exactamente esto. */
  equals?: string | number | boolean
  /** Obligatorio cuando ese campo vale CUALQUIERA de estos — ej. la audiencia, que hace falta tanto al entrar como al salir de ella. */
  equalsAny?: readonly (string | number)[]
  /** Obligatorio cuando ese campo es un número mayor que esto. */
  greaterThan?: number
}

/** `undefined`, `null` y `""` cuentan como "sin completar"; `0` y `false` NO — son respuestas. */
export function isBlankValue(value: unknown): boolean {
  return value === undefined || value === null || value === ""
}

/** Si la condición de `requiredWhen` se cumple con la config actual. */
export function isRequirementMet(
  requirement: FieldRequirement,
  config: Record<string, unknown>
): boolean {
  const value = config[requirement.key]
  if (requirement.equals !== undefined) return value === requirement.equals
  if (requirement.equalsAny) {
    return requirement.equalsAny.some((candidate) => candidate === value)
  }
  if (requirement.greaterThan !== undefined) {
    return typeof value === "number" && value > requirement.greaterThan
  }
  return false
}

/**
 * Si el campo aplica siquiera con la configuración actual.
 *
 * Un campo que no aplica se OCULTA, no se degrada a "opcional". Son cosas
 * distintas: opcional es «puedes no contestarlo», y no aplicar es «esta
 * pregunta no existe en este caso». Mezclarlas llenaba los formularios de
 * campos que nunca había que tocar —el modo de disparo por umbral mostraba
 * también la cadencia y la hora de un flujo programado— y obligaba a leer
 * los seis para descubrir cuáles eran los tres que importaban.
 *
 * `requiredWhen` ya implica visibilidad: si un campo SOLO es obligatorio
 * cuando se cumple X, fuera de X no aplica. `showWhen` está para el otro
 * caso: campos opcionales que solo tienen sentido bajo cierta configuración
 * (el nombre del header secreto, cuando la autenticación es por header).
 *
 * Ojo con lo que NO hace: no borra el valor guardado al ocultarse. Un campo
 * que se esconde y vuelve conserva lo que se escribió, que es lo correcto
 * cuando alguien cambia de modo por error; el valor sobrante es inerte
 * —ningún `FieldSpec` lo lee— y el schema no lo exige.
 */
export function isSpecVisible(
  spec: FieldSpec,
  config: Record<string, unknown>
): boolean {
  if ("showWhen" in spec && spec.showWhen) {
    return isRequirementMet(spec.showWhen, config)
  }
  if ("requiredWhen" in spec && spec.requiredWhen) {
    return isRequirementMet(spec.requiredWhen, config)
  }
  return true
}

/**
 * Si un campo es obligatorio con la config actual — `required` estático o
 * `requiredWhen` cumplido. Una sola función compartida por el formulario y
 * el schema, para que nunca discrepen sobre qué falta.
 */
export function isSpecRequired(
  spec: FieldSpec,
  config: Record<string, unknown>
): boolean {
  if ("required" in spec && spec.required) return true
  if ("requiredWhen" in spec && spec.requiredWhen) {
    return isRequirementMet(spec.requiredWhen, config)
  }
  return false
}

export type FieldSpec =
  | {
      key: string
      label: string
      kind: "text"
      placeholder?: string
      required?: boolean
      requiredWhen?: FieldRequirement
      showWhen?: FieldRequirement
      hint?: string
    }
  | { key: string; label: string; kind: "textarea"; placeholder?: string }
  | {
      key: string
      label: string
      kind: "number"
      min?: number
      suffix?: string
      placeholder?: string
      required?: boolean
      requiredWhen?: FieldRequirement
      showWhen?: FieldRequirement
      /** `SimpleConfigForm` ya lo pinta de forma genérica (`"hint" in spec`) — un número también necesita explicar a qué columna alimenta. */
      hint?: string
    }
  | {
      key: string
      label: string
      kind: "select"
      options: { value: string; label: string }[]
      hint?: string
      required?: boolean
      requiredWhen?: FieldRequirement
      showWhen?: FieldRequirement
    }
  | {
      key: string
      label: string
      kind: "audience-select"
      hint?: string
      required?: boolean
      requiredWhen?: FieldRequirement
      showWhen?: FieldRequirement
    }
  | {
      key: string
      label: string
      kind: "coupon-select"
      hint?: string
      required?: boolean
      requiredWhen?: FieldRequirement
      showWhen?: FieldRequirement
    }
  | {
      key: string
      label: string
      kind: "promotion-select"
      hint?: string
      required?: boolean
    }
  /**
   * Los dos campos del bloque `evento` cuyas opciones NO son una lista fija:
   * dependen de otro campo de la misma config. `event-select` ofrece los
   * eventos del `dominio` elegido; `trigger-mode-select`, los modos que ese
   * evento admite (`CatalogEvent.triggerModes`). Se declaran como kind
   * propio en vez de `select` con opciones vacías para que `SimpleConfigForm`
   * sepa de dónde sacarlas y el schema siga validándolos como cualquier otro.
   */
  | {
      key: string
      label: string
      kind: "event-select"
      hint?: string
      required?: boolean
      requiredWhen?: FieldRequirement
    }
  | {
      key: string
      label: string
      kind: "trigger-mode-select"
      hint?: string
      required?: boolean
      requiredWhen?: FieldRequirement
    }
  | { key: string; label: string; kind: "currency"; required?: boolean }
  | {
      key: string
      label: string
      kind: "multiselect"
      options: { value: string; label: string }[]
      showWhen?: FieldRequirement
    }
  | {
      key: string
      label: string
      kind: "boolean"
      showWhen?: FieldRequirement
    }
  | { key: string; label: string; kind: "time-range"; required?: boolean }

/**
 * Las 4 zonas de operación del tenant de demo. Compartidas por el bloque
 * `evento` en modo programado y por `ventana_horaria`: una hora sin zona es
 * ambigua, y las dos necesitan exactamente la misma lista.
 */
const TIMEZONE_OPTIONS = [
  { value: "America/Bogota", label: "America/Bogotá" },
  { value: "America/Mexico_City", label: "America/Mexico_City" },
  { value: "America/Lima", label: "America/Lima" },
  { value: "America/Santiago", label: "America/Santiago" },
]

const TIER_OPTIONS = [
  { value: "bronce", label: "Base" },
  { value: "plata", label: "Plata" },
  { value: "oro", label: "Oro" },
  { value: "diamante", label: "Diamante" },
]

/**
 * Guardarraíles compartidos por los 3 bloques de acción de mensajería
 * (`email`, `push`, `sms_whatsapp`) — lo único que Loyalty System sigue
 * enforceando antes de despachar al proveedor. El contenido (asunto,
 * plantilla, mensaje) y el canal de envío ya NO se configuran aquí: ese
 * bloque despacha a un flujo de un proveedor externo conectado (Adobe
 * Journey Optimizer, CJO, Braze — ver `config/integration-flows.ts`), y ese
 * proveedor es quien redacta el contenido. `SimpleConfigForm` renderiza esto
 * dentro de `IntegrationMessageForm`
 * (`inspector/integration-message-form.tsx`), no directo desde
 * `InspectorPanel` — por eso los 3 tipos abajo son idénticos: lo único que
 * los distingue ahora es qué flujos del proveedor ofrecen.
 */
const MESSAGE_GUARDRAIL_SPECS: FieldSpec[] = [
  { key: "ventana_envio", label: "Ventana de envío", kind: "time-range" },
  {
    key: "verificar_consentimiento",
    label: "Verificar consentimiento",
    kind: "boolean",
  },
  {
    key: "limite_frecuencia",
    label: "Límite de frecuencia",
    kind: "number",
    min: 1,
    suffix: "por semana",
  },
  {
    key: "fallback_sin_consentimiento",
    label: "Fallback si no hay consentimiento",
    kind: "select",
    options: [
      { value: "saltar_nodo", label: "Saltar nodo" },
      { value: "detener", label: "Detener workflow" },
    ],
  },
]

/**
 * Especificación de formulario para los bloques "simples" —
 * campos extraídos de la tabla PROPIEDAD/TIPO/VALOR POR DEFECTO del
 * catálogo de Figma (`1109:4478 · 08.4`), un tipo de campo abstracto
 * (enum, currency, multi-select, boolean, rate-limit, reference, etc.) por
 * fila. Los tipos abstractos que no tienen un control 1:1 en el design
 * system (rate-limit, cron, timezone, offset, reference, field, metric,
 * event, schedule, mapping) se resuelven al control más cercano ya
 * existente (select con opciones cerradas razonables, number con sufijo,
 * o text libre para referencias a catálogos que este proyecto todavía no
 * modela — reglas como entidad real sigue siendo trabajo de Fase 5, no de
 * este inspector). Tres excepciones ya tienen entidad real: `audiencia_id`
 * (`evento` con un evento de segmentación, y `cambiar_segmento`) usa `kind:
 * "audience-select"` (`segments`, ver 11 · Audiencias); `coupon_batch_id`
 * (`emitir_cupon`, y `evento` con un evento de cupón) usa `kind:
 * "coupon-select"` (`coupon_batch`, ver el módulo de cupones); y
 * `promocion_id` (`aplicar_promocion`) usa `kind: "promotion-select"`
 * (`promociones`, ver el módulo de promociones) — en los tres casos las
 * opciones se cargan desde la base, no una lista cerrada en este archivo, y
 * el usuario elige de lo ya creado en vez de escribir un id/código a mano.
 * `tipo_codigo` ("único por socio" / "código compartido") se quitó
 * de `emitir_cupon`: "código compartido" no tiene dónde vivir en el
 * esquema real (`coupon` tiene `unique(org_id, code)`, cada código es de
 * una sola fila), y sin esa opción el campo dejaba de ser una elección
 * real.
 *
 * `acumular_puntos` y `condicion_multiple` tienen su propio componente
 * dedicado (no están aquí). `ramificacion_valor`/`split_ab` sí están aquí
 * para su pestaña Configuración — su propiedad de tipo "list" (Ramas /
 * Variantes) la gestiona la pestaña Ramas, no Configuración, así que no
 * se repite en este spec. El bloque `evento` tampoco tiene componente
 * propio: su cascada dominio → evento → modo sí cabe aquí, con los dos
 * `kind` que resuelven sus opciones contra el catálogo (`event-select`,
 * `trigger-mode-select`). Lo que sí vive fuera es su ficha de payload
 * (`EventReference`), que muestra, no captura.
 *
 * `email`/`push`/`sms_whatsapp` también tienen componente dedicado
 * (`IntegrationMessageForm`, ver `MESSAGE_GUARDRAIL_SPECS` arriba) por la
 * misma razón que `acumular_puntos`/`condicion_multiple`: proveedor → flujo
 * es una cascada dependiente que no cabe en el modelo plano de
 * `FieldSpec[]`. Sí aparecen abajo, pero solo con sus guardarraíles.
 * `webhook_saliente` es el mismo caso: headers y cuerpo son listas
 * dinámicas (`WebhookSalienteForm`, `inspector/webhook-saliente-form.tsx`)
 * — aquí solo están sus campos escalares (URL, método, reintentos...).
 * `webhook_entrante` sí es 100% "simple" (cabe entero en este archivo). Lo
 * mismo los bloques agregados para cubrir más flujos (`ajustar_puntos`,
 * `espera_hasta_evento`, `ventana_horaria`, `esperar_aprobacion`,
 * `actualizar_cliente`, `cambiar_segmento`, `emitir_evento`, `union`):
 * ninguno necesita componente dedicado.
 */
export const SIMPLE_FIELD_SPECS: Partial<Record<BuilderNodeType, FieldSpec[]>> =
  {
    // === Entradas ===
    // UN bloque de evento, no uno por evento. `dominio` → `evento_id` →
    // `modo_disparo` es la cascada de tres pasos del catálogo
    // (`config/event-catalog.ts`): primero el área del negocio, luego qué
    // pasó, y solo entonces cuándo debe disparar. Antes cada evento era un
    // tipo de bloque distinto, así que agregar "cupón por vencer" costaba
    // un tipo nuevo, su spec, su icono y una migración del `check`.
    evento: [
      {
        key: "dominio",
        label: "Dominio",
        kind: "select",
        required: true,
        options: EVENT_DOMAINS.map((d) => ({
          value: d,
          label: EVENT_DOMAIN_LABEL[d],
        })),
        hint: "Área del programa donde ocurre el evento. Acota la lista del paso siguiente.",
      },
      {
        key: "evento_id",
        label: "Evento",
        kind: "event-select",
        required: true,
        hint: "Su payload se ve aquí mismo al elegirlo — las variables que quedan disponibles para el resto del flujo.",
      },
      // Los modos posibles dependen del evento (`CatalogEvent.triggerModes`):
      // un alta de socio no se puede "cruzar un umbral" y un evento de
      // tiempo solo existe programado. Por eso no es un `select` con
      // opciones fijas.
      {
        key: "modo_disparo",
        label: "Modo de disparo",
        kind: "trigger-mode-select",
        required: true,
        hint: "Al ocurrir · al cruzar un umbral · programado. Es lo que decide si el evento se emite una vez, en cada múltiplo o a una hora.",
      },

      // Los eventos de segmentación no dicen nada sin la audiencia: "un
      // socio entró a una audiencia" es cierto para todas a la vez. Es
      // obligatorio solo para ellos, no para los 24 eventos restantes.
      {
        key: "audiencia_id",
        label: "Audiencia",
        kind: "audience-select",
        requiredWhen: {
          key: "evento_id",
          equalsAny: ["segment.entered", "segment.exited"],
        },
        hint: "Cuál de las audiencias dispara la regla — el evento por sí solo ocurre para todas.",
      },
      // El bloque escucha la emisión de UN lote de cupones, no cualquiera:
      // "se canjeó un cupón" sin decir cuál dispararía con todos.
      {
        key: "coupon_batch_id",
        label: "Emisión de cupón",
        kind: "coupon-select",
        requiredWhen: {
          key: "evento_id",
          equalsAny: ["coupon.issued", "coupon.redeemed", "coupon.expiring"],
        },
        hint: "Emisión cuyos cupones disparan la regla.",
      },

      // --- Solo en modo umbral ---
      // El umbral es lo que hace que un evento pueda NO emitirse: si el
      // valor acumulado no llega al primer múltiplo, no hay disparo. Eso es
      // distinto de disparar y no cumplir condiciones, y la bitácora los
      // guarda distinto (ver `simulateWorkflow`).
      {
        key: "umbral_valor",
        label: "Umbral",
        kind: "number",
        min: 1,
        requiredWhen: { key: "modo_disparo", equals: "al_cruzar_umbral" },
        hint: "Cada cuánto se cruza. El campo acumulado que se mide lo declara el evento del catálogo (`thresholdField`).",
      },
      {
        key: "repeticion",
        label: "Repetición",
        kind: "select",
        requiredWhen: { key: "modo_disparo", equals: "al_cruzar_umbral" },
        options: [
          { value: "cada_multiplo", label: "En cada múltiplo nuevo" },
          { value: "una_vez", label: "Una sola vez por socio" },
        ],
        hint: "Con «una sola vez», cruzar el segundo múltiplo ya no emite nada.",
      },
      {
        key: "deteccion",
        label: "Borde o nivel",
        kind: "select",
        requiredWhen: { key: "modo_disparo", equals: "al_cruzar_umbral" },
        options: [
          { value: "borde", label: "Borde · una vez por cruce" },
          {
            value: "nivel",
            label: "Nivel · en cada evaluación mientras siga por encima",
          },
        ],
        hint: "La diferencia entre asignar un cupón al cruzar el umbral y asignarlo en cada evaluación mientras el saldo siga arriba.",
      },

      // --- Solo en modo programado ---
      {
        key: "cadencia",
        label: "Cadencia",
        kind: "select",
        requiredWhen: { key: "modo_disparo", equals: "programado" },
        options: [
          { value: "diaria", label: "Diaria" },
          { value: "semanal", label: "Semanal" },
          { value: "mensual", label: "Mensual" },
          { value: "una_vez", label: "Una sola vez" },
        ],
      },
      {
        key: "hora_ejecucion",
        label: "Hora de ejecución",
        kind: "text",
        placeholder: "09:00",
        requiredWhen: { key: "modo_disparo", equals: "programado" },
      },
      {
        key: "zona_horaria",
        label: "Zona horaria",
        kind: "select",
        requiredWhen: { key: "modo_disparo", equals: "programado" },
        options: TIMEZONE_OPTIONS,
        hint: "Una hora sin zona es ambigua: la misma regla dispararía a horas distintas por país.",
      },
      {
        key: "desfase_dias",
        showWhen: { key: "modo_disparo", equals: "programado" },
        label: "Desfase",
        kind: "number",
        suffix: "días (negativo = antes)",
        hint: "Para adelantar o atrasar respecto a la fecha ancla del evento (ej. avisar 7 días antes del cumpleaños).",
      },

      // --- Guardarraíl, en cualquier modo ---
      {
        key: "frecuencia_maxima",
        label: "Frecuencia máxima",
        kind: "number",
        min: 1,
        suffix: "por día",
        hint: "Tope de disparos por socio y día, sea cual sea el modo.",
      },
    ],
    // Sin tarjeta en el catálogo de Figma (ver comentario de
    // `BUILDER_NODE_GROUPS` en `types/domain.ts`) — se queda como tipo
    // aparte del bloque `evento` porque no es un evento del catálogo de
    // negocio: es una llamada HTTP entrante, sin dominio ni payload
    // declarado. Esta demo no expone un endpoint real que lo reciba (mismo
    // criterio que "sin sender de email/SMS" en otras partes del proyecto)
    // — `identificador` es solo el dato declarativo que identificaría ese
    // endpoint.
    webhook_entrante: [
      {
        key: "identificador",
        label: "Identificador del endpoint",
        kind: "text",
        required: true,
        placeholder: "ej. reactivacion-vip",
        hint: "Se usa para armar la URL del webhook — esta demo no expone un endpoint real que lo reciba.",
      },
      {
        key: "metodo_esperado",
        label: "Método esperado",
        kind: "select",
        required: true,
        options: [
          { value: "post", label: "POST" },
          { value: "get", label: "GET" },
        ],
      },
      {
        key: "autenticacion",
        label: "Autenticación",
        kind: "select",
        options: [
          { value: "ninguna", label: "Ninguna" },
          { value: "header_secreto", label: "Header secreto" },
        ],
      },
      {
        key: "header_secreto_nombre",
        showWhen: { key: "autenticacion", equals: "header_secreto" },
        label: "Nombre del header",
        kind: "text",
        placeholder: "ej. X-Webhook-Secret",
      },
    ],

    // === Lealtad ===
    canjear_puntos: [
      {
        key: "costo_puntos",
        label: "Costo en puntos",
        kind: "number",
        min: 1,
        required: true,
      },
      {
        key: "beneficio",
        label: "Beneficio",
        kind: "text",
        required: true,
        placeholder: "Ej. Cupón 15%",
      },
      { key: "validar_saldo", label: "Validar saldo", kind: "boolean" },
      {
        key: "permitir_saldo_parcial",
        showWhen: { key: "validar_saldo", equals: true },
        label: "Permitir saldo parcial",
        kind: "boolean",
      },
      {
        key: "motivo",
        label: "Motivo",
        kind: "text",
        placeholder: "Ej. Canje de recompensa",
      },
    ],
    cambio_nivel: [
      {
        key: "accion",
        label: "Acción",
        kind: "select",
        required: true,
        options: [
          { value: "recalcular", label: "Recalcular" },
          { value: "forzar", label: "Forzar nivel" },
        ],
      },
      {
        key: "ventana_calculo_meses",
        showWhen: { key: "accion", equals: "recalcular" },
        label: "Ventana de cálculo",
        kind: "number",
        min: 1,
        suffix: "meses móviles",
      },
      {
        key: "nivel_destino",
        showWhen: { key: "accion", equals: "forzar" },
        label: "Nivel destino",
        kind: "select",
        options: TIER_OPTIONS,
      },
      { key: "permitir_descenso", label: "Permitir descenso", kind: "boolean" },
      {
        key: "periodo_gracia_dias",
        showWhen: { key: "permitir_descenso", equals: true },
        label: "Periodo de gracia",
        kind: "number",
        min: 0,
        suffix: "días",
      },
      { key: "notificar_socio", label: "Notificar al socio", kind: "boolean" },
    ],
    emitir_cupon: [
      {
        key: "modo",
        label: "Modo",
        kind: "select",
        required: true,
        options: [
          { value: "emitir", label: "Emitir un cupón nuevo" },
          { value: "asignar", label: "Asignar uno existente del lote" },
        ],
        hint: "Emitir genera código nuevo y no depende del stock del lote; asignar toma uno ya creado y sin dueño, y baja su stock en 1.",
      },
      {
        key: "coupon_batch_id",
        label: "Emisión base",
        kind: "coupon-select",
        required: true,
        hint: "De aquí salen el descuento, la moneda y el patrón de código. `CouponBlockForm` ajusta este texto según el modo.",
      },
      // Emitir crea una fila en `coupon`; asignar solo la vincula a una
      // persona (`coupon_assignment`). Son dos operaciones distintas con
      // requisitos distintos: emitir necesita un payload completo, asignar
      // no necesita nada más porque el cupón ya existe. De ahí que los
      // campos de abajo sean obligatorios SOLO en modo emitir — la
      // condición vive en `emitirCuponConfigSchema` (`schemas.ts`), porque
      // `FieldSpec.required` es estático.
      // Un solo campo en vez de dos banderas: así el constraint
      // `coupon_bearer_or_member` (un cupón no puede ser al portador Y tener
      // titular) es inexpresable desde la UI, no algo que haya que validar.
      {
        key: "titular",
        label: "Titular del cupón",
        kind: "select",
        requiredWhen: { key: "modo", equals: "emitir" },
        options: [
          { value: "socio_del_flujo", label: "El socio del flujo (member_id)" },
          { value: "al_portador", label: "Al portador (bearer)" },
        ],
        hint: "Obligatorio al emitir: alimenta `member_id` o `bearer`, que son excluyentes en el alta.",
      },
      {
        key: "vigencia_dias",
        label: "Vigencia",
        kind: "number",
        min: 1,
        suffix: "días",
        requiredWhen: { key: "modo", equals: "emitir" },
        hint: "Obligatorio al emitir: `valid_to` se cuenta desde el momento de emitir, no desde que se creó el lote.",
      },
      {
        key: "costo_puntos",
        label: "Costo en puntos",
        kind: "number",
        min: 0,
        requiredWhen: { key: "modo", equals: "emitir" },
        hint: "`points_cost`. Cero en un hito por acumulación (no descuenta saldo); mayor que cero solo si el cupón es un canje.",
      },
      {
        key: "timing_puntos",
        label: "Momento del cargo",
        kind: "select",
        requiredWhen: { key: "costo_puntos", greaterThan: 0 },
        // Vocabulario en inglés a propósito: es el del módulo de cupones
        // (`COUPON_POINTS_CHARGE_TIMINGS`), no el de promociones.
        options: [
          { value: "on_create", label: "Al emitir (on_create)" },
          { value: "on_redeem", label: "Al redimir (on_redeem)" },
        ],
        hint: "Obligatorio solo si el cupón cuesta puntos.",
      },
      {
        key: "entrega",
        label: "Canal de entrega",
        kind: "select",
        requiredWhen: { key: "modo", equals: "emitir" },
        options: [
          { value: "email", label: "Email" },
          { value: "email_sms", label: "Email + SMS" },
          { value: "print", label: "Impresión" },
          { value: "ninguno", label: "Ninguno · queda en su cuenta" },
        ],
        hint: "Alimenta `delivery_channels`. «Ninguno» es válido, pero tiene que ser una decisión explícita — por eso es obligatorio elegir.",
      },
      {
        key: "usos_permitidos",
        showWhen: { key: "modo", equals: "emitir" },
        label: "Usos permitidos",
        kind: "number",
        min: 1,
      },
      {
        key: "canales_validos",
        showWhen: { key: "modo", equals: "emitir" },
        label: "Canales válidos",
        kind: "multiselect",
        options: [
          { value: "pos", label: "POS" },
          { value: "ecommerce", label: "E-commerce" },
          { value: "app", label: "App" },
        ],
      },
      {
        key: "acumulable",
        label: "Acumulable",
        kind: "boolean",
        showWhen: { key: "modo", equals: "emitir" },
      },
    ],
    reto: [
      {
        key: "objetivo",
        label: "Objetivo",
        kind: "select",
        required: true,
        options: [
          { value: "n_compras", label: "N compras" },
          { value: "monto_acumulado", label: "Monto acumulado" },
          { value: "productos_distintos", label: "Productos distintos" },
        ],
      },
      { key: "meta", label: "Meta", kind: "number", min: 1, required: true },
      {
        key: "ventana_dias",
        label: "Ventana",
        kind: "number",
        min: 1,
        required: true,
        suffix: "días",
      },
      {
        key: "premio",
        label: "Premio",
        kind: "text",
        placeholder: "Ej. Subir de nivel",
      },
      { key: "progreso_visible", label: "Progreso visible", kind: "boolean" },
      {
        key: "recordatorios",
        label: "Recordatorios",
        kind: "text",
        placeholder: "Ej. A los 15 y 25 días",
      },
    ],
    referido: [
      {
        key: "recompensa_referidor",
        label: "Recompensa al referidor",
        kind: "text",
        required: true,
        placeholder: "Ej. 500 pts",
      },
      {
        key: "recompensa_referido",
        label: "Recompensa al referido",
        kind: "text",
        placeholder: "Ej. Cupón 10%",
      },
      {
        key: "condicion_pago",
        label: "Condición de pago",
        kind: "select",
        required: true,
        options: [
          { value: "primera_compra", label: "Primera compra del referido" },
          { value: "registro", label: "Registro del referido" },
        ],
      },
      {
        key: "limite_por_socio",
        label: "Límite por socio",
        kind: "number",
        min: 0,
        suffix: "al mes",
      },
      {
        key: "ventana_atribucion_dias",
        label: "Ventana de atribución",
        kind: "number",
        min: 1,
        suffix: "días",
      },
    ],
    // Sin tarjeta en el catálogo de Figma — la acción real ya existe
    // manual en la ficha de cliente (`features/members/actions/
    // points-adjustments.ts` + su schema en `features/members/schemas.ts`):
    // `direction` (otorgar/restar, no un número con signo),
    // `amount` (entero positivo), `reason` (con los mismos presets que ya
    // usa `apply-points-rule-dialog.tsx`). Escribe a `points_ledger` con
    // `tipo: "ajuste"`.
    ajustar_puntos: [
      {
        key: "direccion",
        label: "Dirección",
        kind: "select",
        required: true,
        options: [
          { value: "otorgar", label: "Otorgar" },
          { value: "restar", label: "Restar" },
        ],
      },
      {
        key: "cantidad",
        label: "Cantidad",
        kind: "number",
        min: 1,
        required: true,
        suffix: "puntos",
      },
      {
        key: "motivo",
        label: "Motivo",
        kind: "select",
        required: true,
        options: [
          { value: "bono_cortesia", label: "Bono de cortesía" },
          { value: "correccion_saldo", label: "Corrección de saldo" },
          {
            value: "compensacion_incidencia",
            label: "Compensación por incidencia",
          },
          { value: "otro", label: "Otro" },
        ],
      },
      {
        key: "motivo_detalle",
        showWhen: { key: "motivo", equals: "otro" },
        label: "Detalle del motivo",
        kind: "text",
        placeholder: "Solo si el motivo es 'Otro'",
      },
    ],

    // === Acciones ===
    email: MESSAGE_GUARDRAIL_SPECS,
    push: MESSAGE_GUARDRAIL_SPECS,
    sms_whatsapp: MESSAGE_GUARDRAIL_SPECS,
    aplicar_promocion: [
      {
        key: "promocion_id",
        label: "Promoción",
        kind: "promotion-select",
        required: true,
        hint: "Promoción real que se aplica al socio en este punto del workflow.",
      },
      {
        key: "prioridad_temporal",
        label: "Prioridad temporal",
        kind: "number",
      },
      {
        key: "duracion_dias",
        label: "Duración",
        kind: "number",
        min: 1,
        suffix: "días",
      },
      { key: "acumulable", label: "Acumulable", kind: "boolean" },
      {
        key: "si_colisiona",
        label: "Si colisiona",
        kind: "select",
        options: [
          {
            value: "gana_mayor_prioridad",
            label: "Gana la de mayor prioridad",
          },
          { value: "bloquea_ambas", label: "Se bloquean ambas" },
        ],
      },
    ],
    // Sin tarjeta en el catálogo de Figma — bloque de integración
    // autocontenido (URL + método + headers + cuerpo), mismo criterio que
    // `webhook_entrante` de Entradas. Headers y cuerpo son listas dinámicas
    // que no caben en `FieldSpec` — viven en `WebhookSalienteForm`
    // (`inspector/webhook-saliente-form.tsx`), que reusa estos campos
    // escalares vía `SimpleConfigForm` y agrega sus propias secciones.
    webhook_saliente: [
      {
        key: "url",
        label: "URL",
        kind: "text",
        required: true,
        placeholder: "https://api.ejemplo.com/webhooks/loyalty",
      },
      {
        key: "metodo",
        label: "Método",
        kind: "select",
        required: true,
        options: [
          { value: "post", label: "POST" },
          { value: "put", label: "PUT" },
          { value: "patch", label: "PATCH" },
          { value: "get", label: "GET" },
        ],
      },
      {
        key: "tiempo_espera_seg",
        label: "Tiempo de espera",
        kind: "number",
        min: 1,
        suffix: "segundos",
      },
      {
        key: "reintentos",
        label: "Reintentos",
        kind: "number",
        min: 0,
      },
      // `si_falla` (continuar/detener el workflow) desapareció al tipar los
      // puertos de salida: qué pasa tras un fallo ya no es un desplegable
      // global, es el camino que sale de `error`/`timeout` en el canvas
      // (ver `OUTPUT_HANDLES` en `canvas/builder-node.tsx`). Lo que sí sigue
      // siendo configuración del bloque es CÓMO reintenta y QUÉ cuenta como
      // éxito, porque de eso depende por qué puerto sale.
      {
        key: "politica_reintento",
        showWhen: { key: "reintentos", greaterThan: 0 },
        label: "Política de reintento",
        kind: "select",
        options: [
          { value: "exponencial", label: "Exponencial (1s, 4s, 16s…)" },
          { value: "fijo", label: "Fijo (cada 5s)" },
        ],
        hint: "El reintento es interno al bloque: no es una arista de vuelta, porque el grafo no admite ciclos. El puerto «Error» se toma al agotar los intentos.",
      },
      {
        key: "exito_si",
        label: "Cuenta como éxito",
        kind: "select",
        options: [
          { value: "2xx", label: "Cualquier 2xx" },
          { value: "2xx_3xx", label: "2xx o 3xx" },
          { value: "200", label: "Solo 200" },
        ],
      },
    ],

    // === Lógica (la propiedad "list" de cada una — Ramas/Variantes — la
    // gestiona la pestaña Ramas, no este spec de Configuración) ===
    // Escriben sobre el propio socio. Sin estos bloques una regla solo
    // sabía dar beneficios: no podía dejar constancia de nada en el
    // cliente, que es justo lo que la regla siguiente necesita para poder
    // condicionar sobre ello.
    actualizar_cliente: [
      {
        key: "operacion",
        label: "Qué se actualiza",
        kind: "select",
        required: true,
        options: [
          { value: "atributo", label: "Un atributo del perfil" },
          { value: "tag", label: "Una etiqueta" },
        ],
      },
      {
        key: "atributo",
        label: "Atributo",
        kind: "select",
        requiredWhen: { key: "operacion", equals: "atributo" },
        // Columnas reales de `members` — no un campo libre: escribir sobre
        // un atributo que no existe no fallaría hasta la ejecución.
        options: [
          { value: "canal_preferido", label: "Canal preferido" },
          { value: "provincia", label: "Provincia" },
          { value: "tiene_hijos", label: "Tiene hijos" },
          { value: "tiene_mascotas", label: "Tiene mascotas" },
          { value: "estado_cuenta", label: "Estado de la cuenta" },
        ],
      },
      {
        key: "valor",
        label: "Nuevo valor",
        kind: "text",
        requiredWhen: { key: "operacion", equals: "atributo" },
        placeholder: "Admite variables del flujo — ej. {{compra.canal}}",
      },
      {
        key: "etiqueta",
        label: "Etiqueta",
        kind: "text",
        requiredWhen: { key: "operacion", equals: "tag" },
        placeholder: "ej. vip_reactivado",
      },
      {
        key: "accion_etiqueta",
        label: "Acción sobre la etiqueta",
        kind: "select",
        requiredWhen: { key: "operacion", equals: "tag" },
        options: [
          { value: "agregar", label: "Agregar" },
          { value: "quitar", label: "Quitar" },
        ],
      },
    ],
    // Mueve al socio dentro/fuera de una audiencia real (`segments`, 11 ·
    // Audiencias) — la misma entidad que consume el evento
    // `segment.entered`, para que meter a alguien en un segmento desde una
    // regla pueda despertar a otra.
    cambiar_segmento: [
      {
        key: "audiencia_id",
        label: "Audiencia",
        kind: "audience-select",
        required: true,
      },
      {
        key: "accion",
        label: "Acción",
        kind: "select",
        required: true,
        options: [
          { value: "agregar", label: "Agregar al socio" },
          { value: "quitar", label: "Quitar al socio" },
        ],
      },
      {
        key: "vigencia_dias",
        label: "Permanencia mínima",
        kind: "number",
        min: 1,
        suffix: "días",
        hint: "Opcional: evita que el socio entre y salga del segmento en cada evaluación.",
      },
    ],
    // Publica un evento del catálogo. Es lo que permite que una regla
    // despierte a otra sin que ninguna sepa de la existencia de la otra:
    // esta emite `points.balance_crossed`, la otra lo escucha.
    emitir_evento: [
      {
        key: "dominio",
        label: "Dominio",
        kind: "select",
        required: true,
        options: EVENT_DOMAINS.map((d) => ({
          value: d,
          label: EVENT_DOMAIN_LABEL[d],
        })),
      },
      {
        key: "evento_id",
        label: "Evento a emitir",
        kind: "event-select",
        required: true,
        hint: "Del mismo catálogo que escucha el bloque `evento` — las dos puntas hablan el mismo vocabulario.",
      },
      {
        key: "incluir_payload",
        label: "Adjuntar las variables del flujo",
        kind: "boolean",
      },
      {
        key: "nota",
        label: "Nota para la bitácora",
        kind: "text",
        placeholder: "Por qué esta regla emite este evento",
      },
    ],

    ramificacion_valor: [
      {
        key: "atributo_evaluado",
        label: "Atributo evaluado",
        kind: "select",
        required: true,
        options: [
          { value: "tier", label: "Nivel del cliente" },
          { value: "saldo_puntos", label: "Saldo de puntos" },
          { value: "segmento", label: "Segmento" },
          { value: "fecha_alta", label: "Fecha de alta" },
        ],
      },
      {
        key: "modo",
        label: "Modo",
        kind: "select",
        required: true,
        options: [
          { value: "primera_coincidencia", label: "Primera coincidencia" },
          { value: "todas_las_que_apliquen", label: "Todas las que apliquen" },
        ],
        hint: 'Con "Todas las que apliquen" el socio recorre varias ramas.',
      },
      {
        key: "salida_por_defecto",
        label: "Salida por defecto",
        kind: "boolean",
      },
      {
        key: "permitir_multiples",
        label: "Permitir múltiples",
        kind: "boolean",
      },
    ],
    split_ab: [
      {
        key: "criterio_exito",
        label: "Criterio de éxito",
        kind: "select",
        required: true,
        options: [
          { value: "tasa_canje", label: "Tasa de canje" },
          { value: "tasa_apertura", label: "Tasa de apertura" },
          { value: "conversion_compra", label: "Conversión a compra" },
        ],
      },
      {
        key: "duracion_test_dias",
        label: "Duración del test",
        kind: "number",
        min: 1,
        suffix: "días",
      },
      {
        key: "asignacion",
        label: "Asignación",
        kind: "select",
        options: [
          { value: "estable_por_socio", label: "Estable por socio" },
          { value: "aleatoria_cada_vez", label: "Aleatoria cada vez" },
        ],
      },
      {
        key: "ganador_automatico",
        label: "Ganador automático",
        kind: "boolean",
      },
    ],
    // `hasta_evento`/`ventana_reanudacion` vivían acá — se extrajeron a
    // `espera_hasta_evento`/`ventana_horaria` (bloques propios de Lógica,
    // pedido explícito del usuario) para no tenerlos como sub-modos poco
    // visibles de un solo bloque. `esperar` se queda con lo que sigue
    // siendo genuinamente "una sola espera": duración fija o hasta una
    // fecha. Ningún dato sembrado usaba los campos extraídos (verificado
    // antes de recortar) — nada que migrar.
    esperar: [
      {
        key: "modo",
        label: "Modo",
        kind: "select",
        required: true,
        options: [
          { value: "duracion", label: "Duración" },
          { value: "hasta_fecha", label: "Hasta fecha" },
        ],
      },
      {
        key: "duracion_dias",
        // Solo con modo "duración": con "hasta fecha" la espera la
        // define la fecha, y un número de días ahí no significa nada.
        showWhen: { key: "modo", equals: "duracion" },
        label: "Duración",
        kind: "number",
        min: 1,
        suffix: "días",
      },
    ],
    // Extraído de `esperar` (ver comentario arriba) — mismos 2 campos que
    // antes eran el modo "Hasta evento".
    // El evento que se espera sale del MISMO catálogo que dispara el flujo
    // (`config/event-catalog.ts`), no de una lista aparte: esperar "un canje
    // de cupón" y arrancar por "un canje de cupón" tienen que significar lo
    // mismo, o el motor estaría escuchando dos cosas distintas con el mismo
    // nombre.
    espera_hasta_evento: [
      {
        key: "dominio",
        label: "Dominio",
        kind: "select",
        required: true,
        options: EVENT_DOMAINS.map((d) => ({
          value: d,
          label: EVENT_DOMAIN_LABEL[d],
        })),
      },
      {
        key: "hasta_evento",
        label: "Hasta evento",
        kind: "event-select",
        required: true,
      },
      // Sin esto, el canje de OTRO socio cerraría esta espera: el motor
      // recibe el evento suelto y necesita saber qué campo del payload lo
      // ata a esta instancia del flujo. Es obligatorio a propósito — el
      // valor por defecto silencioso ("supongo que es el socio") es
      // exactamente el bug que produce cupones entregados a quien no era.
      {
        key: "llave_correlacion",
        label: "Llave de correlación",
        kind: "select",
        required: true,
        options: [
          { value: "cliente.id", label: "El socio del flujo (cliente.id)" },
          {
            value: "cupon.id",
            label: "El cupón emitido en el flujo (cupon.id)",
          },
          { value: "compra.id", label: "La compra del flujo (compra.id)" },
          { value: "reto.id", label: "El reto del flujo (reto.id)" },
        ],
        hint: "Qué campo del evento tiene que coincidir para que esta espera —y no la de otro socio— se dé por cumplida.",
      },
      {
        key: "tiempo_maximo_espera_dias",
        label: "Tiempo máximo de espera",
        kind: "number",
        min: 1,
        suffix: "días",
      },
    ],
    // Extraído de `esperar` (ver comentario arriba) — mismo campo que antes
    // era `ventana_reanudacion`, más zona horaria (mismas 4 que ya usa
    // `fecha_recurrente`) porque una ventana de horas sin zona es ambigua.
    ventana_horaria: [
      {
        key: "ventana",
        label: "Ventana horaria",
        kind: "time-range",
        required: true,
      },
      {
        key: "zona_horaria",
        label: "Zona horaria",
        kind: "select",
        options: TIMEZONE_OPTIONS,
      },
    ],
    // Reanuda después de un fan-out. No tiene configuración de negocio: lo
    // único que hay que decidir es si espera a TODAS las ramas vivas o
    // sigue con la primera que llegue — de eso depende que el flujo
    // continúe una vez o tantas veces como ramas hubiera.
    union: [
      {
        key: "modo_union",
        label: "Cuándo continuar",
        kind: "select",
        required: true,
        options: [
          {
            value: "todas",
            label: "Cuando lleguen todas las ramas vivas",
          },
          { value: "primera", label: "Con la primera rama que llegue" },
        ],
        hint: "«Todas» cuenta solo las ramas que de verdad se recorrieron: una rama que no se tomó no bloquea la unión para siempre.",
      },
    ],
    // Sin tarjeta en el catálogo de Figma — declarativo, sin motor real de
    // aprobación (mismo criterio que el resto del builder). Grounded en el
    // flujo real de doble aprobación de cupones (`coupon_approval`) solo
    // como referencia de forma — no reusa esa tabla, es genérico para
    // cualquier journey. `rol_aprobador` reusa los roles reales del
    // proyecto (`ROLES` en `types/domain.ts`), sin `lector` (solo lectura).
    // 2 salidas fijas — ver `OUTPUT_HANDLES` en `canvas/builder-node.tsx`.
    esperar_aprobacion: [
      {
        key: "rol_aprobador",
        label: "Quién aprueba",
        kind: "select",
        required: true,
        options: [
          { value: "gestor", label: "Gestor" },
          { value: "aprobador", label: "Aprobador" },
          { value: "admin", label: "Administrador" },
        ],
      },
      {
        key: "motivo",
        label: "Motivo / contexto",
        kind: "text",
        placeholder: "Ej. Emisión de cupón de alto valor",
      },
      {
        key: "tiempo_maximo_espera_dias",
        label: "Tiempo máximo de espera",
        kind: "number",
        min: 1,
        suffix: "días",
      },
    ],

    // === Fin ===
    fin_workflow: [
      {
        key: "resultado",
        label: "Resultado",
        kind: "select",
        required: true,
        options: [
          { value: "conversion", label: "Conversión" },
          { value: "abandono", label: "Abandono" },
          {
            value: "completado_sin_conversion",
            label: "Completado sin conversión",
          },
        ],
      },
      {
        key: "motivo",
        label: "Motivo",
        kind: "text",
        placeholder: "Ej. Cliente vuelve a VIP activo",
      },
      {
        key: "permitir_reingreso",
        label: "Permitir reingreso",
        kind: "boolean",
      },
      {
        key: "registrar_analitica",
        label: "Registrar en analítica",
        kind: "boolean",
      },
    ],
  }
