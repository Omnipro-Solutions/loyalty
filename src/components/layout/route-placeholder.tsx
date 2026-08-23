import { Hammer } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"

/** Temporary content for `(app)` routes that don't have their Phase built yet. */
export function RoutePlaceholder({ phase }: { phase: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-2xl bg-background">
      <EmptyState
        icon={Hammer}
        title="Todavía no construida"
        description={`Esta vista llega en la ${phase} del plan.`}
      />
    </div>
  )
}
