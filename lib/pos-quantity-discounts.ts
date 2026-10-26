import type { PriceListSlug } from "@/lib/price-lists"

export type PosDiscountThresholdType = "quantity" | "amount"
export type PosDiscountType = "percent" | "fixed"

export interface PosQuantityDiscount {
  id: number
  name: string
  threshold_type: PosDiscountThresholdType
  min_quantity: number
  min_amount: number
  discount_type: PosDiscountType
  discount_percent: number
  discount_amount: number
  price_list_slug: string | null
  is_active: boolean
  sort_order: number
}

/** Normaliza reglas viejas (sin campos nuevos) para no romper el POS. */
export function normalizePosDiscount(raw: Partial<PosQuantityDiscount> & { id: number; name: string }): PosQuantityDiscount {
  return {
    id: raw.id,
    name: raw.name,
    threshold_type: raw.threshold_type === "amount" ? "amount" : "quantity",
    min_quantity: Number(raw.min_quantity) || 1,
    min_amount: Number(raw.min_amount) || 0,
    discount_type: raw.discount_type === "fixed" ? "fixed" : "percent",
    discount_percent: Number(raw.discount_percent) || 0,
    discount_amount: Number(raw.discount_amount) || 0,
    price_list_slug: raw.price_list_slug ?? null,
    is_active: raw.is_active !== false,
    sort_order: Number(raw.sort_order) || 0,
  }
}

function ruleHasBenefit(r: PosQuantityDiscount): boolean {
  if (r.discount_type === "fixed") return Number(r.discount_amount) > 0
  return Number(r.discount_percent) > 0
}

function ruleApplies(
  r: PosQuantityDiscount,
  quantity: number,
  lineListTotal: number,
  priceListSlug: string
): boolean {
  if (!r.is_active || !ruleHasBenefit(r)) return false
  if (r.price_list_slug && r.price_list_slug !== priceListSlug) return false
  if (r.threshold_type === "amount") {
    return lineListTotal + 1e-9 >= Number(r.min_amount)
  }
  return quantity >= Number(r.min_quantity)
}

export function applyDiscountPercent(basePrice: number, discountPercent: number): number {
  const base = Number(basePrice) || 0
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0))
  if (pct <= 0) return base
  return Math.round(base * (1 - pct / 100) * 100) / 100
}

export function applyDiscountFixed(basePrice: number, discountAmount: number): number {
  const base = Number(basePrice) || 0
  const off = Math.max(0, Number(discountAmount) || 0)
  return Math.round(Math.max(0, base - off) * 100) / 100
}

export function unitPriceFromRule(listUnitPrice: number, rule: PosQuantityDiscount): number {
  if (rule.discount_type === "fixed") {
    return applyDiscountFixed(listUnitPrice, rule.discount_amount)
  }
  return applyDiscountPercent(listUnitPrice, rule.discount_percent)
}

/** Mejor regla aplicable: la que deja el precio unitario más bajo. */
export function matchQuantityDiscount(
  quantity: number,
  priceListSlug: PriceListSlug | string,
  rules: PosQuantityDiscount[],
  listUnitPrice = 0
): PosQuantityDiscount | null {
  const qty = Number(quantity) || 0
  if (qty <= 0 || !rules.length) return null
  const lineTotal = (Number(listUnitPrice) || 0) * qty

  const applicable = rules.filter((r) =>
    ruleApplies(normalizePosDiscount(r), qty, lineTotal, String(priceListSlug))
  )
  if (!applicable.length) return null

  applicable.sort((a, b) => {
    const pa = unitPriceFromRule(listUnitPrice, a)
    const pb = unitPriceFromRule(listUnitPrice, b)
    if (pa !== pb) return pa - pb
    return Number(b.sort_order) - Number(a.sort_order)
  })

  return applicable[0]
}

export function resolveUnitPriceWithDiscount(
  listUnitPrice: number,
  quantity: number,
  priceListSlug: PriceListSlug | string,
  rules: PosQuantityDiscount[]
): {
  unit_price: number
  discount_percent: number
  discount_fixed: number
  rule: PosQuantityDiscount | null
} {
  const rule = matchQuantityDiscount(quantity, priceListSlug, rules, listUnitPrice)
  if (!rule) {
    return { unit_price: listUnitPrice, discount_percent: 0, discount_fixed: 0, rule: null }
  }
  if (rule.discount_type === "fixed") {
    const discount_fixed = Number(rule.discount_amount) || 0
    return {
      unit_price: applyDiscountFixed(listUnitPrice, discount_fixed),
      discount_percent: 0,
      discount_fixed,
      rule,
    }
  }
  const discount_percent = Number(rule.discount_percent) || 0
  return {
    unit_price: applyDiscountPercent(listUnitPrice, discount_percent),
    discount_percent,
    discount_fixed: 0,
    rule,
  }
}

export function formatDiscountRuleThreshold(rule: PosQuantityDiscount): string {
  if (rule.threshold_type === "amount") {
    return `Desde $${Number(rule.min_amount).toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  }
  return `Desde ${rule.min_quantity} u.`
}

export function formatDiscountRuleBenefit(rule: PosQuantityDiscount): string {
  if (rule.discount_type === "fixed") {
    return `−$${Number(rule.discount_amount).toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}/u`
  }
  return `−${Number(rule.discount_percent)}%`
}
