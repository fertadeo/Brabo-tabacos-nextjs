"use client"

import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input"
import { cn } from "@/lib/utils"

function editableDecimalFromNumber(value: number): string {
  if (value === 0 || Number.isNaN(value)) return ""
  return formatCurrencyInput(value).replace(/^\$\s?/, "")
}

export interface CurrencyFieldInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "type" | "inputMode"
  > {
  value: number
  onValueChange: (value: number) => void
}

/**
 * Monto con centavos (es-AR). Mientras el usuario escribe no se reformatea en cada tecla
 * (evita saltos de cursor); al salir del campo se normaliza con parseCurrencyInput.
 */
export function CurrencyFieldInput({
  value,
  onValueChange,
  onFocus,
  onBlur,
  className,
  ...rest
}: CurrencyFieldInputProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState("")

  const displayValue = focused
    ? draft
    : value === 0 || Number.isNaN(value)
      ? ""
      : formatCurrencyInput(value)

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true)
      setDraft(editableDecimalFromNumber(value))
      onFocus?.(e)
    },
    [value, onFocus],
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      const n = parseCurrencyInput(draft)
      onValueChange(n)
      setDraft("")
      onBlur?.(e)
    },
    [draft, onValueChange, onBlur],
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value)
  }, [])

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      {...rest}
      className={cn(className)}
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  )
}
