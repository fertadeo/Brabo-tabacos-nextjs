/** Alicuotas de IVA soportadas en ventas POS y facturación ARCA. */
export const SALE_IVA_RATES = [21, 10.5, 0] as const

export type SaleIvaRate = (typeof SALE_IVA_RATES)[number]

export const DEFAULT_SALE_IVA_RATE: SaleIvaRate = 21

/** Códigos WSFE de alícuota IVA (AFIP). */
export const AFIP_ALICUOTA_BY_RATE: Record<SaleIvaRate, number> = {
  21: 5,
  10.5: 4,
  0: 3,
}

export function normalizeSaleIvaRate(value: unknown): SaleIvaRate {
  if (value === 10.5 || value === "10.5") return 10.5
  if (value === 0 || value === "0") return 0
  if (value === 21 || value === "21") return 21
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""))
  if (n === 10.5) return 10.5
  if (n === 0) return 0
  return DEFAULT_SALE_IVA_RATE
}

export function formatSaleIvaRateLabel(rate: SaleIvaRate): string {
  if (rate === 0) return "Exento (0%)"
  if (rate === 10.5) return "10,5%"
  return "21%"
}

/** Etiqueta de alícuota para comprobante ARCA/AFIP (columna «Alicuota IVA»). */
export function formatAlicuotaIvaArca(rate: SaleIvaRate): string {
  if (rate === 0) return "0%"
  if (rate === 10.5) return "10,5%"
  return "21%"
}

export function afipAlicuotaIdFromRate(rate: SaleIvaRate): number {
  return AFIP_ALICUOTA_BY_RATE[rate]
}

/** Los precios de venta en POS son finales (IVA incluido en el importe de línea). */
export function ivaFromInclusiveAmount(amount: number, rate: SaleIvaRate): number {
  if (rate === 0 || amount === 0) return 0
  return Math.round((amount - amount / (1 + rate / 100)) * 100) / 100
}

export function netFromInclusiveAmount(amount: number, rate: SaleIvaRate): number {
  if (rate === 0) return amount
  return Math.round((amount / (1 + rate / 100)) * 100) / 100
}

export function splitIva(lineTotal: number, ivaRate: SaleIvaRate): { neto: number; iva: number } {
  if (ivaRate === 0) return { neto: lineTotal, iva: 0 }
  const neto = netFromInclusiveAmount(lineTotal, ivaRate)
  const iva = Math.round((lineTotal - neto) * 100) / 100
  return { neto, iva }
}

/** Alícuota IVA del producto (default 21% si falta en API). */
export function productIvaRate(product: { iva_rate?: number | null }): SaleIvaRate {
  return normalizeSaleIvaRate(product.iva_rate)
}

export interface SaleIvaBreakdown {
  subtotalInclIva: number
  netoGravado: number
  iva21: number
  iva105: number
  ivaExento: number
  ivaTotal: number
}

export function computeSaleIvaBreakdown(
  items: Array<{ subtotal: number; iva_rate?: number | null }>
): SaleIvaBreakdown {
  let iva21 = 0
  let iva105 = 0
  let ivaExento = 0
  let netoGravado = 0
  let subtotalInclIva = 0

  for (const item of items) {
    const subtotal = item.subtotal
    subtotalInclIva += subtotal
    const rate = normalizeSaleIvaRate(item.iva_rate)
    if (rate === 0) {
      ivaExento += subtotal
    } else {
      const { neto, iva } = splitIva(subtotal, rate)
      netoGravado += neto
      if (rate === 21) iva21 += iva
      else if (rate === 10.5) iva105 += iva
    }
  }

  iva21 = Math.round(iva21 * 100) / 100
  iva105 = Math.round(iva105 * 100) / 100
  ivaExento = Math.round(ivaExento * 100) / 100
  netoGravado = Math.round(netoGravado * 100) / 100

  return {
    subtotalInclIva: Math.round(subtotalInclIva * 100) / 100,
    netoGravado,
    iva21,
    iva105,
    ivaExento,
    ivaTotal: Math.round((iva21 + iva105) * 100) / 100,
  }
}

export interface ArcaIvaDiscriminado {
  netoGravado: number
  iva27: number
  iva21: number
  iva105: number
  iva5: number
  iva25: number
  iva0: number
}

export interface ArcaIvaDiscriminadoRow {
  label: string
  amount: number
}

const ARCA_IVA_RATE_ROWS: Array<{ key: keyof Omit<ArcaIvaDiscriminado, "netoGravado">; label: string }> = [
  { key: "iva27", label: "IVA 27%: $" },
  { key: "iva21", label: "IVA 21%: $" },
  { key: "iva105", label: "IVA 10.5%: $" },
  { key: "iva5", label: "IVA 5%: $" },
  { key: "iva25", label: "IVA 2.5%: $" },
  { key: "iva0", label: "IVA 0%: $" },
]

/** Solo alícuotas IVA con importe distinto de cero (para pie de factura ARCA). */
export function arcaIvaDiscriminadoRows(iva: ArcaIvaDiscriminado): ArcaIvaDiscriminadoRow[] {
  return ARCA_IVA_RATE_ROWS.filter(({ key }) => Math.abs(iva[key]) >= 0.01).map(({ key, label }) => ({
    label,
    amount: iva[key],
  }))
}

/** Desglose IVA discriminado para pie de factura ARCA (todas las alícuotas AFIP, con 0 si no aplica). */
export function buildArcaIvaDiscriminado(
  items: Array<{ subtotal: number; iva_rate?: number | null }>
): ArcaIvaDiscriminado {
  const breakdown = computeSaleIvaBreakdown(items)
  return {
    netoGravado: breakdown.netoGravado,
    iva27: 0,
    iva21: breakdown.iva21,
    iva105: breakdown.iva105,
    iva5: 0,
    iva25: 0,
    iva0: 0,
  }
}

/** Agrupa líneas de venta en el array `iva[]` del facturador (Factura A/B). */
export function buildFacturadorIvaArrayFromLines(
  items: Array<{ subtotal: number; iva_rate?: number | null }>
): Array<{ id: number; base: number; cuota: number }> {
  const buckets = new Map<number, { base: number; lineTotal: number }>()

  for (const item of items) {
    const rate = normalizeSaleIvaRate(item.iva_rate)
    const id = afipAlicuotaIdFromRate(rate)
    const lineTotal = Math.round(Number(item.subtotal) * 100) / 100
    const { neto } = splitIva(lineTotal, rate)
    const prev = buckets.get(id) ?? { base: 0, lineTotal: 0 }
    buckets.set(id, {
      base: Math.round((prev.base + neto) * 100) / 100,
      lineTotal: Math.round((prev.lineTotal + lineTotal) * 100) / 100,
    })
  }

  return Array.from(buckets.entries())
    .map(([id, { base, lineTotal }]) => ({
      id,
      base,
      cuota: Math.round((lineTotal - base) * 100) / 100,
    }))
    .filter((row) => row.base !== 0 || row.cuota !== 0)
    .sort((a, b) => a.id - b.id)
}

/** importe WSFE = suma(bases) + suma(cuotas) del array iva[] del facturador. */
export function facturadorImporteFromIvaArray(
  iva: Array<{ id: number; base: number; cuota: number }>
): number {
  const total = iva.reduce((sum, row) => sum + row.base + row.cuota, 0)
  return Math.round(total * 100) / 100
}
