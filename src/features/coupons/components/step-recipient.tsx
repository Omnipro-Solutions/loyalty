"use client"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Field } from "@/components/form/field"
import { OptionPicker } from "@/components/form/option-picker"
import { Section } from "@/components/form/section"

import type { MemberOption } from "../lib/queries"

type StepRecipientProps = {
  members: MemberOption[]
  memberId: string | undefined
  error?: string
  onChange: (member: MemberOption) => void
}

/**
 * Paso "Destinatario" (manual_customer, points_redemption): elige al socio
 * que será el titular del cupón.
 *
 * El control es `OptionPicker`, así que la forma de elegir la decide el
 * tamaño de la lista con los mismos umbrales que el resto de la app
 * (desplegable → desplegable con buscador → modal), en vez de un campo de
 * búsqueda a ciegas que no enseñaba a nadie hasta escribir dos letras. El
 * email viaja como `hint`: se ve bajo el nombre y también se busca por él,
 * que es lo único que distingue a dos socios homónimos.
 */
export function StepRecipient({
  members,
  memberId,
  error,
  onChange,
}: StepRecipientProps) {
  const selected = members.find((member) => member.id === memberId)

  return (
    <Section
      title="Destinatario"
      description="Elige al cliente que será el titular del cupón."
    >
      <Field label="Cliente" error={error} required htmlFor="recipient-member">
        <OptionPicker
          id="recipient-member"
          title="Elegir cliente"
          description="Busca por nombre o email al titular del cupón."
          placeholder="Busca por nombre o email…"
          confirmLabel="Elegir cliente"
          options={members.map((member) => ({
            value: member.id,
            label: member.name,
            hint: member.email,
          }))}
          value={memberId}
          onValueChange={(id) => {
            const member = members.find((m) => m.id === id)
            if (member) onChange(member)
          }}
        />
      </Field>

      {selected && (
        <div className="flex items-center gap-2.5 rounded-xl border-2 border-selected bg-accent px-3 py-2.5">
          <AvatarInitials name={selected.name} size={28} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">
              {selected.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {selected.email}
            </p>
          </div>
        </div>
      )}
    </Section>
  )
}
