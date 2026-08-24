import { Skeleton } from "@/components/feedback/skeleton"
import { formatNumber } from "@/lib/format"

import type { Member } from "../lib/queries"

type MembersCountProps = {
  membersPromise: Promise<{ members: Member[]; total: number }>
}

/** Comparte la promesa con `MembersTableSection`: una sola consulta a `listMembers`, dos boundaries que resuelven al mismo tiempo. */
export async function MembersCount({ membersPromise }: MembersCountProps) {
  const { total } = await membersPromise
  return (
    <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
      {formatNumber(total)}
    </span>
  )
}

/** Mismo alto que el pill real (`py-0.5` + `leading-[15px]` ≈ 19px) para que el título no se mueva al resolver. */
export function CountPillSkeleton() {
  return <Skeleton className="h-[19px] w-9 rounded-full" />
}
