"use client"

import { Badge } from "@/components/ui/badge"
import { formatExchangeRate, isUsdSale } from "@/lib/pos-usd"
import { cn } from "@/lib/utils"

export interface SaleCurrencyBadgeProps {
  currency?: string | null
  exchangeRate?: number | null
  /** Si true, muestra la cotización junto al badge USD */
  showRate?: boolean
  className?: string
}

export function SaleCurrencyBadge({
  currency,
  exchangeRate,
  showRate = false,
  className,
}: SaleCurrencyBadgeProps) {
  if (isUsdSale(currency)) {
    const rateLabel =
      showRate && exchangeRate != null && exchangeRate > 0
        ? ` · TC ${formatExchangeRate(exchangeRate)}`
        : ""
    return (
      <Badge
        className={cn(
          "border-amber-400/80 bg-amber-100 text-amber-950 hover:bg-amber-100",
          "dark:border-amber-600 dark:bg-amber-950/80 dark:text-amber-100",
          className
        )}
      >
        USD{rateLabel}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={className}>
      ARS
    </Badge>
  )
}
