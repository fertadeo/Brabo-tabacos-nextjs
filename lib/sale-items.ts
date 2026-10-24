import type { CreateSaleItem, Product, SaleItemResponse } from "@/lib/api"
import type { SaleReceiptCartItem } from "@/lib/generate-sale-receipt-pdf"
import { newCustomLineId, posCartLineToCreateSaleItem, type PosCartLine } from "@/lib/pos-cart"
import { normalizeSaleIvaRate } from "@/lib/sale-iva"

/** Nombre visible de una línea de venta (catálogo o manual). */
export function getSaleItemDisplayName(item: SaleItemResponse): string {
  const fromApi = item.product_name?.trim() || item.description?.trim()
  if (fromApi) return fromApi
  if (item.product_id != null && item.product_id > 0) {
    return `Producto #${item.product_id}`
  }
  return "Ítem"
}

export function isSaleCustomItem(item: SaleItemResponse): boolean {
  return item.product_id == null || item.product_id === 0
}

export function posCartLinesToCreateSaleItems(lines: PosCartLine[]): CreateSaleItem[] {
  return lines.map(posCartLineToCreateSaleItem)
}

export function posCartLinesToReceiptItems(lines: PosCartLine[]): SaleReceiptCartItem[] {
  return lines.map((line) => ({
    product: {
      id: line.kind === "catalog" ? line.product.id : 0,
      name: line.kind === "catalog" ? line.product.name : line.description,
    },
    quantity: line.quantity,
    unit_price: line.unit_price,
  }))
}

export function saleItemsToReceiptItems(
  items: SaleItemResponse[],
  nameByProductId?: Record<number, string>
): SaleReceiptCartItem[] {
  return items.map((item) => {
    const name =
      getSaleItemDisplayName(item) ||
      (item.product_id != null && nameByProductId?.[item.product_id]) ||
      "Ítem"
    return {
      product: { id: item.product_id ?? 0, name },
      quantity: item.quantity,
      unit_price: item.unit_price,
    }
  })
}

function stubProductFromSaleItem(item: SaleItemResponse): Product {
  const name = getSaleItemDisplayName(item)
  return {
    id: item.product_id!,
    code: "",
    name,
    price: item.unit_price,
    stock: 0,
    min_stock: 0,
    max_stock: 0,
    is_active: true,
    created_at: "",
    updated_at: "",
  }
}

/** Convierte líneas de venta a carrito POS para edición. */
export function saleItemsToPosCartLines(
  items: SaleItemResponse[],
  productById?: Record<number, Product>
): PosCartLine[] {
  return items.map((item) => {
    const iva_rate = normalizeSaleIvaRate(item.iva_rate)
    if (item.product_id != null && item.product_id > 0) {
      const product = productById?.[item.product_id] ?? stubProductFromSaleItem(item)
      return {
        kind: "catalog" as const,
        product,
        quantity: item.quantity,
        unit_price: item.unit_price,
        iva_rate,
      }
    }
    return {
      kind: "custom" as const,
      lineId: newCustomLineId(),
      description: getSaleItemDisplayName(item),
      quantity: item.quantity,
      unit_price: item.unit_price,
      iva_rate,
    }
  })
}

/** IDs de catálogo para prefetch (ítems manuales se excluyen). */
export function saleItemCatalogProductIds(items: SaleItemResponse[]): number[] {
  return [
    ...new Set(
      items
        .map((i) => i.product_id)
        .filter((id): id is number => id != null && id > 0)
    ),
  ]
}
