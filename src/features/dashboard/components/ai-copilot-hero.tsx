"use client"

import { useState, type KeyboardEvent } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getAiChatScenario } from "../lib/ai-chat"
import {
  AI_CHAT_DEFAULT_SCENARIO_ID,
  AI_CHAT_SCENARIOS,
  AI_SUGGESTION_CHIPS,
} from "../lib/mock-data"
import { AiChatPanel, type AiChatAskRequest } from "./ai-chat-panel"

type AiCopilotHeroProps = { name: string }

/**
 * Figma "AI Hero" (1027:4267) + "Panel · Chat IA" (1057:37, estado 02.4).
 * Preguntar, un chip o Enter abren el panel con una pregunta de
 * `AI_CHAT_SCENARIOS` — sigue sin haber un modelo real detrás, pero ahora
 * se puede "simular" distintas preguntas sobre los datos para la demo.
 */
export function AiCopilotHero({ name }: AiCopilotHeroProps) {
  const [inputValue, setInputValue] = useState("")
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [askRequest, setAskRequest] = useState<AiChatAskRequest | null>(null)

  function ask(question: string) {
    setAskRequest((prev) => ({ question, token: (prev?.token ?? 0) + 1 }))
    setIsChatOpen(true)
  }

  function handleAsk() {
    const question = inputValue.trim()
    ask(
      question ||
        getAiChatScenario(AI_CHAT_SCENARIOS, AI_CHAT_DEFAULT_SCENARIO_ID)
          .question
    )
    setInputValue("")
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") handleAsk()
  }

  return (
    <>
      <div
        className="flex w-full flex-col items-start gap-[18px] rounded-[20px] px-8 py-7"
        style={{ backgroundImage: "var(--gradient-ai-hero)" }}
      >
        <p className="text-[30px] leading-[normal] font-bold text-primary-800">
          Hola de nuevo, {name}
        </p>
        <p className="max-w-[560px] text-sm leading-[normal] text-secondary-foreground">
          Tu copiloto de lealtad: descubre insights, resuelve retos y decide qué
          hacer a continuación.
        </p>

        <div className="flex h-[52px] w-full items-center gap-2.5 rounded-[14px] border border-border-strong bg-background py-2 pr-2 pl-[18px]">
          <Sparkles className="size-[18px] shrink-0 text-primary" />
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Pregunta sobre el desempeño del programa, oportunidades o qué hacer a continuación"
            className="min-w-0 flex-1 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            onKeyDown={handleKeyDown}
          />
          <Button
            className="h-9 shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium"
            onClick={handleAsk}
          >
            Preguntar
          </Button>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          {AI_SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() =>
                ask(
                  getAiChatScenario(AI_CHAT_SCENARIOS, chip.scenarioId).question
                )
              }
              className="rounded-full border border-border bg-background px-3.5 py-2 text-xs font-medium text-secondary-foreground"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <AiChatPanel
        open={isChatOpen}
        onOpenChange={setIsChatOpen}
        askRequest={askRequest}
      />
    </>
  )
}
