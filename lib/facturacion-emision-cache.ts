import type { FacturarSaleRequest } from "@/lib/api"
import type { FacturacionEmisionData } from "@/lib/facturacion-errors"
import { buildDefaultFacturarFormRequest } from "@/lib/facturacion-settings"

const prefix = "mf_arca_emision_"

export function cacheFacturacionEmision(
  saleId: number,
  emision: FacturacionEmisionData,
  facturarPayload: FacturarSaleRequest
): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(
      `${prefix}${saleId}`,
      JSON.stringify({ emision, facturarPayload, cachedAt: new Date().toISOString() })
    )
  } catch {
    /* quota / privado */
  }
}

export function getCachedFacturacionEmision(saleId: number): {
  emision: FacturacionEmisionData
  facturarPayload: FacturarSaleRequest
} | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(`${prefix}${saleId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      emision?: FacturacionEmisionData
      facturarPayload?: FacturarSaleRequest
    }
    if (!parsed?.emision?.cae) return null
    return {
      emision: parsed.emision,
      facturarPayload: parsed.facturarPayload ?? buildDefaultFacturarFormRequest(),
    }
  } catch {
    return null
  }
}
