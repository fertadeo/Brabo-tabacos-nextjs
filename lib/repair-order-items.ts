import type { AddRepairOrderItemBody, RepairOrderItem } from "@/lib/api"

/** Línea de catálogo pendiente al crear una orden (antes del POST). */
export type RepairOrderPendingCatalogItem = {
  kind: "catalog"
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
}

/** Línea manual pendiente al crear una orden. */
export type RepairOrderPendingCustomItem = {
  kind: "custom"
  description: string
  quantity: number
  unit_price: number
}

export type RepairOrderPendingItem = RepairOrderPendingCatalogItem | RepairOrderPendingCustomItem

export function getRepairOrderItemDisplayName(item: RepairOrderItem): string {
  const fromApi =
    item.product?.name?.trim() ||
    item.product_name?.trim() ||
    item.description?.trim()
  if (fromApi) return fromApi
  if (item.product_id != null && item.product_id > 0) {
    return `Producto #${item.product_id}`
  }
  return "Ítem"
}

export function isRepairOrderCustomItem(item: RepairOrderItem): boolean {
  return item.product_id == null || item.product_id === 0
}

export function pendingItemToAddBody(item: RepairOrderPendingItem): AddRepairOrderItemBody {
  if (item.kind === "catalog") {
    return {
      product_id: item.product_id,
      quantity: Math.max(1, Math.floor(item.quantity)),
      unit_price: Math.max(0, item.unit_price),
    }
  }
  return {
    description: item.description.trim(),
    quantity: Math.max(1, Math.floor(item.quantity)),
    unit_price: Math.max(0, item.unit_price),
  }
}

export function pendingItemDisplayName(item: RepairOrderPendingItem): string {
  return item.kind === "catalog" ? item.product_name : item.description
}

export function repairOrderItemsToPdfLines(
  items: RepairOrderItem[]
): Array<{ product_name: string; quantity: number; unit_price: number }> {
  return items.map((i) => ({
    product_name: getRepairOrderItemDisplayName(i),
    quantity: i.quantity,
    unit_price: parseFloat(String(i.unit_price)) || 0,
  }))
}
