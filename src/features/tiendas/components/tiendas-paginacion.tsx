"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Pagination } from "@/components/data/pagination"

type TiendasPaginacionProps = { total: number; pageSize: number }

export function TiendasPaginacion({ total, pageSize }: TiendasPaginacionProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const page = Number(searchParams.get("page") ?? "1")

  function onPageChange(siguiente: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(siguiente))
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
