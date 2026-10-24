import { describe, expect, it } from "vitest"
import type { Cliente } from "@/lib/api"
import {
  clienteRequiresZeroItemIva,
  effectiveSaleItemIvaRate,
  labelCondicionIvaReceptorForDisplay,
  resolveTipoComprobanteFromCondicionIvaReceptor,
  setEmisorRegimenFromApi,
  tipoComprobanteRequiresZeroItemIva,
  validateFacturacionItemIva,
} from "@/lib/facturacion-cliente-fiscal"

function cliente(partial: Partial<Cliente> & Pick<Cliente, "id" | "name" | "code">): Cliente {
  return {
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    is_active: true,
    ...partial,
  }
}

describe("facturacion-cliente-fiscal — tipo comprobante", () => {
  it("emisor RI: monotributo receptor usa Factura A; consumidor final Factura B", () => {
    expect(resolveTipoComprobanteFromCondicionIvaReceptor(6, "responsable_inscripto")).toBe(1)
    expect(resolveTipoComprobanteFromCondicionIvaReceptor(5, "responsable_inscripto")).toBe(6)
    expect(resolveTipoComprobanteFromCondicionIvaReceptor(1, "responsable_inscripto")).toBe(1)
  })

  it("emisor monotributo: siempre Factura C", () => {
    setEmisorRegimenFromApi("monotributo")
    expect(resolveTipoComprobanteFromCondicionIvaReceptor(1, "monotributo")).toBe(11)
    expect(resolveTipoComprobanteFromCondicionIvaReceptor(6, "monotributo")).toBe(11)
    setEmisorRegimenFromApi("responsable_inscripto")
  })
})

describe("facturacion-cliente-fiscal — IVA por ítem", () => {
  it("solo Factura C exige ítems sin alícuota gravada", () => {
    expect(tipoComprobanteRequiresZeroItemIva(6)).toBe(false)
    expect(tipoComprobanteRequiresZeroItemIva(8)).toBe(false)
    expect(tipoComprobanteRequiresZeroItemIva(11)).toBe(true)
    expect(tipoComprobanteRequiresZeroItemIva(13)).toBe(true)
    expect(tipoComprobanteRequiresZeroItemIva(1)).toBe(false)
  })

  it("consumidor final y monotributo receptor (emisor RI) permiten IVA; solo Factura C no", () => {
    expect(clienteRequiresZeroItemIva(null)).toBe(false)
    expect(
      clienteRequiresZeroItemIva(
        cliente({ id: 1, name: "CF", code: "C1", tax_condition: "consumidor_final" })
      )
    ).toBe(false)
    expect(
      clienteRequiresZeroItemIva(
        cliente({ id: 2, name: "Mono", code: "M1", tax_condition: "monotributo" })
      )
    ).toBe(false)
    expect(
      clienteRequiresZeroItemIva(
        cliente({ id: 3, name: "RI", code: "R1", tax_condition: "responsable_inscripto" })
      )
    ).toBe(false)
  })

  it("effectiveSaleItemIvaRate solo fuerza 0% con emisor monotributo (Factura C)", () => {
    expect(effectiveSaleItemIvaRate(21, null)).toBe(21)
    expect(
      effectiveSaleItemIvaRate(
        21,
        cliente({ id: 1, name: "CF", code: "C1", tax_condition: "consumidor_final" })
      )
    ).toBe(21)
    expect(
      effectiveSaleItemIvaRate(
        21,
        cliente({ id: 2, name: "Mono", code: "M1", tax_condition: "monotributo" })
      )
    ).toBe(21)
  })

  it("validateFacturacionItemIva bloquea ítems gravados solo en Factura C", () => {
    expect(validateFacturacionItemIva(6, [{ ivaRate: 21 }])).toBeNull()
    const err = validateFacturacionItemIva(11, [{ ivaRate: 21 }])
    expect(err).toMatch(/Factura C/)
    expect(validateFacturacionItemIva(11, [{ ivaRate: 0 }])).toBeNull()
    expect(validateFacturacionItemIva(1, [{ ivaRate: 21 }])).toBeNull()
  })
})

describe("labelCondicionIvaReceptorForDisplay", () => {
  it("muestra Responsable Monotributo aunque WSFE use código 7", () => {
    expect(
      labelCondicionIvaReceptorForDisplay(
        7,
        cliente({ id: 37, name: "FERNANDO", code: "F1", tax_condition: "monotributo" })
      )
    ).toBe("Responsable Monotributo")
  })

  it("muestra IVA Responsable Inscripto para persona física inscripta", () => {
    expect(
      labelCondicionIvaReceptorForDisplay(
        1,
        cliente({
          id: 10,
          name: "ALEXIS",
          code: "A1",
          tax_condition: "inscripto",
          personeria: "persona_fisica",
        })
      )
    ).toBe("IVA Responsable Inscripto")
  })
})
