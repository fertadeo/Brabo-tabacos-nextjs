import { describe, expect, it } from "vitest"
import {
  classifyClientTaxId,
  docTipoFromClientTaxIdDigits,
  formatClientTaxIdDisplay,
  isValidClientTaxId,
  isValidCuitForArcaPadron,
} from "@/lib/client-tax-id"

describe("client-tax-id", () => {
  it("clasifica DNI de 7-8 dígitos", () => {
    expect(classifyClientTaxId("1234567")).toBe("dni")
    expect(classifyClientTaxId("12345678")).toBe("dni")
    expect(docTipoFromClientTaxIdDigits("12345678")).toBe(96)
  })

  it("clasifica CUIL/CUIT de 11 dígitos", () => {
    expect(classifyClientTaxId("20355026656")).toBe("cuil_cuit")
    expect(docTipoFromClientTaxIdDigits("20355026656")).toBe(80)
  })

  it("rechaza longitudes intermedias", () => {
    expect(isValidClientTaxId("123456")).toBe(false)
    expect(isValidClientTaxId("123456789")).toBe(false)
    expect(isValidClientTaxId("1234567890")).toBe(false)
  })

  it("formatea CUIT con guiones y deja DNI plano", () => {
    expect(formatClientTaxIdDisplay("12345678")).toBe("12345678")
    expect(formatClientTaxIdDisplay("20355026656")).toBe("20-35502665-6")
  })

  it("solo permite padrón ARCA con 11 dígitos", () => {
    expect(isValidCuitForArcaPadron("12345678")).toBe(false)
    expect(isValidCuitForArcaPadron("20355026656")).toBe(true)
  })
})
