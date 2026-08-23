"use client"

import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp"

import { cn } from "@/lib/utils"

type TotpCodeInputProps = {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
}

/** Grilla de 6 dígitos (Figma "01.2 · Verificación en dos pasos", 634:846). */
export function TotpCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
}: TotpCodeInputProps) {
  return (
    <OTPInput
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      maxLength={6}
      disabled={disabled}
      pattern={REGEXP_ONLY_DIGITS}
      containerClassName="flex w-full gap-2.5"
      render={({ slots }) => (
        <>
          {slots.map((slot, i) => (
            <div
              key={i}
              className={cn(
                "flex h-11 flex-1 items-center justify-center rounded-[10px] border border-border-strong bg-background font-mono text-lg font-medium text-foreground",
                slot.isActive && "border-2 border-primary"
              )}
            >
              {slot.char}
            </div>
          ))}
        </>
      )}
    />
  )
}
