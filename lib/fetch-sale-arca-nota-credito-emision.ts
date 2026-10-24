import {
  getSale,
  type FacturarSaleRequest,
  type NotaCreditoEmisionData,
  type Sale,
} from "@/lib/api"
import type { FacturacionEmisionData } from "@/lib/facturacion-errors"
import { vencimientoCaeAfipAIso } from "@/lib/facturacion-errors"
import { formatComprobanteAfipReferencia } from "@/lib/facturacion-comprobantes"
import { toNumber } from "@/lib/arca-invoice-format"
import {
  buildDefaultFacturarFormRequest,
  getStoredFacturacionCuitEmisor,
  getStoredFacturacionPuntoVenta,
} from "@/lib/facturacion-settings"
import { fetchSaleArcaEmision } from "@/lib/fetch-sale-arca-emision"

function normalizeCaeVto(vto: string | null | undefined): string | null {
  if (!vto?.trim()) return null
  const raw = vto.trim()
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 8) return vencimientoCaeAfipAIso(digits)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  return raw
}

function emisionFromNotaCreditoData(
  nc: NotaCreditoEmisionData,
  sale: Sale
): FacturacionEmisionData | null {
  const cae = nc.cae?.trim()
  if (!cae) return null
  return {
    cae,
    vencimientoCaeIso: normalizeCaeVto(nc.vencimientoCaeIso ?? nc.vencimientoCae),
    facturaId: nc.facturaId ?? null,
    numero: nc.numero ?? null,
    puntoVenta: nc.puntoVenta ?? null,
    tipo: nc.tipo ?? sale.arca_nc_tipo ?? null,
    qrUrl: null,
    fechaEmision: new Date().toISOString().slice(0, 10),
    cuitEmisor: getStoredFacturacionCuitEmisor(),
    importe: sale.total_amount ?? null,
  }
}

function emisionFromSaleNcFields(sale: Sale): FacturacionEmisionData | null {
  const cae = sale.arca_nc_cae?.trim()
  if (!cae) return null
  return {
    cae,
    vencimientoCaeIso: normalizeCaeVto(sale.arca_nc_cae_vto),
    facturaId: sale.arca_nc_factura_id ?? null,
    numero: sale.arca_nc_numero ?? null,
    puntoVenta: sale.arca_nc_punto_venta ?? null,
    tipo: sale.arca_nc_tipo ?? null,
    qrUrl: null,
    fechaEmision: sale.arca_nc_last_attempt_at
      ? String(sale.arca_nc_last_attempt_at).slice(0, 10)
      : sale.sale_date
        ? String(sale.sale_date).slice(0, 10)
        : null,
    cuitEmisor: getStoredFacturacionCuitEmisor(),
    importe: sale.total_amount ?? null,
  }
}

export interface ResolvedSaleArcaNotaCreditoEmision {
  emision: FacturacionEmisionData
  facturarPayload: FacturarSaleRequest
  incomplete: boolean
  /** Referencia AFIP de la factura original (ej. B 00005-00000456). */
  comprobanteAsociadoRef: string | null
}

/**
 * Recupera datos de emisión de NC desde respuesta de emitir, fila de venta o GET /sales/:id.
 */
export async function fetchSaleArcaNotaCreditoEmision(
  sale: Sale,
  ncOverride?: NotaCreditoEmisionData | null
): Promise<ResolvedSaleArcaNotaCreditoEmision | null> {
  let emision =
    (ncOverride ? emisionFromNotaCreditoData(ncOverride, sale) : null) ??
    emisionFromSaleNcFields(sale)

  let saleRow = sale

  if (!emision?.cae) {
    try {
      const detail = await getSale(sale.id)
      saleRow = detail.data as Sale
      emision = emisionFromSaleNcFields(saleRow)
    } catch {
      /* detalle opcional */
    }
  }

  if (!emision?.cae) return null

  const invoiceResolved = await fetchSaleArcaEmision(saleRow)
  const facturarPayload =
    invoiceResolved?.facturarPayload ??
    buildDefaultFacturarFormRequest()

  if (emision.puntoVenta == null) {
    emision = {
      ...emision,
      puntoVenta:
        facturarPayload.puntoVenta ?? getStoredFacturacionPuntoVenta() ?? null,
    }
  }

  const tipoFactura =
    saleRow.arca_tipo ?? invoiceResolved?.emision.tipo ?? facturarPayload.tipo ?? 6
  const pvFactura =
    saleRow.arca_punto_venta ??
    invoiceResolved?.emision.puntoVenta ??
    facturarPayload.puntoVenta
  const nroFactura = saleRow.arca_numero ?? invoiceResolved?.emision.numero ?? null

  const comprobanteAsociadoRef =
    nroFactura != null && Number(nroFactura) >= 1
      ? formatComprobanteAfipReferencia(tipoFactura, pvFactura, nroFactura)
      : null

  const nro = emision.numero != null ? toNumber(emision.numero, NaN) : NaN
  const incomplete = !Number.isFinite(nro) || nro < 1

  return { emision, facturarPayload, incomplete, comprobanteAsociadoRef }
}
