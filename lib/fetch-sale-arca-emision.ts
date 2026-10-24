import { getSale, type FacturarSaleRequest, type Sale } from "@/lib/api"
import type { FacturacionEmisionData } from "@/lib/facturacion-errors"
import {
  extractFacturacionEmisionFromResponse,
  vencimientoCaeAfipAIso,
} from "@/lib/facturacion-errors"
import { getCachedFacturacionEmision } from "@/lib/facturacion-emision-cache"
import { toNumber } from "@/lib/arca-invoice-format"
import {
  buildDefaultFacturarFormRequest,
  getStoredFacturacionCuitEmisor,
  getStoredFacturacionPuntoVenta,
} from "@/lib/facturacion-settings"
import { condicionVentaFieldsFromSale } from "@/lib/condicion-venta"
import { parseAfipQrReceptorDoc } from "@/lib/arca-invoice-afip-qr"
import { extractDocFromArcaRequest } from "@/lib/facturacion-receptor-doc"

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v)
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

function pickNumber(...values: unknown[]): number | null {
  for (const v of values) {
    if (typeof v === "number" && !Number.isNaN(v)) return v
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v)
  }
  return null
}

function normalizeCaeVto(vto: string | null | undefined): string | null {
  if (!vto?.trim()) return null
  const raw = vto.trim()
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 8) return vencimientoCaeAfipAIso(digits)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  return raw
}

/** Campos ARCA que el backend puede persistir en `sales` (contrato recomendado). */
function extractEmisionFromSaleRow(sale: Sale | Record<string, unknown>): FacturacionEmisionData | null {
  const row = sale as Record<string, unknown>
  const cae = pickString(row.arca_cae)
  if (!cae) return null

  return {
    cae,
    vencimientoCaeIso: normalizeCaeVto(pickString(row.arca_cae_vto)),
    facturaId: pickString(row.arca_factura_id),
    numero: pickNumber(row.arca_numero, row.arca_comprobante_numero, row.arca_nro),
    puntoVenta: pickNumber(row.arca_punto_venta, row.arca_puntoVenta),
    tipo: pickNumber(row.arca_tipo, row.arca_tipo_comprobante),
    qrUrl: pickString(row.arca_qr_url, row.arca_qrUrl),
    fechaEmision: pickString(row.arca_fecha_emision)?.slice(0, 10) ?? null,
    cuitEmisor: pickString(row.arca_cuit_emisor)?.replace(/\D/g, "") ?? null,
    importe: toNumber(pickNumber(row.arca_importe, row.total_amount)),
  }
}

function mergeEmision(
  base: FacturacionEmisionData,
  extra: FacturacionEmisionData | null
): FacturacionEmisionData {
  if (!extra) return base
  return {
    cae: extra.cae || base.cae,
    vencimientoCaeIso: extra.vencimientoCaeIso ?? base.vencimientoCaeIso,
    facturaId: extra.facturaId ?? base.facturaId,
    numero: extra.numero ?? base.numero,
    puntoVenta: extra.puntoVenta ?? base.puntoVenta,
    tipo: extra.tipo ?? base.tipo,
    qrUrl: extra.qrUrl ?? base.qrUrl,
    fechaEmision: extra.fechaEmision ?? base.fechaEmision,
    cuitEmisor: extra.cuitEmisor ?? base.cuitEmisor,
    importe: extra.importe ?? base.importe,
  }
}

function tryParseStoredArcaJson(raw: unknown): FacturacionEmisionData | null {
  if (typeof raw === "string") {
    try {
      return extractFacturacionEmisionFromResponse({ data: JSON.parse(raw) as Record<string, unknown> })
    } catch {
      return null
    }
  }
  if (isRecord(raw)) {
    return extractFacturacionEmisionFromResponse({ data: { arca: { response: raw } } })
  }
  return null
}

export interface ResolvedSaleArcaEmision {
  emision: FacturacionEmisionData
  facturarPayload: FacturarSaleRequest
  /** true si falta número AFIP (preview posible pero QR / Comp. Nro incompletos). */
  incomplete: boolean
  sources: ("session" | "sale_row" | "sale_detail")[]
}

/**
 * Recupera datos de emisión desde: caché de sesión, fila de venta (GET /sales) y detalle (GET /sales/:id).
 * No llama al facturador externo; solo MF API.
 */
export async function fetchSaleArcaEmision(sale: Sale): Promise<ResolvedSaleArcaEmision | null> {
  const cached = getCachedFacturacionEmision(sale.id)
  const defaults = buildDefaultFacturarFormRequest()
  const fromSaleCondicion = condicionVentaFieldsFromSale(sale)
  let facturarPayload = {
    ...defaults,
    ...fromSaleCondicion,
    ...(cached?.facturarPayload ?? {}),
    ...extractDocFromArcaRequest(sale),
  }

  const fromRow = extractEmisionFromSaleRow(sale)
  const cae = pickString(sale.arca_cae, fromRow?.cae, cached?.emision.cae)
  if (!cae) return null

  let emision: FacturacionEmisionData = {
    cae,
    vencimientoCaeIso:
      cached?.emision.vencimientoCaeIso ??
      fromRow?.vencimientoCaeIso ??
      normalizeCaeVto(sale.arca_cae_vto),
    facturaId: sale.arca_factura_id ?? cached?.emision.facturaId ?? fromRow?.facturaId ?? null,
    numero: cached?.emision.numero ?? fromRow?.numero ?? null,
    puntoVenta:
      cached?.emision.puntoVenta ??
      fromRow?.puntoVenta ??
      facturarPayload.puntoVenta ??
      getStoredFacturacionPuntoVenta() ??
      null,
    tipo: cached?.emision.tipo ?? fromRow?.tipo ?? facturarPayload.tipo ?? defaults.tipo ?? 6,
    qrUrl: cached?.emision.qrUrl ?? fromRow?.qrUrl ?? null,
    fechaEmision:
      cached?.emision.fechaEmision ??
      fromRow?.fechaEmision ??
      (sale.sale_date ? String(sale.sale_date).slice(0, 10) : null),
    cuitEmisor:
      cached?.emision.cuitEmisor ?? fromRow?.cuitEmisor ?? getStoredFacturacionCuitEmisor() ?? null,
    importe: toNumber(cached?.emision.importe ?? fromRow?.importe ?? sale.total_amount),
  }

  const sources: ResolvedSaleArcaEmision["sources"] = []
  if (cached?.emision.cae) sources.push("session")
  if (fromRow?.cae) sources.push("sale_row")

  try {
    const detail = await getSale(sale.id)
    const data = detail.data as Record<string, unknown>

    const fromDetailRow = extractEmisionFromSaleRow(data as Sale)
    if (fromDetailRow) {
      emision = mergeEmision(emision, fromDetailRow)
      sources.push("sale_detail")
    }

    const fromNested = extractFacturacionEmisionFromResponse({
      data: {
        sale: data,
        arca: isRecord(data.arca) ? data.arca : undefined,
      },
    })
    if (fromNested) {
      emision = mergeEmision(emision, fromNested)
      if (!sources.includes("sale_detail")) sources.push("sale_detail")
    }

    const storedJson = tryParseStoredArcaJson(
      data.arca_response ?? data.arca_last_response ?? data.arca_payload
    )
    if (storedJson) {
      emision = mergeEmision(emision, storedJson)
      if (!sources.includes("sale_detail")) sources.push("sale_detail")
    }

    const fromDetailArcaRequest = extractDocFromArcaRequest(data as Sale)
    if (Object.keys(fromDetailArcaRequest).length > 0) {
      facturarPayload = { ...facturarPayload, ...fromDetailArcaRequest }
    }
  } catch {
    /* detalle opcional */
  }

  const fromQr = parseAfipQrReceptorDoc(emision.qrUrl)
  if (fromQr.docNro) {
    facturarPayload = {
      ...facturarPayload,
      docTipo: fromQr.docTipo ?? 80,
      docNro: fromQr.docNro,
    }
  }

  const nro = emision.numero != null ? toNumber(emision.numero, NaN) : NaN
  const incomplete = !Number.isFinite(nro) || nro < 1

  return { emision, facturarPayload, incomplete, sources }
}
