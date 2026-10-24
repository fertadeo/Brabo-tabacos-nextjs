"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Receipt } from "lucide-react"
import {
  type ClientPersoneria,
  type ClientTaxCondition,
  getTaxConditionOptionsForPersoneria,
  formatTaxConditionLabel,
} from "@/lib/client-tax-condition"

interface ClientTaxConditionFieldProps {
  personeria: ClientPersoneria
  value: ClientTaxCondition
  onChange: (value: ClientTaxCondition) => void
  disabled?: boolean
  padronSuggested?: ClientTaxCondition
  error?: string
  id?: string
}

export function ClientTaxConditionField({
  personeria,
  value,
  onChange,
  disabled,
  padronSuggested,
  error,
  id = "tax_condition",
}: ClientTaxConditionFieldProps) {
  const options = getTaxConditionOptionsForPersoneria(personeria)
  const fromPadron =
    padronSuggested && formatTaxConditionLabel(padronSuggested)

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        Condición frente al IVA
      </Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ClientTaxCondition)}
        disabled={disabled || options.length <= 1}
      >
        <SelectTrigger id={id} className={error ? "border-red-500" : ""}>
          <SelectValue placeholder="Seleccionar condición fiscal" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fromPadron && padronSuggested === value && (
        <p className="text-xs text-muted-foreground">
          Sugerido por consulta ARCA: {fromPadron}
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
