import { z } from "zod"

import {
  ACQUISITION_CHANNELS,
  DOCUMENT_TYPES,
  MARITAL_STATUSES,
  GENDERS,
  LANGUAGES,
  MEMBER_SEARCH_SCOPES,
  MEMBER_STATUSES,
} from "@/types/domain"

export const memberSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre"),
  lastName: z.string().min(2, "Ingresa el apellido"),
  email: z.string().email("Correo inválido"),
  phone: z.string().optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  documentNumber: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(GENDERS).optional(),
  province: z.string().optional(),
  maritalStatus: z.enum(MARITAL_STATUSES).optional(),
  purchasePreference: z.string().optional(),
  hasChildren: z.boolean().optional(),
  hasPets: z.boolean().optional(),
  marketingConsent: z.boolean(),
  acquisitionChannel: z.enum(ACQUISITION_CHANNELS).optional(),
  accountStatus: z.enum(MEMBER_STATUSES),
  enrollmentStoreId: z.string().uuid().optional(),
  language: z.enum(LANGUAGES),
  tierId: z.string().uuid().optional(),
})

export type MemberValues = z.infer<typeof memberSchema>

export const updateMemberSchema = memberSchema.extend({
  id: z.string().uuid(),
})

/** "Enviar promoción" del Hero — asignación manual, no un canje real (ver `member_promociones`). */
export const assignPromotionSchema = z.object({
  memberId: z.string().uuid(),
  promotionId: z.string().uuid(),
  note: z.string().max(280).optional(),
})

/** "Aplicar regla" del Hero — ajuste manual de puntos (único alcance real hoy, ver plan de la tarea). */
export const pointsAdjustmentSchema = z.object({
  memberId: z.string().uuid(),
  direction: z.enum(["otorgar", "restar"]),
  amount: z.number().int().positive(),
  reason: z.string().min(1, "Elige un motivo").max(120),
})

/**
 * Filtros del listado (05.1), sin `page`/`pageSize` — "Exportar" siempre pide
 * el universo completo, así que la paginación no aplica en esta ruta. Sin
 * `satisfies z.ZodType<MemberExportFilters>`: forzaría a este archivo (lo
 * importa react-hook-form en el cliente) a depender de `lib/queries.ts`, que
 * importa `lib/supabase/server.ts` — la llamada `listAllMembers(parsedInput)`
 * en la action ya es una comprobación de tipos equivalente. La comparte
 * `previewMembersAction` (conteo antes de exportar, `ExportDialog`) y
 * `exportMembersAction` (que además valida `columns`).
 */
export const memberExportFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  searchScope: z.enum(MEMBER_SEARCH_SCOPES).optional(),
  tierId: z.string().uuid().optional(),
  accountStatus: z.enum(MEMBER_STATUSES).optional(),
})
export type MemberExportFiltersInput = z.infer<typeof memberExportFiltersSchema>

/** `columns`: keys de `MEMBERS_EXPORT_COLUMN_OPTIONS` marcadas en el diálogo
 *  — vacío o ausente exporta todas (`pickColumns`, `@/lib/csv`). */
export const exportMembersSchema = memberExportFiltersSchema.extend({
  columns: z.array(z.string()).optional(),
})
