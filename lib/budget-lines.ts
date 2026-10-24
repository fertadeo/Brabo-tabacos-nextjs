import type { CommercialBudgetItemInput, CommercialBudgetLine, Product } from "@/lib/api"
import type { BudgetLineItem } from "@/components/budget-lines-panel"
import type { SaleCurrency } from "@/lib/budget-currency"
import { resolveBudgetLineCurrency } from "@/lib/budget-currency"

export type BudgetCatalogLine = {
  kind: "catalog"
  key: number
  product: Product
  quantity: number
  unit_price: number
  currency: SaleCurrency
  ars_unit_price?: number
}

export type BudgetCustomLine = {
  kind: "custom"
  key: string
  description: string
  quantity: number
  unit_price: number
  currency: SaleCurrency
  ars_unit_price?: number
}

export type BudgetDraftLine = BudgetCatalogLine | BudgetCustomLine

export type BudgetDetailDraftLine = {
  id: number
  product_id: number | null
  product_name: string
  product_code: string
  description: string
  is_custom: boolean
  quantity: number
  unit_price: number
  currency: SaleCurrency
  ars_unit_price?: number
}

export function newCustomLineKey(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function lineToApiItem(
  line: Pick<BudgetDraftLine, "quantity" | "unit_price" | "currency"> & (
    | { kind: "catalog"; product: Product }
    | { kind: "custom"; description: string }
  )
): CommercialBudgetItemInput {
  const base = {
    quantity: Math.max(1, Math.floor(line.quantity)),
    unit_price: Math.max(0, line.unit_price),
    currency: resolveBudgetLineCurrency(line.currency),
  }
  if (line.kind === "catalog") {
    return { product_id: line.product.id, ...base }
  }
  return { description: line.description.trim(), ...base }
}

export function budgetDraftLinesToApiItems(lines: BudgetDraftLine[]): CommercialBudgetItemInput[] {
  return lines.map((line) => {
    if (line.kind === "catalog") {
      return lineToApiItem({ ...line, kind: "catalog" })
    }
    return lineToApiItem({ ...line, kind: "custom" })
  })
}

export function budgetDetailDraftLinesToApiItems(lines: BudgetDetailDraftLine[]): CommercialBudgetItemInput[] {
  return lines.map((line) => {
    const base = {
      quantity: Math.max(1, Math.floor(line.quantity)),
      unit_price: Math.max(0, line.unit_price),
      currency: resolveBudgetLineCurrency(line.currency),
    }
    if (line.is_custom || line.product_id == null) {
      return {
        description: (line.description || line.product_name).trim(),
        ...base,
      }
    }
    return {
      product_id: line.product_id,
      ...base,
    }
  })
}

export function linesFromBudgetDetail(items: CommercialBudgetLine[]): BudgetDetailDraftLine[] {
  return items.map((item) => {
    const isCustom = item.product_id == null
    const description = (item.description ?? item.product_name ?? "").trim()
    const currency = resolveBudgetLineCurrency(item.currency)
    return {
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: isCustom ? "" : item.product_code,
      description,
      is_custom: isCustom,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency,
      ars_unit_price:
        currency === "USD" && item.product_id != null ? undefined : undefined,
    }
  })
}

export function budgetDraftLineItems(lines: BudgetDraftLine[]): BudgetLineItem[] {
  return lines.map((line) => {
    if (line.kind === "catalog") {
      return {
        key: line.key,
        name: line.product.name,
        code: line.product.code,
        quantity: line.quantity,
        unit_price: line.unit_price,
        currency: line.currency,
        ars_unit_price: line.ars_unit_price ?? line.product.price,
        product: line.product,
        isCustom: false,
      }
    }
    return {
      key: line.key,
      name: line.description,
      code: "Manual",
      quantity: line.quantity,
      unit_price: line.unit_price,
      currency: line.currency,
      ars_unit_price: line.ars_unit_price,
      isCustom: true,
    }
  })
}

export function budgetDetailDraftToLineItems(
  lines: BudgetDetailDraftLine[],
  productsById?: Map<number, Product>
): BudgetLineItem[] {
  return lines.map((line) => ({
    key: line.id,
    name: line.is_custom ? line.description || line.product_name : line.product_name,
    code: line.is_custom ? "Manual" : line.product_code,
    quantity: line.quantity,
    unit_price: line.unit_price,
    currency: line.currency,
    ars_unit_price:
      line.ars_unit_price ??
      (line.product_id != null ? productsById?.get(line.product_id)?.price : undefined),
    product: line.product_id != null ? productsById?.get(line.product_id) : undefined,
    isCustom: line.is_custom,
  }))
}
