/** Listas de precio Brabo (alineadas al seed API). */

export type PriceListSlug = "venta_local" | "mayorista" | "revendedor"

export interface ProductPricesBySlug {
  venta_local?: number
  mayorista?: number
  revendedor?: number
  [slug: string]: number | undefined
}

export interface PriceListOption {
  slug: PriceListSlug
  name: string
}

export const PRICE_LIST_OPTIONS: PriceListOption[] = [
  { slug: "venta_local", name: "Venta en local" },
  { slug: "mayorista", name: "Mayorista" },
  { slug: "revendedor", name: "Revendedor" },
]

export const DEFAULT_PRICE_LIST_SLUG: PriceListSlug = "venta_local"

/** Precio ARS según lista; fallback a product.price / venta_local. */
export function resolveProductListPrice(
  product: {
    price?: number | null
    prices?: ProductPricesBySlug | null
  },
  slug: PriceListSlug = DEFAULT_PRICE_LIST_SLUG
): number {
  const fromList = product.prices?.[slug]
  if (fromList !== undefined && fromList !== null && Number.isFinite(Number(fromList))) {
    return Number(fromList)
  }
  if (slug !== "venta_local") {
    const local = product.prices?.venta_local
    if (local !== undefined && local !== null && Number.isFinite(Number(local))) {
      return Number(local)
    }
  }
  return Number(product.price) || 0
}
