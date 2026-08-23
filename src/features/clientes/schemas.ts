import { z } from "zod"

import {
  ACQUISITION_CHANNELS,
  DOCUMENT_TYPES,
  MARITAL_STATUSES,
  GENDERS,
  LANGUAGES,
  MEMBER_STATUSES,
} from "@/types/domain"

export const clienteSchema = z.object({
  nombre: z.string().min(2, "Ingresa el nombre"),
  apellido: z.string().min(2, "Ingresa el apellido"),
  email: z.string().email("Correo inválido"),
  telefono: z.string().optional(),
  tipoDocumento: z.enum(DOCUMENT_TYPES).optional(),
  numeroDocumento: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  genero: z.enum(GENDERS).optional(),
  provincia: z.string().optional(),
  estadoCivil: z.enum(MARITAL_STATUSES).optional(),
  preferenciaCompra: z.string().optional(),
  tieneHijos: z.boolean().optional(),
  tieneMascotas: z.boolean().optional(),
  consentimientoMarketing: z.boolean(),
  canalAdquisicion: z.enum(ACQUISITION_CHANNELS).optional(),
  estadoCuenta: z.enum(MEMBER_STATUSES),
  tiendaInscripcionId: z.string().uuid().optional(),
  idioma: z.enum(LANGUAGES),
  tierId: z.string().uuid().optional(),
})

export type ClienteValues = z.infer<typeof clienteSchema>

export const actualizarClienteSchema = clienteSchema.extend({
  id: z.string().uuid(),
})
