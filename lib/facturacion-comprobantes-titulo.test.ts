import { describe, expect, it } from "vitest"
import { getComprobanteArcaTitulo } from "@/lib/facturacion-comprobantes"

describe("getComprobanteArcaTitulo", () => {
  it("devuelve NOTA DE CRÉDITO con letra para tipos NC", () => {
    expect(getComprobanteArcaTitulo(3)).toBe("NOTA DE CRÉDITO A")
    expect(getComprobanteArcaTitulo(8)).toBe("NOTA DE CRÉDITO B")
    expect(getComprobanteArcaTitulo(13)).toBe("NOTA DE CRÉDITO C")
  })

  it("devuelve FACTURA con letra para tipos factura", () => {
    expect(getComprobanteArcaTitulo(1)).toBe("FACTURA A")
    expect(getComprobanteArcaTitulo(6)).toBe("FACTURA B")
    expect(getComprobanteArcaTitulo(11)).toBe("FACTURA C")
  })
})
