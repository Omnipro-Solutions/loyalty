import { z } from "zod"

import {
  ALCANCE_CANALES,
  APLICAR_SOBRE_OPCIONES,
  COMBINADORES_CONDICION,
  ESTADOS_PUBLICACION_PROMOCION,
  TIPOS_BENEFICIO,
  TIPOS_PROMOCION,
  USOS_PERIODOS,
} from "@/types/domain"

const condicionSchema = z.discriminatedUnion("campo", [
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

export const promocionSchema = z.object({
  nombre: z.string().min(3, "Ingresa el nombre de la promoción"),
  codigo: z
    .string()
    .min(3, "Ingresa un código")
    .regex(/^[A-Z0-9-]+$/, "Solo mayúsculas, números y guiones"),
  tipo: z.enum(TIPOS_PROMOCION),
  prioridad: z.number().int().min(1).max(10),
  acumulable: z.boolean(),
  canalAplicacion: z.enum(ALCANCE_CANALES),
  combinadorCondiciones: z.enum(COMBINADORES_CONDICION),
  condiciones: z.array(condicionSchema).max(8),
  tipoBeneficio: z.enum(TIPOS_BENEFICIO),
  valorBeneficio: z.number().positive("Ingresa un valor mayor a 0"),
  topeMaximo: z.number().positive().optional(),
  aplicarSobre: z.enum(APLICAR_SOBRE_OPCIONES),
  usosPorCliente: z.number().int().positive().optional(),
  usosPeriodo: z.enum(USOS_PERIODOS).optional(),
  presupuestoAsignado: z.number().nonnegative(),
  vigenteDesde: z.string().min(1, "Elige la fecha de inicio"),
  vigenteHasta: z.string().optional(),
  estadoPublicacion: z.enum(ESTADOS_PUBLICACION_PROMOCION),
})

export type PromocionValues = z.infer<typeof promocionSchema>
export type CondicionValues = z.infer<typeof condicionSchema>

export const actualizarPromocionSchema = promocionSchema.extend({
  id: z.string().uuid(),
})

export const simularPromocionSchema = z.object({
  idExcluir: z.string().uuid().optional(),
  condiciones: z.array(condicionSchema),
  canalAplicacion: z.enum(ALCANCE_CANALES),
  prioridad: z.number().int().min(1).max(10),
})
