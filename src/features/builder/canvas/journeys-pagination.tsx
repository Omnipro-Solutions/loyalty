"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { Pagination } from "@/components/data/pagination"

export function JourneysPagination({
  total,
  pageSize,
  page,
}: {
  total: number
  pageSize: number
  page: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function onPageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(newPage))
    router.push(`/journeys?${params.toString()}`)
  }

  return (
    <Pagination
      total={total}
      pageSize={pageSize}
      page={page}
      onPageChange={onPageChange}
      className="rounded-b-[20px] bg-neutral-50"
    />
  )
}
