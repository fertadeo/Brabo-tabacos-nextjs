import { describe, expect, it } from "vitest"
import {
  buildFacturarFullPayloadPreview,
  extractFacturarBodyFromPreviewJson,
  mergeFacturarSaleRequestBody,
} from "@/lib/facturacion-request-preview"

describe("facturacion-request-preview", () => {
  it("conserva campos del body y no agrega cuit/pv si ya vienen en el payload", () => {
    const merged = mergeFacturarSaleRequestBody({
      tipo: 6,
      docTipo: 80,
      docNro: 30123456789,
      condicionIvaReceptor: 1,
      concepto: 1,
      cuitEmisor: "20123456789",
      puntoVenta: 5,
    })

    expect(merged.cuitEmisor).toBe("20123456789")
    expect(merged.puntoVenta).toBe(5)
    expect(merged.docTipo).toBe(80)
  })

  it("arma JSON completo con receptor, ítems e IVA (Factura A)", () => {
    const preview = buildFacturarFullPayloadPreview({
      saleId: 42,
      saleNumber: "SALE-001",
      clientId: 7,
      facturarPayload: {
        tipo: 1,
        docTipo: 80,
        docNro: 30709212083,
        condicionIvaReceptor: 1,
        concepto: 1,
        cuitEmisor: "20339985945",
        puntoVenta: 5,
      },
      lines: [
        {
          description: "Disco 1TB",
          quantity: 2,
          unitPrice: 100000,
          subtotal: 200000,
          ivaRate: 21,
          neto: 165289.26,
          iva: 34710.74,
        },
      ],
      receptor: {
        razonSocial: "MATERIALES BUTALO S. R. L.",
        docTipo: 80,
        docNro: 30709212083,
        condicionIvaReceptor: 1,
        condicionIvaLabel: "IVA Responsable Inscripto",
        taxConditionEnErp: "responsable_inscripto",
      },
      totalAmount: 200000,
    })

    expect(preview.receptor.razonSocial).toBe("MATERIALES BUTALO S. R. L.")
    expect(preview.items).toHaveLength(1)
    expect(preview.items[0].quantity).toBe(2)
    expect(preview.items[0].iva_rate).toBe(21)
    expect(preview.totales.importe_total).toBe(200000)
    expect(preview.facturadorPayload.iva).toBeDefined()
    expect(preview.httpRequest.body.tipo).toBe(1)
  })

  it("Factura C no incluye iva en facturadorPayload ni desglose IVA en ítems", () => {
    const preview = buildFacturarFullPayloadPreview({
      saleId: 46,
      saleNumber: "SALE-202606-0001",
      facturarPayload: {
        tipo: 11,
        docTipo: 80,
        docNro: 20355026656,
        condicionIvaReceptor: 6,
        concepto: 1,
        cuitEmisor: "20339985945",
        puntoVenta: 5,
      },
      lines: [
        {
          description: "Producto de prueba",
          quantity: 2,
          unitPrice: 1,
          subtotal: 2,
          ivaRate: 0,
        },
      ],
      receptor: {
        razonSocial: "FERNANDO MANUEL TADEO SUAREZ",
        docTipo: 80,
        docNro: 20355026656,
        condicionIvaReceptor: 6,
        condicionIvaLabel: "Responsable Monotributo",
      },
      saleDate: "2026-06-02",
      fechaCbte: "2026-06-16",
      totalAmount: 2,
    })

    expect(preview.facturadorPayload.tipo).toBe(11)
    expect(preview.facturadorPayload.iva).toBeUndefined()
    expect(preview.facturadorPayload.importe).toBe(2)
    expect(preview.items[0]).not.toHaveProperty("iva_rate")
    expect(preview.totales).toEqual({ importe_total: 2 })
    expect(preview.venta.fechaComprobante).toBe("2026-06-16")
    expect(preview.comprobante.notaFechasServicio).toContain("No aplica")
  })

  it("Factura B con producto exento alinea totales ERP y facturadorPayload con MultiFacturador", () => {
    const preview = buildFacturarFullPayloadPreview({
      saleId: 46,
      saleNumber: "SALE-202606-0001",
      facturarPayload: {
        tipo: 6,
        docTipo: 80,
        docNro: 20355026656,
        condicionIvaReceptor: 6,
        concepto: 1,
        cuitEmisor: "20339985945",
        puntoVenta: 5,
      },
      lines: [
        {
          description: "Producto de prueba. Testing Sistema",
          quantity: 2,
          unitPrice: 1,
          subtotal: 2,
          ivaRate: 0,
        },
      ],
      receptor: {
        razonSocial: "FERNANDO MANUEL TADEO SUAREZ",
        docTipo: 80,
        docNro: 20355026656,
        condicionIvaReceptor: 6,
        condicionIvaLabel: "Responsable Monotributo",
      },
      totalAmount: 2,
    })

    expect(preview.facturadorPayload).toEqual({
      cuitEmisor: 20339985945,
      tipo: 6,
      puntoVenta: 5,
      docTipo: 80,
      docNro: "20355026656",
      condicionIvaReceptor: 5,
      concepto: 1,
      importe: 2,
      iva: [{ id: 3, base: 2, cuota: 0 }],
      omitirPdf: true,
    })
    expect(preview.httpRequest.body.condicionIvaReceptor).toBe(5)
    expect(preview.receptor.condicionIvaReceptor).toBe(5)
    expect(preview.receptor.condicionIvaLabel).toBe("Consumidor final")
    expect(preview.receptor.condicionIvaReceptorErp).toBe(6)
    expect(preview.receptor.condicionIvaErpLabel).toBe("Responsable Monotributo")
    expect(preview.items[0].importe_exento).toBe(2)
    expect(preview.items[0]).not.toHaveProperty("neto_gravado")
    expect(preview.totales).toEqual({
      neto_gravado: 0,
      importe_exento: 2,
      iva_discriminado: 0,
      iva_21: 0,
      iva_10_5: 0,
      importe_total: 2,
    })
  })

  it("mergeFacturarSaleRequestBody no mapea WSFE con fiscalManualConfig", () => {
    const merged = mergeFacturarSaleRequestBody({
      tipo: 1,
      docTipo: 80,
      docNro: 20343304073,
      condicionIvaReceptor: 5,
      concepto: 1,
      fiscalManualConfig: true,
    })
    expect(merged.condicionIvaReceptor).toBe(5)
    expect(merged.tipo).toBe(1)
  })

  it("extractFacturarBodyFromPreviewJson lee httpRequest.body", () => {
    const result = extractFacturarBodyFromPreviewJson(
      JSON.stringify({
        httpRequest: {
          method: "POST",
          url: "http://localhost/api/sales/70/facturar",
          body: { tipo: 1, condicionIvaReceptor: 5, docTipo: 80, docNro: 20343304073 },
        },
      })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.body.tipo).toBe(1)
      expect(result.body.condicionIvaReceptor).toBe(5)
      expect(result.body.fiscalManualConfig).toBe(true)
    }
  })

  it("extractFacturarBodyFromPreviewJson acepta body plano", () => {
    const result = extractFacturarBodyFromPreviewJson(
      JSON.stringify({ tipo: 6, condicionIvaReceptor: 5, docTipo: 80, docNro: 123 })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.body.tipo).toBe(6)
    }
  })
})
