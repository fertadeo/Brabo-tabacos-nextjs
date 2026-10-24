import type { Product } from "@/lib/api"

/** Producto con unidades disponibles para venta inmediata. */
export function isPosInStock(p: Product): boolean {
  return (p.stock ?? 0) >= 1
}

/** Activo, sin stock y habilitado para venta por encargo. */
export function isPosBackorderOnly(p: Product): boolean {
  return (p.stock ?? 0) < 1 && !!p.allow_backorders && !!p.is_active
}

/** Visible en el catálogo del POS según el filtro de encargo. */
export function isPosCatalogVisible(p: Product, includeBackorder: boolean): boolean {
  if (isPosInStock(p)) return true
  if (!includeBackorder) return false
  return isPosBackorderOnly(p)
}

export function canAddPosCatalogProduct(p: Product): boolean {
  return isPosInStock(p) || isPosBackorderOnly(p)
}

export function posCatalogMaxQuantity(p: Product): number {
  const stock = p.stock ?? 0
  if (stock >= 1) return stock
  if (isPosBackorderOnly(p)) return 999
  return 0
}

export function filterPosCatalogProducts(
  products: Product[],
  options: { includeBackorder: boolean; searchTerm?: string }
): Product[] {
  const term = options.searchTerm?.trim().toLowerCase()
  let list = products.filter((p) => isPosCatalogVisible(p, options.includeBackorder))
  if (term) {
    list = list.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term) ||
        p.category_name?.toLowerCase().includes(term)
    )
  }
  return [...list].sort((a, b) => {
    const aBack = isPosBackorderOnly(a) ? 1 : 0
    const bBack = isPosBackorderOnly(b) ? 1 : 0
    if (aBack !== bBack) return aBack - bBack
    return (a.name || "").localeCompare(b.name || "", "es")
  })
}
