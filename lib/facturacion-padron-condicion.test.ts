import { describe, expect, it } from "vitest"
import {
  shouldConsultarPadronCondicionIva,
  validateCondicionIvaConPadronSugerencia,
} from "@/lib/facturacion-padron-condicion"

describe("facturacion-padron-condicion", () => {
  it("requiere padrón solo con docTipo 80 y CUIT de 11 dígitos", () => {
    expect(shouldConsultarPadronCondicionIva(80, "20343304073")).toBe(true)
    expect(shouldConsultarPadronCondicionIva(99, 0)).toBe(false)
    expect(shouldConsultarPadronCondicionIva(80, "123")).toBe(false)
  })

  it("detecta desvío monotributo (6) vs no categorizado (7)", () => {
    const result = validateCondicionIvaConPadronSugerencia(7, 6)
    expect(result.checked).toBe(true)
    expect(result.coincide).toBe(false)
    expect(result.condicionSugerida).toBe(6)
    expect(result.message).toMatch(/no coincide/)
  })

  it("acepta condición alineada con padrón", () => {
    const result = validateCondicionIvaConPadronSugerencia(6, 6)
    expect(result.coincide).toBe(true)
    expect(result.message).toBeUndefined()
  })

  it("acepta Factura B con condición WSFE 5 cuando el padrón indica monotributo (6)", () => {
    const result = validateCondicionIvaConPadronSugerencia(5, 6, 6)
    expect(result.coincide).toBe(true)
    expect(result.message).toBeUndefined()
  })
})
