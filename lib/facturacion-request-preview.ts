import { getApiUrl } from "@/config/api"
import type { FacturarSaleRequest } from "@/lib/api"
import { applyWsfeCondicionToFacturarPayload } from "@/lib/facturacion-form-from-cliente"
import { labelCondicionIvaReceptor } from "@/lib/facturacion-cliente-fiscal"
import { facturadorTipoRequiereIva, getTipoComprobanteLabel, resolveCondicionIvaReceptorForWsfe } from "@/lib/facturacion-comprobantes"
import type { FacturacionPreviewLine } from "@/lib/facturacion-preview-lines"
import { getStoredFacturacionCuitEmisor, getStoredFacturacionPuntoVenta } from "@/lib/facturacion-settings"
import {
  afipAlicuotaIdFromRate,
  buildFacturadorIvaArrayFromLines,
  computeSaleIvaBreakdown,
  facturadorImporteFromIvaArray,
  formatSaleIvaRateLabel,
  netFromInclusiveAmount,
  splitIva,
} from "@/lib/sale-iva"

/** Misma fusión que `facturarSale` antes del POST (CUIT emisor y PV desde localStorage). */
export function mergeFacturarSaleRequestBody(body: FacturarSaleRequest): FacturarSaleRequest {
  const storedCuit = typeof window !== "undefined" ? getStoredFacturacionCuitEmisor() : null
  const storedPv = typeof window !== "undefined" ? getStoredFacturacionPuntoVenta() : undefined
  const merged: FacturarSaleRequest = {
    ...body,
    ...(body.cuitEmisor == null && storedCuit ? { cuitEmisor: storedCuit } : {}),
    ...(body.puntoVenta == null && storedPv != null ? { puntoVenta: storedPv } : {}),
  }
  if (merged.fiscalManualConfig === true) return merged
  return applyWsfeCondicionToFacturarPayload(merged)
}

export type ExtractFacturarBodyResult =
  | { ok: true; body: FacturarSaleRequest }
  | { ok: false; error: string }

/**
 * Extrae el body de POST /sales/:id/facturar desde el JSON de vista previa
 * (objeto completo con `httpRequest.body`) o desde un body plano.
 */
export function extractFacturarBodyFromPreviewJson(raw: string): ExtractFacturarBodyResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim())
  } catch {
    return { ok: false, error: "JSON inválido. Revisá comas, comillas y llaves." }
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "El JSON debe ser un objeto." }
  }

  const root = parsed as Record<string, unknown>
  let body: Record<string, unknown> | null = null

  if (root.httpRequest && typeof root.httpRequest === "object") {
    const httpRequest = root.httpRequest as Record<string, unknown>
    if (httpRequest.body && typeof httpRequest.body === "object") {
      body = httpRequest.body as Record<string, unknown>
    }
  }

  if (
    !body &&
    ("tipo" in root || "condicionIvaReceptor" in root || "docTipo" in root || "concepto" in root)
  ) {
    body = root
  }

  if (!body) {
    return {
      ok: false,
      error:
        "No se encontró httpRequest.body. Editá esa sección o pegá un objeto con tipo, condicionIvaReceptor y docTipo.",
    }
  }

  return {
    ok: true,
    body: {
      ...(body as FacturarSaleRequest),
      fiscalManualConfig: true,
      skipPadronCondicionCheck: true,
    },
  }
}

export interface FacturarHttpRequestPreview {
  method: "POST"
  url: string
  saleId: number
  body: FacturarSaleRequest
}

/** Vista previa del request HTTP que enviará `facturarSale` (sin cabeceras de auth). */
export function buildFacturarHttpRequestPreview(
  saleId: number,
  body: FacturarSaleRequest
): FacturarHttpRequestPreview {
  return {
    method: "POST",
    url: `${getApiUrl()}sales/${saleId}/facturar`,
    saleId,
    body: mergeFacturarSaleRequestBody(body),
  }
}

function conceptoLabel(concepto?: number): string {
  if (concepto === 2) return "Servicios"
  if (concepto === 3) return "Productos + servicios"
  return "Productos"
}

function argentinaTodayYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

function normalizeFechaYmd(value?: string | null): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

function resolveFechaComprobante(fechaCbte?: string | null): string {
  return normalizeFechaYmd(fechaCbte) ?? argentinaTodayYmd()
}

export interface FacturarFullPayloadPreviewReceptor {
  razonSocial: string
  docTipo: number
  docNro: number
  /** Condición enviada a WSFE (httpRequest / facturador). */
  condicionIvaReceptor: number
  condicionIvaLabel: string
  /** Condición fiscal en ERP/padrón cuando difiere del código WSFE (ej. monotributo 6 → WSFE 5). */
  condicionIvaReceptorErp?: number
  condicionIvaErpLabel?: string
  taxConditionEnErp?: string | null
  domicilio?: string | null
}

export interface BuildFacturarFullPayloadPreviewArgs {
  saleId: number
  saleNumber?: string | null
  clientId?: number | null
  facturarPayload: FacturarSaleRequest
  lines: FacturacionPreviewLine[]
  receptor: FacturarFullPayloadPreviewReceptor
  saleDate?: string | null
  fechaCbte?: string | null
  totalAmount?: number | null
}

export interface FacturadorEmitirPayloadPreview {
  cuitEmisor: number
  tipo: number
  puntoVenta: number
  docTipo: number
  docNro?: string
  condicionIvaReceptor: number
  concepto: number
  importe: number
  iva?: Array<{ id: number; base: number; cuota: number }>
  fechaServicioDesde?: string
  fechaServicioHasta?: string
  fechaVencimientoPago?: string
  condicionVenta?: string
  receptorRazonSocial?: string
  receptorDomicilio?: string
  omitirPdf: boolean
  nota?: string
}

export interface FacturarFullPayloadPreview {
  descripcion: string
  nota: string
  httpRequest: FacturarHttpRequestPreview
  /** Payload que el backend arma y envía a POST /api/facturas del facturador ARCA. */
  facturadorPayload: FacturadorEmitirPayloadPreview
  venta: {
    saleId: number
    saleNumber?: string | null
    clientId?: number | null
    saleDate?: string
    fechaComprobante: string
    notaFechaComprobante: string
  }
  emisor: {
    cuitEmisor?: string | null
    puntoVenta?: number | null
  }
  receptor: FacturarFullPayloadPreviewReceptor
  comprobante: {
    tipo: number
    tipoLabel: string
    concepto: number
    conceptoLabel: string
    fechaServicioDesde?: string
    fechaServicioHasta?: string
    notaFechasServicio?: string
    force?: boolean
  }
  items: Array<Record<string, string | number>>
  totales: Record<string, number>
}

/**
 * JSON completo para depuración: request HTTP + datos efectivos del comprobante.
 * Los ítems no van en el POST; el backend los toma de `sale_items` (misma fuente que esta preview).
 */
export function buildFacturarFullPayloadPreview(
  args: BuildFacturarFullPayloadPreviewArgs
): FacturarFullPayloadPreview {
  const body = mergeFacturarSaleRequestBody(args.facturarPayload)
  const tipo = body.tipo ?? 6
  const concepto = body.concepto ?? 1
  const condicionErp = body.condicionIvaReceptor ?? 5
  const condicionWsfe =
    body.fiscalManualConfig === true
      ? condicionErp
      : resolveCondicionIvaReceptorForWsfe(tipo, condicionErp)
  const requiereIva = facturadorTipoRequiereIva(tipo)
  const fechaComprobante = resolveFechaComprobante(args.fechaCbte)
  const saleDate = normalizeFechaYmd(args.saleDate)

  const lineInputs = args.lines.map((line) => ({ subtotal: line.subtotal, iva_rate: line.ivaRate }))

  const items = requiereIva
    ? args.lines.map((line) => {
        const isExento = line.ivaRate === 0
        if (isExento) {
          return {
            descripcion: line.description,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            subtotal: line.subtotal,
            iva_rate: 0,
            iva_rate_label: formatSaleIvaRateLabel(0),
            alicuota_afip_id: afipAlicuotaIdFromRate(0),
            importe_exento: Math.round(line.subtotal * 100) / 100,
            nota: "En iva[] del facturador va como { id: 3, base: subtotal, cuota: 0 }; no es neto gravado.",
          }
        }
        const neto = line.neto ?? splitIva(line.subtotal, line.ivaRate).neto
        const iva = line.iva ?? splitIva(line.subtotal, line.ivaRate).iva
        return {
          descripcion: line.description,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          iva_rate: line.ivaRate,
          iva_rate_label: formatSaleIvaRateLabel(line.ivaRate),
          alicuota_afip_id: afipAlicuotaIdFromRate(line.ivaRate),
          subtotal: line.subtotal,
          neto_gravado: Math.round(neto * 100) / 100,
          iva: Math.round(iva * 100) / 100,
          precio_unitario_neto: Math.round(netFromInclusiveAmount(line.unitPrice, line.ivaRate) * 100) / 100,
        }
      })
    : args.lines.map((line) => ({
        descripcion: line.description,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        subtotal: line.subtotal,
      }))

  const ivaBreakdown = computeSaleIvaBreakdown(lineInputs)
  const linesSubtotal = args.lines.reduce((acc, l) => acc + l.subtotal, 0)
  const importeTotal = Math.round((args.totalAmount ?? linesSubtotal) * 100) / 100

  const cuitEmisorRaw = body.cuitEmisor ?? getStoredFacturacionCuitEmisor() ?? ""
  const cuitEmisor = Number(String(cuitEmisorRaw).replace(/\D/g, ""))
  const puntoVenta = body.puntoVenta ?? getStoredFacturacionPuntoVenta() ?? 1
  const docTipo = body.docTipo ?? 99
  const docNroRaw = body.docNro != null ? String(body.docNro).replace(/\D/g, "") : ""

  const ivaArray = requiereIva ? buildFacturadorIvaArrayFromLines(lineInputs) : undefined

  const facturadorPayload: FacturadorEmitirPayloadPreview = {
    cuitEmisor,
    tipo,
    puntoVenta,
    docTipo,
    condicionIvaReceptor: condicionWsfe,
    concepto,
    importe: requiereIva && ivaArray?.length
      ? facturadorImporteFromIvaArray(ivaArray)
      : importeTotal,
    omitirPdf: true,
  }

  if (docNroRaw && docNroRaw !== "0") {
    facturadorPayload.docNro = docNroRaw
  }

  if (requiereIva && ivaArray) {
    facturadorPayload.iva = ivaArray
  } else if (!requiereIva) {
    facturadorPayload.nota = "Factura C: no se envía el array iva[] al facturador ARCA."
  }

  if (concepto === 2 || concepto === 3) {
    const desde = normalizeFechaYmd(body.fechaServicioDesde)
    const hasta = normalizeFechaYmd(body.fechaServicioHasta)
    if (desde) facturadorPayload.fechaServicioDesde = desde
    if (hasta) facturadorPayload.fechaServicioHasta = hasta
    const vto = normalizeFechaYmd(body.fechaVencimientoPago)
    if (vto) facturadorPayload.fechaVencimientoPago = vto
  }

  if (body.condicionVenta?.trim()) {
    facturadorPayload.condicionVenta = body.condicionVenta.trim()
  }
  if (body.receptorRazonSocial?.trim()) {
    facturadorPayload.receptorRazonSocial = body.receptorRazonSocial.trim()
  }
  if (body.receptorDomicilio?.trim()) {
    facturadorPayload.receptorDomicilio = body.receptorDomicilio.trim()
  }

  const totales = requiereIva
    ? {
        neto_gravado: Math.round(ivaBreakdown.netoGravado * 100) / 100,
        importe_exento: Math.round(ivaBreakdown.ivaExento * 100) / 100,
        iva_discriminado: Math.round(ivaBreakdown.ivaTotal * 100) / 100,
        iva_21: Math.round(ivaBreakdown.iva21 * 100) / 100,
        iva_10_5: Math.round(ivaBreakdown.iva105 * 100) / 100,
        importe_total: importeTotal,
      }
    : {
        importe_total: importeTotal,
      }

  const comprobante: FacturarFullPayloadPreview["comprobante"] = {
    tipo,
    tipoLabel: getTipoComprobanteLabel(tipo),
    concepto,
    conceptoLabel: conceptoLabel(concepto),
    force: body.force ?? false,
  }

  if (concepto === 2 || concepto === 3) {
    comprobante.fechaServicioDesde = normalizeFechaYmd(body.fechaServicioDesde)
    comprobante.fechaServicioHasta = normalizeFechaYmd(body.fechaServicioHasta)
  } else {
    comprobante.notaFechasServicio =
      "No aplica: fechas de servicio solo son obligatorias con concepto 2 (servicios) o 3 (productos + servicios)."
  }

  return {
    descripcion: "Vista previa del comprobante fiscal (frontend + venta ERP)",
    nota:
      "httpRequest.body es lo que envía el navegador en POST /sales/:id/facturar. " +
      "facturadorPayload es lo que el backend envía a POST /api/facturas (MultiFacturador). " +
      "receptor.condicionIvaReceptor es el código WSFE (igual que httpRequest.body). " +
      "condicionIvaReceptorErp, si aparece, es la condición del padrón/ERP. " +
      "items y totales son del ERP; importe = suma(iva[].base + iva[].cuota). " +
      "Ítems exentos (0%): importe_exento en ERP, base en iva id 3 — no neto_gravado.",
    httpRequest: {
      method: "POST",
      url: `${getApiUrl()}sales/${args.saleId}/facturar`,
      saleId: args.saleId,
      body,
    },
    facturadorPayload,
    venta: {
      saleId: args.saleId,
      saleNumber: args.saleNumber,
      clientId: args.clientId,
      saleDate,
      fechaComprobante,
      notaFechaComprobante:
        "ARCA asigna la fecha del comprobante al emitir (fecha de proceso). No se envía fechaCbte en el payload.",
    },
    emisor: {
      cuitEmisor: body.cuitEmisor ?? getStoredFacturacionCuitEmisor(),
      puntoVenta: body.puntoVenta ?? getStoredFacturacionPuntoVenta() ?? null,
    },
    receptor: (() => {
      const condicionWsfe = body.condicionIvaReceptor ?? 5
      const condicionErp = args.receptor.condicionIvaReceptor
      const receptor: FacturarFullPayloadPreviewReceptor = {
        ...args.receptor,
        condicionIvaReceptor: condicionWsfe,
        condicionIvaLabel: labelCondicionIvaReceptor(condicionWsfe),
      }
      if (condicionErp !== condicionWsfe) {
        receptor.condicionIvaReceptorErp = condicionErp
        receptor.condicionIvaErpLabel = labelCondicionIvaReceptor(condicionErp)
      }
      return receptor
    })(),
    comprobante,
    items,
    totales,
  }
}
