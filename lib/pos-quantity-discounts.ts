import type { PriceListSlug } from "@/lib/price-lists"

export interface PosQuantityDiscount {
  id: number
  name: string
  min_quantity: number
  discount_percent: number
  price_list_slug: string | null
  is_active: boolean
  sort_order: number
}

/** Mejor tramo aplicable: mayor min_quantity <= qty, filtrando por lista. */
export function matchQuantityDiscount(
  quantity: number,
  priceListSlug: PriceListSlug | string,
  rules: PosQuantityDiscount[]
): PosQuantityDiscount | null {
  const qty = Number(quantity) || 0
  if (qty <= 0 || !rules.length) return null

  const applicable = rules.filter((r) => {
    if (!r.is_active) return false
    if (Number(r.discount_percent) <= 0) return false
    if (qty < Number(r.min_quantity)) return false
    if (r.price_list_slug && r.price_list_slug !== priceListSlug) return false
    return true
  })

  if (!applicable.length) return null

  applicable.sort((a, b) => {
    const dq = Number(b.min_quantity) - Number(a.min_quantity)
    if (dq !== 0) return dq
    const dp = Number(b.discount_percent) - Number(a.discount_percent)
    if (dp !== 0) return dp
    return Number(b.sort_order) - Number(a.sort_order)
  })

  return applicable[0]
}

export function applyDiscountPercent(basePrice: number, discountPercent: number): number {
  const base = Number(basePrice) || 0
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0))
  if (pct <= 0) return base
  return Math.round(base * (1 - pct / 100) * 100) / 100
}

export function resolveUnitPriceWithDiscount(
  listUnitPrice: number,
  quantity: number,
  priceListSlug: PriceListSlug | string,
  rules: PosQuantityDiscount[]
): { unit_price: number; discount_percent: number; rule: PosQuantityDiscount | null } {
  const rule = matchQuantityDiscount(quantity, priceListSlug, rules)
  const discount_percent = rule ? Number(rule.discount_percent) : 0
  return {
    unit_price: applyDiscountPercent(listUnitPrice, discount_percent),
    discount_percent,
    rule,
  }
}
