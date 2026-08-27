import { Skeleton } from "@/components/feedback/skeleton"

import { ExportStoresButton } from "./export-stores-button"
import { listStoreGroups, type Store } from "../lib/queries"

type StoresExportSlotProps = {
  storesPromise: Promise<{ stores: Store[]; total: number }>
}

/** `ExportStoresButton` necesita el array de `stores` ya resuelto — vive en el mismo boundary que la tabla, no en el shell síncrono. `listStoreGroups()` se repite aquí (ya se pide también en `page.tsx` para `StoresCard`) para no tener que pasarla por el `<Suspense>` de la tabla. */
export async function StoresExportSlot({
  storesPromise,
}: StoresExportSlotProps) {
  const [{ stores }, storeGroups] = await Promise.all([
    storesPromise,
    listStoreGroups(),
  ])
  const groupNameById = new Map(storeGroups.map((g) => [g.id, g.name]))
  return <ExportStoresButton stores={stores} groupNameById={groupNameById} />
}

export function ExportButtonSkeleton() {
  return <Skeleton className="h-9 w-[104px] rounded-[10px]" />
}
