import { describe, expect, it } from "vitest"
import {
  canEmitNotaCredito,
  canFacturarSaleViaApi,
  saleCanRefacturar,
  saleHasComprobanteHistorial,
  saleHasNotaCreditoEmitida,
} from "@/lib/facturacion-nota-credito"
import { saleHasFiscalLock } from "@/lib/sale-edit"
import type { Sale } from "@/lib/api"

function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 1,
    sale_number: "SALE-1",
    client_id: 1,
    total_amount: 1000,
    payment_method: "efectivo",
    sale_date: "2026-08-26",
    created_at: "2026-08-26T12:00:00Z",
    updated_at: "2026-08-26T12:00:00Z",
    arca_status: "success",
    arca_cae: "111",
    ...overrides,
  }
}

describe("facturacion-nota-credito / refacturación", () => {
  it("bloquea nueva factura si hay factura vigente sin NC", () => {
    const s = sale()
    expect(canFacturarSaleViaApi(s)).toBe(false)
    expect(canEmitNotaCredito(s)).toBe(true)
    expect(saleCanRefacturar(s)).toBe(false)
    expect(saleHasFiscalLock(s)).toBe(true)
  })

  it("permite refacturar y editar después de una NC", () => {
    const s = sale({ arca_nc_status: "success", arca_nc_cae: "222" })
    expect(saleHasNotaCreditoEmitida(s)).toBe(true)
    expect(saleCanRefacturar(s)).toBe(true)
    expect(canFacturarSaleViaApi(s)).toBe(true)
    expect(canEmitNotaCredito(s)).toBe(false)
    expect(saleHasFiscalLock(s)).toBe(false)
  })

  it("detecta historial con más de un comprobante", () => {
    const s = sale({
      arca_historial: [
        {
          id: 1,
          sequence: 1,
          kind: "factura",
          status: "success",
          cae: "111",
          vigente: false,
        },
        {
          id: 2,
          sequence: 2,
          kind: "nota_credito",
          status: "success",
          cae: "222",
          vigente: false,
        },
        {
          id: 3,
          sequence: 3,
          kind: "factura",
          status: "success",
          cae: "333",
          vigente: true,
        },
      ],
    })
    expect(saleHasComprobanteHistorial(s)).toBe(true)
  })
})
