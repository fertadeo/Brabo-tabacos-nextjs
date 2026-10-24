import type { RepairOrder, RepairOrderStatus, Sale } from "@/lib/api"
import { REPAIR_ORDER_STATUS_LABELS } from "@/lib/api"
import { isSaleFacturacionArchived } from "@/lib/facturacion-archive"

export type ArcaStatus = "pending" | "success" | "error" | "not_issued"
export type BillableKind = "sale" | "repair_order"

/** Estados de reparación que deben aparecer en facturación ARCA. */
export const REPAIR_ORDER_FACTURABLE_STATUSES: RepairOrderStatus[] = ["aceptado", "entregado"]

export interface BillableRow {
  key: string
  kind: BillableKind
  id: number
  reference: string
  clientId: number | null
  clientName: string
  date: string
  totalAmount: number
  currency?: Sale["currency"]
  exchangeRate?: number | null
  arcaStatus: ArcaStatus
  arcaCae?: string | null
  arcaCaeVto?: string | null
  arcaErrorCode?: string | null
  arcaErrorMessage?: string | null
  arcaLastAttemptAt?: string | null
  arcaNcStatus?: "pending" | "success" | "error" | null
  arcaNcCae?: string | null
  arcaNcNumero?: number | null
  /** Oculta en listado de facturación (venta subyacente archivada). */
  facturacionArchived?: boolean
  sale?: Sale
  repairOrder?: RepairOrder
  linkedSaleId?: number | null
  repairStatusLabel?: string
}

export function getArcaStatusFromSale(sale: Sale): ArcaStatus {
  if (sale.arca_status === "pending" || sale.arca_status === "success" || sale.arca_status === "error") {
    return sale.arca_status
  }
  return "not_issued"
}

function parseRepairAmount(value: string | number | undefined): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "string") {
    const n = parseFloat(value.replace(",", "."))
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

function arcaFieldsFromRepair(order: RepairOrder): Pick<
  BillableRow,
  "arcaStatus" | "arcaCae" | "arcaCaeVto" | "arcaErrorCode" | "arcaErrorMessage" | "arcaLastAttemptAt"
> {
  const st = order.arca_status
  const arcaStatus: ArcaStatus =
    st === "pending" || st === "success" || st === "error" ? st : "not_issued"
  return {
    arcaStatus,
    arcaCae: order.arca_cae ?? null,
    arcaCaeVto: order.arca_cae_vto ?? null,
    arcaErrorCode: order.arca_error_code ?? null,
    arcaErrorMessage: order.arca_error_message ?? null,
    arcaLastAttemptAt: order.arca_last_attempt_at ?? null,
  }
}

export function saleToBillable(sale: Sale): BillableRow {
  return {
    key: `sale-${sale.id}`,
    kind: "sale",
    id: sale.id,
    reference: sale.sale_number,
    clientId: sale.client_id,
    clientName: sale.client_name?.trim() || "Consumidor final",
    date: sale.sale_date,
    totalAmount: sale.total_amount,
    currency: sale.currency,
    exchangeRate: sale.exchange_rate ?? null,
    arcaStatus: getArcaStatusFromSale(sale),
    arcaCae: sale.arca_cae,
    arcaCaeVto: sale.arca_cae_vto,
    arcaErrorCode: sale.arca_error_code,
    arcaErrorMessage: sale.arca_error_message,
    arcaLastAttemptAt: sale.arca_last_attempt_at,
    arcaNcStatus: sale.arca_nc_status ?? null,
    arcaNcCae: sale.arca_nc_cae ?? null,
    arcaNcNumero: sale.arca_nc_numero ?? null,
    facturacionArchived: isSaleFacturacionArchived(sale),
    sale,
    linkedSaleId: sale.id,
  }
}

export function repairOrderToBillable(order: RepairOrder, clientName?: string): BillableRow {
  const linkedSale = order.sale_id != null && order.sale_id > 0 ? order.sale_id : null
  const name =
    clientName?.trim() ||
    order.client?.name?.trim() ||
    (order.client_id ? `Cliente #${order.client_id}` : "Consumidor final")

  const fromRepair = arcaFieldsFromRepair(order)
  const date =
    order.status === "entregado" && order.delivery_date_actual
      ? order.delivery_date_actual
      : order.accepted_at || order.updated_at || order.created_at

  return {
    key: `repair-${order.id}`,
    kind: "repair_order",
    id: order.id,
    reference: order.repair_number,
    clientId: order.client_id,
    clientName: name,
    date,
    totalAmount: parseRepairAmount(order.total_amount),
    ...fromRepair,
    repairOrder: order,
    linkedSaleId: linkedSale,
    repairStatusLabel: REPAIR_ORDER_STATUS_LABELS[order.status],
  }
}

/** Une ventas POS y órdenes de reparación facturables sin duplicar la venta vinculada. */
export function mergeFacturacionBillables(
  sales: Sale[],
  repairOrders: RepairOrder[],
  options?: { showArchived?: boolean }
): BillableRow[] {
  const saleIdsLinkedToRepair = new Set(
    repairOrders
      .map((o) => o.sale_id)
      .filter((id): id is number => id != null && id > 0)
  )

  const salesById = new Map(sales.map((s) => [s.id, s]))
  const rows: BillableRow[] = []

  for (const sale of sales) {
    if (saleIdsLinkedToRepair.has(sale.id)) continue
    rows.push(saleToBillable(sale))
  }

  for (const order of repairOrders) {
    const linkedArchived = Boolean(
      (order as RepairOrder & { linked_sale_facturacion_archived?: number | boolean })
        .linked_sale_facturacion_archived
    )
    if (linkedArchived && !options?.showArchived) continue

    const row = repairOrderToBillable(order)
    if (row.linkedSaleId != null) {
      const linked = salesById.get(row.linkedSaleId)
      if (linked) {
        row.arcaStatus = getArcaStatusFromSale(linked)
        row.arcaCae = linked.arca_cae
        row.arcaCaeVto = linked.arca_cae_vto
        row.arcaErrorCode = linked.arca_error_code
        row.arcaErrorMessage = linked.arca_error_message
        row.arcaLastAttemptAt = linked.arca_last_attempt_at
        row.facturacionArchived = isSaleFacturacionArchived(linked)
        row.sale = linked
      } else if (linkedArchived) {
        row.facturacionArchived = true
      }
    }
    rows.push(row)
  }

  return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function filterBillables(
  rows: BillableRow[],
  query: string,
  statusFilter: ArcaStatus | "all"
): BillableRow[] {
  const q = query.trim().toLowerCase()
  return rows.filter((row) => {
    if (statusFilter !== "all" && row.arcaStatus !== statusFilter) return false
    if (!q) return true
    return (
      row.reference.toLowerCase().includes(q) ||
      row.clientName.toLowerCase().includes(q) ||
      String(row.id).includes(q) ||
      (row.repairStatusLabel?.toLowerCase().includes(q) ?? false) ||
      (row.kind === "repair_order" && (q.includes("rep") || q.includes("repar")))
    )
  })
}

export function billableStats(rows: BillableRow[]) {
  return {
    total: rows.length,
    success: rows.filter((r) => r.arcaStatus === "success").length,
    pending: rows.filter((r) => r.arcaStatus === "pending").length,
    error: rows.filter((r) => r.arcaStatus === "error").length,
  }
}
