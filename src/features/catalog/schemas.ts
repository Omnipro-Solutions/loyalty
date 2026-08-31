import { z } from "zod"

import { PRODUCT_STATUSES } from "@/types/domain"

/** Filtros del listado (03.1), sin `page`/`pageSize` — comparte
 *  `previewProductsExportAction` (conteo) y `exportProductsAction`
 *  (además valida `columns`). */
export const catalogExportFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
})
export type CatalogExportFiltersInput = z.infer<
  typeof catalogExportFiltersSchema
>

/** `columns`: keys de `PRODUCTS_EXPORT_COLUMN_OPTIONS` marcadas en el diálogo — vacío exporta todas. */
export const exportProductsSchema = catalogExportFiltersSchema.extend({
  columns: z.array(z.string()).optional(),
})
