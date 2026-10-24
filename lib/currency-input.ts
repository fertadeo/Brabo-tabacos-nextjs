/**
 * Formato argentino para inputs de moneda: $1.000.000,00
 * - Miles con punto
 * - Decimales con coma (2 dígitos)
 */

export function formatCurrencyInput(value: number): string {
  if (value === 0 || Number.isNaN(value)) return ""
  return "$" + value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseCurrencyInput(raw: string): number {
  const s = raw.trim().replace(/^\$/, "").replace(/\s/g, "")
  if (!s) return 0
  const commaIdx = s.lastIndexOf(",")
  let intStr: string
  let decStr: string
  if (commaIdx >= 0) {
    intStr = s.slice(0, commaIdx).replace(/\./g, "")
    decStr = s.slice(commaIdx + 1).replace(/\D/g, "").slice(0, 2)
  } else {
    intStr = s.replace(/\./g, "")
    decStr = ""
  }
  const intPart = parseInt(intStr || "0", 10) || 0
  const decPart = decStr ? parseInt(decStr, 10) / Math.pow(10, decStr.length) : 0
  return Math.max(0, intPart + decPart)
}

/**
 * Monto en pesos enteros con miles (ej. $150.000) — cómodo para tipear sin forzar ,00 en cada tecla.
 */
export function formatCurrencyIntegerInput(value: number): string {
  if (value === 0 || Number.isNaN(value)) return ""
  return (
    "$" +
    Math.floor(value).toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    })
  )
}

/** Toma solo dígitos del texto = pesos enteros (estilo teclado numérico / POS). */
export function parseCurrencyIntegerDigits(raw: string): number {
  const digits = raw.replace(/\D/g, "")
  if (digits === "") return 0
  const n = parseInt(digits, 10)
  return Number.isNaN(n) ? 0 : Math.max(0, n)
}
