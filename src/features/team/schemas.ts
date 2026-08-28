import { z } from "zod"

import { ACTIONS, RESOURCES } from "@/lib/permissions"
import {
  CHANNEL_SCOPES,
  PROFILE_STATUSES,
  STORE_SCOPES,
  ROLES,
} from "@/types/domain"

const permissionSchema = z.object({
  resource: z.enum(RESOURCES),
  action: z.enum(ACTIONS),
})

export const createRoleSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre del rol"),
  description: z.string().optional(),
  baseRole: z.enum(ROLES),
  storeScope: z.enum(STORE_SCOPES),
  channelScope: z.enum(CHANNEL_SCOPES),
  maxDiscountPct: z.coerce.number().int().min(0).max(100).optional(),
})

export type CreateRoleValues = z.infer<typeof createRoleSchema>

export const updateRoleSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().min(2, "Ingresa el nombre del rol"),
  description: z.string().optional(),
  storeScope: z.enum(STORE_SCOPES),
  channelScope: z.enum(CHANNEL_SCOPES),
  maxDiscountPct: z.coerce.number().int().min(0).max(100).optional(),
  permissions: z.array(permissionSchema),
})

export type UpdateRoleValues = z.infer<typeof updateRoleSchema>

export const duplicateRoleSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().min(2, "Ingresa el nombre del rol"),
})

export const inviteUserSchema = z.object({
  email: z.string().email("Correo inválido"),
  roleId: z.string().uuid("Selecciona un rol"),
  storeId: z.string().uuid().optional(),
})

export type InviteUserValues = z.infer<typeof inviteUserSchema>

export const cancelInvitationSchema = z.object({
  invitationId: z.string().uuid(),
})

export const sendUserPasswordResetSchema = z.object({
  profileId: z.string().uuid(),
})

export const updateUserAccessSchema = z.object({
  profileId: z.string().uuid(),
  roleId: z.string().uuid("Selecciona un rol"),
  storeId: z.string().uuid().optional(),
})

export type UpdateUserAccessValues = z.infer<typeof updateUserAccessSchema>

export const setUserStatusSchema = z.object({
  profileId: z.string().uuid(),
  status: z.enum(PROFILE_STATUSES),
})

export const resetUserMfaSchema = z.object({
  profileId: z.string().uuid(),
})

export const revokeUserDevicesSchema = z.object({
  profileId: z.string().uuid(),
})
