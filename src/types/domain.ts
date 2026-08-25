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

// Field of an IF condition (07.1 "Condiciones (SI)"). All 4 now have a real
// table — 'categoria'/'tienda' from the start, 'segmento' since 11 ·
// Audiencias (`segments`), and 'monto_carrito' since `pedidos` exists — the
// creation form lets you add all 4.
export const CONDITION_FIELDS = [
  "categoria",
  "tienda",
  "segmento",
  "monto_carrito",
] as const
export type ConditionField = (typeof CONDITION_FIELDS)[number]

/** Gradual rollout mechanism (not every field had a real table from day 1) — today all 4 are enabled, kept in case a new field is added before it has a data source. */
export const ENABLED_CONDITION_FIELDS: readonly ConditionField[] =
  CONDITION_FIELDS

export const CONDITION_COMBINATORS = ["todas", "alguna"] as const
export type ConditionCombinator = (typeof CONDITION_COMBINATORS)[number]

// Reward benefit type (07.1 "Recompensa (ENTONCES)" → "Tipo de beneficio").
export const BENEFIT_TYPES = [
  "descuento_porcentual",
  "descuento_monto_fijo",
  "envio_gratis",
  "producto_gratis",
  "precio_fijo_bundle",
] as const
export type BenefitType = (typeof BENEFIT_TYPES)[number]

export const APPLY_TO_OPTIONS = [
  "subtotal_carrito",
  "producto",
  "envio",
] as const
export type ApplyTo = (typeof APPLY_TO_OPTIONS)[number]

export const USAGE_PERIODS = ["sin_limite", "dia", "semana", "mes"] as const
export type UsagePeriod = (typeof USAGE_PERIODS)[number]

// Publication flag (07.1 "Guardar y activar" / "Guardar como borrador"). The
// status shown in the listing (Activa/Programada/Finalizada) is computed by
// crossing this with vigente_desde/vigente_hasta — see
// `features/promotions/lib/status.ts` — instead of being stored separately.
export const PROMOTION_PUBLICATION_STATUSES = ["borrador", "activa"] as const
export type PromotionPublicationStatus =
  (typeof PROMOTION_PUBLICATION_STATUSES)[number]

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

export const WORKFLOW_STATUSES = [
  "borrador",
  "publicado",
  "pausado",
  "archivado",
] as const
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number]

export const WORKFLOW_RUN_TYPES = ["simulacion", "publicacion"] as const
export type WorkflowRunType = (typeof WORKFLOW_RUN_TYPES)[number]

export const WORKFLOW_RUN_STATUSES = [
  "en_progreso",
  "completado",
  "con_errores",
] as const
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number]

/**
 * Catalog of 19 Loyalty Builder block types, in 5 groups (Figma
 * "08.4 · Loyalty builder · catálogo de bloques"). Presentation metadata
 * (label, icon, color) lives in src/config/builder-blocks.ts; here only the
 * closed set of valid values for `workflow_nodes.tipo`.
 */
export const BUILDER_NODE_GROUPS = {
  entry: [
    "evento_compra",
    "entra_segmento",
    "canje_cupon",
    "fecha_recurrente",
    "alta_socio",
  ],
  loyalty: [
    "acumular_puntos",
    "canjear_puntos",
    "cambio_nivel",
    "emitir_cupon",
    "reto",
    "referido",
  ],
  actions: ["email", "push", "sms_whatsapp", "aplicar_promocion"],
  logic: ["condicion_multiple", "ramificacion_valor", "split_ab", "esperar"],
  end: ["fin_workflow"],
} as const

export type BuilderNodeGroup = keyof typeof BUILDER_NODE_GROUPS

export const BUILDER_NODE_TYPES = Object.values(BUILDER_NODE_GROUPS).flat()
export type BuilderNodeType = (typeof BUILDER_NODE_TYPES)[number]

// Only one entry node can be active per workflow (explicit Figma rule).
export const BUILDER_ENTRY_NODE_TYPES = BUILDER_NODE_GROUPS.entry

// Output ports per node type — logic nodes branch, the rest don't.
export const BUILDER_LOGIC_NODE_TYPES = BUILDER_NODE_GROUPS.logic
