import type { Sale, SaleResponseData } from "@/lib/api"

export type SaleSource = "pos" | "imported" | "pos_external"

type SaleSourceCarrier = Pick<Sale, "sale_source"> | Pick<SaleResponseData, "sale_source">

/** Factura registrada fuera del sistema (importada sola o vinculada a venta POS). */
export function isExternallyInvoicedSale(sale?: SaleSourceCarrier | null): boolean {
  return sale?.sale_source === "imported" || sale?.sale_source === "pos_external"
}

export function isLinkedPosExternalSale(sale?: SaleSourceCarrier | null): boolean {
  return sale?.sale_source === "pos_external"
}

/** Alias usado por facturación para bloquear emisión/NC por API. */
export function isImportedSale(sale?: SaleSourceCarrier | null): boolean {
  return isExternallyInvoicedSale(sale)
}

export const IMPORTED_SALE_BADGE = "Factura importada"

export const LINKED_POS_SALE_BADGE = "Factura externa vinculada"

export function externalInvoiceBadgeLabel(sale?: SaleSourceCarrier | null): string {
  if (sale?.sale_source === "pos_external") return LINKED_POS_SALE_BADGE
  if (sale?.sale_source === "imported") return IMPORTED_SALE_BADGE
  return ""
}

export const IMPORTED_SALE_FISCAL_HINT =
  "Comprobante registrado desde un PDF externo (ARCA u otro canal). No se puede emitir, reemitir ni anular por API desde el sistema; si necesitás una nota de crédito, gestionala directamente en ARCA."

export const LINKED_POS_SALE_HINT =
  "Esta venta POS tiene una factura externa vinculada. Los ítems y el stock son los de la venta original; el PDF solo registra los datos fiscales."
