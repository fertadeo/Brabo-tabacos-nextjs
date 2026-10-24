import type { PosCartLine } from "@/lib/pos-cart"
import { getPosCartLineLabel } from "@/lib/pos-cart"
import type { SalePaymentMethod, SaleCurrency } from "@/lib/api"
import { formatSaleIvaRateLabel, type SaleIvaRate } from "@/lib/sale-iva"
import { formatSaleMoney, resolveSaleCurrency } from "@/lib/pos-usd"

export interface SaleEditLineSnapshot {
  matchKey: string
  label: string
  quantity: number
  unit_price: number
  iva_rate: SaleIvaRate
  subtotal: number
}

export interface SaleEditOriginalSnapshot {
  clientId: number | null
  clientLabel: string
  notes: string
  paymentMethod: SalePaymentMethod
  currency: SaleCurrency
  exchangeRate: number | null
  total: number
  lines: SaleEditLineSnapshot[]
}

export interface SaleEditLineChange {
  kind: "added" | "removed" | "modified" | "unchanged"
  matchKey: string
  label: string
  quantity: number
  unit_price: number
  iva_rate: SaleIvaRate
  subtotal: number
  details?: string[]
}

export interface SaleEditConfirmSummary {
  clientChanged: boolean
  clientBefore: string
  clientAfter: string
  notesChanged: boolean
  notesBefore: string
  notesAfter: string
  paymentChanged: boolean
  paymentBefore: string
  paymentAfter: string
  totalChanged: boolean
  totalBefore: number
  totalAfter: number
  lineChanges: SaleEditLineChange[]
  /** Carrito final que se enviará al backend. */
  finalLines: SaleEditLineSnapshot[]
  hasItemChanges: boolean
  hasAnyChange: boolean
  currencyChanged: boolean
  currencyBefore: SaleCurrency
  currencyAfter: SaleCurrency
  exchangeRateAfter: number | null
}

function formatMoney(n: number, currency: SaleCurrency = "ARS"): string {
  return formatSaleMoney(n, resolveSaleCurrency(currency), { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

export function clientLabelFromSale(clientId: number | null, clientName?: string | null): string {
  if (clientName?.trim()) return clientName.trim()
  if (clientId != null) return `Cliente #${clientId}`
  return "Consumidor final"
}

export function cartLineMatchKey(line: PosCartLine): string {
  if (line.kind === "catalog") return `product:${line.product.id}`
  return `custom:${line.description.trim().toLowerCase()}`
}

export function cartToLineSnapshots(cart: PosCartLine[]): SaleEditLineSnapshot[] {
  return cart.map((line) => ({
    matchKey: cartLineMatchKey(line),
    label: getPosCartLineLabel(line),
    quantity: line.quantity,
    unit_price: line.unit_price,
    iva_rate: line.iva_rate,
    subtotal: line.quantity * line.unit_price,
  }))
}

function lineDetailChanges(
  before: SaleEditLineSnapshot,
  after: SaleEditLineSnapshot,
  currency: SaleCurrency
): string[] {
  const details: string[] = []
  if (before.quantity !== after.quantity) {
    details.push(`Cantidad: ${before.quantity} → ${after.quantity}`)
  }
  if (Math.abs(before.unit_price - after.unit_price) >= 0.01) {
    details.push(
      `Precio unit.: ${formatMoney(before.unit_price, currency)} → ${formatMoney(after.unit_price, currency)}`
    )
  }
  if (before.iva_rate !== after.iva_rate) {
    details.push(
      `IVA: ${formatSaleIvaRateLabel(before.iva_rate)} → ${formatSaleIvaRateLabel(after.iva_rate)}`
    )
  }
  return details
}

export function buildSaleEditConfirmSummary(params: {
  original: SaleEditOriginalSnapshot
  clientId: number | null
  clientLabel: string
  notes: string
  paymentMethod: SalePaymentMethod
  paymentLabel: (m: SalePaymentMethod) => string
  currency: SaleCurrency
  exchangeRate: number | null
  total: number
  cart: PosCartLine[]
}): SaleEditConfirmSummary {
  const currentLines = cartToLineSnapshots(params.cart)
  const currency = resolveSaleCurrency(params.currency)
  const beforeMap = new Map(params.original.lines.map((l) => [l.matchKey, l]))
  const afterMap = new Map(currentLines.map((l) => [l.matchKey, l]))

  const lineChanges: SaleEditLineChange[] = []

  for (const line of currentLines) {
    const prev = beforeMap.get(line.matchKey)
    if (!prev) {
      lineChanges.push({
        kind: "added",
        matchKey: line.matchKey,
        label: line.label,
        quantity: line.quantity,
        unit_price: line.unit_price,
        iva_rate: line.iva_rate,
        subtotal: line.subtotal,
      })
      continue
    }
    const details = lineDetailChanges(prev, line, currency)
    if (details.length > 0) {
      lineChanges.push({
        kind: "modified",
        matchKey: line.matchKey,
        label: line.label,
        quantity: line.quantity,
        unit_price: line.unit_price,
        iva_rate: line.iva_rate,
        subtotal: line.subtotal,
        details,
      })
    } else {
      lineChanges.push({
        kind: "unchanged",
        matchKey: line.matchKey,
        label: line.label,
        quantity: line.quantity,
        unit_price: line.unit_price,
        iva_rate: line.iva_rate,
        subtotal: line.subtotal,
      })
    }
  }

  for (const line of params.original.lines) {
    if (!afterMap.has(line.matchKey)) {
      lineChanges.push({
        kind: "removed",
        matchKey: line.matchKey,
        label: line.label,
        quantity: line.quantity,
        unit_price: line.unit_price,
        iva_rate: line.iva_rate,
        subtotal: line.subtotal,
      })
    }
  }

  const clientChanged = params.clientId !== params.original.clientId
  const notesChanged = params.notes.trim() !== params.original.notes.trim()
  const paymentChanged = params.paymentMethod !== params.original.paymentMethod
  const totalChanged = Math.abs(params.total - params.original.total) >= 0.01
  const hasItemChanges = lineChanges.some((l) => l.kind !== "unchanged")

  const currencyChanged = currency !== resolveSaleCurrency(params.original.currency)
  const exchangeRateChanged =
    currency === "USD" &&
    params.exchangeRate != null &&
    params.original.exchangeRate != null &&
    Math.abs(params.exchangeRate - params.original.exchangeRate) >= 0.01

  return {
    clientChanged,
    clientBefore: params.original.clientLabel,
    clientAfter: params.clientLabel,
    notesChanged,
    notesBefore: params.original.notes.trim() || "—",
    notesAfter: params.notes.trim() || "—",
    paymentChanged,
    paymentBefore: params.paymentLabel(params.original.paymentMethod),
    paymentAfter: params.paymentLabel(params.paymentMethod),
    totalChanged,
    totalBefore: params.original.total,
    totalAfter: params.total,
    lineChanges,
    finalLines: currentLines,
    hasItemChanges,
    currencyChanged,
    currencyBefore: resolveSaleCurrency(params.original.currency),
    currencyAfter: currency,
    exchangeRateAfter: params.exchangeRate,
    hasAnyChange:
      clientChanged ||
      notesChanged ||
      paymentChanged ||
      totalChanged ||
      hasItemChanges ||
      currencyChanged ||
      exchangeRateChanged,
  }
}

export function formatSaleEditMoney(n: number, currency: SaleCurrency = "ARS"): string {
  return formatMoney(n, currency)
}
