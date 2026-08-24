import { Skeleton } from "@/components/feedback/skeleton"
import { formatNumber } from "@/lib/format"

import type { User } from "../lib/queries"

type UsersCountProps = {
  usersPromise: Promise<{ users: User[]; total: number }>
}

/** Comparte la promesa con `UsersTableSection`: una sola consulta a `listUsers`, dos boundaries que resuelven al mismo tiempo. */
export async function UsersCount({ usersPromise }: UsersCountProps) {
  const { total } = await usersPromise
  return (
    <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
      {formatNumber(total)}
    </span>
  )
}

/** Mismo alto que el pill real, para que el título no se mueva al resolver. */
export function CountPillSkeleton() {
  return <Skeleton className="h-[19px] w-9 rounded-full" />
}
