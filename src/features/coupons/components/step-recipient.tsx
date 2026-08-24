"use client"

import { useAction } from "next-safe-action/hooks"
import { useEffect, useState } from "react"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Field } from "@/components/form/field"
import { FilterSearch } from "@/components/filters/search"
import { Section } from "@/components/form/section"
import { cn } from "@/lib/utils"

import { searchMembersAction } from "../actions/lookups"
import type { MemberOption } from "../lib/queries"

type StepRecipientProps = {
  memberId: string | undefined
  memberLabel: string | undefined
  error?: string
  onChange: (member: MemberOption) => void
}

/** Paso "Destinatario" (manual_customer, points_redemption): busca un socio por nombre/email y lo elige como titular. */
export function StepRecipient({
  memberId,
  memberLabel,
  error,
  onChange,
}: StepRecipientProps) {
  const [search, setSearch] = useState("")
  const [rawResults, setRawResults] = useState<MemberOption[]>([])
  // Derivado en el render, no en el efecto: bajo 2 caracteres no hay
  // búsqueda visible, sin necesidad de un setState extra para "limpiarla".
  const results = search.trim().length < 2 ? [] : rawResults
  const searchAction = useAction(searchMembersAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) setRawResults(data.members)
    },
  })

  useEffect(() => {
    if (search.trim().length < 2) return
    const timeout = setTimeout(() => {
      searchAction.execute({ search })
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <Section
      title="Destinatario"
      description="Busca al cliente que será el titular del cupón."
    >
      <Field label="Cliente" error={error} required>
        <FilterSearch
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Busca por nombre o email…"
          className="w-full"
        />
      </Field>

      {memberId && memberLabel && (
        <div className="flex items-center gap-2.5 rounded-xl border-2 border-primary bg-accent px-3 py-2.5">
          <AvatarInitials name={memberLabel} size={28} />
          <p className="text-[13px] font-medium text-foreground">
            {memberLabel}
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-1">
          {results.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                onChange(member)
                setSearch("")
                setResults([])
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-left hover:bg-accent",
                memberId === member.id && "border-primary bg-accent"
              )}
            >
              <AvatarInitials name={member.name} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {member.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {member.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Section>
  )
}
