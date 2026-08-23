import * as React from "react"

import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

type PaginationProps = {
  total: number
  pageSize: number
  page: number
  onPageChange: (page: number) => void
  className?: string
}

function paginas(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, 2, total - 1, total, page - 1, page, page + 1])
  const nums = [...set]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
  const out: (number | "…")[] = []
  nums.forEach((n, i) => {
    if (i > 0 && n - (nums[i - 1] as number) > 1) out.push("…")
    out.push(n)
  })
  return out
}

const PILL =
  "h-auto rounded-[9px] px-[11px] py-1.5 text-[12px] leading-4 font-medium"

/** Figma "Table / Paginación" (698:357): "Mostrando X–Y de Z" + botones 28px sobre bg-subtle. */
export function Pagination({
  total,
  pageSize,
  page,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1
  const hasta = Math.min(page * pageSize, total)
  const items = React.useMemo(
    () => paginas(page, totalPages),
    [page, totalPages]
  )

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 bg-background px-5 py-3",
        className
      )}
    >
      <p className="min-w-0 flex-1 text-[12px] leading-4 text-muted-foreground">
        Mostrando {formatNumber(desde)}–{formatNumber(hasta)} de{" "}
        {formatNumber(total)}
      </p>
      <Button
        variant="ghost"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(PILL, "bg-muted")}
      >
        ‹
      </Button>
      {items.map((p, i) =>
        p === "…" ? (
          <span
            key={`e${i}`}
            className={cn(
              PILL,
              "inline-flex items-center justify-center bg-muted text-muted-foreground"
            )}
          >
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "ghost"}
            onClick={() => onPageChange(p)}
            className={cn(PILL, p === page ? "font-semibold" : "bg-muted")}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="ghost"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={cn(PILL, "bg-muted")}
      >
        ›
      </Button>
    </div>
  )
}
