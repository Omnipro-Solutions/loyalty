import { z } from "zod"

import {
  CHANNEL_SCOPES,
  APPLY_TO_OPTIONS,
  CONDITION_COMBINATORS,
  DISCOUNT_VALUE_TYPES,
  ESCALONADO_BASES,
  NXM_SCOPES,
  POINTS_MODES,
  PROMOTION_PUBLICATION_STATUSES,
  BENEFIT_TYPES,
  PROMOTION_TYPES,
  USAGE_PERIODS,
} from "@/types/domain"

const conditionSchema = z.discriminatedUnion("campo", [
  z.object({
    campo: z.literal("categoria"),
    valor: z.array(z.string().uuid()).min(1, "Elige al menos una categoría"),
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
])

export const promotionSchema = z.object({
  name: z.string().min(3, "Ingresa el nombre de la promoción"),
  code: z
    .string()
    .min(3, "Ingresa un código")
    .regex(/^[A-Z0-9-]+$/, "Solo mayúsculas, números y guiones"),
  type: z.enum(PROMOTION_TYPES),
  priority: z.number().int().min(1).max(10),
  stackable: z.boolean(),
  channelScope: z.enum(CHANNEL_SCOPES),
  conditionCombinator: z.enum(CONDITION_COMBINATORS),
  conditions: z.array(conditionSchema).max(8),
  benefitType: z.enum(BENEFIT_TYPES),
  benefitValue: z.number().positive("Ingresa un valor mayor a 0"),
  maxCap: z.number().positive().optional(),
  applyTo: z.enum(APPLY_TO_OPTIONS),
  usesPerMember: z.number().int().positive().optional(),
  usagePeriod: z.enum(USAGE_PERIODS).optional(),
  assignedBudget: z.number().nonnegative(),
  validFrom: z.string().min(1, "Elige la fecha de inicio"),
  validUntil: z.string().optional(),
  publicationStatus: z.enum(PROMOTION_PUBLICATION_STATUSES),
})

export type PromotionValues = z.infer<typeof promotionSchema>
export type ConditionValues = z.infer<typeof conditionSchema>

export const updatePromotionSchema = promotionSchema.extend({
  id: z.string().uuid(),
})

export const simulatePromotionSchema = z.object({
  excludeId: z.string().uuid().optional(),
  conditions: z.array(conditionSchema),
  channelScope: z.enum(CHANNEL_SCOPES),
  priority: z.number().int().min(1).max(10),
})

export const tierSchema = z.object({
  desde: z.number().nonnegative(),
  tipoDescuento: z.enum(DISCOUNT_VALUE_TYPES),
  valor: z.number().positive(),
})

export type TierValues = z.infer<typeof tierSchema>

/** Recompensa (ENTONCES) del wizard nuevo — reemplaza `benefitType`/`benefitValue` planos, ver `features/promotions/lib/mechanics.ts`. */
export const rewardSchema = z.discriminatedUnion("mecanica", [
  z.object({
    mecanica: z.literal("descuento"),
    tipoDescuento: z.enum(DISCOUNT_VALUE_TYPES),
    valor: z.number().positive("Ingresa un valor mayor a 0"),
    topeMaximo: z.number().positive().optional(),
    aplicarSobre: z.enum(APPLY_TO_OPTIONS),
  }),
  z.object({
    mecanica: z.literal("escalonado"),
    base: z.enum(ESCALONADO_BASES),
    tramos: z.array(tierSchema).min(2, "Agrega al menos 2 tramos"),
  }),
  z.object({
    mecanica: z.literal("puntos"),
    modo: z.enum(POINTS_MODES),
    valor: z.number().positive("Ingresa un valor mayor a 0"),
  }),
  z.object({
    mecanica: z.literal("nxm"),
    llevaN: z.number().int().min(2),
    pagaM: z.number().int().min(1),
    aplicarA: z.enum(NXM_SCOPES),
  }),
  z.object({
    mecanica: z.literal("cupon"),
    tipoDescuento: z.enum(DISCOUNT_VALUE_TYPES),
    valor: z.number().positive("Ingresa un valor mayor a 0"),
    vigenciaDias: z.number().int().positive(),
  }),
])

export type RewardValues = z.infer<typeof rewardSchema>
