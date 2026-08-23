"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"

import { logoutAction } from "@/lib/supabase/actions"

/** Ejecuta `logoutAction` y redirige a /login al terminar. */
export function useLogout() {
  const router = useRouter()
  return useAction(logoutAction, {
    onSuccess: () => router.push("/login"),
  })
}
