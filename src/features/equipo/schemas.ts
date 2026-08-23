import { z } from "zod"

import { ACTIONS, RESOURCES } from "@/lib/permissions"
import { CHANNEL_SCOPES, STORE_SCOPES, ROLES } from "@/types/domain"

const permisoSchema = z.object({
  recurso: z.enum(RESOURCES),
  accion: z.enum(ACTIONS),
})

export const crearRolSchema = z.object({
  nombre: z.string().min(2, "Ingresa el nombre del rol"),
  descripcion: z.string().optional(),
  rolBase: z.enum(ROLES),
  alcanceTiendas: z.enum(STORE_SCOPES),
  alcanceCanal: z.enum(CHANNEL_SCOPES),
  descuentoMaximoPct: z.coerce.number().int().min(0).max(100).optional(),
})

export type CrearRolValues = z.infer<typeof crearRolSchema>

export const actualizarRolSchema = z.object({
  roleId: z.string().uuid(),
  nombre: z.string().min(2, "Ingresa el nombre del rol"),
  descripcion: z.string().optional(),
  alcanceTiendas: z.enum(STORE_SCOPES),
  alcanceCanal: z.enum(CHANNEL_SCOPES),
  descuentoMaximoPct: z.coerce.number().int().min(0).max(100).optional(),
  permisos: z.array(permisoSchema),
})

export type ActualizarRolValues = z.infer<typeof actualizarRolSchema>

export const duplicarRolSchema = z.object({
  roleId: z.string().uuid(),
  nombre: z.string().min(2, "Ingresa el nombre del rol"),
})

export const invitarUsuarioSchema = z.object({
  email: z.string().email("Correo inválido"),
  roleId: z.string().uuid("Selecciona un rol"),
  tiendaId: z.string().uuid().optional(),
})

export type InvitarUsuarioValues = z.infer<typeof invitarUsuarioSchema>

export const cancelarInvitacionSchema = z.object({
  invitacionId: z.string().uuid(),
})
