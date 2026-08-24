import { ExportAudiencesButton } from "./export-audiences-button"
import type { AudienceListItem } from "../lib/queries"

type AudiencesExportSectionProps = {
  audiencesPromise: Promise<{ audiences: AudienceListItem[]; total: number }>
}

/** Comparte la promesa con `AudiencesCount`/`AudiencesTableSection`. Sin key — solo espera, no necesita remontarse. */
export async function AudiencesExportSection({
  audiencesPromise,
}: AudiencesExportSectionProps) {
  const { audiences } = await audiencesPromise
  return <ExportAudiencesButton audiences={audiences} />
}
