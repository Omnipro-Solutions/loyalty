import { z } from "zod"

import { STORE_STATUSES, STORE_FORMATS } from "@/types/domain"

export const storeSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre de la tienda"),
  storeCode: z.string().min(2, "Ingresa el código de tienda"),
  format: z.enum(STORE_FORMATS),
  status: z.enum(STORE_STATUSES),
  groupId: z.string().uuid("Elige un grupo de tienda"),
  country: z.string().min(2, "Ingresa el país"),
  region: z.string().min(2, "Ingresa el departamento o estado"),
  city: z.string().min(2, "Ingresa la ciudad"),
  neighborhood: z.string().min(2, "Ingresa la colonia o barrio"),
  address: z.string().min(3, "Ingresa la calle y número"),
  postalCode: z.string().min(3, "Ingresa el código postal"),
  reference: z.string().optional(),
  phone: z.string().min(7, "Ingresa un número de contacto"),
  email: z.string().email("Correo inválido"),
  manager: z.string().optional(),
  timezone: z.string().optional(),
})

export type StoreValues = z.infer<typeof storeSchema>

export const updateStoreSchema = storeSchema.extend({
  id: z.string().uuid(),
})

/** Diálogo de gestión de grupos de tienda (`StoreGroupsDialog`) — sin nodo de Figma, feature nueva. */
export const storeGroupSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre del grupo"),
  description: z.string().optional(),
})

export type StoreGroupValues = z.infer<typeof storeGroupSchema>

export const updateStoreGroupSchema = storeGroupSchema.extend({
  id: z.string().uuid(),
})

export const deleteStoreGroupSchema = z.object({
  id: z.string().uuid(),
})

/** Filtros del listado (04.1), sin `page`/`pageSize` — comparte
 *  `previewStoresExportAction` (conteo) y `exportStoresAction` (además
 *  valida `columns`). `city` no tiene un enum cerrado (viene de
 *  `listCities()`, dinámico), así que se queda como string libre. */
export const storesExportFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  city: z.string().max(200).optional(),
  format: z.enum(STORE_FORMATS).optional(),
})
export type StoresExportFiltersInput = z.infer<typeof storesExportFiltersSchema>

/** `columns`: keys de `STORES_EXPORT_COLUMN_OPTIONS` marcadas en el diálogo — vacío exporta todas. */
export const exportStoresSchema = storesExportFiltersSchema.extend({
  columns: z.array(z.string()).optional(),
})
