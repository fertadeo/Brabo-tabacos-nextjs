import { labelCondicionIvaReceptor } from "@/lib/facturacion-cliente-fiscal"
import { resolveCondicionIvaReceptorForWsfe } from "@/lib/facturacion-comprobantes"

export interface PadronCondicionValidationResult {
  checked: boolean
  coincide: boolean
  condicionEnviada: number
  condicionSugerida?: number | null
  condicionSugeridaLabel?: string | null
  message?: string
  unavailable?: boolean
}

export function shouldConsultarPadronCondicionIva(
  docTipo?: number,
  docNro?: number | string | null
): boolean {
  const tipo = Number(docTipo ?? 99)
  if (tipo !== 80) return false
  const digits = String(docNro ?? "").replace(/\D/g, "")
  return digits.length === 11 && digits !== "0"
}

export function validateCondicionIvaConPadronSugerencia(
  condicionEnviada: number,
  sugerenciaPadron: number | null | undefined,
  tipoComprobante?: number
): PadronCondicionValidationResult {
  const condicion = Number(condicionEnviada)
  if (sugerenciaPadron == null || !Number.isFinite(Number(sugerenciaPadron))) {
    return {
      checked: false,
      coincide: false,
      condicionEnviada: condicion,
      unavailable: true,
      message: "No se pudo validar la condición IVA contra el padrón ARCA.",
    }
  }

  const sugerida = Number(sugerenciaPadron)
  const coincide =
    condicion === sugerida ||
    (tipoComprobante != null &&
      resolveCondicionIvaReceptorForWsfe(tipoComprobante, sugerida) === condicion)
  return {
    checked: true,
    coincide,
    condicionEnviada: condicion,
    condicionSugerida: sugerida,
    condicionSugeridaLabel: labelCondicionIvaReceptor(sugerida),
    message: coincide
      ? undefined
      : `La condición IVA del comprobante (${condicion} — ${labelCondicionIvaReceptor(condicion)}) no coincide con el padrón ARCA (${sugerida} — ${labelCondicionIvaReceptor(sugerida)}).`,
  }
}

export function formatCondicionPadronMismatchHint(result: PadronCondicionValidationResult): string | null {
  if (!result.checked || result.coincide) return null
  return (
    result.message ??
    `El padrón ARCA sugiere condición ${result.condicionSugerida} (${result.condicionSugeridaLabel ?? "—"}).`
  )
}
