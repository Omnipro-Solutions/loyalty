"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

type CopyButtonProps = { value: string }

/** Ícono de copiar junto a Correo/Teléfono (05.3g) — único motivo por el que el Hero necesita un borde de cliente. */
export function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copiar ${value}`}
      className="shrink-0 text-muted-foreground hover:text-foreground"
    >
      {copied ? (
        <Check className="size-2.5 text-success" />
      ) : (
        <Copy className="size-2.5" />
      )}
    </button>
  )
}
