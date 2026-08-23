import { z } from "zod"

import {
  ACQUISITION_CHANNELS,
  DOCUMENT_TYPES,
  MARITAL_STATUSES,
  GENDERS,
  LANGUAGES,
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
