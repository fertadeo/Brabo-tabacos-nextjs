import { describe, expect, it } from "vitest"
import {
  canSuperadminArchiveBillable,
  isSaleFacturacionArchived,
  resolveBillableArchiveSaleId,
} from "@/lib/facturacion-archive"
import { saleToBillable } from "@/lib/facturacion-billables"

describe("facturacion-archive", () => {
  it("detecta venta archivada", () => {
    expect(isSaleFacturacionArchived({ facturacion_archived: 1 } as never)).toBe(true)
    expect(isSaleFacturacionArchived({ facturacion_archived: 0 } as never)).toBe(false)
  })

  it("permite archivar error o emitida", () => {
    const errorRow = saleToBillable({
      id: 1,
      sale_number: "V-1",
      client_id: 1,
      total_amount: 100,
      sale_date: "2026-01-01",
      arca_status: "error",
    } as never)
    const okRow = saleToBillable({
      id: 2,
      sale_number: "V-2",
      client_id: 1,
      total_amount: 100,
      sale_date: "2026-01-01",
      arca_status: "success",
    } as never)
    expect(canSuperadminArchiveBillable(errorRow)).toBe(true)
    expect(canSuperadminArchiveBillable(okRow)).toBe(true)
  })

  it("resuelve sale id en reparación vinculada", () => {
    expect(
      resolveBillableArchiveSaleId({
        key: "r-1",
        kind: "repair_order",
        id: 9,
        linkedSaleId: 42,
      } as never)
    ).toBe(42)
  })
})
