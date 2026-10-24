import type { FacturarSaleRequest } from "@/lib/api"
import { labelCondicionIvaReceptor } from "@/lib/facturacion-cliente-fiscal"
import {
  extractFacturacionErrorFromPayload,
  resolveFacturacionError,
  resolveFacturacionErrorFromExtracted,
  type ExtractedFacturacionError,
  type FacturacionErrorInfo,
} from "@/lib/facturacion-errors"

export interface FacturacionApiErrorLike {
  message?: string
  status?: number
  code?: string
  requestId?: string
  data?: Record<string, unknown> | null
  responsePayload?: unknown
  facturacionError?: FacturacionErrorInfo
}

function receptorContextFromPayload(payload?: FacturarSaleRequest | null): FacturacionErrorInfo["receptorContext"] {
  if (!payload) return undefined
  const condicion = payload.condicionIvaReceptor
  return {
    docTipo: payload.docTipo,
    docNro: payload.docNro,
    condicionIvaReceptor: condicion,
    condicionLabel: condicion != null ? labelCondicionIvaReceptor(condicion) : undefined,
    tipoComprobante: payload.tipo,
  }
}

function mergeReceptorIntoExtracted(
  extracted: ExtractedFacturacionError,
  payload?: FacturarSaleRequest | null
): ExtractedFacturacionError {
  const ctx = receptorContextFromPayload(payload)
  if (!ctx) return extracted
  return {
    ...extracted,
    docTipo: extracted.docTipo ?? ctx.docTipo,
    docNro: extracted.docNro ?? ctx.docNro,
    condicionIvaReceptor: extracted.condicionIvaReceptor ?? ctx.condicionIvaReceptor,
    tipoComprobante: extracted.tipoComprobante ?? ctx.tipoComprobante,
  }
}

/** Resuelve error de facturación/NC con contexto del payload enviado y respuesta API. */
export function resolveFacturacionApiError(
  err: FacturacionApiErrorLike,
  options?: {
    payload?: FacturarSaleRequest | null
    isNetwork?: boolean
  }
): FacturacionErrorInfo {
  if (err.facturacionError) {
    const ctx = receptorContextFromPayload(options?.payload)
    if (!err.facturacionError.receptorContext && ctx) {
      return { ...err.facturacionError, receptorContext: ctx }
    }
    return err.facturacionError
  }

  const payload = err.responsePayload ?? { data: err.data, message: err.message, error: err.message }
  const extracted = mergeReceptorIntoExtracted(
    extractFacturacionErrorFromPayload(payload, err.status),
    options?.payload
  )

  if (options?.isNetwork) {
    return resolveFacturacionError({
      code: "NETWORK_ERROR",
      rawMessage: err.message,
      requestId: err.requestId ?? extracted.requestId,
      receptorContext: receptorContextFromPayload(options?.payload),
    })
  }

  return resolveFacturacionErrorFromExtracted(extracted, err.status)
}
