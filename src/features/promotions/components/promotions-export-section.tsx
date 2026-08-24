import { ExportPromotionsButton } from "./export-promotions-button"
import type { Promotion } from "../lib/queries"

type PromotionsExportSectionProps = {
  promotionsPromise: Promise<{ promotions: Promotion[]; total: number }>
}

/** Comparte la promesa con `PromotionsTableSection`: una sola consulta a `listPromotions`. Sin key — solo espera, no necesita remontarse. */
export async function PromotionsExportSection({
  promotionsPromise,
}: PromotionsExportSectionProps) {
  const { promotions } = await promotionsPromise
  return <ExportPromotionsButton promotions={promotions} />
}
