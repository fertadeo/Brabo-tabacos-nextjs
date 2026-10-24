/** DNI argentino (AFIP docTipo 96). */
export const CLIENT_TAX_ID_DNI_MIN = 7
export const CLIENT_TAX_ID_DNI_MAX = 8
export const CLIENT_TAX_ID_CUIT_LEN = 11

export type ClientTaxIdKind = "dni" | "cuil_cuit"

export function normalizeClientTaxIdDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(0, CLIENT_TAX_ID_CUIT_LEN)
}

export function classifyClientTaxId(digits: string): ClientTaxIdKind | null {
  const len = digits.length
  if (len === CLIENT_TAX_ID_CUIT_LEN) return "cuil_cuit"
  if (len >= CLIENT_TAX_ID_DNI_MIN && len <= CLIENT_TAX_ID_DNI_MAX) return "dni"
  return null
}

export function isValidClientTaxId(value: string | null | undefined): boolean {
  const digits = normalizeClientTaxIdDigits(value)
  return digits.length > 0 && classifyClientTaxId(digits) != null
}

export function isValidCuitForArcaPadron(value: string | null | undefined): boolean {
  return normalizeClientTaxIdDigits(value).length === CLIENT_TAX_ID_CUIT_LEN
}

export function docTipoFromClientTaxIdDigits(digits: string): number {
  const kind = classifyClientTaxId(digits)
  if (kind === "cuil_cuit") return 80
  if (kind === "dni") return 96
  return 99
}

/** DNI sin formato; CUIL/CUIT con guiones al superar 8 dígitos. */
export function formatClientTaxIdDisplay(value: string | null | undefined): string {
  const d = normalizeClientTaxIdDigits(value)
  if (d.length === 0) return ""
  if (d.length <= CLIENT_TAX_ID_DNI_MAX) return d
  if (d.length <= 2) return d
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

export function clientTaxIdValidationMessage(): string {
  return `Ingresá un DNI (${CLIENT_TAX_ID_DNI_MIN}-${CLIENT_TAX_ID_DNI_MAX} dígitos) o CUIL/CUIT (${CLIENT_TAX_ID_CUIT_LEN} dígitos)`
}

export function clientTaxIdFieldLabel(): string {
  return "CUIL / CUIT / DNI"
}
