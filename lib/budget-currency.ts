import type { SaleCurrency } from "@/lib/pos-usd"
import {
  arsToUsd,
  formatExchangeRate,
  formatSaleMoney,
  resolveSaleCurrency,
  usdToArs,
} from "@/lib/pos-usd"

export type { SaleCurrency }

export interface BudgetLineCurrencyFields {
  currency: SaleCurrency
  /** Precio de catálogo en ARS cuando la línea se cotiza en USD */
  ars_unit_price?: number
}

export function resolveBudgetLineCurrency(
  currency: SaleCurrency | string | null | undefined
): SaleCurrency {
  return resolveSaleCurrency(currency)
}

export function budgetLineTotal(
  quantity: number,
  unitPrice: number
): number {
  return quantity * unitPrice
}

export function budgetTotalsByCurrency(
  lines: Array<{ quantity: number; unit_price: number; currency?: SaleCurrency | string | null }>
): { ars: number; usd: number } {
  return lines.reduce(
    (acc, line) => {
      const total = budgetLineTotal(line.quantity, line.unit_price)
      if (resolveBudgetLineCurrency(line.currency) === "USD") {
        acc.usd += total
      } else {
        acc.ars += total
      }
      return acc
    },
    { ars: 0, usd: 0 }
  )
}

export function budgetHasUsdLines(
  lines: Array<{ currency?: SaleCurrency | string | null }>
): boolean {
  return lines.some((line) => resolveBudgetLineCurrency(line.currency) === "USD")
}

export function budgetHasMixedCurrencies(
  lines: Array<{ currency?: SaleCurrency | string | null }>
): boolean {
  const currencies = new Set(lines.map((line) => resolveBudgetLineCurrency(line.currency)))
  return currencies.size > 1
}

export function computeBudgetHeaderTotal(
  lines: Array<{ quantity: number; unit_price: number; currency?: SaleCurrency | string | null }>,
  exchangeRate?: number | null
): number {
  const { ars, usd } = budgetTotalsByCurrency(lines)
  if (usd > 0) {
    const rate = Number(exchangeRate)
    if (!Number.isFinite(rate) || rate <= 0) return ars
    return Math.round((ars + usd * rate) * 100) / 100
  }
  return Math.round(ars * 100) / 100
}

export function formatBudgetMoney(value: number, currency: SaleCurrency): string {
  return formatSaleMoney(value, currency, {
    minimumFractionDigits: currency === "USD" ? 2 : 0,
    maximumFractionDigits: currency === "USD" ? 2 : 2,
  })
}

export function formatBudgetTotalsSummary(
  lines: Array<{ quantity: number; unit_price: number; currency?: SaleCurrency | string | null }>,
  exchangeRate?: number | null
): string {
  const { ars, usd } = budgetTotalsByCurrency(lines)
  if (usd > 0 && ars > 0) {
    const converted = computeBudgetHeaderTotal(lines, exchangeRate)
    return `${formatBudgetMoney(ars, "ARS")} + ${formatBudgetMoney(usd, "USD")} ≈ ${formatBudgetMoney(converted, "ARS")}`
  }
  if (usd > 0) {
    return formatBudgetMoney(usd, "USD")
  }
  return formatBudgetMoney(ars, "ARS")
}

export function convertBudgetLineToUsd<T extends BudgetLineCurrencyFields & { unit_price: number }>(
  line: T,
  rate: number,
  arsReference: number
): T {
  return {
    ...line,
    currency: "USD",
    ars_unit_price: arsReference,
    unit_price: arsToUsd(arsReference, rate),
  }
}

export function convertBudgetLineToArs<T extends BudgetLineCurrencyFields & { unit_price: number }>(
  line: T
): T {
  const ars = line.ars_unit_price ?? line.unit_price
  const next = { ...line, currency: "ARS" as const, unit_price: ars }
  delete (next as { ars_unit_price?: number }).ars_unit_price
  return next
}

export function recalcBudgetUsdLine<T extends BudgetLineCurrencyFields & { unit_price: number }>(
  line: T,
  rate: number
): T {
  const ars = line.ars_unit_price ?? line.unit_price
  return {
    ...line,
    currency: "USD",
    ars_unit_price: ars,
    unit_price: arsToUsd(ars, rate),
  }
}

export function applyBudgetUsdUnitPriceEdit<T extends BudgetLineCurrencyFields & { unit_price: number }>(
  line: T,
  unitPriceUsd: number,
  rate: number
): T {
  const usd = Math.round(unitPriceUsd * 100) / 100
  return {
    ...line,
    currency: "USD",
    unit_price: usd,
    ars_unit_price: usdToArs(usd, rate),
  }
}

export { formatExchangeRate }
