"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Pagination } from "@/components/data/pagination"

type CouponsPaginationProps = { total: number; pageSize: number }

export function CouponsPagination({ total, pageSize }: CouponsPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page") ?? "1")

  function onPageChange(next: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(next))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Pagination
      total={total}
      pageSize={pageSize}
      page={page}
      onPageChange={onPageChange}
    />
  )
}
