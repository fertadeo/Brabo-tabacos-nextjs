import { describe, expect, it } from "vitest"
import {
  applyCondicionVentaToFacturarPayload,
  resolveCondicionVentaEtiqueta,
  sumarDiasYmd,
} from "./condicion-venta"

describe("condicion-venta", () => {
  it("resuelve etiqueta del catálogo", () => {
    expect(resolveCondicionVentaEtiqueta("CC_30", null)).toBe(
      "Cuenta corriente — 30 días fecha factura"
    )
  })

  it("usa texto libre para OTRO", () => {
    expect(resolveCondicionVentaEtiqueta("OTRO", "Pago a 45 días")).toBe("Pago a 45 días")
  })

  it("calcula fechaVencimientoPago en servicios", () => {
    const out = applyCondicionVentaToFacturarPayload(
      { concepto: 2, condicionVentaCodigo: "CC_30" },
      { fechaComprobante: "2026-06-16" }
    )
    expect(out.condicionVenta).toContain("30 días")
    expect(out.fechaVencimientoPago).toBe("2026-07-16")
  })

  it("suma días en YYYY-MM-DD", () => {
    expect(sumarDiasYmd("2026-06-16", 30)).toBe("2026-07-16")
  })
})
