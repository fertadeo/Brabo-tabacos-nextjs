import { describe, expect, it } from "vitest"
import type { Cliente } from "@/lib/api"
import {
  applyClienteToFacturarForm,
  buildFacturarFormForSale,
  buildFacturarPayload,
  clienteCuitDigitos,
  validateFacturarPayloadCoherence,
  validateFacturarReceptorFiscal,
} from "@/lib/facturacion-form-from-cliente"

function cliente(partial: Partial<Cliente> & Pick<Cliente, "id" | "name" | "code">): Cliente {
  return {
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Argentina",
    is_active: 1,
    created_at: "",
    updated_at: "",
    client_type: "mayorista",
    sales_channel: "manual",
    ...partial,
  }
}

describe("facturacion-form-from-cliente", () => {
  it("lee CUIT desde primary_tax_id si falta cuil_cuit", () => {
    expect(
      clienteCuitDigitos(
        cliente({
          id: 1,
          name: "Ministerio",
          code: "M1",
          primary_tax_id: "30-12345678-9",
        })
      )
    ).toBe("30123456789")
  })

  it("aplica docTipo 96 para cliente con DNI", () => {
    const form = applyClienteToFacturarForm(
      { docTipo: 99, docNro: 0, condicionIvaReceptor: 5, tipo: 6 },
      cliente({
        id: 2,
        name: "Juan Pérez",
        code: "J1",
        personeria: "persona_fisica",
        tax_condition: "consumidor_final",
        cuil_cuit: "12345678",
      })
    )
    expect(form.docTipo).toBe(96)
    expect(form.docNro).toBe(12345678)
  })

  it("aplica docTipo 80 y condición RI para cliente jurídico con CUIT", () => {
    const form = applyClienteToFacturarForm(
      { docTipo: 99, docNro: 0, condicionIvaReceptor: 5, tipo: 6 },
      cliente({
        id: 1,
        name: "MINISTERIO TEST",
        code: "M1",
        personeria: "persona_juridica",
        tax_condition: "responsable_inscripto",
        primary_tax_id: "30123456789",
      })
    )
    expect(form.docTipo).toBe(80)
    expect(form.docNro).toBe(30123456789)
    expect(form.condicionIvaReceptor).toBe(1)
    expect(form.tipo).toBe(1)
  })

  it("buildFacturarPayload autocompleta doc desde cliente sin pisar tipo ni condición del form", () => {
    const payload = buildFacturarPayload(
      { docTipo: 99, docNro: 0, condicionIvaReceptor: 1, tipo: 1 },
      cliente({
        id: 1,
        name: "MINISTERIO TEST",
        code: "M1",
        personeria: "persona_juridica",
        tax_condition: "responsable_inscripto",
        cuil_cuit: "30123456789",
      })
    )
    expect(payload.docTipo).toBe(80)
    expect(payload.docNro).toBe(30123456789)
    expect(payload.condicionIvaReceptor).toBe(1)
    expect(payload.tipo).toBe(1)
  })

  it("aplica Factura A a receptor monotributo cuando el emisor es RI", () => {
    const form = applyClienteToFacturarForm(
      { docTipo: 99, docNro: 0, condicionIvaReceptor: 5, tipo: 11 },
      cliente({
        id: 37,
        name: "FERNANDO MANUEL TADEO SUAREZ",
        code: "F1",
        tax_condition: "monotributo",
        cuil_cuit: "20355026656",
      })
    )
    expect(form.condicionIvaReceptor).toBe(6)
    expect(form.tipo).toBe(1)
    expect(form.docTipo).toBe(80)
  })

  it("usa tipo sugerido por la API (emisor RI → Factura A para monotributo)", () => {
    const form = buildFacturarFormForSale(
      cliente({
        id: 37,
        name: "FERNANDO MANUEL TADEO SUAREZ",
        code: "F1",
        tax_condition: "monotributo",
        cuil_cuit: "20355026656",
      }),
      {
        totalAmount: 2,
        condicionIvaReceptor: 6,
        sugerencia: {
          tipo: 1,
          label: "Factura A",
          motivo: "Emisor RI y receptor monotributo: corresponde Factura A.",
        },
      }
    )
    expect(form.tipo).toBe(1)
    expect(form.condicionIvaReceptor).toBe(6)
  })

  it("no deja Factura A con consumidor final si sugerencia API contradice al cliente ERP", () => {
    const form = buildFacturarFormForSale(
      cliente({
        id: 1,
        name: "MATERIALES BUTALO S. R. L.",
        code: "MIN033",
        personeria: "persona_juridica",
        tax_condition: "responsable_inscripto",
        primary_tax_id: "30709212083",
      }),
      {
        totalAmount: 1000,
        condicionIvaReceptor: 5,
        sugerencia: { tipo: 1, label: "Factura A" },
      }
    )
    expect(form.condicionIvaReceptor).toBe(1)
    expect(form.tipo).toBe(1)
    expect(form.docTipo).toBe(80)
    expect(form.docNro).toBe(30709212083)
  })

  it("validateFacturarPayloadCoherence permite Factura A a monotributo (6) con CUIT", () => {
    const err = validateFacturarPayloadCoherence({
      tipo: 1,
      condicionIvaReceptor: 6,
      docTipo: 80,
      docNro: 20355026656,
    })
    expect(err).toBeNull()
  })

  it("validateFacturarPayloadCoherence rechaza Factura A sin CUIT", () => {
    const err = validateFacturarPayloadCoherence({
      tipo: 1,
      condicionIvaReceptor: 5,
      docTipo: 99,
      docNro: 0,
    })
    expect(err).toMatch(/Factura A/)
  })

  it("buildFacturarPayload mapea monotributo (6) a consumidor final (5) en Factura B para WSFE", () => {
    const payload = buildFacturarPayload(
      {
        docTipo: 80,
        docNro: 20355026656,
        condicionIvaReceptor: 6,
        tipo: 6,
      },
      cliente({
        id: 37,
        name: "FERNANDO MANUEL TADEO SUAREZ",
        code: "F1",
        tax_condition: "monotributo",
        cuil_cuit: "20355026656",
      })
    )
    expect(payload.tipo).toBe(6)
    expect(payload.docTipo).toBe(80)
    expect(payload.condicionIvaReceptor).toBe(5)
  })

  it("buildFacturarPayload respeta Factura A manual aunque el cliente sea monotributo", () => {
    const payload = buildFacturarPayload(
      {
        docTipo: 80,
        docNro: 20355026656,
        condicionIvaReceptor: 6,
        tipo: 1,
      },
      cliente({
        id: 37,
        name: "FERNANDO MANUEL TADEO SUAREZ",
        code: "F1",
        tax_condition: "monotributo",
        cuil_cuit: "20355026656",
      })
    )
    expect(payload.tipo).toBe(1)
    expect(payload.condicionIvaReceptor).toBe(6)
  })

  it("validateFacturarReceptorFiscal permite CF (5) en Factura B a monotributista (mapeo WSFE)", () => {
    const err = validateFacturarReceptorFiscal(
      { client_id: 37, client_name: "FERNANDO" },
      cliente({
        id: 37,
        name: "FERNANDO MANUEL TADEO SUAREZ",
        code: "F1",
        tax_condition: "monotributo",
        cuil_cuit: "20355026656",
      }),
      { docTipo: 80, docNro: 20355026656, condicionIvaReceptor: 5, tipo: 6 }
    )
    expect(err).toBeNull()
  })

  it("buildFacturarPayload respeta condición manual sin mapeo WSFE", () => {
    const payload = buildFacturarPayload(
      {
        docTipo: 80,
        docNro: 20343304073,
        condicionIvaReceptor: 5,
        tipo: 1,
        fiscalManualConfig: true,
      },
      cliente({
        id: 1,
        name: "MATIAS",
        code: "M1",
        tax_condition: "monotributo",
        cuil_cuit: "20343304073",
      })
    )
    expect(payload.tipo).toBe(1)
    expect(payload.condicionIvaReceptor).toBe(5)
    expect(payload.fiscalManualConfig).toBe(true)
    expect(payload.skipPadronCondicionCheck).toBe(true)
  })

  it("validateFacturarReceptorFiscal permite override manual Factura A + CF (5)", () => {
    const err = validateFacturarReceptorFiscal(
      { client_id: 1, client_name: "MATIAS" },
      cliente({
        id: 1,
        name: "MATIAS DANIEL RONCATTO",
        code: "M1",
        tax_condition: "monotributo",
        cuil_cuit: "20343304073",
      }),
      {
        docTipo: 80,
        docNro: 20343304073,
        condicionIvaReceptor: 5,
        tipo: 1,
        fiscalManualConfig: true,
      }
    )
    expect(err).toBeNull()
  })

  it("validateFacturarPayloadCoherence rechaza CUIT con CF en Factura A", () => {
    const err = validateFacturarPayloadCoherence({
      tipo: 1,
      condicionIvaReceptor: 5,
      docTipo: 80,
      docNro: 20355026656,
    })
    expect(err).toMatch(/Factura B/)
  })

  it("validateFacturarReceptorFiscal detecta CUIT en ERP con payload CF", () => {
    const err = validateFacturarReceptorFiscal(
      { client_id: 10, client_name: "MINISTERIO" },
      cliente({
        id: 10,
        name: "MINISTERIO",
        code: "M1",
        cuil_cuit: "30123456789",
        tax_condition: "responsable_inscripto",
        personeria: "persona_juridica",
      }),
      { docTipo: 99, docNro: 0, condicionIvaReceptor: 5, tipo: 6 }
    )
    expect(err).toMatch(/Consumidor final/i)
  })
})
