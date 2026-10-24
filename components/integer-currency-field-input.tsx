"use client"

import { useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { formatCurrencyIntegerInput } from "@/lib/currency-input"
import { cn } from "@/lib/utils"

export interface IntegerCurrencyFieldInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "type" | "inputMode"
  > {
  value: number
  onValueChange: (value: number) => void
}

/**
 * Pesos enteros: mientras escribís solo dígitos sin reformatear; al salir se muestra $1.234.567
 */
export function IntegerCurrencyFieldInput({
  value,
  onValueChange,
  onFocus,
  onBlur,
  className,
  ...rest
}: IntegerCurrencyFieldInputProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState("")

  const displayValue = focused
    ? draft
    : value > 0 && !Number.isNaN(value)
      ? formatCurrencyIntegerInput(value)
      : ""

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true)
      setDraft(
        value > 0 && !Number.isNaN(value) ? String(Math.round(value)) : "",
      )
      onFocus?.(e)
    },
    [value, onFocus],
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      const digits = draft.replace(/\D/g, "")
      const n = digits === "" ? 0 : parseInt(digits, 10)
      onValueChange(Number.isNaN(n) ? 0 : Math.max(0, n))
      setDraft("")
      onBlur?.(e)
    },
    [draft, onValueChange, onBlur],
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value.replace(/\D/g, ""))
  }, [])

  return (
    <Input
      type="text"
      inputMode="numeric"
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
