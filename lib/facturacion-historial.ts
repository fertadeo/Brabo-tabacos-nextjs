import type { FacturarSaleRequest, Sale, SaleComprobanteHistorial, SaleItemResponse } from "@/lib/api"
import type { FacturacionEmisionData } from "@/lib/facturacion-errors"
import {
  formatComprobanteAfipReferencia,
  formatNumeroComprobanteAfip,
  formatPuntoVentaAfip,
  getComprobanteArcaTitulo,
  isNotaCreditoTipoAfip,
} from "@/lib/facturacion-comprobantes"
import { vencimientoCaeAfipAIso } from "@/lib/facturacion-errors"

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v)
}

function pickNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v)
  return undefined
}

export function historialComprobanteLabel(row: SaleComprobanteHistorial): string {
  const titulo =
    row.tipo != null
      ? getComprobanteArcaTitulo(row.tipo)
      : row.kind === "nota_credito"
        ? "NOTA DE CRÉDITO"
        : "FACTURA"
  if (row.punto_venta != null && row.numero != null) {
    return `${titulo} ${formatPuntoVentaAfip(row.punto_venta)}-${formatNumeroComprobanteAfip(row.numero)}`
  }
  return titulo
}

export function historialComprobanteRef(row: SaleComprobanteHistorial): string | null {
  if (row.tipo == null || row.numero == null) return null
  return formatComprobanteAfipReferencia(row.tipo, row.punto_venta, row.numero)
}

export function emisionFromHistorialComprobante(
  row: SaleComprobanteHistorial
): FacturacionEmisionData | null {
  const cae = row.cae?.trim()
  if (!cae) return null
  const vto = row.cae_vto?.trim()
  let vencimientoCaeIso: string | null = null
  if (vto) {
    const digits = vto.replace(/\D/g, "")
    vencimientoCaeIso = digits.length === 8 ? vencimientoCaeAfipAIso(digits) : vto.slice(0, 10)
  }
  return {
    cae,
    vencimientoCaeIso,
    facturaId: row.factura_id ?? null,
    numero: row.numero ?? null,
    puntoVenta: row.punto_venta ?? null,
    tipo: row.tipo ?? null,
    qrUrl: row.qr_url ?? null,
    fechaEmision: row.fecha_emision?.slice(0, 10) ?? row.emitted_at?.slice(0, 10) ?? null,
    cuitEmisor: row.cuit_emisor ?? null,
  }
}

export function facturarPayloadFromHistorialComprobante(
  row: SaleComprobanteHistorial
): FacturarSaleRequest {
  const req = row.request_json
  if (!isRecord(req)) {
    return {
      tipo: row.tipo ?? undefined,
      puntoVenta: row.punto_venta ?? undefined,
    }
  }
  const conceptoRaw = pickNumber(req.concepto)
  return {
    cuitEmisor: req.cuitEmisor != null ? String(req.cuitEmisor) : undefined,
    puntoVenta: pickNumber(req.puntoVenta) ?? row.punto_venta ?? undefined,
    docTipo: pickNumber(req.docTipo),
    docNro: pickNumber(req.docNro),
    tipo: pickNumber(req.tipo) ?? row.tipo ?? undefined,
    condicionIvaReceptor: pickNumber(req.condicionIvaReceptor),
    concepto: conceptoRaw === 2 || conceptoRaw === 3 ? conceptoRaw : 1,
    fechaServicioDesde: typeof req.fechaServicioDesde === "string" ? req.fechaServicioDesde : undefined,
    fechaServicioHasta: typeof req.fechaServicioHasta === "string" ? req.fechaServicioHasta : undefined,
    condicionVenta: typeof req.condicionVenta === "string" ? req.condicionVenta : undefined,
    receptorRazonSocial: typeof req.receptorRazonSocial === "string" ? req.receptorRazonSocial : undefined,
    receptorDomicilio: typeof req.receptorDomicilio === "string" ? req.receptorDomicilio : undefined,
  }
}

export function itemsFromHistorialComprobante(row: SaleComprobanteHistorial): SaleItemResponse[] {
  return (row.items_json ?? []).map((item, index) => ({
    id: index + 1,
    product_id: item.product_id,
    product_name: item.product_name ?? item.description ?? null,
    product_code: item.product_code ?? null,
    description: item.description ?? null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    iva_rate: item.iva_rate,
    subtotal: item.total_price,
  }))
}

export function historialPreviewAviso(row: SaleComprobanteHistorial): string | undefined {
  const tipo = row.tipo
  if (tipo == null || !isNotaCreditoTipoAfip(tipo)) return undefined
  const req = row.request_json
  const asoc = isRecord(req) && Array.isArray(req.cbtesAsoc) ? req.cbtesAsoc[0] : null
  if (!isRecord(asoc)) return undefined
  const tipoAsoc = pickNumber(asoc.tipo)
  const pv = pickNumber(asoc.ptoVta)
  const nro = pickNumber(asoc.nro)
  if (tipoAsoc == null || nro == null) return undefined
  return `Anula comprobante ${formatComprobanteAfipReferencia(tipoAsoc, pv, nro)}`
}

export function visibleSaleHistorial(sale: Sale): SaleComprobanteHistorial[] {
  return (sale.arca_historial ?? []).filter((row) => row.status === "success" && Boolean(row.cae?.trim()))
}
