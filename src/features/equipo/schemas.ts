import { z } from "zod"

import { ACCIONES, RECURSOS } from "@/lib/permissions"
import { ALCANCE_CANALES, ALCANCE_TIENDAS, ROLES } from "@/types/domain"

const permisoSchema = z.object({
  recurso: z.enum(RECURSOS),
  accion: z.enum(ACCIONES),
})

export const crearRolSchema = z.object({
  nombre: z.string().min(2, "Ingresa el nombre del rol"),
  descripcion: z.string().optional(),
  rolBase: z.enum(ROLES),
  alcanceTiendas: z.enum(ALCANCE_TIENDAS),
  alcanceCanal: z.enum(ALCANCE_CANALES),
  descuentoMaximoPct: z.coerce.number().int().min(0).max(100).optional(),
})

export type CrearRolValues = z.infer<typeof crearRolSchema>

export const actualizarRolSchema = z.object({
  roleId: z.string().uuid(),
  nombre: z.string().min(2, "Ingresa el nombre del rol"),
  descripcion: z.string().optional(),
  alcanceTiendas: z.enum(ALCANCE_TIENDAS),
  alcanceCanal: z.enum(ALCANCE_CANALES),
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
