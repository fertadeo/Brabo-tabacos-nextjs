import type { FacturarSaleRequest, SalePaymentMethod } from "@/lib/api"

/** Longitud recomendada para la etiqueta impresa en el PDF ARCA. */
export const CONDICION_VENTA_MAX_LENGTH = 120

export interface CondicionVentaCatalogItem {
  codigo: string
  etiquetaPdf: string
  /** null = plazo según acuerdo / sin cálculo automático */
  diasPlazo: number | null
  notas?: string
}

/** Catálogo ERP de condiciones de venta (texto libre enviado al facturador como `condicionVenta`). */
export const CONDICION_VENTA_CATALOG: CondicionVentaCatalogItem[] = [
  { codigo: "CONTADO", etiquetaPdf: "Contado", diasPlazo: 0, notas: "Pago inmediato" },
  { codigo: "CC", etiquetaPdf: "Cuenta corriente", diasPlazo: null },
  { codigo: "CC_15", etiquetaPdf: "Cuenta corriente — 15 días", diasPlazo: 15 },
  { codigo: "CC_30", etiquetaPdf: "Cuenta corriente — 30 días fecha factura", diasPlazo: 30 },
  { codigo: "CC_60", etiquetaPdf: "Cuenta corriente — 60 días fecha factura", diasPlazo: 60 },
  { codigo: "CC_90", etiquetaPdf: "Cuenta corriente — 90 días fecha factura", diasPlazo: 90 },
  { codigo: "TRANSFERENCIA", etiquetaPdf: "Transferencia bancaria", diasPlazo: 0 },
  { codigo: "CHEQUE", etiquetaPdf: "Cheque", diasPlazo: null },
  { codigo: "TD", etiquetaPdf: "Tarjeta de débito", diasPlazo: 0 },
  { codigo: "TC", etiquetaPdf: "Tarjeta de crédito", diasPlazo: 0 },
  { codigo: "ECHEQ", etiquetaPdf: "eCheq", diasPlazo: null },
  { codigo: "OTRO", etiquetaPdf: "Otro", diasPlazo: null, notas: "Texto libre del usuario" },
]

export const DEFAULT_CONDICION_VENTA_CODIGO = "CONTADO"

const catalogByCodigo = new Map(CONDICION_VENTA_CATALOG.map((item) => [item.codigo, item]))

export function getCondicionVentaByCodigo(codigo: string | null | undefined): CondicionVentaCatalogItem | null {
  if (!codigo?.trim()) return null
  return catalogByCodigo.get(codigo.trim().toUpperCase()) ?? null
}

export function defaultCondicionVentaCodigoFromPayment(
  paymentMethod?: SalePaymentMethod | null
): string {
  switch (paymentMethod) {
    case "transferencia":
      return "TRANSFERENCIA"
    case "tarjeta":
      return "TC"
    case "efectivo":
    case "mixto":
    default:
      return "CONTADO"
  }
}

export function resolveCondicionVentaEtiqueta(
  codigo: string | null | undefined,
  textoLibre?: string | null
): string {
  const item =
    getCondicionVentaByCodigo(codigo) ??
    getCondicionVentaByCodigo(DEFAULT_CONDICION_VENTA_CODIGO)!
  if (item.codigo === "OTRO") {
    const custom = (textoLibre ?? "").trim()
    return custom ? truncateCondicionVenta(custom) : "Otro"
  }
  return truncateCondicionVenta(item.etiquetaPdf)
}

export function truncateCondicionVenta(text: string): string {
  const t = text.trim()
  if (t.length <= CONDICION_VENTA_MAX_LENGTH) return t
  return t.slice(0, CONDICION_VENTA_MAX_LENGTH)
}

function normalizeFechaYmd(value?: string | null): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

export function argentinaTodayYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

/** Suma días calendario a una fecha YYYY-MM-DD (sin depender de TZ del navegador). */
export function sumarDiasYmd(fechaYmd: string, dias: number): string {
  const base = normalizeFechaYmd(fechaYmd) ?? argentinaTodayYmd()
  const [y, m, d] = base.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + dias)
  return dt.toISOString().slice(0, 10)
}

export interface ApplyCondicionVentaContext {
  fechaComprobante?: string | null
  receptorRazonSocial?: string | null
  receptorDomicilio?: string | null
}

/**
 * Enriquece el body de facturación con `condicionVenta`, vencimiento de pago (servicios)
 * y datos de receptor para el PDF del facturador.
 */
export function applyCondicionVentaToFacturarPayload(
  payload: FacturarSaleRequest,
  ctx?: ApplyCondicionVentaContext
): FacturarSaleRequest {
  const codigo = payload.condicionVentaCodigo ?? DEFAULT_CONDICION_VENTA_CODIGO
  const etiqueta = resolveCondicionVentaEtiqueta(codigo, payload.condicionVentaTexto)
  const item = getCondicionVentaByCodigo(codigo)
  const concepto = payload.concepto ?? 1
  const fechaCbte = normalizeFechaYmd(ctx?.fechaComprobante) ?? argentinaTodayYmd()

  const enriched: FacturarSaleRequest = {
    ...payload,
    condicionVentaCodigo: codigo,
    condicionVenta: etiqueta,
  }

  if (ctx?.receptorRazonSocial?.trim()) {
    enriched.receptorRazonSocial = ctx.receptorRazonSocial.trim()
  }
  if (ctx?.receptorDomicilio?.trim()) {
    enriched.receptorDomicilio = ctx.receptorDomicilio.trim()
  }

  if (concepto === 2 || concepto === 3) {
    const plazo =
      payload.fechaVencimientoPago != null
        ? undefined
        : item?.diasPlazo ?? 0
    if (payload.fechaVencimientoPago) {
      enriched.fechaVencimientoPago = normalizeFechaYmd(payload.fechaVencimientoPago)
    } else if (plazo != null && plazo >= 0) {
      enriched.fechaVencimientoPago = sumarDiasYmd(fechaCbte, plazo)
    }
  }

  return enriched
}

export function condicionVentaLabelFromPayload(payload: FacturarSaleRequest): string {
  if (payload.condicionVenta?.trim()) return payload.condicionVenta.trim()
  return resolveCondicionVentaEtiqueta(
    payload.condicionVentaCodigo ?? DEFAULT_CONDICION_VENTA_CODIGO,
    payload.condicionVentaTexto
  )
}
export function condicionVentaFieldsFromSale(
  sale: {
    condicion_venta_codigo?: string | null
    condicion_venta_texto?: string | null
    fecha_vencimiento_pago?: string | null
    arca_request_json?: Record<string, unknown> | null
  } | null | undefined
): Pick<FacturarSaleRequest, "condicionVentaCodigo" | "condicionVenta" | "condicionVentaTexto" | "fechaVencimientoPago"> {
  if (!sale) return {}
  const req = sale.arca_request_json
  const texto =
    sale.condicion_venta_texto ??
    (typeof req?.condicionVenta === "string" ? req.condicionVenta : null)
  const codigo = sale.condicion_venta_codigo ?? undefined
  const fechaVto =
    sale.fecha_vencimiento_pago ??
    (typeof req?.fechaVencimientoPago === "string" ? req.fechaVencimientoPago : undefined)

  return {
    ...(codigo ? { condicionVentaCodigo: codigo } : {}),
    ...(texto ? { condicionVenta: texto, condicionVentaTexto: codigo === "OTRO" ? texto : undefined } : {}),
    ...(fechaVto ? { fechaVencimientoPago: fechaVto.slice(0, 10) } : {}),
  }
}
