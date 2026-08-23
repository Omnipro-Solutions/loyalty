"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

type CopyButtonProps = { valor: string }

/** Ícono de copiar junto a Correo/Teléfono (05.3g) — único motivo por el que el Hero necesita un borde de cliente. */
export function CopyButton({ valor }: CopyButtonProps) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    await navigator.clipboard.writeText(valor)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`Copiar ${valor}`}
      className="shrink-0 text-muted-foreground hover:text-foreground"
    >
      {copiado ? (
        <Check className="size-2.5 text-success" />
      ) : (
        <Copy className="size-2.5" />
      )}
    </button>
  )
}
