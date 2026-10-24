/** Formato numérico y estilos compartidos plantilla ARCA (AFIP). */
export const ARCA_TABLE_HEADER_RGB: [number, number, number] = [230, 230, 230]

/** Proporciones relativas de las 9 columnas de la tabla de ítems (con IVA discriminado). */
export const ARCA_ITEM_TABLE_COL_WEIGHTS = [9, 34, 11, 12, 16, 9, 14, 10, 16] as const

const ARCA_ITEM_TABLE_COL_WEIGHT_SUM = ARCA_ITEM_TABLE_COL_WEIGHTS.reduce((a, b) => a + b, 0)

/** Anchos en mm (PDF) escalados al ancho útil del comprobante. */
export function getArcaItemTableColumnWidthsMm(totalWidthMm: number): number[] {
  return ARCA_ITEM_TABLE_COL_WEIGHTS.map((w) => (w / ARCA_ITEM_TABLE_COL_WEIGHT_SUM) * totalWidthMm)
}

/** Porcentajes para `colgroup` en la vista previa HTML. */
export function getArcaItemTableColumnPercents(): string[] {
  return ARCA_ITEM_TABLE_COL_WEIGHTS.map((w) => `${(w / ARCA_ITEM_TABLE_COL_WEIGHT_SUM) * 100}%`)
}

/** Normaliza valores de API (string | null) a número finito. */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".")
    if (!trimmed) return fallback
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

/** Formato ARCA: decimales con coma, sin separador de miles (ej. 55000,00). */
export function moneyAr(n: number | string | null | undefined): string {
  const [intPart, dec = "00"] = toNumber(n).toFixed(2).split(".")
  return `${intPart},${dec}`
}

export function moneyArWithSymbol(n: number | string | null | undefined): string {
  return `$ ${moneyAr(n)}`
}

export function fmtDateAr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/** Etiqueta del campo documento receptor en PDF / vista previa. */
export function labelReceptorDocumento(docTipo: number | string, docNro: number | string): string {
  return toNumber(docNro, 0) > 0 ? "CUIT/CUIL: " : "Doc.: "
}

/** Muestra CUIT/CUIL del receptor en el PDF (XX-XXXXXXXX-X). Sin número → guión. */
export function formatDocReceptor(docTipo: number | string, docNro: number | string): string {
  void docTipo
  const nro = toNumber(docNro, 0)
  if (nro <= 0) return "-"
  const digits = String(Math.trunc(nro)).replace(/\D/g, "")
  if (digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
  }
  return String(nro)
}
