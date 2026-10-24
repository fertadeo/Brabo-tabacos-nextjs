import { describe, expect, it } from "vitest"
import { buildAfipQrUrl, parseAfipQrReceptorDoc } from "@/lib/arca-invoice-afip-qr"
import { formatDocReceptor } from "@/lib/arca-invoice-format"
import {
  extractDocFromArcaRequest,
  resolveReceptorDocForInvoicePdf,
} from "@/lib/facturacion-receptor-doc"

describe("parseAfipQrReceptorDoc", () => {
  it("extrae CUIT del receptor desde qrUrl AFIP", () => {
    const qrUrl = buildAfipQrUrl({
      fechaEmision: "2026-06-19",
      cuitEmisor: "20339985945",
      puntoVenta: 5,
      tipoComprobante: 6,
      numeroComprobante: 17,
      importe: 475000,
      docTipoReceptor: 80,
      docNroReceptor: 30709212083,
      cae: "12345678901234",
    })
    expect(parseAfipQrReceptorDoc(qrUrl)).toEqual({ docTipo: 80, docNro: 30709212083 })
  })
})

describe("formatDocReceptor", () => {
  it("formatea CUIT con guiones", () => {
    expect(formatDocReceptor(80, 30709212083)).toBe("30-70921208-3")
  })

  it("muestra guión solo sin número", () => {
    expect(formatDocReceptor(99, 0)).toBe("-")
  })

  it("muestra CUIT aunque docTipo sea 99 (payload incompleto)", () => {
    expect(formatDocReceptor(99, 30709212083)).toBe("30-70921208-3")
  })
})

describe("resolveReceptorDocForInvoicePdf", () => {
  it("prioriza docTipo 80 del payload", () => {
    expect(
      resolveReceptorDocForInvoicePdf(
        { docTipo: 80, docNro: 20339985945 },
        { cuil_cuit: "30709212083" }
      )
    ).toEqual({ docTipo: 80, docNro: 20339985945 })
  })

  it("toma CUIT del cliente si el payload es consumidor final", () => {
    expect(
      resolveReceptorDocForInvoicePdf(
        { docTipo: 99, docNro: 0 },
        { primary_tax_id: "30-70921208-3" }
      )
    ).toEqual({ docTipo: 80, docNro: 30709212083 })
  })

  it("prioriza hints del QR sobre consumidor final en payload", () => {
    expect(
      resolveReceptorDocForInvoicePdf(
        { docTipo: 99, docNro: 0 },
        null,
        { docTipo: 80, docNro: 30709212083 }
      )
    ).toEqual({ docTipo: 80, docNro: 30709212083 })
  })

  it("lee doc desde arca_request_json y campos planos", () => {
    expect(
      extractDocFromArcaRequest({
        arca_receptor_doc_tipo: 80,
        arca_receptor_doc_nro: "30709212083",
      })
    ).toEqual({ docTipo: 80, docNro: 30709212083 })

    expect(
      extractDocFromArcaRequest({
        arca_request_json: { docTipo: 80, docNro: "30709212083", condicionIvaReceptor: 4 },
      })
    ).toEqual({ docTipo: 80, docNro: 30709212083, condicionIvaReceptor: 4 })
  })
})
