import type { SaleCurrency } from "@/lib/budget-currency"
import {
  applyBudgetUsdUnitPriceEdit,
  convertBudgetLineToArs,
  convertBudgetLineToUsd,
  resolveBudgetLineCurrency,
} from "@/lib/budget-currency"

type BudgetLineWithCurrency = {
  unit_price: number
  currency?: SaleCurrency
  ars_unit_price?: number
  product?: { price: number }
}

export function catalogArsReference(line: BudgetLineWithCurrency): number {
  return line.ars_unit_price ?? line.product?.price ?? line.unit_price
}

export function withBudgetCurrencyChange<T extends BudgetLineWithCurrency>(
  line: T,
  currency: SaleCurrency,
  exchangeRate: number
): T {
  const current = resolveBudgetLineCurrency(line.currency)
  if (currency === current) return line

  if (currency === "USD") {
    const arsRef = catalogArsReference(line)
    return convertBudgetLineToUsd({ ...line, currency: "USD" }, exchangeRate, arsRef)
  }

  return convertBudgetLineToArs({ ...line, currency: "ARS" })
}

export function withBudgetUnitPriceEdit<T extends BudgetLineWithCurrency>(
  line: T,
  unitPrice: number,
  exchangeRate: number
): T {
  if (resolveBudgetLineCurrency(line.currency) === "USD") {
    return applyBudgetUsdUnitPriceEdit({ ...line, currency: "USD" }, unitPrice, exchangeRate)
  }
  return { ...line, unit_price: unitPrice, currency: "ARS" }
}
