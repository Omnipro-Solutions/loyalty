import { z } from "zod"

import { AUDIENCES_SORTS } from "./lib/sort"

/** Filtros del listado (11.1), sin `page`/`pageSize` — comparte
 *  `previewAudiencesExportAction` (conteo) y `exportAudiencesAction`
 *  (además valida `columns`). Incluye `sort`/`dir`: a diferencia del resto
 *  de features, el orden de audiencias se calcula en JS (`collectAudiences`,
 *  `lib/queries.ts`), así que el CSV necesita el mismo criterio que la
 *  pantalla para salir en el mismo orden. */
export const audiencesExportFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  sort: z.enum(AUDIENCES_SORTS).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
})
export type AudiencesExportFiltersInput = z.infer<
  typeof audiencesExportFiltersSchema
>

/** `columns`: keys de `AUDIENCES_EXPORT_COLUMN_OPTIONS` marcadas en el diálogo — vacío exporta todas. */
export const exportAudiencesSchema = audiencesExportFiltersSchema.extend({
  columns: z.array(z.string()).optional(),
})
