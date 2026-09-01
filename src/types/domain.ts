/**
 * Closed domain sets, as union types derived from `as const` tuples — never
 * `enum` (convention inherited from polar-portal). Each tuple must exactly
 * mirror the `check` on the matching column in `supabase/migrations/`; if you
 * change one, change the other.
 */

// Starting archetype for an organization role (`roles.rol_base` in
// supabase/migrations) — not the role assigned to a person: that's
// `profiles.role_id`, a real row of `roles` (09.2 "Equipo · roles y
// permisos"), with its own name and permission matrix per organization.
export const ROLES = ["admin", "gestor", "aprobador", "lector"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_TYPES = ["sistema", "personalizado"] as const
export type RoleType = (typeof ROLE_TYPES)[number]

// 'propia' = only the store from that person's `profiles.tienda_id` (09.2
// "Su tienda"). There's no manual store list yet.
export const STORE_SCOPES = ["todas", "propia"] as const
export type StoreScope = (typeof STORE_SCOPES)[number]

export const CHANNEL_SCOPES = ["pos", "ecommerce", "pos_ecommerce"] as const
export type ChannelScope = (typeof CHANNEL_SCOPES)[number]

export const PROFILE_STATUSES = ["activo", "inactivo"] as const
export type ProfileStatus = (typeof PROFILE_STATUSES)[number]

export const INVITATION_STATUSES = [
  "pendiente",
  "aceptada",
  "cancelada",
  "expirada",
] as const
export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

export const TENANT_IDPS = [
  "microsoft_entra_id",
  "saml_okta",
  "saml_ping",
  "saml_google_workspace",
] as const
export type TenantIdp = (typeof TENANT_IDPS)[number]

// Loyalty program tiers (08.5 "Multiplicador por nivel").
export const TIER_NAMES = ["diamante", "oro", "plata", "bronce"] as const
export type TierName = (typeof TIER_NAMES)[number]

// Member profile attributes (05 · Clientes y audiencias, `members`).
export const DOCUMENT_TYPES = ["cc", "ce", "ti", "pasaporte", "nit"] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const GENDERS = [
  "femenino",
  "masculino",
  "otro",
  "prefiere_no_decir",
] as const
export type Gender = (typeof GENDERS)[number]

export const MARITAL_STATUSES = [
  "soltero",
  "casado",
  "union_libre",
  "divorciado",
  "viudo",
] as const
export type MaritalStatus = (typeof MARITAL_STATUSES)[number]

export const ACQUISITION_CHANNELS = [
  "pos",
  "ecommerce",
  "app",
  "referido",
  "campana",
  "otro",
] as const
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number]

export const MEMBER_STATUSES = ["activo", "inactivo", "suspendido"] as const
export type MemberStatus = (typeof MEMBER_STATUSES)[number]

/** Ámbito del buscador de clientes (05.1): por cuál dato buscar. Solo UI, sin columna de BD detrás. */
export const MEMBER_SEARCH_SCOPES = [
  "todos",
  "nombre",
  "email",
  "codigo_socio",
  "documento",
  "telefono",
] as const
export type MemberSearchScope = (typeof MEMBER_SEARCH_SCOPES)[number]

export const LANGUAGES = ["es", "en"] as const
export type Language = (typeof LANGUAGES)[number]

// Marketing consent per channel (05.3g "Card · Consentimientos").
export const CONSENT_CHANNELS = [
  "email",
  "sms",
  "push",
  "whatsapp",
  "personalizacion",
  "socios_comerciales",
] as const
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number]

// Orders (05.3g "Comportamiento de compra" / "Valor comercial").
export const SALES_CHANNELS = ["pos", "ecommerce", "app"] as const
export type SalesChannel = (typeof SALES_CHANNELS)[number]

export const ORDER_STATUSES = ["completado", "cancelado", "devuelto"] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const CONSENT_SOURCES = ["web", "app", "tienda", "formulario"] as const
export type ConsentSource = (typeof CONSENT_SOURCES)[number]

export const POINTS_LEDGER_TYPES = [
  "acumulacion",
  "canje",
  "expiracion",
  "ajuste",
] as const
export type PointsLedgerType = (typeof POINTS_LEDGER_TYPES)[number]

/**
 * Módulo de cupones (docs/cupones.md, features/coupons). EXCEPCIÓN a la
 * regla de "valores de dominio en español" de CLAUDE.md §3: este módulo
 * —tablas, columnas y valores de `check`— va en inglés, decisión explícita
 * del usuario. La regla base sigue en pie: cada tupla espeja exactamente
 * el `check` de su columna en supabase/migrations/20260824110000_cupones_esquema.sql.
 * Reemplaza las viejas `COUPON_TYPES`/`COUPON_STATUSES` (español, de la
 * tabla `coupons` plana que este módulo reemplazó — sin uso real en `src/`).
 */
export const COUPON_ORIGINS = [
  "manual_customer",
  "manual_bearer",
  "points_redemption",
  "batch_audience",
  "batch_anonymous",
  "csv_import",
] as const
export type CouponOrigin = (typeof COUPON_ORIGINS)[number]

export const COUPON_BATCH_STATUSES = [
  "draft",
  "pending_approval",
  "generating",
  "issued",
  "closed",
  "cancelled",
] as const
export type CouponBatchStatus = (typeof COUPON_BATCH_STATUSES)[number]

/** Espeja el check de `coupon_approval.status` (migración del flujo de doble aprobación). 'revoked' no está aquí a propósito: ninguna acción del módulo lo produce todavía (ver actions/approvals.ts). */
export const COUPON_APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
] as const
export type CouponApprovalStatus = (typeof COUPON_APPROVAL_STATUSES)[number]

export const COUPON_DISCOUNT_TYPES = [
  "percentage",
  "fixed_amount",
  "free_product",
] as const
export type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number]

/** Estados ALMACENADOS en `coupon.status` — 'expired' no está aquí a propósito (ver COUPON_DISPLAY_STATUSES). */
export const COUPON_STATUSES = [
  "draft",
  "issued",
  "assigned",
  "redeemed",
  "cancelled",
] as const
export type CouponStatus = (typeof COUPON_STATUSES)[number]

/**
 * Lo que ve el usuario: los estados almacenados más 'expired', que se
 * DERIVA cruzando `status` con `valid_to` (mismo patrón que
 * `features/promotions/lib/status.ts`) en vez de guardarse y desincronizarse.
 */
export const COUPON_DISPLAY_STATUSES = [...COUPON_STATUSES, "expired"] as const
export type CouponDisplayStatus = (typeof COUPON_DISPLAY_STATUSES)[number]

export const COUPON_AUDIENCE_MODES = ["dynamic", "frozen"] as const
export type CouponAudienceMode = (typeof COUPON_AUDIENCE_MODES)[number]

export const COUPON_POINTS_CHARGE_TIMINGS = ["on_create", "on_redeem"] as const
export type CouponPointsChargeTiming =
  (typeof COUPON_POINTS_CHARGE_TIMINGS)[number]

/** Solo 'print' tiene implementación real — no hay sender de email/SMS en este proyecto. */
export const COUPON_DELIVERY_CHANNELS = ["email", "sms", "print"] as const
export type CouponDeliveryChannel = (typeof COUPON_DELIVERY_CHANNELS)[number]

export const COUPON_CANCEL_REASON_CODES = [
  "issued_in_error",
  "duplicate",
  "suspected_fraud",
  "customer_request",
  "other",
] as const
export type CouponCancelReasonCode = (typeof COUPON_CANCEL_REASON_CODES)[number]

/** Motivos que exigen nota obligatoria (regla 7.4, espejo del check `coupon_cancel_note_required`). */
export const COUPON_CANCEL_REASONS_REQUIRING_NOTE: readonly CouponCancelReasonCode[] =
  ["suspected_fraud", "other"]

export const COUPON_ASSIGNMENT_ROLES = [
  "holder",
  "previous_holder",
  "issuer",
] as const
export type CouponAssignmentRole = (typeof COUPON_ASSIGNMENT_ROLES)[number]

export const COUPON_ASSIGNMENT_SOURCES = [
  "manual",
  "rule",
  "journey",
  "redemption",
  "csv",
] as const
export type CouponAssignmentSource = (typeof COUPON_ASSIGNMENT_SOURCES)[number]

export const COUPON_REDEMPTION_RESULTS = [
  "applied",
  "rejected",
  "validated",
] as const
export type CouponRedemptionResult = (typeof COUPON_REDEMPTION_RESULTS)[number]

/**
 * `delivered`/`viewed` (Figma 13.4 "Entregado por email"/"Cupón
 * visualizado") reflejan hechos que en producción llegarían de una
 * integración externa (proveedor de email, SDK de la app) — este proyecto
 * no tiene ese sender ni ese tracking, así que en la demo se siembran como
 * datos de ejemplo, no como eventos que el sistema genera solo. `reminder_sent`
 * del doc se queda fuera: no hay ningún flujo de recordatorio, ni siquiera
 * simulado, que lo dispare. `approval_requested`/`approval_rejected`/
 * `approval_withdrawn` no estaban en el doc: sin ellos la petición y el
 * rechazo de una doble aprobación quedarían invisibles en la línea de tiempo.
 */
export const COUPON_EVENT_TYPES = [
  "batch_created",
  "authorization_signed",
  "approval_requested",
  "approval_granted",
  "approval_rejected",
  "approval_revoked",
  "approval_withdrawn",
  "generation_started",
  "generation_completed",
  "issued",
  "assigned",
  "unassigned",
  "validity_extended",
  "delivered",
  "viewed",
  "redeemed",
  "redemption_rejected",
  "expired",
  "cancelled",
  "printed",
  "exported",
] as const
export type CouponEventType = (typeof COUPON_EVENT_TYPES)[number]

export const COUPON_ACTOR_TYPES = [
  "user",
  "system",
  "rule",
  "journey",
  "store",
] as const
export type CouponActorType = (typeof COUPON_ACTOR_TYPES)[number]

export const COUPON_PRINT_LAYOUTS = ["grid_8", "single_page"] as const
export type CouponPrintLayout = (typeof COUPON_PRINT_LAYOUTS)[number]

export const COUPON_PRINT_JOB_STATUSES = ["pending", "ready", "failed"] as const
export type CouponPrintJobStatus = (typeof COUPON_PRINT_JOB_STATUSES)[number]

/** Solo UI (searchParams de /cupones), sin columna de BD detrás. */
export const COUPON_LIST_MODES = ["batches", "coupons", "approvals"] as const
export type CouponListMode = (typeof COUPON_LIST_MODES)[number]

/** Ámbito del buscador (docs/cupones.md §4.1: Todo · Persona · ID cupón · Emisión). Solo UI. */
export const COUPON_SEARCH_SCOPES = ["all", "person", "code", "batch"] as const
export type CouponSearchScope = (typeof COUPON_SEARCH_SCOPES)[number]

// Product status in the catalog (03.1 "ESTADO" / 03.3 "Badge · ACTIVO").
export const PRODUCT_STATUSES = ["activo", "inactivo"] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

// Category of a product history event (03.3 "Card · Bitácora de cambios",
// Precios/Datos/Promociones/Estado filter chips).
export const PRODUCT_EVENT_CATEGORIES = [
  "precio",
  "datos",
  "promocion",
  "estado",
] as const
export type ProductEventCategory = (typeof PRODUCT_EVENT_CATEGORIES)[number]

// Store format (04.1 "FORMATO" / 04.2 "Formato").
export const STORE_FORMATS = ["flagship", "express", "mall"] as const
export type StoreFormat = (typeof STORE_FORMATS)[number]

// Store operating status (04.1 "ESTADO"). 'en_apertura' is the initial
// status until the POS's first transaction (04.2 note).
export const STORE_STATUSES = [
  "operando",
  "bajo_meta",
  "en_apertura",
  "cerrada_temporal",
] as const
export type StoreStatus = (typeof STORE_STATUSES)[number]

// Promotion mechanic (06.1 "PROMOCIÓN": "Cantidad · todas las tiendas",
// "Segmento · regla RULE-VIP-15"…) — classifies the promotion for the
// listing's icon and subtitle, independent of which `condiciones` fields it
// carries.
export const PROMOTION_TYPES = [
  "cantidad",
  "categoria",
  "segmento",
  "carrito",
  "cupon",
  "bundle",
] as const
export type PromotionType = (typeof PROMOTION_TYPES)[number]

// Field of an IF condition (07.1 "Condiciones (SI)"). All 19 have a real
// table/column behind them — 'categoria'/'tienda' from the start,
// 'segmento' since 11 · Audiencias (`segments`), 'monto_carrito' since
// `pedidos` exists, 'cupon_codigo' since `coupon_batch` exists (T15 del
// documento de modalidades: "Cupón con código"), the 8
// socio_*/tienda_*/producto_* fields added to let a promotion condition
// on member/store/product attributes (`members`, `tiers`, `tiendas`,
// `productos`), 'genero'/'estado_civil'/'tiene_hijos'/'tiene_mascotas' —
// los mismos atributos demográficos que ya muestra el detalle de cliente
// (`members`, ver `features/members/components/member-hero.tsx`) — y
// 'producto_receta' desde que existe `productos.requiere_receta`
// (docs/promociones.md §8, migración `20260826153000_productos_receta`).
// 'producto' referencia directamente `productos.id` (a diferencia de
// 'categoria'/'producto_marca', que son atributos del producto, no el
// producto en sí) — para acotar la promoción a uno o varios SKU puntuales
// sin pasar por una mecánica que ya tenga su propio picker (ej.
// `precio_especial`).
// Deliberately left out: any "ticket"/"linea"/"contexto" field (día, hora,
// medio de pago, feriados) — none of those have a real column anywhere in
// the schema, so adding them would be inventing UI for data that doesn't
// exist.
export const CONDITION_FIELDS = [
  "categoria",
  "producto",
  "tienda",
  "segmento",
  "monto_carrito",
  "cupon_codigo",
  "socio_nivel",
  "socio_provincia",
  "socio_antiguedad",
  "socio_edad",
  "genero",
  "estado_civil",
  "tiene_hijos",
  "tiene_mascotas",
  "tienda_region",
  "tienda_formato",
  // A diferencia de `tienda_region`/`tienda_formato` (texto libre, sin tabla
  // propia), `tienda_grupo` referencia la tabla real `tienda_grupos`
  // (agrupación editable por el usuario, ver
  // `20260826260000_tienda_grupos.sql`) — mismo criterio que `socio_nivel`
  // (array de UUID de una tabla real, no de valores de texto distintos).
  "tienda_grupo",
  "producto_marca",
  "producto_proveedor",
  "producto_receta",
] as const
export type ConditionField = (typeof CONDITION_FIELDS)[number]

/** Gradual rollout mechanism (not every field had a real table from day 1) — today all 18 are enabled, kept in case a new field is added before it has a data source. */
export const ENABLED_CONDITION_FIELDS: readonly ConditionField[] =
  CONDITION_FIELDS

/** Agrupa el selector de campo de una condición por ámbito de negocio — sin esto, 13 campos en una sola lista plana son difíciles de escanear. */
export const CONDITION_FIELD_DOMAINS = [
  "Carrito",
  "Producto",
  "Tienda",
  "Cliente",
  "Cupón",
] as const
export type ConditionFieldDomain = (typeof CONDITION_FIELD_DOMAINS)[number]

export const CONDITION_COMBINATORS = ["todas", "alguna"] as const
export type ConditionCombinator = (typeof CONDITION_COMBINATORS)[number]

// Reward benefit type (07.1 "Recompensa (ENTONCES)" → paso "Mecánica").
// `descuento_escalonado` es la única de las 3 mecánicas de descuento con
// un beneficio multi-fila (`escalones`) en vez de un valor único — ver
// docs/promociones.md §7.1a. La mayoría son la versión transaccional
// (evaluada contra un solo carrito); `descuento_continuidad` es la
// excepción deliberada — reusa `escalones` con `umbral` como ordinal de
// compra consecutiva, no unidades/monto del carrito (ver
// `CONTINUITY_BREAK_BEHAVIORS` abajo y
// `20260826180000_promociones_continuidad.sql`). La acumulación
// multi-ticket genérica (T07) y la línea de farmacia clínica (T18-T21,
// dominio regulado de datos de salud) de docs/modalidades-promocion-
// contexto.md siguen fuera (ver docs/promociones.md §18).
export const BENEFIT_TYPES = [
  "descuento_porcentual",
  "descuento_monto_fijo",
  "envio_gratis",
  "producto_gratis",
  "precio_fijo_bundle",
  "descuento_escalonado",
  "por_piezas",
  "multiplicador_puntos",
  "bono_puntos",
  "emitir_cupon",
  "precio_especial",
  "cashback",
  "descuento_continuidad",
] as const
export type BenefitType = (typeof BENEFIT_TYPES)[number]

// Sub-choices de `descuento_escalonado` — qué se mide en el carrito para
// decidir el escalón alcanzado.
export const DISCOUNT_TIER_THRESHOLD_TYPES = ["unidades", "monto"] as const
export type DiscountTierThresholdType =
  (typeof DISCOUNT_TIER_THRESHOLD_TYPES)[number]

// `escalon_unico`: el escalón más alto alcanzado aplica a todo el pedido
// (hay un salto en el límite). `progresivo`: cada tramo se descuenta por
// separado y se suman, como los tramos de un impuesto (sin salto).
export const DISCOUNT_TIER_CALCULATION_MODES = [
  "escalon_unico",
  "progresivo",
] as const
export type DiscountTierCalculationMode =
  (typeof DISCOUNT_TIER_CALCULATION_MODES)[number]

// Sub-choices de `descuento_continuidad` — la escalera de continuidad
// (variante V11 de docs/modalidades-promocion-contexto.md:1962-1978, no
// T18: sin inscripción ni padrón de pacientes). `umbral` de `escalones` es
// el ordinal de compra consecutiva; estos 3 campos declaran qué pasa
// cuando el cliente excede la ventana de continuidad entre compras.
export const CONTINUITY_BREAK_BEHAVIORS = [
  "reiniciar",
  "retroceder_un_escalon",
  "mantener",
] as const
export type ContinuityBreakBehavior =
  (typeof CONTINUITY_BREAK_BEHAVIORS)[number]

/** Efecto de una devolución sobre el escalón alcanzado (campo pedido por la ficha T07, docs/modalidades-promocion-contexto.md:3235). */
export const RETURN_EFFECTS = [
  "no_afecta",
  "rompe_racha",
  "retrocede_escalon",
] as const
export type ReturnEffect = (typeof RETURN_EFFECTS)[number]

/** Sobre qué piezas elegibles recae el beneficio cuando el límite de piezas del paso "Límites" topa el número de unidades. */
export const PIECE_SELECTION_CRITERIA = [
  "menor_precio",
  "mayor_precio",
] as const
export type PieceSelectionCriterion = (typeof PIECE_SELECTION_CRITERIA)[number]

// Alcance de `por_piezas` (BxGy) — qué universo de producto cuenta para
// "compra N". `producto_especifico` reusa `productoCompradoId` (el mismo
// campo que `producto_gratis`, nunca ambas mecánicas a la vez).
export const BXGY_SCOPES = [
  "mismo_producto",
  "misma_categoria",
  "producto_especifico",
] as const
export type BxgyScope = (typeof BXGY_SCOPES)[number]

export const APPLY_TO_OPTIONS = ["subtotal_carrito", "envio"] as const
export type ApplyTo = (typeof APPLY_TO_OPTIONS)[number]

// Días de la semana en que corre la regla (07.5 "Vigencia" — vacío/sin
// selección = todos los días).
export const DAYS_OF_WEEK = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

// Cómo se resuelve el "empate" cuando más de una promoción activa podría
// aplicar a la vez (07.6 "Límites y stacking") — más granular que el
// booleano `acumulable`, que solo dice si ESTA promoción admite combinarse
// con otras, no cómo se decide cuál gana cuando varias podrían aplicar.
export const STACKING_MODES = [
  "mejor_beneficio",
  "mayor_prioridad",
  "todas_acumulan",
] as const
export type StackingMode = (typeof STACKING_MODES)[number]

// Lifecycle of a promotion. It is picked explicitly when creating it (step
// "Resumen" of 07.1 — "con qué estado se cierra el formulario") and, once
// created, it is the ONLY field that stays editable: everything else becomes
// read-only. Allowed transitions live in `features/promotions/lib/status.ts`.
//
// `activa`/`inactiva` keep the feminine form of the stored value because it
// agrees with "promoción" and is what `estado_publicacion` already holds in
// the seed and in every `.eq("estado_publicacion", "activa")` query.
//
// `programada` is NOT part of this set: it is derived by crossing the status
// with vigente_desde/vigente_hasta instead of being stored separately.
/**
 * Ciclo de vida de todo lo que se publica en el portal: promociones y
 * reglas del builder. Vive una sola vez porque las dos lo comparten —
 * mismos estados, mismas transiciones (ver `lib/publication-status.ts`) y
 * el mismo motivo obligatorio en cada cambio.
 *
 * `programada` no es un estado guardado: se deriva de cruzar `activa` con
 * la vigencia.
 *
 * `pendiente_aprobacion` (`20260831090000_promociones_journeys_doble_aprobacion.sql`)
 * tampoco es elegible por quien publica — lo escribe el servidor cuando
 * quien publica no es admin, nunca el cliente. Por eso NO está en
 * `SELECTABLE_PUBLICATION_STATUSES`, la tupla que sí deben usar los
 * `<Select>` y los `z.enum` de los formularios.
 */
export const PUBLICATION_STATUSES = [
  "borrador",
  "pendiente_aprobacion",
  "activa",
  "inactiva",
  "finalizada",
] as const
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number]

export const SELECTABLE_PUBLICATION_STATUSES = [
  "borrador",
  "activa",
  "inactiva",
  "finalizada",
] as const satisfies readonly PublicationStatus[]
export type SelectablePublicationStatus =
  (typeof SELECTABLE_PUBLICATION_STATUSES)[number]

export const PROMOTION_PUBLICATION_STATUSES = PUBLICATION_STATUSES
export type PromotionPublicationStatus = PublicationStatus

export const CHALLENGE_STATUSES = [
  "en_progreso",
  "cumplido",
  "expirado",
] as const
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number]

// Audience publication status (11 · Audiencias, ESTADO column).
// `nivel_dominante` reuses `TierName` — it's the tier with the most members
// within the segment, not an attribute of the audience itself.
export const SEGMENT_STATUSES = ["activa", "pausada"] as const
export type SegmentStatus = (typeof SEGMENT_STATUSES)[number]

/**
 * Ciclo de vida de una regla del builder. Adopta el vocabulario del módulo
 * de promociones (`PROMOTION_PUBLICATION_STATUSES`) en vez del que tenía
 * antes (`publicado`/`pausado`/`archivado`): las dos cosas se publican, se
 * suspenden y se cierran igual, y tener dos juegos de palabras para el
 * mismo ciclo obligaba a traducir mentalmente entre pantallas.
 *
 * `programada` NO está aquí a propósito: se deriva de cruzar `activa` con
 * la vigencia (ver `publicationStatus` en `lib/publication-status.ts`), así
 * que no puede quedar desincronizada de la columna.
 */
export const WORKFLOW_STATUSES = PUBLICATION_STATUSES
export type WorkflowStatus = PublicationStatus

/**
 * Cómo se dispara la regla una vez ocurre su evento.
 *
 * · `al_ocurrir` — cada vez que llega el evento.
 * · `al_cruzar_umbral` — solo cuando un valor acumulado cruza un múltiplo
 *   (ej. cada 1.000 puntos de saldo). Un evento por umbral puede NO
 *   emitirse: que no se dispare es distinto de dispararse y no cumplir las
 *   condiciones, y la bitácora los guarda distinto.
 * · `programado` — a una hora, no ante un evento.
 */
export const WORKFLOW_TRIGGER_MODES = [
  "al_ocurrir",
  "al_cruzar_umbral",
  "programado",
] as const
export type WorkflowTriggerMode = (typeof WORKFLOW_TRIGGER_MODES)[number]

/**
 * Qué hacer cuando el umbral se vuelve a cruzar. `cada_multiplo` emite en
 * cada múltiplo nuevo; `una_vez` solo la primera vez para ese socio.
 */
export const THRESHOLD_REPEAT_MODES = ["cada_multiplo", "una_vez"] as const
export type ThresholdRepeatMode = (typeof THRESHOLD_REPEAT_MODES)[number]

/**
 * La diferencia entre asignar un cupón al cruzar el umbral y asignarlo en
 * cada evaluación mientras el valor siga por encima.
 *
 * · `borde` — se emite una vez por cruce.
 * · `nivel` — se emite en cada evaluación mientras se mantenga por encima.
 */
export const THRESHOLD_DETECTIONS = ["borde", "nivel"] as const
export type ThresholdDetection = (typeof THRESHOLD_DETECTIONS)[number]

/**
 * Qué pasa cuando dos reglas escuchan el mismo evento. `exclusiva` gana
 * solo la de mayor prioridad dentro de su grupo; `acumulable` se aplica
 * junto con las demás. Espejo de `si_colisiona` de `aplicar_promocion`,
 * pero a nivel de regla completa.
 */
export const WORKFLOW_EXCLUSIVITIES = ["exclusiva", "acumulable"] as const
export type WorkflowExclusivity = (typeof WORKFLOW_EXCLUSIVITIES)[number]

export const WORKFLOW_RUN_TYPES = ["simulacion", "publicacion"] as const
export type WorkflowRunType = (typeof WORKFLOW_RUN_TYPES)[number]

export const WORKFLOW_RUN_STATUSES = [
  "en_progreso",
  "completado",
  "con_errores",
] as const
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number]

/**
 * Catálogo de tipos de bloque del Loyalty Builder, en 5 grupos. Parte viene
 * del Figma "08.4 · Loyalty builder · catálogo de bloques"; el resto se
 * añadió después sin tarjeta de Figma —`webhook_entrante`/`webhook_saliente`
 * (integración HTTP), `ajustar_puntos`/`espera_hasta_evento`/
 * `ventana_horaria`/`esperar_aprobacion`, y los bloques nuevos
 * `actualizar_cliente`/`cambiar_segmento`/`emitir_evento`/`union`— con el
 * mismo precedente que `email`/`push`/`sms_whatsapp` (ver comentario en
 * `config/integration-flows.ts`: sin equivalente en el Figma, resuelto con
 * el lenguaje de formulario existente del inspector).
 *
 * Presentation metadata (label, icon, color) lives in
 * src/config/builder-blocks.ts; here only the closed set of valid values
 * for `workflow_nodes.tipo` (mirrored in the `check` constraint de
 * `supabase/migrations/`).
 */
export const BUILDER_NODE_GROUPS = {
  // Un solo bloque de evento, parametrizado desde `config/event-catalog.ts`
  // (dominio → evento → trigger). Antes había 8 tipos de Entrada —
  // `evento_compra`, `entra_segmento`, `canje_cupon`, `fecha_recurrente`,
  // `alta_socio`, `cambio_nivel_entrada`, `devolucion`— que solo se
  // diferenciaban en qué trigger declaraban: cada evento nuevo del catálogo
  // obligaba a un tipo de bloque nuevo, con su `FieldSpec`, su icono y su
  // entrada en el `check` de la tabla. Ahora el evento es DATO, no tipo.
  //
  // `webhook_entrante` se queda aparte porque no es un evento del catálogo
  // de negocio: es una llamada HTTP entrante, con su propia configuración
  // (método esperado, secreto) y sin dominio ni payload declarado.
  entry: ["evento", "webhook_entrante"],
  loyalty: [
    "acumular_puntos",
    "canjear_puntos",
    "cambio_nivel",
    "emitir_cupon",
    "reto",
    "referido",
    "ajustar_puntos",
    // Deshace lo que una orden otorgó cuando esa orden se cae (devolución,
    // cancelación, contracargo). NO lo cubre `ajustar_puntos`: ese resta una
    // cantidad FIJA escrita a mano, sin saber qué otorgó el pedido, sin
    // distinguir puntos canjeables de calificadores, y sin poder ver si un
    // tope truncó el otorgamiento original — con un tope de por medio,
    // revertir un porcentaje del total le cobra al socio puntos que nunca
    // recibió. Ver `engine/reversal.ts`.
    "revertir_beneficios",
  ],
  actions: [
    "email",
    "push",
    "sms_whatsapp",
    "aplicar_promocion",
    "webhook_saliente",
    // Acciones sobre el propio socio, que hasta ahora no se podían hacer
    // desde una regla: sin ellas el builder solo sabía dar beneficios, no
    // dejar constancia de nada en el cliente.
    "actualizar_cliente",
    "cambiar_segmento",
    // Publica un evento al catálogo — lo que permite que una regla despierte
    // a otra sin acoplarlas. El evento emitido es del mismo catálogo que
    // consume el bloque `evento`.
    "emitir_evento",
  ],
  logic: [
    "condicion_multiple",
    "ramificacion_valor",
    "split_ab",
    "esperar",
    "espera_hasta_evento",
    "ventana_horaria",
    "esperar_aprobacion",
    // Reanuda después de un fan-out. Sin él, abrir varias ramas en paralelo
    // no tenía forma de volver a juntarse y el flujo había que escribirlo
    // como cadena secuencial.
    "union",
  ],
  end: ["fin_workflow"],
} as const

export type BuilderNodeGroup = keyof typeof BUILDER_NODE_GROUPS

export const BUILDER_NODE_TYPES = Object.values(BUILDER_NODE_GROUPS).flat()
export type BuilderNodeType = (typeof BUILDER_NODE_TYPES)[number]

// Only one entry node can be active per workflow (explicit Figma rule).
export const BUILDER_ENTRY_NODE_TYPES = BUILDER_NODE_GROUPS.entry

// Output ports per node type — logic nodes branch, the rest don't.
export const BUILDER_LOGIC_NODE_TYPES = BUILDER_NODE_GROUPS.logic

/**
 * Categorías excluidas por reglamento del programa de lealtad (S20 del
 * documento de modalidades de promoción, línea 229): ninguna promoción
 * debería poder aplicar sobre ellas por omisión. Se configuran una vez a
 * nivel de organización en `programa_parametros.exclusiones_reglamento`.
 */
export const REGULATION_EXCLUSIONS = [
  "tabaco",
  "pago_servicios",
  "tarjetas_prepago",
  "recargas",
  "herbalife",
] as const
export type RegulationExclusion = (typeof REGULATION_EXCLUSIONS)[number]

/**
 * Taxonomía de una categoría de catálogo (S11/S23 del documento de
 * modalidades): el selector de condiciones de Promociones solo debe
 * ofrecer categorías `comercial` — la `terapeutica` puede restringir dónde
 * aplica una promoción, pero nunca construir la audiencia.
 */
export const CATEGORY_TAXONOMIES = ["comercial", "terapeutica"] as const
export type CategoryTaxonomy = (typeof CATEGORY_TAXONOMIES)[number]

/**
 * Un límite de promoción (L01–L23 del documento de modalidades) son 4
 * decisiones independientes, no un número y un texto — ver
 * `features/promotions/lib/limits.ts`. Las unidades `dias`/`tickets` no
 * están en el selector que el propio documento propone, pero sí las usan
 * L19–L23 de su tabla; se incluyen aquí para que los 23 límites sean
 * declarables.
 */
export const LIMIT_UNITS = [
  "veces",
  "piezas",
  "monto",
  "puntos",
  "cupones",
  "presupuesto",
  "dias",
  "tickets",
] as const
export type LimitUnit = (typeof LIMIT_UNITS)[number]

export const LIMIT_SUBJECTS = [
  "socio",
  "tarjeta",
  "hogar",
  "ticket",
  "tienda",
  "promocion",
  "contrato",
] as const
export type LimitSubject = (typeof LIMIT_SUBJECTS)[number]

export const LIMIT_WINDOWS = [
  "ticket",
  "dia",
  "semana",
  "mes_calendario",
  "rolling",
  "campana",
  "vida",
] as const
export type LimitWindow = (typeof LIMIT_WINDOWS)[number]

export const LIMIT_EXCESS_BEHAVIORS = [
  "descartar",
  "aplicar_parcial",
  "degradar",
  "encolar",
  "alertar_continuar",
] as const
export type LimitExcessBehavior = (typeof LIMIT_EXCESS_BEHAVIORS)[number]

/**
 * Las 6 naturalezas contables del costo de una promoción (paso
 * "Economía", F01–F12 del documento de modalidades) — cada una mapea a
 * una cuenta contable distinta, ver `COST_NATURE_ACCOUNT_LABEL` en
 * `lib/labels.ts`.
 */
export const COST_NATURES = [
  "margen_sacrificado",
  "costo_producto",
  "saldo_efectivo",
  "ingreso_diferido",
  "costo_tercero",
  "costo_servicio",
] as const
export type CostNature = (typeof COST_NATURES)[number]

/** "¿Quién paga la promoción?" (S06) — los campos de proveedor solo aparecen si no es `retailer`. */
export const FINANCIADORES = [
  "retailer",
  "laboratorio_proveedor",
  "compartido",
  "marca_propia",
] as const
export type Financiador = (typeof FINANCIADORES)[number]

export const SETTLEMENT_PERIODS = [
  "mensual",
  "trimestral",
  "semestral",
  "al_cierre_contrato",
] as const
export type SettlementPeriod = (typeof SETTLEMENT_PERIODS)[number]

/** Tipo de saldo de la mecánica `cashback` — mismo vocabulario que `descuento_porcentual`/`descuento_monto_fijo` (T13). */
export const WALLET_VALUE_TYPES = ["porcentaje", "monto_fijo"] as const
export type WalletValueType = (typeof WALLET_VALUE_TYPES)[number]

/**
 * Cómo se resuelve un `multiplicador_puntos` cuando otro también aplica al
 * mismo SKU (T12) — "exponencial" (se multiplican entre sí) es la opción
 * de mayor riesgo del catálogo según el documento de modalidades, así que
 * nunca es el default.
 */
export const MULTIPLIER_RESOLUTION_MODES = [
  "gana_mayor",
  "exponencial",
] as const
export type MultiplierResolutionMode =
  (typeof MULTIPLIER_RESOLUTION_MODES)[number]

/** Sub-tipo de `envio_gratis` como "beneficio no transaccional" (T17) — el propio mecanismo (elimina costo de envío) es solo uno de los 4. */
export const NON_TRANSACTIONAL_BENEFIT_TYPES = [
  "envio_gratis",
  "servicio",
  "meses_sin_intereses",
  "descuento_aliado",
] as const
export type NonTransactionalBenefitType =
  (typeof NON_TRANSACTIONAL_BENEFIT_TYPES)[number]

/**
 * "¿Qué dispara la regla?" (T23) — enum transversal de 9 valores del
 * documento de modalidades, más amplio que los "4 eventos de vida del
 * socio" que T23 nombra como ejemplo. Declarado y persistido; el disparo
 * real (que algo lo evalúe en el momento del evento) es motor de
 * evaluación, fuera de alcance.
 */
export const TRIGGER_EVENTS = [
  "compra_pagada",
  "devolucion",
  "alta_socio",
  "cumpleanos",
  "cambio_nivel",
  "inactividad",
  "fecha_programada",
  "redencion_cupon",
  "inscripcion_programa",
] as const
export type TriggerEvent = (typeof TRIGGER_EVENTS)[number]

export const TRIGGER_RESOLUTION_MOMENTS = [
  "en_caja",
  "cierre_ticket",
  "proceso_nocturno",
  "al_ocurrir",
] as const
export type TriggerResolutionMoment =
  (typeof TRIGGER_RESOLUTION_MOMENTS)[number]

export const TRIGGER_FREQUENCIES = [
  "cada_vez",
  "una_vez_ano",
  "una_vez_vida",
] as const
export type TriggerFrequency = (typeof TRIGGER_FREQUENCIES)[number]

/**
 * Fase 4 (S01–S25) — reglas de negocio transversales del documento de
 * modalidades. La mayoría son solo la declaración de un campo (crítica
 * por severidad, pero sin una relación que validar); las que sí cruzan
 * campos viven en `refineCompliance` de `features/promotions/schemas.ts`.
 */
export const APPLICATION_LEVELS = ["linea", "ticket"] as const
export type ApplicationLevel = (typeof APPLICATION_LEVELS)[number]

/** S01: sobre qué precio se calcula el descuento — "vigente" es la opción segura (el legado fijo a "lista" duplica el descuento sobre un producto ya rebajado). */
export const PRICE_BASES = ["lista", "vigente"] as const
export type PriceBasis = (typeof PRICE_BASES)[number]

export const BALANCE_TYPES = ["canjeable", "calificador"] as const
export type BalanceType = (typeof BALANCE_TYPES)[number]

export const ACCRUAL_TIMINGS = ["inmediato", "diferido"] as const
export type AccrualTiming = (typeof ACCRUAL_TIMINGS)[number]

export const BALANCE_INITIAL_STATES = ["disponible", "pendiente"] as const
export type BalanceInitialState = (typeof BALANCE_INITIAL_STATES)[number]

export const POINTS_DEBIT_TIMINGS = ["al_emitir", "al_redimir"] as const
export type PointsDebitTiming = (typeof POINTS_DEBIT_TIMINGS)[number]

/**
 * S12: si la promoción puede tocar productos con receta — "permitido" es
 * el default. Sigue siendo una declaración manual del operador a nivel de
 * promoción completa, distinta de la condición `producto_receta`
 * (`CONDITION_FIELDS`) que sí filtra por `productos.requiere_receta` real
 * — ambas conviven a propósito, ver docs/promociones.md §8.
 */
export const RX_APPLICABILITIES = [
  "permitido",
  "revisar",
  "restringido",
] as const
export type RxApplicability = (typeof RX_APPLICABILITIES)[number]

/** S24: qué exige el alta del socio para calificar a un bono por evento. */
export const ENROLLMENT_REQUIREMENTS = [
  "ninguno",
  "perfil_completo",
  "primera_compra",
] as const
export type EnrollmentRequirement = (typeof ENROLLMENT_REQUIREMENTS)[number]

/**
 * Unidad de la ventana de continuidad (`descuento_continuidad`). Se guarda
 * la unidad elegida y no solo su equivalente en días porque "2 meses" y
 * "60 días" no son la misma regla de negocio, aunque hoy se aproximen
 * igual (ver `CONTINUITY_WINDOW_UNIT_DAYS` en
 * `features/promotions/lib/continuity-discount.ts`).
 */
export const CONTINUITY_WINDOW_UNITS = [
  "dias",
  "semanas",
  "meses",
  "bimestres",
] as const
export type ContinuityWindowUnit = (typeof CONTINUITY_WINDOW_UNITS)[number]

/** Vocabulario de `tipo` en `promocion_eventos` — ciclo de vida + canjes, ver comentario de la migración `20260826160000_promociones_eventos.sql`. Los cuatro `aprobacion_*` se añadieron en `20260831090000_promociones_journeys_doble_aprobacion.sql`, mismo criterio que los `approval_*` de `COUPON_EVENT_TYPES`. */
export const PROMOTION_EVENT_TYPES = [
  "creada",
  "editada",
  "activada",
  "inactivada",
  "finalizada",
  "presupuesto_incrementado",
  "presupuesto_agotado",
  "vencida",
  "cancelada",
  "canje",
  "canje_rechazado",
  "aprobacion_solicitada",
  "aprobacion_concedida",
  "aprobacion_rechazada",
  "aprobacion_retirada",
] as const
export type PromotionEventType = (typeof PROMOTION_EVENT_TYPES)[number]

/** Espejo de `COUPON_APPROVAL_STATUSES`, para `promotion_approval`/`workflow_approval` (misma migración). Se mantiene como tupla propia y no reutilizada por cupones — no hay ningún motivo para que un cambio en uno de los tres flujos de aprobación afecte a los otros dos. */
export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

/**
 * Motivo obligatorio al cambiar el estado de una promoción publicada — se
 * guarda en `promocion_eventos.codigo_motivo` y es lo que hace auditable la
 * bitácora ("quién, cuándo y por qué"). `otro` exige además una nota
 * libre en `nota_motivo`.
 */
/**
 * Política de reversión — las 7 decisiones que gobiernan qué hacer cuando la
 * orden que disparó una regla se cae (devolución, cancelación, contracargo).
 *
 * Viven a nivel de REGLA y no de bloque: «qué hago si la orden que me
 * disparó se cae» no lo puede contestar ningún nodo por separado. Se
 * resuelven en cascada **global → regla → nodo** (ver
 * `features/builder/engine/reversal.ts`), donde el nivel global es una regla
 * de ámbito `global` cuya política heredan todas las demás.
 */

/**
 * Cómo se calcula cuánto quitar en una devolución parcial.
 *
 * `recalculo` es el default y no `proporcional`: con un tope o un umbral de
 * por medio, repartir un porcentaje del total le cobra al socio puntos que
 * sigue mereciendo. Sin tope ni umbral las dos bases dan el mismo número, así
 * que elegir la correcta no cuesta nada.
 */
export const REVERSAL_BASES = ["proporcional", "recalculo"] as const
export type ReversalBase = (typeof REVERSAL_BASES)[number]

/** Qué hacer cuando la devolución rompe el umbral que habilitaba el beneficio. */
export const REVERSAL_THRESHOLD_ACTIONS = ["revertir_todo", "mantener"] as const
export type ReversalThresholdAction =
  (typeof REVERSAL_THRESHOLD_ACTIONS)[number]

/**
 * Qué hacer cuando el socio ya gastó los puntos que hay que quitarle.
 *
 * `permitir_negativo` es el default por uniformidad: absorber regala dinero
 * sin registro y bloquear frena la operación de caja. Un socio con deuda y
 * uno al que se le perdonó no son lo mismo, por eso son valores distintos.
 */
export const REVERSAL_SHORT_BALANCE_ACTIONS = [
  "permitir_negativo",
  "topar_en_cero",
  "deuda_futura",
  "bloquear",
] as const
export type ReversalShortBalance =
  (typeof REVERSAL_SHORT_BALANCE_ACTIONS)[number]

/** Cuándo se recalcula el nivel tras mover los puntos. Espeja `permitir_descenso`/`periodo_gracia_dias` del bloque `cambio_nivel`. */
export const REVERSAL_LEVEL_EFFECTS = [
  "recalcular_inmediato",
  "cierre_periodo",
  "mantener_gracia",
] as const
export type ReversalLevelEffect = (typeof REVERSAL_LEVEL_EFFECTS)[number]

/** Clases de beneficio que un paso de reversión puede tocar. Sin declararlas, un bloque suelto deshace todo lo que encuentra y el contra-flujo deja de ser auditable. */
export const REVERSAL_CLASSES = [
  "puntos",
  "cupones",
  "nivel",
  "monedero",
] as const
export type ReversalClass = (typeof REVERSAL_CLASSES)[number]

export type ReversalPolicy = {
  base: ReversalBase
  umbralRoto: ReversalThresholdAction
  saldoInsuficiente: ReversalShortBalance
  efectoNivel: ReversalLevelEffect
  /** Días desde la compra dentro de los que se revierte. */
  ventanaDias: number
  /** Si el motivo es producto defectuoso, no se castiga al socio. */
  exentoPorDefecto: boolean
  clases: readonly ReversalClass[]
}

/**
 * Ámbito de una regla del builder.
 *
 * `global` es la que define qué hacer con cualquier orden del programa; su
 * política la heredan todas las de ámbito `journey`, que solo la
 * sobreescriben cuando de verdad difieren. Por defecto todo workflow es
 * `journey`, así que los existentes no cambian de comportamiento.
 */
export const WORKFLOW_SCOPES = ["journey", "global"] as const
export type WorkflowScope = (typeof WORKFLOW_SCOPES)[number]

/**
 * Canales por los que puede llegar la caída de una orden. Cada uno con su
 * latencia, su nivel de detalle y su propia costumbre de reintentar — ver
 * las reglas de ingesta.
 *
 * Invariante que sostiene el modelo: **cada canal en exactamente una regla
 * activa**. Sin cubrir se pierde la orden; en dos, se procesa dos veces.
 */
export const REVERSAL_CHANNELS = [
  "pos",
  "erp",
  "ecommerce",
  "call_center",
] as const
export type ReversalChannel = (typeof REVERSAL_CHANNELS)[number]

export const REVERSAL_CHANNEL_LABEL: Record<ReversalChannel, string> = {
  pos: "POS",
  erp: "ERP",
  ecommerce: "Ecommerce",
  call_center: "Call center",
}

/**
 * Por qué cambió de estado. Es lo que hace auditable la bitácora —quién,
 * cuándo y por qué—, así que no hay cambio de estado sin uno. `otro` exige
 * nota (ver `STATUS_CHANGE_REASONS_REQUIRING_NOTE`).
 *
 * Compartido por promociones y por las reglas del builder, misma razón que
 * `PUBLICATION_STATUSES`.
 */
export const STATUS_CHANGE_REASONS = [
  "decision_comercial",
  "presupuesto",
  "error_configuracion",
  "bajo_rendimiento",
  "fin_de_campana",
  "otro",
] as const
export type StatusChangeReason = (typeof STATUS_CHANGE_REASONS)[number]

/** El único motivo que no se explica solo. */
export const STATUS_CHANGE_REASONS_REQUIRING_NOTE: readonly StatusChangeReason[] =
  ["otro"]

export const PROMOTION_STATUS_CHANGE_REASONS = STATUS_CHANGE_REASONS
export type PromotionStatusChangeReason = StatusChangeReason

/**
 * Por qué se aprobó o se rechazó una solicitud de doble aprobación. Distinto
 * de `STATUS_CHANGE_REASONS`, que explica por qué se PIDE publicar: aquí lo
 * que se justifica es la decisión de otra persona, y una nota libre no basta
 * para poder agrupar ni filtrar el historial después.
 *
 * Una sola tupla porque una sola columna (`codigo_decision`) guarda las dos
 * decisiones — refleja exactamente su `check`. Los subconjuntos de abajo son
 * los que cada diálogo ofrece: aprobar «por error de configuración» no
 * significa nada, y rechazar «porque cumple la política», tampoco.
 *
 * Compartido por promociones, reglas y cupones: las tres tablas de
 * aprobación tienen la columna y el mismo `check`.
 */
export const DECISION_REASONS = [
  "cumple_politica",
  "urgencia_comercial",
  "revisado_con_solicitante",
  "error_configuracion",
  "fuera_de_politica",
  "presupuesto",
  "requiere_ajustes",
  "otro",
] as const
export type DecisionReason = (typeof DECISION_REASONS)[number]

export const APPROVAL_REASONS: readonly DecisionReason[] = [
  "cumple_politica",
  "urgencia_comercial",
  "revisado_con_solicitante",
  "otro",
]

export const REJECTION_REASONS: readonly DecisionReason[] = [
  "error_configuracion",
  "fuera_de_politica",
  "presupuesto",
  "requiere_ajustes",
  "otro",
]

/** Mismo criterio que `STATUS_CHANGE_REASONS_REQUIRING_NOTE`. */
export const DECISION_REASONS_REQUIRING_NOTE: readonly DecisionReason[] = [
  "otro",
]

export const PROMOTION_EVENT_ACTOR_TYPES = [
  "usuario",
  "sistema",
  "regla",
  "tienda",
] as const
export type PromotionEventActorType =
  (typeof PROMOTION_EVENT_ACTOR_TYPES)[number]

// 12 · Integraciones — dirección de una conexión respecto al catálogo
// estático (`src/config/integrations-catalog.ts`: SOURCES/DESTINATIONS).
export const INTEGRATION_CONNECTION_DIRECTIONS = ["origen", "destino"] as const
export type IntegrationConnectionDirection =
  (typeof INTEGRATION_CONNECTION_DIRECTIONS)[number]

export const INTEGRATION_CONNECTION_STATUSES = [
  "activa",
  "con_error",
  "pausada",
] as const
export type IntegrationConnectionStatus =
  (typeof INTEGRATION_CONNECTION_STATUSES)[number]

// Método de autenticación de una conexión — deriva del campo `method` de
// cada integración en el catálogo estático (ver comentario de cabecera de
// `supabase/migrations/20260831110000_integraciones_conexiones.sql`).
export const INTEGRATION_AUTH_TYPES = [
  "oauth2",
  "api_key",
  "app_key_token",
  "token_personal",
  "token_integracion",
  "certificado",
  "usuario_tecnico",
] as const
export type IntegrationAuthType = (typeof INTEGRATION_AUTH_TYPES)[number]
