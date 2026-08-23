import { z } from "zod"

import { TIENDA_ESTADOS, TIENDA_FORMATOS } from "@/types/domain"

export const tiendaSchema = z.object({
  nombre: z.string().min(2, "Ingresa el nombre de la tienda"),
  codigoTienda: z.string().min(2, "Ingresa el código de tienda"),
  formato: z.enum(TIENDA_FORMATOS),
  estado: z.enum(TIENDA_ESTADOS),
  pais: z.string().min(2, "Ingresa el país"),
  region: z.string().min(2, "Ingresa el departamento o estado"),
  ciudad: z.string().min(2, "Ingresa la ciudad"),
  colonia: z.string().min(2, "Ingresa la colonia o barrio"),
  direccion: z.string().min(3, "Ingresa la calle y número"),
  codigoPostal: z.string().min(3, "Ingresa el código postal"),
  referencia: z.string().optional(),
  telefono: z.string().min(7, "Ingresa un número de contacto"),
  email: z.string().email("Correo inválido"),
  responsable: z.string().optional(),
  zonaHoraria: z.string().optional(),
})

export type TiendaValues = z.infer<typeof tiendaSchema>

export const actualizarTiendaSchema = tiendaSchema.extend({
  id: z.string().uuid(),
})
