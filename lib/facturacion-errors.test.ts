import { describe, expect, it } from "vitest"
import {
  buildFacturacionErrorDiagnosis,
  formatFacturacionErrorForUi,
  formatFacturacionErrorSummaryForUi,
  resolveFacturacionErrorFromExtracted,
} from "@/lib/facturacion-errors"

describe("facturacion-errors diagnosis", () => {
  it("diagnostica CUIT + consumidor final", () => {
    const diagnosis = buildFacturacionErrorDiagnosis({
      code: "RECEPTOR_CUIT_CONDICION_INVALIDA",
      receptorContext: { docTipo: 80, docNro: 20355026656, condicionIvaReceptor: 5 },
    })
    expect(diagnosis).toMatch(/Consumidor final/)
  })

  it("resuelve error ARCA 10056 con mensaje de condición IVA", () => {
    const info = resolveFacturacionErrorFromExtracted({
      code: "10056",
      message: "Condicion IVA receptor invalida",
      remoteDetail: "Observacion 10056",
    })
    expect(info.title).toMatch(/Condición IVA/)
    expect(info.diagnosis).toMatch(/condición IVA/i)
    expect(info.remoteDetail).toBe("Observacion 10056")
  })

  it("extrae issues de validación desde data", () => {
    const info = resolveFacturacionErrorFromExtracted({
      code: "RECEPTOR_CUIT_CONDICION_INVALIDA",
      message: "Con CUIT/CUIL del receptor",
      issues: [{ code: "RECEPTOR_CUIT_CONDICION_INVALIDA", message: "Detalle issue" }],
      sugerencias: ["Consultá padrón ARCA"],
    })
    expect(info.issues?.[0]?.message).toBe("Detalle issue")
    expect(info.suggestions).toContain("Consultá padrón ARCA")
  })

  it("prioriza diagnosis en el resumen para la UI", () => {
    const info = resolveFacturacionErrorFromExtracted({
      code: "10056",
      message: "Condicion IVA receptor invalida",
      remoteDetail: "Observacion 10056",
    })
    expect(formatFacturacionErrorSummaryForUi(info)).toMatch(/condición IVA/i)
    expect(formatFacturacionErrorForUi(info)).toMatch(/condición IVA/i)
  })
})
