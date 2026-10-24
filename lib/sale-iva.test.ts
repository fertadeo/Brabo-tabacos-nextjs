import { describe, expect, it } from "vitest"
import {
  arcaIvaDiscriminadoRows,
  buildArcaIvaDiscriminado,
  buildFacturadorIvaArrayFromLines,
  computeSaleIvaBreakdown,
  facturadorImporteFromIvaArray,
  ivaFromInclusiveAmount,
  normalizeSaleIvaRate,
} from "@/lib/sale-iva"

describe("sale-iva", () => {
  it("normaliza alícuotas válidas y usa 21% por defecto", () => {
    expect(normalizeSaleIvaRate(21)).toBe(21)
    expect(normalizeSaleIvaRate(10.5)).toBe(10.5)
    expect(normalizeSaleIvaRate(0)).toBe(0)
    expect(normalizeSaleIvaRate(undefined)).toBe(21)
    expect(normalizeSaleIvaRate("10.5")).toBe(10.5)
  })

  it("calcula IVA contenido desde precio final", () => {
    expect(ivaFromInclusiveAmount(121, 21)).toBe(21)
    expect(ivaFromInclusiveAmount(110.5, 10.5)).toBe(10.5)
    expect(ivaFromInclusiveAmount(100, 0)).toBe(0)
  })

  it("desglosa venta mixta por alícuota", () => {
    const breakdown = computeSaleIvaBreakdown([
      { subtotal: 121, iva_rate: 21 },
      { subtotal: 110.5, iva_rate: 10.5 },
      { subtotal: 50, iva_rate: 0 },
    ])
    expect(breakdown.iva21).toBe(21)
    expect(breakdown.iva105).toBe(10.5)
    expect(breakdown.ivaExento).toBe(50)
    expect(breakdown.ivaTotal).toBe(31.5)
    expect(breakdown.subtotalInclIva).toBe(281.5)
    expect(breakdown.netoGravado).toBe(200)
  })

  it("producto exento no suma a neto gravado", () => {
    const breakdown = computeSaleIvaBreakdown([{ subtotal: 2, iva_rate: 0 }])
    expect(breakdown.netoGravado).toBe(0)
    expect(breakdown.ivaExento).toBe(2)
    expect(breakdown.ivaTotal).toBe(0)
  })

  it("arma IVA discriminado ARCA con alícuotas AFIP en cero si no aplican", () => {
    const disc = buildArcaIvaDiscriminado([
      { subtotal: 121, iva_rate: 21 },
      { subtotal: 110.5, iva_rate: 10.5 },
    ])
    expect(disc.iva21).toBe(21)
    expect(disc.iva105).toBe(10.5)
    expect(disc.iva27).toBe(0)
    expect(disc.netoGravado).toBe(200)
  })

  it("omite alícuotas IVA en cero del desglose ARCA", () => {
    const rows = arcaIvaDiscriminadoRows({
      netoGravado: 100,
      iva27: 0,
      iva21: 21,
      iva105: 10.5,
      iva5: 0,
      iva25: 0,
      iva0: 0,
    })
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.label)).toEqual(["IVA 21%: $", "IVA 10.5%: $"])
  })

  it("arma iva[] como MultiFacturador — multi alícuota (importe 1,16)", () => {
    const iva = buildFacturadorIvaArrayFromLines([
      { subtotal: 0.55, iva_rate: 10.5 },
      { subtotal: 0.61, iva_rate: 21 },
    ])
    expect(iva).toEqual([
      { id: 4, base: 0.5, cuota: 0.05 },
      { id: 5, base: 0.5, cuota: 0.11 },
    ])
    expect(facturadorImporteFromIvaArray(iva)).toBe(1.16)
  })

  it("arma iva[] como MultiFacturador — un ítem 21% (importe 1,21)", () => {
    const iva = buildFacturadorIvaArrayFromLines([{ subtotal: 1.21, iva_rate: 21 }])
    expect(iva).toEqual([{ id: 5, base: 1, cuota: 0.21 }])
    expect(facturadorImporteFromIvaArray(iva)).toBe(1.21)
  })
})
