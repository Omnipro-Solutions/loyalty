"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Pagination } from "@/components/data/pagination"

type AudiencesPaginationProps = { total: number; defaultPageSize: number }

export function AudiencesPagination({
  total,
  defaultPageSize,
}: AudiencesPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page") ?? "1")
  const pageSize = Number(
    searchParams.get("pageSize") ?? String(defaultPageSize)
  )

  function onPageChange(next: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(next))
    router.push(`${pathname}?${params.toString()}`)
  }

  function onPageSizeChange(next: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("pageSize", String(next))
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Pagination
      total={total}
      pageSize={pageSize}
      page={page}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  )
}
