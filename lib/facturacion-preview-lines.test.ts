import { describe, expect, it } from "vitest"
import type { SaleItemResponse } from "@/lib/api"
import {
  findMatchingIvaDesgloseLine,
  mapSaleItemsWithIvaDesglose,
} from "@/lib/facturacion-preview-lines"

describe("facturacion-preview-lines", () => {
  it("usa cantidad y precio unitario de la venta aunque sugerencia traiga qty 1", () => {
    const saleItems: SaleItemResponse[] = [
      {
        product_id: 213,
        product_name: "camara tapo ws 520",
        quantity: 7,
        unit_price: 123000,
        iva_rate: 21,
        subtotal: 861000,
      },
    ]

    const lines = mapSaleItemsWithIvaDesglose(saleItems, [
      {
        productId: 213,
        descripcion: "camara tapo ws 520",
        quantity: 1,
        unitPrice: 861000,
        lineTotal: 861000,
        ivaRate: 21,
        neto: 711570.25,
        iva: 149429.75,
      },
    ])

    expect(lines[0].quantity).toBe(7)
    expect(lines[0].unitPrice).toBe(123000)
    expect(lines[0].subtotal).toBe(861000)
    expect(lines[0].neto).toBe(711570.25)
    expect(lines[0].iva).toBe(149429.75)
  })

  it("empareja desglose por productId", () => {
    const item: SaleItemResponse = {
      product_id: 99,
      product_name: "Router",
      quantity: 2,
      unit_price: 1000,
    }

    const match = findMatchingIvaDesgloseLine(item, 0, [
      { productId: 99, descripcion: "Otro nombre", lineTotal: 2000, ivaRate: 21, neto: 1000, iva: 210 },
    ])

    expect(match?.productId).toBe(99)
  })
})
