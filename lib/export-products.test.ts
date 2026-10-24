import { describe, expect, it } from "vitest"
import type { Product } from "@/lib/api"
import { buildProductsCsv, buildProductsExcelHtml, buildProductsPdf } from "@/lib/export-products"
import { filterProductCatalog } from "@/lib/product-catalog-filter"

function product(partial: Partial<Product> & Pick<Product, "id" | "code" | "name">): Product {
  return {
    price: 1500.5,
    stock: 3,
    min_stock: 1,
    max_stock: 10,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    category_name: "Notebooks",
    ...partial,
  }
}

describe("filterProductCatalog", () => {
  const catalog = [
    product({ id: 1, code: "NB-1", name: "Notebook", stock: 4, is_active: true }),
    product({ id: 2, code: "MO-1", name: "Mouse", stock: 0, is_active: true, allow_backorders: false }),
    product({ id: 3, code: "KB-1", name: "Teclado", stock: 0, is_active: true, allow_backorders: true }),
    product({ id: 4, code: "OLD", name: "Viejo", stock: 2, is_active: false }),
  ]

  it("separa publicados, borrador y eliminados", () => {
    const base = {
      searchTerm: "",
      filterCategory: "all",
      filterStatus: "all" as const,
      filterStock: "all" as const,
      filterDateModification: "all" as const,
      sortBy: "code" as const,
      sortOrder: "asc" as const,
    }
    expect(filterProductCatalog(catalog, { ...base, productTab: "published" }).map((p) => p.code)).toEqual([
      "KB-1",
      "NB-1",
    ])
    expect(filterProductCatalog(catalog, { ...base, productTab: "draft" }).map((p) => p.code)).toEqual(["MO-1"])
    expect(filterProductCatalog(catalog, { ...base, productTab: "deleted" }).map((p) => p.code)).toEqual(["OLD"])
  })
})

describe("buildProductsCsv", () => {
  it("arma CSV con columnas elegidas, precio, stock e imagen opcional", () => {
    const csv = buildProductsCsv({
      format: "csv",
      includeImage: true,
      columns: ["code", "name", "price", "stock"],
      products: [
        product({
          id: 1,
          code: 'A"1',
          name: "Monitor; 24",
          images: ["https://cdn.example/monitor.jpg"],
          price: 1999.5,
          stock: 8,
        }),
      ],
    })

    expect(csv.startsWith("\uFEFF")).toBe(true)
    const lines = csv.replace(/^\uFEFF/, "").split("\r\n")
    expect(lines[0]).toBe("Imagen;Código;Nombre;Precio;Stock")
    expect(lines[1]).toBe('https://cdn.example/monitor.jpg;"A""1";"Monitor; 24";1.999,50;8')
  })

  it("omite la imagen cuando no se pide", () => {
    const csv = buildProductsCsv({
      format: "csv",
      includeImage: false,
      columns: ["name", "stock"],
      products: [product({ id: 1, code: "X", name: "Cable", stock: 2 })],
    })
    expect(csv).toContain("Nombre;Stock")
    expect(csv).not.toContain("Imagen")
    expect(csv).toContain("Cable;2")
  })
})

describe("buildProductsExcelHtml", () => {
  it("incrusta la foto para que Excel la muestre", () => {
    const html = buildProductsExcelHtml(
      {
        format: "csv",
        includeImage: true,
        columns: ["name"],
        products: [product({ id: 1, code: "X", name: "Cable" })],
      },
      ["data:image/jpeg;base64,abc"]
    )
    expect(html).toContain('<img src="data:image/jpeg;base64,abc"')
    expect(html).toContain("Cable")
  })
})
describe("buildProductsPdf", () => {
  it("genera un PDF con el nombre y el precio del producto", async () => {
    const doc = await buildProductsPdf({
      format: "pdf",
      includeImage: false,
      columns: ["name", "price", "stock"],
      products: [product({ id: 1, code: "NB-1", name: "Notebook Gamer", price: 250000, stock: 2 })],
    })
    const bytes = doc.output("arraybuffer")
    expect(doc.getNumberOfPages()).toBeGreaterThan(0)
    expect(bytes.byteLength).toBeGreaterThan(500)
  })
})
