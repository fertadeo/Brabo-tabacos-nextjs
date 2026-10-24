import type { Product } from "@/lib/api"

export type ProductCatalogTab = "published" | "draft" | "deleted"
export type ProductCatalogSortBy = "name" | "code" | "price" | "stock" | "category" | "updated_at"
export type ProductCatalogSortOrder = "asc" | "desc"

export interface ProductCatalogFilterInput {
  productTab: ProductCatalogTab
  searchTerm: string
  filterCategory: string
  filterStatus: "all" | "active" | "inactive"
  filterStock: "all" | "low" | "out"
  filterDateModification: "all" | "last7" | "last30" | "last90"
  sortBy: ProductCatalogSortBy
  sortOrder: ProductCatalogSortOrder
}

/** Misma selección que la grilla de productos: pestaña, búsqueda, filtros y orden. */
export function filterProductCatalog(allProducts: Product[], input: ProductCatalogFilterInput): Product[] {
  const {
    productTab,
    searchTerm,
    filterCategory,
    filterStatus,
    filterStock,
    filterDateModification,
    sortBy,
    sortOrder,
  } = input

  const byTab = allProducts.filter((p) => {
    if (productTab === "published") return !!p.is_active && (p.stock > 0 || !!p.allow_backorders)
    if (productTab === "draft") return !!p.is_active && p.stock === 0 && !p.allow_backorders
    return !p.is_active
  })

  let productsToShow: Product[]

  if (searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase()
    productsToShow = byTab.filter((product) => {
      const codeMatch = product.code?.toLowerCase().includes(term)
      const nameMatch = product.name?.toLowerCase().includes(term)
      const categoryMatch = product.category_name?.toLowerCase().includes(term)
      return codeMatch || nameMatch || categoryMatch
    })
  } else {
    productsToShow = [...byTab]
  }

  if (filterCategory !== "all") {
    if (filterCategory === "none") {
      productsToShow = productsToShow.filter((p) => !p.category_id)
    } else {
      const categoryId = parseInt(filterCategory, 10)
      productsToShow = productsToShow.filter((p) => p.category_id === categoryId)
    }
  }

  if (filterStatus === "active") {
    productsToShow = productsToShow.filter((p) => p.is_active)
  } else if (filterStatus === "inactive") {
    productsToShow = productsToShow.filter((p) => !p.is_active)
  }

  if (filterStock === "low") {
    productsToShow = productsToShow.filter((p) => p.stock > 0 && p.stock <= p.min_stock)
  } else if (filterStock === "out") {
    productsToShow = productsToShow.filter((p) => p.stock === 0)
  }

  if (filterDateModification !== "all" && productsToShow.length > 0) {
    const now = Date.now()
    const daysMs = {
      last7: 7 * 24 * 60 * 60 * 1000,
      last30: 30 * 24 * 60 * 60 * 1000,
      last90: 90 * 24 * 60 * 60 * 1000,
    }
    const since = now - daysMs[filterDateModification]
    productsToShow = productsToShow.filter((p) => {
      const updated = p.updated_at ? new Date(p.updated_at).getTime() : 0
      return updated >= since
    })
  }

  productsToShow = [...productsToShow].sort((a, b) => {
    let cmp = 0
    switch (sortBy) {
      case "name":
        cmp = (a.name || "").localeCompare(b.name || "", "es")
        break
      case "code":
        cmp = (a.code || "").localeCompare(b.code || "", "es")
        break
      case "price":
        cmp = Number(a.price) - Number(b.price)
        break
      case "stock":
        cmp = a.stock - b.stock
        break
      case "category":
        cmp = (a.category_name || "").localeCompare(b.category_name || "", "es")
        break
      case "updated_at":
        cmp = new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
        break
      default:
        cmp = 0
    }
    return sortOrder === "asc" ? cmp : -cmp
  })

  return productsToShow
}
