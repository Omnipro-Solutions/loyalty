"use client"

import { Plus } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

import { createWorkflowAction } from "./actions"

export function NewJourneyButton() {
  const router = useRouter()
  const create = useAction(createWorkflowAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) router.push(`/journeys/${data.id}`)
    },
  })

  return (
    <Button
      disabled={create.isPending}
      onClick={() => create.execute({ nombre: "Nuevo workflow" })}
    >
      <Plus className="size-4" />
      Nuevo workflow
    </Button>
  )
}
