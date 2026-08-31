import { Skeleton } from "@/components/feedback/skeleton"
import { formatNumber } from "@/lib/format"

import type { Product } from "../lib/queries"

type ProductsPromise = Promise<{ products: Product[]; total: number }>

type ProductsCountProps = { productsPromise: ProductsPromise }

/** Comparte la promesa con `ProductsTableSection`: una sola consulta a `listProducts`. */
export async function ProductsCount({ productsPromise }: ProductsCountProps) {
  const { total } = await productsPromise
  return (
    <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
      {formatNumber(total)}
    </span>
  )
}

/** Mismo alto que el pill real para que el título no se mueva al resolver. */
export function CountPillSkeleton() {
  return <Skeleton className="h-[19px] w-9 rounded-full" />
}
