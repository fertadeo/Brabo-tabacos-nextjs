import type { Sale } from "@/lib/api"
import type { BillableRow } from "@/lib/facturacion-billables"

export function isSaleFacturacionArchived(sale?: Sale | null): boolean {
  if (!sale) return false
  const v = sale.facturacion_archived
  return v === true || v === 1
}

/** ID de venta subyacente para archivar (venta directa o venta vinculada a reparación). */
export function resolveBillableArchiveSaleId(row: BillableRow): number | null {
  if (row.kind === "sale") return row.id
  if (row.linkedSaleId != null && row.linkedSaleId > 0) return row.linkedSaleId
  return null
}

/** Superadmin puede archivar comprobantes con error o emitidos (p. ej. prueba). */
export function canSuperadminArchiveBillable(row: BillableRow): boolean {
  const saleId = resolveBillableArchiveSaleId(row)
  if (saleId == null) return false
  const st = row.arcaStatus
  return st === "error" || st === "success"
}

export function isBillableArchivedInFacturacion(row: BillableRow): boolean {
  if (row.facturacionArchived) return true
  return isSaleFacturacionArchived(row.sale)
}
