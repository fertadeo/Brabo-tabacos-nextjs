import type { FacturarSaleRequest, Sale } from "@/lib/api"
import type { ArcaPadronResult } from "@/lib/arca-padron"
import { formatTaxConditionLabel } from "@/lib/client-tax-condition"
import {
  classifyClientTaxId,
  formatClientTaxIdDisplay,
  isValidClientTaxId,
} from "@/lib/client-tax-id"
import { resolveTipoComprobanteFromCondicionIvaReceptor } from "@/lib/facturacion-cliente-fiscal"
import { clienteCuitDigitos } from "@/lib/facturacion-form-from-cliente"

export function soloDigitosDoc(s?: string | null): string {
  return (s ?? "").replace(/\D/g, "")
}

/** Formato visual: DNI plano o CUIL/CUIT con guiones. */
export function formatCuitInputDisplay(value: string): string {
  return formatClientTaxIdDisplay(value)
}

export function receptorCuitInputFromForm(
  form: FacturarSaleRequest,
  clienteCuil?: string | null,
  clientePrimaryTaxId?: string | null
): string {
  if (form.docTipo === 99) return ""
  if ((form.docTipo === 80 || form.docTipo === 96) && form.docNro != null && form.docNro > 0) {
    return formatCuitInputDisplay(String(form.docNro))
  }
  const d = soloDigitosDoc(clienteCuil) || soloDigitosDoc(clientePrimaryTaxId)
  if (classifyClientTaxId(d)) return formatCuitInputDisplay(d)
  return ""
}

/** CUIT del cliente ERP para mostrar en confirmación (cuil_cuit o primary_tax_id). */
export function clienteCuitForDisplay(cliente?: { cuil_cuit?: string | null; primary_tax_id?: string } | null): string {
  return clienteCuitDigitos(cliente as Parameters<typeof clienteCuitDigitos>[0])
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v)
}

function docNroFromUnknown(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined
  const digits = String(value).replace(/\D/g, "")
  if (!digits || digits === "0") return undefined
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Extrae docTipo/docNro del request persistido al emitir o campos planos del GET /sales. */
export function extractDocFromArcaRequest(
  sale: Sale | Record<string, unknown>
): Pick<FacturarSaleRequest, "docTipo" | "docNro" | "condicionIvaReceptor" | "tipo"> {
  const row = sale as Record<string, unknown>
  const out: Pick<FacturarSaleRequest, "docTipo" | "docNro" | "condicionIvaReceptor" | "tipo"> = {}

  const flatTipo = row.arca_receptor_doc_tipo
  const flatNro = row.arca_receptor_doc_nro
  if (flatTipo != null && !Number.isNaN(Number(flatTipo))) {
    out.docTipo = Number(flatTipo)
  }
  const flatDocNro = docNroFromUnknown(flatNro)
  if (flatDocNro != null) out.docNro = flatDocNro

  const req = row.arca_request_json
  if (isRecord(req)) {
    if (req.docTipo != null && !Number.isNaN(Number(req.docTipo))) {
      out.docTipo = Number(req.docTipo)
    }
    const reqDocNro = docNroFromUnknown(req.docNro)
    if (reqDocNro != null) out.docNro = reqDocNro
    if (req.condicionIvaReceptor != null && !Number.isNaN(Number(req.condicionIvaReceptor))) {
      out.condicionIvaReceptor = Number(req.condicionIvaReceptor)
    }
    if (req.tipo != null && !Number.isNaN(Number(req.tipo))) {
      out.tipo = Number(req.tipo)
    }
  }

  return out
}

/** docTipo/docNro efectivos para PDF y vista previa (QR / request / payload / cliente ERP). */
export function resolveReceptorDocForInvoicePdf(
  payload: FacturarSaleRequest,
  cliente?: { cuil_cuit?: string | null; primary_tax_id?: string } | null,
  hints?: { docTipo?: number; docNro?: number }
): { docTipo: number; docNro: number } {
  const hintNro = hints?.docNro ?? 0
  if (hintNro > 0) {
    return { docTipo: hints?.docTipo ?? 80, docNro: hintNro }
  }

  const payloadNro = payload.docNro ?? 0
  if ((payload.docTipo ?? 99) === 80 && payloadNro > 0) {
    return { docTipo: 80, docNro: payloadNro }
  }
  if (payloadNro > 0) {
    return { docTipo: payload.docTipo ?? 80, docNro: payloadNro }
  }

  const cuit = clienteCuitDigitos(cliente as Parameters<typeof clienteCuitDigitos>[0])
  const kind = classifyClientTaxId(cuit)
  if (kind === "cuil_cuit") {
    return { docTipo: 80, docNro: parseInt(cuit, 10) }
  }
  if (kind === "dni") {
    return { docTipo: 96, docNro: parseInt(cuit, 10) }
  }

  return { docTipo: payload.docTipo ?? 99, docNro: payloadNro }
}

export function isReceptorCuitInputInvalid(rawInput: string): boolean {
  const d = soloDigitosDoc(rawInput)
  return d.length > 0 && !isValidClientTaxId(d)
}

export interface ClienteFiscalSnapshot {
  condicionIvaReceptor: number
  tipoComprobante: number
}

/**
 * Actualiza docTipo/docNro (y condición CF si corresponde) según el CUIT ingresado en confirmación.
 * Vacío → consumidor final (docTipo 99, docNro 0, condición IVA 5).
 */
export function applyReceptorCuitToFacturarForm(
  prev: FacturarSaleRequest,
  rawInput: string,
  fiscalFromCliente?: ClienteFiscalSnapshot | null
): FacturarSaleRequest {
  const digits = soloDigitosDoc(rawInput)

  if (digits.length === 0) {
    return {
      ...prev,
      docTipo: 99,
      docNro: 0,
      condicionIvaReceptor: 5,
      tipo: resolveTipoComprobanteFromCondicionIvaReceptor(5),
    }
  }

  const kind = classifyClientTaxId(digits)
  if (!kind) {
    return prev
  }

  const next: FacturarSaleRequest = {
    ...prev,
    docTipo: kind === "cuil_cuit" ? 80 : 96,
    docNro: parseInt(digits, 10),
  }

  if (
    fiscalFromCliente &&
    prev.condicionIvaReceptor === 5 &&
    fiscalFromCliente.condicionIvaReceptor !== 5
  ) {
    next.condicionIvaReceptor = fiscalFromCliente.condicionIvaReceptor
    next.tipo = fiscalFromCliente.tipoComprobante
  }

  return next
}

/** Aplica condición IVA y tipo de comprobante desde padrón ARCA (misma lógica que alta de clientes). */
export function applyPadronToFacturarForm(
  prev: FacturarSaleRequest,
  padron: ArcaPadronResult
): FacturarSaleRequest {
  const digits = soloDigitosDoc(padron.cuit)
  if (digits.length !== 11) return prev

  const condicion =
    padron.condicionIvaCodigo != null && padron.condicionIvaCodigo > 0
      ? padron.condicionIvaCodigo
      : (prev.condicionIvaReceptor ?? 5)

  return {
    ...prev,
    docTipo: 80,
    docNro: parseInt(digits, 10),
    condicionIvaReceptor: condicion,
    tipo: resolveTipoComprobanteFromCondicionIvaReceptor(condicion),
  }
}

export interface FacturacionVentaDestinatario {
  name: string
  cuitDigits: string
  cuitFormatted: string | null
  condicionLabel: string
}

export function buildVentaDestinatarioSnapshot(
  saleClientName: string | null | undefined,
  billableClientName: string | null | undefined,
  clienteCuil?: string | null,
  taxCondition?: string | null,
  clientePrimaryTaxId?: string | null
): FacturacionVentaDestinatario {
  const name = (saleClientName || billableClientName || "Consumidor final").trim()
  const cuitDigits = soloDigitosDoc(clienteCuil) || soloDigitosDoc(clientePrimaryTaxId)
  return {
    name,
    cuitDigits,
    cuitFormatted: classifyClientTaxId(cuitDigits) ? formatCuitInputDisplay(cuitDigits) : null,
    condicionLabel: formatTaxConditionLabel(taxCondition, "Sin datos fiscales en ERP"),
  }
}

export function isFacturacionDestinatarioChanged(
  venta: FacturacionVentaDestinatario,
  opts: {
    esConsumidorFinal: boolean
    receptorCuitDigits: string
    padronDisplayName?: string | null
  }
): boolean {
  if (opts.esConsumidorFinal) {
    return classifyClientTaxId(venta.cuitDigits) != null || venta.name.toLowerCase() !== "consumidor final"
  }
  if (opts.receptorCuitDigits.length > 0 && opts.receptorCuitDigits !== venta.cuitDigits) {
    return true
  }
  if (opts.padronDisplayName) {
    return opts.padronDisplayName.trim().toUpperCase() !== venta.name.trim().toUpperCase()
  }
  return false
}

export function requiresPadronForReceptorCuit(
  ventaCuitDigits: string,
  receptorCuitDigits: string,
  esConsumidorFinal: boolean
): boolean {
  if (esConsumidorFinal) return false
  return classifyClientTaxId(receptorCuitDigits) === "cuil_cuit"
}
