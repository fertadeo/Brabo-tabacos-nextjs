import type { PosCartLine } from "@/lib/pos-cart"

export type SaleCurrency = "ARS" | "USD"

export function roundUsd(value: number): number {
  return Math.round(value * 100) / 100
}

export function arsToUsd(ars: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0
  return roundUsd(ars / rate)
}

export function usdToArs(usd: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0
  return roundUsd(usd * rate)
}

export function formatSaleMoney(
  value: number,
  currency: SaleCurrency,
  opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string {
  if (currency === "USD") {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: opts?.minimumFractionDigits ?? 2,
      maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
    })
  }
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
  })
}

export function cartLineArsReference(line: PosCartLine): number {
  if (line.kind === "catalog" && line.ars_list_unit_price != null) return line.ars_list_unit_price
  if (line.ars_unit_price != null) return line.ars_unit_price
  if (line.kind === "catalog") return line.product.price
  return line.unit_price
}

export function convertCartLineToUsd(line: PosCartLine, rate: number): PosCartLine {
  if (line.kind === "catalog") {
    const arsList = line.ars_list_unit_price ?? line.list_unit_price ?? cartLineArsReference(line)
    const arsEffective = line.price_overridden
      ? line.ars_unit_price ?? cartLineArsReference(line)
      : arsList * (1 - (Number(line.discount_percent) || 0) / 100)
    const listUsd = arsToUsd(arsList, rate)
    const unitUsd = line.price_overridden
      ? arsToUsd(arsEffective, rate)
      : roundUsd(listUsd * (1 - (Number(line.discount_percent) || 0) / 100))
    return {
      ...line,
      ars_list_unit_price: arsList,
      ars_unit_price: roundUsd(arsEffective),
      list_unit_price: listUsd,
      unit_price: unitUsd,
    }
  }
  const ars = cartLineArsReference(line)
  return { ...line, ars_unit_price: ars, unit_price: arsToUsd(ars, rate) }
}

export function convertCartLineToArs(line: PosCartLine): PosCartLine {
  if (line.kind === "catalog") {
    const arsList = line.ars_list_unit_price ?? line.list_unit_price ?? cartLineArsReference(line)
    const unit = line.price_overridden
      ? line.ars_unit_price ?? arsList
      : roundUsd(arsList * (1 - (Number(line.discount_percent) || 0) / 100))
    const next = {
      ...line,
      list_unit_price: arsList,
      unit_price: unit,
    }
    delete (next as { ars_unit_price?: number }).ars_unit_price
    delete (next as { ars_list_unit_price?: number }).ars_list_unit_price
    return next
  }
  const ars = line.ars_unit_price ?? cartLineArsReference(line)
  const next = { ...line, unit_price: ars }
  delete (next as { ars_unit_price?: number }).ars_unit_price
  return next
}

export function recalcUsdCartLine(line: PosCartLine, rate: number): PosCartLine {
  return convertCartLineToUsd(line, rate)
}

export function applyUsdUnitPriceEdit(
  line: PosCartLine,
  unitPriceUsd: number,
  rate: number
): PosCartLine {
  const usd = roundUsd(unitPriceUsd)
  return {
    ...line,
    unit_price: usd,
    ars_unit_price: usdToArs(usd, rate),
    price_overridden: line.kind === "catalog" ? true : undefined,
    discount_percent: line.kind === "catalog" ? 0 : undefined,
    discount_fixed: line.kind === "catalog" ? 0 : undefined,
  }
}

export function isUsdSale(currency: SaleCurrency | string | null | undefined): boolean {
  return String(currency ?? "ARS").toUpperCase() === "USD"
}

export function resolveSaleCurrency(currency: SaleCurrency | string | null | undefined): SaleCurrency {
  return isUsdSale(currency) ? "USD" : "ARS"
}

export function formatExchangeRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(Number(rate))) return "—"
  return Number(rate).toLocaleString("es-AR", { maximumFractionDigits: 2 })
}

export function formatUsdPriceInput(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ""
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function parseUsdPriceInput(raw: string): number {
  const normalized = raw.replace(/[^\d.,]/g, "").replace(",", ".")
  const n = parseFloat(normalized)
  if (!Number.isFinite(n) || n < 0) return 0
  return roundUsd(n)
}

export function formatArsPriceInput(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ""
  return Math.round(value).toLocaleString("es-AR")
}

export function parseArsPriceInput(raw: string): number {
  const digits = raw.replace(/\D/g, "")
  return digits === "" ? 0 : Math.max(0, parseInt(digits, 10))
}

export function currencyPricePrefix(currency: SaleCurrency): string {
  return currency === "USD" ? "U$S" : "$"
}
