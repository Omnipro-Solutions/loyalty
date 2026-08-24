"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import {
  ArrowUp,
  Copy,
  Paperclip,
  Plus,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { AI_CHAT_EXAMPLE, AI_COMPOSER_SUGGESTIONS } from "../lib/mock-data"

type AiChatPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Figma "Panel · Chat IA" (1057:37, estado abierto en 02.4). Conversación de
 * ejemplo fija — no hay modelo real detrás todavía (ver `mock-data.ts`), por
 * eso el composer no envía nada: es una muestra de cómo se vería el
 * copiloto, no una integración funcional.
 */
export function AiChatPanel({ open, onOpenChange }: AiChatPanelProps) {
  const { assistantReply } = AI_CHAT_EXAMPLE

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-foreground/20 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-full flex-col bg-background shadow-[-16px_0px_48px_-12px_rgba(13,13,10,0.2)] outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
          {/* Header */}
          <div className="flex h-[68px] shrink-0 items-center gap-3 border-b border-muted pt-4 pr-4 pb-3.5 pl-5">
            <div
              className="flex size-[38px] shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundImage: "var(--gradient-ai-avatar)" }}
            >
              <Sparkles className="size-[18px] text-white" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <DialogPrimitive.Title className="text-[15px] leading-5 font-semibold text-foreground">
                Asistente de lealtad
              </DialogPrimitive.Title>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-success" />
                <span className="truncate text-[10px] leading-[14px] text-muted-foreground">
                  Conectado a datos en vivo · 8.412 clientes
                </span>
              </div>
            </div>
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Nueva conversación"
            >
              <RotateCcw className="size-[15px]" />
            </button>
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Iniciar conversación"
            >
              <Plus className="size-[15px]" />
            </button>
            <DialogPrimitive.Close
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Cerrar"
            >
              <X className="size-[15px]" />
            </DialogPrimitive.Close>
          </div>

          {/* Conversación */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-neutral-50 px-5 py-[18px]">
            <div className="flex items-center gap-2.5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] leading-[14px] font-medium whitespace-nowrap text-muted-foreground">
                Hoy · 09:14
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="flex justify-end">
              <div className="max-w-[280px] rounded-tl-2xl rounded-tr-2xl rounded-br-md rounded-bl-2xl bg-primary px-3.5 py-2.5">
                <p className="text-[13px] leading-[19px] text-primary-foreground">
                  {AI_CHAT_EXAMPLE.userQuestion}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px]"
                  style={{ backgroundImage: "var(--gradient-ai-avatar)" }}
                >
                  <Sparkles className="size-3 text-white" />
                </div>
                <p className="flex-1 text-xs leading-[17px] font-semibold text-foreground">
                  Asistente
                </p>
                <p className="text-[10px] leading-[14px] text-muted-foreground">
                  09:14
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-tl-md rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-border bg-background px-3.5 py-3">
                <p className="text-[13px] leading-[19px] text-foreground">
                  {assistantReply.text}
                </p>
                <div className="flex items-start gap-2 rounded-[10px] bg-neutral-50 p-1">
                  {assistantReply.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex flex-1 flex-col gap-px rounded-lg px-2.5 py-2"
                    >
                      <p className="text-sm leading-[18px] font-bold tracking-[-0.3px] text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-[9px] leading-3 text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[13px] leading-[19px] text-secondary-foreground">
                  {assistantReply.recommendation}
                </p>
                <div className="flex flex-wrap items-start gap-1.5">
                  <span className="text-[10px] leading-[14px] whitespace-nowrap text-muted-foreground">
                    Fuentes:
                  </span>
                  {assistantReply.sources.map((source) => (
                    <span
                      key={source}
                      className="rounded-full bg-brand-subtle px-2 py-0.5 text-[9px] leading-[13px] font-medium whitespace-nowrap text-primary-800"
                    >
                      {source}
                    </span>
                  ))}
                </div>
                <div className="flex items-start gap-2">
                  <Button className="h-auto flex-1 rounded-[9px] px-3.5 py-2 text-[11px] font-semibold">
                    Crear journey
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-1 rounded-[9px] px-3.5 py-2 text-[11px] font-medium text-secondary-foreground"
                  >
                    Ver segmento
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pl-0.5">
                <p className="flex-1 text-[10px] leading-[14px] text-muted-foreground">
                  ¿Te sirvió esta respuesta?
                </p>
                <ThumbsUp className="size-[13px] text-muted-foreground" />
                <ThumbsDown className="size-[13px] text-muted-foreground" />
                <Copy className="size-[13px] text-muted-foreground" />
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[268px] rounded-tl-2xl rounded-tr-2xl rounded-br-md rounded-bl-2xl bg-primary px-3.5 py-2.5">
                <p className="text-[13px] leading-[19px] text-primary-foreground">
                  {AI_CHAT_EXAMPLE.followUpQuestion}
                </p>
              </div>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-tl-md rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-border bg-background py-3 pr-4 pl-3.5">
              <span className="flex gap-1">
                <span className="size-[7px] animate-pulse rounded-full bg-primary" />
                <span className="size-[7px] animate-pulse rounded-full bg-border [animation-delay:150ms]" />
                <span className="size-[7px] animate-pulse rounded-full bg-border [animation-delay:300ms]" />
              </span>
              <span className="text-[11px] leading-[15px] whitespace-nowrap text-muted-foreground">
                {AI_CHAT_EXAMPLE.typingHint}
              </span>
            </div>
          </div>

          {/* Composer */}
          <div className="flex shrink-0 flex-col gap-2.5 border-t border-muted px-5 pt-3.5 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {AI_COMPOSER_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border border-border bg-background px-[11px] py-1.5"
                >
                  <Sparkles className="size-[11px] text-primary" />
                  <span className="text-[11px] leading-[15px] font-medium whitespace-nowrap text-secondary-foreground">
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-primary px-3.5 pt-3 pb-2.5 shadow-[0px_4px_14px_-4px_rgba(79,69,229,0.1)]">
              <input
                type="text"
                placeholder="Pregunta sobre clientes, puntos, promociones o reglas…"
                className="w-full text-[13px] leading-[19px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-muted px-[9px] py-[5px]">
                  <span className="size-[11px] rounded-[2px] bg-border" />
                  <span className="text-[10px] leading-[14px] font-medium whitespace-nowrap text-secondary-foreground">
                    Contexto: últimos 30 días
                  </span>
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  className="flex size-[30px] items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label="Adjuntar"
                >
                  <Paperclip className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="flex size-[34px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0px_4px_10px_-2px_rgba(79,69,229,0.35)]"
                  aria-label="Enviar"
                >
                  <ArrowUp className="size-[15px]" />
                </button>
              </div>
            </div>

            <p className="text-[9px] leading-[13px] text-muted-foreground">
              Las respuestas se basan en tus datos de lealtad. Verifica antes de
              publicar cambios que afecten a clientes.
            </p>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
