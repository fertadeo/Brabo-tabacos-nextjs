import type { Sale } from "@/lib/api"
import { isImportedSale } from "@/lib/sale-import"

export function saleHasNotaCreditoEmitida(
  sale: Pick<Sale, "arca_nc_status" | "arca_nc_cae">
): boolean {
  return sale.arca_nc_status === "success" && Boolean(sale.arca_nc_cae?.trim())
}

/** Factura vigente anulada con NC: se puede corregir y emitir otra factura. */
export function saleCanRefacturar(sale: Sale): boolean {
  if (isImportedSale(sale)) return false
  if (sale.arca_status !== "success" || !sale.arca_cae?.trim()) return false
  return saleHasNotaCreditoEmitida(sale)
}

/** Venta facturada que aún puede recibir NC por API (no importada, no emitida con éxito). */
export function canEmitNotaCredito(sale: Sale): boolean {
  if (isImportedSale(sale)) return false
  if (sale.arca_status !== "success" || !sale.arca_cae?.trim()) return false
  if (saleHasNotaCreditoEmitida(sale)) return false
  return true
}

/** Permite POST /sales/:id/facturar (emisión ARCA vía API, incluida refacturación post-NC). */
export function canFacturarSaleViaApi(sale: Sale): boolean {
  if (isImportedSale(sale)) return false
  if (saleCanRefacturar(sale)) return true
  return sale.arca_status !== "success"
}

/** Permite reemitir PDF / abrir flujo de emisión sobre comprobante ya registrado. */
export function canReemitirComprobante(sale: Sale): boolean {
  if (isImportedSale(sale)) return false
  return sale.arca_status === "success"
}

export function saleHistorialFacturas(sale: Sale): number {
  const fromHistorial = (sale.arca_historial ?? []).filter((row) => row.kind === "factura").length
  if (fromHistorial > 0) return fromHistorial
  return sale.arca_status === "success" && sale.arca_cae?.trim() ? 1 : 0
}

export function saleHasComprobanteHistorial(sale: Sale): boolean {
  const rows = sale.arca_historial ?? []
  if (rows.length > 1) return true
  return saleHistorialFacturas(sale) > 1
}
