import type { BuilderNodeType } from "@/types/domain"

export type FieldSpec =
  | {
      key: string
      label: string
      kind: "text"
      placeholder?: string
      required?: boolean
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
    }
  | {
      key: string
      label: string
      kind: "select"
      options: { value: string; label: string }[]
      hint?: string
      required?: boolean
    }
  | {
      key: string
      label: string
      kind: "audience-select"
      hint?: string
      required?: boolean
    }
  | {
      key: string
      label: string
      kind: "coupon-select"
      hint?: string
      required?: boolean
    }
  | {
      key: string
      label: string
      kind: "promotion-select"
      hint?: string
      required?: boolean
    }
  | { key: string; label: string; kind: "currency"; required?: boolean }
  | {
      key: string
      label: string
      kind: "multiselect"
      options: { value: string; label: string }[]
    }
  | { key: string; label: string; kind: "boolean" }
  | { key: string; label: string; kind: "time-range"; required?: boolean }

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
 * Especificación de formulario para los 24 tipos de bloque "simples" —
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
 * (`entra_segmento`) usa `kind: "audience-select"` (`segments`, ver 11 ·
 * Audiencias); `coupon_batch_id` (`emitir_cupon` y `canje_cupon`) usa `kind:
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
 * se repite en este spec. `canje_cupon` y `alta_socio` no tienen tarjeta
 * en el catálogo de Figma (no fue diseñado) — se dejan con la
 * configuración mínima razonable que ya existía, documentado abajo.
 *
 * `email`/`push`/`sms_whatsapp` también tienen componente dedicado
 * (`IntegrationMessageForm`, ver `MESSAGE_GUARDRAIL_SPECS` arriba) por la
 * misma razón que `acumular_puntos`/`condicion_multiple`: proveedor → flujo
 * es una cascada dependiente que no cabe en el modelo plano de
 * `FieldSpec[]`. Sí aparecen abajo, pero solo con sus guardarraíles.
 * `webhook_saliente` es el mismo caso: headers y cuerpo son listas
 * dinámicas (`WebhookSalienteForm`, `inspector/webhook-saliente-form.tsx`)
 * — aquí solo están sus campos escalares (URL, método, reintentos...).
 * `webhook_entrante` sí es 100% "simple" (cabe entero en este archivo). Los
 * 6 bloques agregados para cubrir más flujos (`ajustar_puntos`,
 * `cambio_nivel_entrada`, `devolucion`, `espera_hasta_evento`,
 * `ventana_horaria`, `esperar_aprobacion`) también son 100% "simples" —
 * ninguno necesita componente dedicado.
 */
export const SIMPLE_FIELD_SPECS: Partial<Record<BuilderNodeType, FieldSpec[]>> =
  {
    // === Entradas ===
    // `evento_compra` es el único bloque de Entrada con más de un momento
    // técnico posible para el mismo evento de negocio — por eso es el único
    // con un campo `trigger` real y editable (docs/builder.md §2-3: "Solo
    // Entrada tiene Trigger"). Los otros 4 tipos de Entrada son 1:1 con su
    // trigger — no hay nada que elegir, se muestran como dato informativo
    // en el inspector en vez de repetir un selector de una sola opción
    // (ver `entry-triggers.ts`).
    evento_compra: [
      {
        key: "trigger",
        label: "Disparador técnico",
        kind: "select",
        required: true,
        options: [
          {
            value: "checkout.calculated",
            label: "Al calcular el checkout (checkout.calculated)",
          },
          {
            value: "order.paid",
            label: "Al confirmarse el pago (order.paid)",
          },
          {
            value: "order.completed",
            label: "Al completarse la orden (order.completed)",
          },
        ],
        hint: "En qué momento técnico exacto debe empezar a evaluarse el workflow — el resto de bloques no vuelve a declarar esto.",
      },
      {
        key: "fuente_datos",
        label: "Fuente de datos",
        kind: "select",
        required: true,
        options: [
          { value: "pos_ecommerce", label: "POS + E-commerce" },
          { value: "pos", label: "Solo POS" },
          { value: "ecommerce", label: "Solo E-commerce" },
        ],
      },
      { key: "monto_minimo", label: "Monto mínimo", kind: "currency" },
      {
        key: "categorias_incluidas",
        label: "Categorías incluidas",
        kind: "multiselect",
        options: [
          { value: "bebidas", label: "Bebidas" },
          { value: "snacks", label: "Snacks" },
          { value: "lacteos", label: "Lácteos" },
          { value: "aseo", label: "Aseo" },
        ],
      },
      {
        key: "tiendas",
        label: "Tiendas",
        kind: "multiselect",
        options: [
          { value: "centro", label: "Centro" },
          { value: "norte", label: "Norte" },
          { value: "sur", label: "Sur" },
        ],
      },
      {
        key: "frecuencia_maxima",
        label: "Frecuencia máxima",
        kind: "number",
        min: 1,
        suffix: "por día",
      },
    ],
    entra_segmento: [
      {
        key: "audiencia_id",
        label: "Audiencia",
        kind: "audience-select",
        required: true,
      },
      {
        key: "modo",
        label: "Modo",
        kind: "select",
        required: true,
        options: [
          { value: "al_entrar", label: "Al entrar" },
          { value: "al_entrar_y_salir", label: "Al entrar y salir" },
          { value: "al_reingresar", label: "Al entrar y reingresar" },
        ],
      },
      {
        key: "reevaluacion",
        label: "Reevaluación",
        kind: "select",
        options: [
          { value: "tiempo_real", label: "Tiempo real" },
          { value: "diaria", label: "Diaria" },
          { value: "semanal", label: "Semanal" },
        ],
      },
      {
        key: "reingreso_permitido",
        label: "Reingreso permitido",
        kind: "boolean",
      },
    ],
    // Sin tarjeta en el catálogo de Figma (08.4 no diseñó este bloque) —
    // se mantiene mínimo: solo qué cupón dispara la entrada. Reutiliza el
    // mismo `coupon-select` de `emitir_cupon` (misma tabla `coupon_batch`)
    // en vez del prefijo de texto libre que tenía antes — el usuario elige
    // la emisión real ya creada, no escribe un patrón esperando que
    // coincida.
    canje_cupon: [
      {
        key: "coupon_batch_id",
        label: "Cupón",
        kind: "coupon-select",
        hint: "Emisión de cupón cuyos códigos disparan la entrada al workflow.",
      },
    ],
    fecha_recurrente: [
      {
        key: "tipo",
        label: "Tipo",
        kind: "select",
        required: true,
        options: [
          { value: "fecha_fija", label: "Fecha fija" },
          { value: "cumpleanos", label: "Cumpleaños del socio" },
          { value: "recurrente", label: "Recurrente" },
        ],
      },
      {
        key: "cadencia",
        label: "Cadencia",
        kind: "select",
        options: [
          { value: "diaria", label: "Diaria" },
          { value: "semanal", label: "Semanal · lunes 09:00" },
          { value: "mensual", label: "Mensual" },
          { value: "personalizada", label: "Personalizada" },
        ],
      },
      {
        key: "fecha_ancla",
        label: "Fecha ancla",
        kind: "select",
        options: [
          { value: "cumpleanos", label: "Cumpleaños" },
          { value: "fecha_alta", label: "Fecha de alta" },
          { value: "fecha_fija", label: "Fecha fija" },
        ],
      },
      {
        key: "desfase_dias",
        label: "Desfase",
        kind: "number",
        suffix: "días (negativo = antes)",
      },
      {
        key: "zona_horaria",
        label: "Zona horaria",
        kind: "select",
        options: [
          { value: "America/Bogota", label: "America/Bogotá" },
          { value: "America/Mexico_City", label: "America/Mexico_City" },
          { value: "America/Lima", label: "America/Lima" },
          { value: "America/Santiago", label: "America/Santiago" },
        ],
      },
    ],
    // Sin tarjeta en el catálogo de Figma — a diferencia de `canje_cupon`
    // (que al menos filtra por prefijo), un alta de socio sin ningún
    // parámetro se sentía incompleto para un bloque de entrada real, así
    // que se agregan 2 campos razonables (canal de alta, requerir opt-in
    // de marketing) en vez de dejarlo vacío.
    alta_socio: [
      {
        key: "canal",
        label: "Canal de alta",
        kind: "select",
        options: [
          { value: "todos", label: "Todos los canales" },
          { value: "web", label: "Sitio web" },
          { value: "app", label: "App móvil" },
          { value: "tienda_fisica", label: "Tienda física" },
        ],
      },
      {
        key: "requiere_opt_in",
        label: "Requiere opt-in de marketing",
        kind: "boolean",
      },
    ],
    // Sin tarjeta en el catálogo de Figma (ver comentario de
    // `BUILDER_NODE_GROUPS` en `types/domain.ts`) — bloque de integración
    // autocontenido: un sistema externo llama a este webhook y eso arranca
    // el journey. Esta demo no expone un endpoint real que lo reciba
    // (mismo criterio que "sin sender de email/SMS" en otras partes del
    // proyecto) — `identificador` es solo el dato declarativo que
    // identificaría ese endpoint.
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
        label: "Nombre del header",
        kind: "text",
        placeholder: "ej. X-Webhook-Secret",
      },
    ],
    // Sin tarjeta en el catálogo de Figma — distinto del `cambio_nivel` de
    // Lealtad (esa es la acción que recalcula/fuerza el nivel). No existe
    // tabla de historial de cambios de nivel (`nivel_anterior`/
    // `nivel_actual` no están en el esquema), así que el filtro NO es "de
    // nivel X a nivel Y" — solo dirección + nivel objetivo, contra la
    // tabla real `tiers` (mismo `TIER_OPTIONS` que ya usa `cambio_nivel`).
    cambio_nivel_entrada: [
      {
        key: "direccion",
        label: "Dirección",
        kind: "select",
        required: true,
        options: [
          { value: "sube", label: "Solo al subir" },
          { value: "baja", label: "Solo al bajar" },
          { value: "cualquiera", label: "Cualquier cambio" },
        ],
      },
      {
        key: "nivel_objetivo",
        label: "Nivel objetivo",
        kind: "select",
        options: TIER_OPTIONS,
      },
    ],
    // Sin tarjeta en el catálogo de Figma — `pedidos.estado` sí incluye
    // 'devuelto' (real), pero la tabla no tiene columna de motivo/monto
    // devuelto, así que el spec se queda minimalista (mismo patrón que
    // `evento_compra`: canal + monto mínimo, contra columnas reales).
    devolucion: [
      {
        key: "canal",
        label: "Canal",
        kind: "select",
        options: [
          { value: "todos", label: "Todos los canales" },
          { value: "pos", label: "POS" },
          { value: "ecommerce", label: "E-commerce" },
          { value: "app", label: "App" },
        ],
      },
      { key: "monto_minimo", label: "Monto mínimo", kind: "currency" },
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
        label: "Ventana de cálculo",
        kind: "number",
        min: 1,
        suffix: "meses móviles",
      },
      {
        key: "nivel_destino",
        label: "Nivel destino",
        kind: "select",
        options: TIER_OPTIONS,
      },
      { key: "permitir_descenso", label: "Permitir descenso", kind: "boolean" },
      {
        key: "periodo_gracia_dias",
        label: "Periodo de gracia",
        kind: "number",
        min: 0,
        suffix: "días",
      },
      { key: "notificar_socio", label: "Notificar al socio", kind: "boolean" },
    ],
    emitir_cupon: [
      {
        key: "coupon_batch_id",
        label: "Emisión base",
        kind: "coupon-select",
        required: true,
        hint: "Cupón real cuya configuración (descuento, vigencia, restricciones) se reutiliza para cada socio que llega aquí.",
      },
      {
        key: "vigencia_dias",
        label: "Vigencia",
        kind: "number",
        min: 1,
        required: true,
        suffix: "días",
      },
      {
        key: "usos_permitidos",
        label: "Usos permitidos",
        kind: "number",
        min: 1,
      },
      {
        key: "canales_validos",
        label: "Canales válidos",
        kind: "multiselect",
        options: [
          { value: "pos", label: "POS" },
          { value: "ecommerce", label: "E-commerce" },
          { value: "app", label: "App" },
        ],
      },
      { key: "acumulable", label: "Acumulable", kind: "boolean" },
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
      {
        key: "si_falla",
        label: "Si falla",
        kind: "select",
        options: [
          { value: "continuar_workflow", label: "Continuar workflow" },
          { value: "detener_workflow", label: "Detener workflow" },
        ],
      },
    ],

    // === Lógica (la propiedad "list" de cada una — Ramas/Variantes — la
    // gestiona la pestaña Ramas, no este spec de Configuración) ===
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
        label: "Duración",
        kind: "number",
        min: 1,
        suffix: "días",
      },
    ],
    // Extraído de `esperar` (ver comentario arriba) — mismos 2 campos que
    // antes eran el modo "Hasta evento".
    espera_hasta_evento: [
      {
        key: "hasta_evento",
        label: "Hasta evento",
        kind: "select",
        required: true,
        options: [
          { value: "canje_cupon", label: "Canje de cupón" },
          { value: "evento_compra", label: "Compra realizada" },
          { value: "entra_segmento", label: "Entra a segmento" },
        ],
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
        options: [
          { value: "America/Bogota", label: "America/Bogotá" },
          { value: "America/Mexico_City", label: "America/Mexico_City" },
          { value: "America/Lima", label: "America/Lima" },
          { value: "America/Santiago", label: "America/Santiago" },
        ],
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
