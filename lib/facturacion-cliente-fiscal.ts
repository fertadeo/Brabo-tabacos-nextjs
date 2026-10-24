import type { Cliente } from "@/lib/api"
import {
  afipCondicionFromTaxCondition,
  CLIENT_TAX_CONDITION_OPTIONS,
  normalizeTaxConditionFromApi,
  type ClientTaxCondition,
} from "@/lib/client-tax-condition"
import { CONDICIONES_IVA_RECEPTOR, isCondicionIvaMonotributoErp } from "@/lib/facturacion-comprobantes"
import { normalizeSaleIvaRate, type SaleIvaRate } from "@/lib/sale-iva"

export type EmisorCondicionIva = "responsable_inscripto" | "monotributo"

export type EmisorRegimenApi = "responsable_inscripto" | "monotributo" | "exento"

/** Régimen del emisor según GET /facturar/sugerencia (prioridad sobre env del navegador). */
let emisorRegimenFromApi: EmisorRegimenApi | null = null

export function setEmisorRegimenFromApi(regimen?: string | null): void {
  const r = (regimen ?? "").trim().toLowerCase()
  if (r === "monotributo" || r === "mt") {
    emisorRegimenFromApi = "monotributo"
    return
  }
  if (r === "exento") {
    emisorRegimenFromApi = "exento"
    return
  }
  if (r === "responsable_inscripto" || r === "ri") {
    emisorRegimenFromApi = "responsable_inscripto"
  }
}

export function getEmisorRegimenFromApi(): EmisorRegimenApi | null {
  return emisorRegimenFromApi
}

export function getEmisorRegimenLabel(regimen?: EmisorRegimenApi | null): string {
  if (regimen === "monotributo") return "Monotributo"
  if (regimen === "exento") return "Exento"
  if (regimen === "responsable_inscripto") return "Responsable inscripto"
  return "No informado"
}

/** Condición IVA del emisor (MF). Por defecto RI; monotributo emite solo Factura C. */
export function getEmisorCondicionIva(): EmisorCondicionIva {
  if (emisorRegimenFromApi === "monotributo" || emisorRegimenFromApi === "exento") {
    return "monotributo"
  }
  if (emisorRegimenFromApi === "responsable_inscripto") {
    return "responsable_inscripto"
  }
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_FACTURADOR_EMISOR_CONDICION_IVA?.trim().toLowerCase()
      : undefined
  return raw === "monotributo" ? "monotributo" : "responsable_inscripto"
}

export function condicionIvaReceptorFromCliente(cliente: Cliente | null): number {
  if (!cliente) return 5

  const stored = (cliente as Cliente & { condicion_iva_receptor?: number }).condicion_iva_receptor
  if (stored != null && Number.isFinite(stored) && stored > 0) {
    return stored
  }

  const tc = normalizeTaxConditionFromApi(cliente.tax_condition)
  if (tc) return afipCondicionFromTaxCondition(tc)

  if (cliente.personeria === "persona_juridica") return 1
  if (cliente.personeria === "persona_fisica") return 5

  return 5
}

/**
 * Tipo WSFE según condición IVA del receptor y régimen del emisor (tabla ARCA).
 * Emisor monotributo o exento → Factura C (11).
 * Emisor RI → receptor RI o monotributo → Factura A (1); consumidor final / exento → Factura B (6).
 */
export function resolveTipoComprobanteFromCondicionIvaReceptor(
  condicionIvaReceptor: number,
  emisorCondicion: EmisorCondicionIva = getEmisorCondicionIva()
): number {
  if (emisorCondicion === "monotributo") return 11

  if (condicionIvaReceptor === 1) return 1
  if (isCondicionIvaMonotributoErp(condicionIvaReceptor)) return 1
  return 6
}

export function resolveFacturacionDesdeCliente(cliente: Cliente | null): {
  condicionIvaReceptor: number
  tipoComprobante: number
  taxCondition?: ClientTaxCondition
} {
  const taxCondition = normalizeTaxConditionFromApi(cliente?.tax_condition)
  const condicionIvaReceptor = condicionIvaReceptorFromCliente(cliente)
  const tipoComprobante = resolveTipoComprobanteFromCondicionIvaReceptor(condicionIvaReceptor)
  return { condicionIvaReceptor, tipoComprobante, taxCondition }
}

export function labelCondicionIvaReceptor(codigo: number): string {
  const found = CONDICIONES_IVA_RECEPTOR.find((c) => c.value === codigo)
  return found?.label ?? `Condición ${codigo}`
}

/**
 * Etiqueta legible para PDF/UI: prioriza la condición fiscal del cliente en el ERP
 * cuando difiere del código enviado en el payload WSFE.
 */
export function labelCondicionIvaReceptorForDisplay(
  codigoWsfe: number,
  cliente?: Cliente | null
): string {
  if (cliente) {
    const tax = normalizeTaxConditionFromApi(cliente.tax_condition)
    if (tax) {
      const opt = CLIENT_TAX_CONDITION_OPTIONS.find((o) => o.value === tax)
      if (opt) return opt.label
    }
    const erpCodigo = condicionIvaReceptorFromCliente(cliente)
    if (erpCodigo !== codigoWsfe) {
      return labelCondicionIvaReceptor(erpCodigo)
    }
  }
  return labelCondicionIvaReceptor(codigoWsfe)
}

/** Solo Factura C (y NC C): no admite IVA discriminado por ítem en el payload AFIP. Factura B sí puede llevarlo (opcional). */
export function tipoComprobanteRequiresZeroItemIva(tipo: number): boolean {
  return tipo === 11 || tipo === 13
}

/**
 * Obligatorio IVA 0% solo para circuito Factura C (tipo 11/13), típico de emisor monotributo.
 * Receptor monotributo con emisor RI usa Factura A y discrimina IVA.
 */
export function clienteRequiresZeroItemIva(cliente: Cliente | null): boolean {
  const tipo = resolveFacturacionDesdeCliente(cliente).tipoComprobante
  return tipoComprobanteRequiresZeroItemIva(tipo)
}

export function effectiveSaleItemIvaRate(
  ivaRate: number | null | undefined,
  cliente: Cliente | null
): SaleIvaRate {
  if (clienteRequiresZeroItemIva(cliente)) return 0
  return normalizeSaleIvaRate(ivaRate)
}

export function saleLinesHaveGravadoIva(
  lines: Array<{ iva_rate?: number | null; ivaRate?: number | null }>
): boolean {
  return lines.some((line) => normalizeSaleIvaRate(line.iva_rate ?? line.ivaRate) > 0)
}

export function validateFacturacionItemIva(
  tipoComprobante: number,
  lines: Array<{ iva_rate?: number | null; ivaRate?: number | null }>
): string | null {
  if (!tipoComprobanteRequiresZeroItemIva(tipoComprobante)) return null
  if (!saleLinesHaveGravadoIva(lines)) return null
  return "Esta venta tiene ítems con IVA gravado (21% o 10,5%), pero el comprobante es Factura C. Editá la venta y poné todos los ítems en 0% (exento) antes de facturar; ARCA rechazará el comprobante si se envía con IVA discriminado."
}
