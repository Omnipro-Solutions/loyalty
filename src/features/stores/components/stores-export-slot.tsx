import { Skeleton } from "@/components/feedback/skeleton"

import { ExportStoresButton } from "./export-stores-button"
import type { Store } from "../lib/queries"

type StoresExportSlotProps = {
  storesPromise: Promise<{ stores: Store[]; total: number }>
}

/** `ExportStoresButton` necesita el array de `stores` ya resuelto — vive en el mismo boundary que la tabla, no en el shell síncrono. */
export async function StoresExportSlot({
  storesPromise,
}: StoresExportSlotProps) {
  const { stores } = await storesPromise
  return <ExportStoresButton stores={stores} />
}

export function ExportButtonSkeleton() {
  return <Skeleton className="h-9 w-[104px] rounded-[10px]" />
}
