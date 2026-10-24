import { describe, expect, it } from "vitest"
import { buildArcaInvoicePdfInputFromPreviewLines } from "@/lib/build-arca-invoice-pdf-input"

describe("buildArcaInvoicePdfInputFromPreviewLines", () => {
  it("arma borrador con receptor, ítems y tipo NC", () => {
    const preview = buildArcaInvoicePdfInputFromPreviewLines({
      facturarPayload: {
        tipo: 6,
        docTipo: 80,
        docNro: 30709212083,
        condicionIvaReceptor: 1,
        concepto: 1,
        puntoVenta: 5,
      },
      lines: [
        {
          description: "Producto test",
          quantity: 2,
          unitPrice: 1000,
          subtotal: 2000,
          ivaRate: 21,
        },
      ],
      receptorRazonSocial: "MATERIALES BUTALO S. R. L.",
      totalAmount: 2000,
      tipoComprobante: 8,
      previewAviso: "Anula comprobante A 00005-00000001",
    })

    expect(preview.comprobante.tipo).toBe(8)
    expect(preview.comprobante.numero).toBe(0)
    expect(preview.comprobanteIncompleto).toBe(true)
    expect(preview.receptor.razonSocial).toContain("BUTALO")
    expect(preview.items).toHaveLength(1)
    expect(preview.cae).toBe("")
  })

  it("completa CUIT del receptor desde el cliente ERP si el payload tiene docTipo 99", () => {
    const preview = buildArcaInvoicePdfInputFromPreviewLines({
      facturarPayload: {
        tipo: 6,
        docTipo: 99,
        docNro: 0,
        condicionIvaReceptor: 4,
        concepto: 1,
        puntoVenta: 5,
      },
      lines: [
        {
          description: "Servicio",
          quantity: 1,
          unitPrice: 1000,
          subtotal: 1000,
          ivaRate: 21,
        },
      ],
      receptorRazonSocial: "ENTE PROVINCIAL DEL RIO COLORADO O. P.",
      cliente: {
        id: 1,
        code: "C001",
        client_type: "mayorista",
        sales_channel: "sistema_mf",
        name: "ENTE PROVINCIAL DEL RIO COLORADO O. P.",
        email: "",
        phone: "",
        city: "Santa Rosa",
        country: "AR",
        is_active: 1,
        created_at: "",
        updated_at: "",
        cuil_cuit: "30709212083",
        condicion_iva_receptor: 4,
      },
      totalAmount: 1000,
    })

    expect(preview.receptor.docTipo).toBe(80)
    expect(preview.receptor.docNro).toBe(30709212083)
  })
})
