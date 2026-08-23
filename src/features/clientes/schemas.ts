import { z } from "zod"

import {
  CANALES_ADQUISICION,
  DOCUMENTO_TIPOS,
  ESTADOS_CIVILES,
  GENEROS,
  IDIOMAS,
  MEMBER_ESTADOS,
} from "@/types/domain"

export const clienteSchema = z.object({
  nombre: z.string().min(2, "Ingresa el nombre"),
  apellido: z.string().min(2, "Ingresa el apellido"),
  email: z.string().email("Correo inválido"),
  telefono: z.string().optional(),
  tipoDocumento: z.enum(DOCUMENTO_TIPOS).optional(),
  numeroDocumento: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  genero: z.enum(GENEROS).optional(),
  provincia: z.string().optional(),
  estadoCivil: z.enum(ESTADOS_CIVILES).optional(),
  preferenciaCompra: z.string().optional(),
  tieneHijos: z.boolean().optional(),
  tieneMascotas: z.boolean().optional(),
  consentimientoMarketing: z.boolean(),
  canalAdquisicion: z.enum(CANALES_ADQUISICION).optional(),
  estadoCuenta: z.enum(MEMBER_ESTADOS),
  tiendaInscripcionId: z.string().uuid().optional(),
  idioma: z.enum(IDIOMAS),
  tierId: z.string().uuid().optional(),
})

export type ClienteValues = z.infer<typeof clienteSchema>

export const actualizarClienteSchema = clienteSchema.extend({
  id: z.string().uuid(),
})
