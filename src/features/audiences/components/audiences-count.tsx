import { Skeleton } from "@/components/feedback/skeleton"
import { formatNumber } from "@/lib/format"

import type { AudienceListItem } from "../lib/queries"

type AudiencesCountProps = {
  audiencesPromise: Promise<{ audiences: AudienceListItem[]; total: number }>
}

/** Comparte la promesa con `AudiencesTableSection`: una sola consulta a `listAudiences`. */
export async function AudiencesCount({
  audiencesPromise,
}: AudiencesCountProps) {
  const { total } = await audiencesPromise
  return (
    <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
      {formatNumber(total)}
    </span>
  )
}

export function CountPillSkeleton() {
  return <Skeleton className="h-[19px] w-9 rounded-full" />
}
