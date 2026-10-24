"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DEFAULT_SALE_IVA_RATE,
  formatSaleIvaRateLabel,
  normalizeSaleIvaRate,
  SALE_IVA_RATES,
  type SaleIvaRate,
} from "@/lib/sale-iva"

export interface IvaRateSelectProps {
  value?: number | null
  onChange: (rate: SaleIvaRate) => void
  disabled?: boolean
  id?: string
  className?: string
  size?: "sm" | "default"
}

export function IvaRateSelect({
  value,
  onChange,
  disabled,
  id,
  className,
  size = "default",
}: IvaRateSelectProps) {
  const normalized = normalizeSaleIvaRate(value ?? DEFAULT_SALE_IVA_RATE)

  return (
    <Select
      value={String(normalized)}
      onValueChange={(v) => onChange(normalizeSaleIvaRate(v))}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={className ?? (size === "sm" ? "h-7 text-xs w-[7.5rem]" : "w-full")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SALE_IVA_RATES.map((rate) => (
          <SelectItem key={rate} value={String(rate)}>
            {formatSaleIvaRateLabel(rate)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
