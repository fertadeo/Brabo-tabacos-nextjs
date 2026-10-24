import { describe, expect, it } from "vitest"
import { resolveCondicionIvaReceptorForWsfe } from "@/lib/facturacion-comprobantes"

describe("resolveCondicionIvaReceptorForWsfe", () => {
  it("monotributo (6) en Factura B se mapea a consumidor final (5) para WSFE", () => {
    expect(resolveCondicionIvaReceptorForWsfe(6, 6)).toBe(5)
    expect(resolveCondicionIvaReceptorForWsfe(8, 6)).toBe(5)
  })

  it("variantes monotributo en Factura B también mapean a 5", () => {
    expect(resolveCondicionIvaReceptorForWsfe(6, 9)).toBe(5)
    expect(resolveCondicionIvaReceptorForWsfe(6, 10)).toBe(5)
    expect(resolveCondicionIvaReceptorForWsfe(6, 13)).toBe(5)
    expect(resolveCondicionIvaReceptorForWsfe(6, 16)).toBe(5)
  })

  it("monotributo (6) en Factura C se mantiene", () => {
    expect(resolveCondicionIvaReceptorForWsfe(11, 6)).toBe(6)
  })

  it("RI (1) en Factura B se mantiene (la validación fiscal sugiere Factura A)", () => {
    expect(resolveCondicionIvaReceptorForWsfe(6, 1)).toBe(1)
  })

  it("consumidor final (5) en Factura B se mantiene", () => {
    expect(resolveCondicionIvaReceptorForWsfe(6, 5)).toBe(5)
  })
})
