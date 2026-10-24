import type { Cliente, FacturarSaleRequest, FacturarSugerenciaData } from "@/lib/api"
import {
  afipCondicionFromTaxCondition,
  formatTaxConditionLabel,
  normalizeTaxConditionFromApi,
} from "@/lib/client-tax-condition"
import {
  resolveFacturacionDesdeCliente,
  resolveTipoComprobanteFromCondicionIvaReceptor,
  setEmisorRegimenFromApi,
} from "@/lib/facturacion-cliente-fiscal"
import {
  isComprobanteClaseB,
  isCondicionIvaMonotributoErp,
  resolveCondicionIvaReceptorForWsfe,
} from "@/lib/facturacion-comprobantes"
import { buildDefaultFacturarFormRequest } from "@/lib/facturacion-settings"
import { soloDigitosDoc } from "@/lib/facturacion-receptor-doc"
import {
  classifyClientTaxId,
  normalizeClientTaxIdDigits,
} from "@/lib/client-tax-id"

/** Cliente con datos fiscales confiables en el ERP (no pisar con sugerencia API). */
export function clienteTieneDatosFiscalesErp(cliente?: Cliente | null): boolean {
  if (!cliente) return false
  if (classifyClientTaxId(clienteCuitDigitos(cliente))) return true
  if (normalizeTaxConditionFromApi(cliente.tax_condition)) return true
  if (cliente.personeria === "persona_juridica") return true
  if (cliente.condicion_iva_receptor != null && cliente.condicion_iva_receptor > 0) return true
  return false
}

/** Condición IVA fiscal del cliente en el ERP (no la enviada a WSFE). */
export function clienteCondicionIvaErp(cliente?: Cliente | null): number | null {
  if (!cliente) return null
  if (cliente.condicion_iva_receptor != null && cliente.condicion_iva_receptor > 0) {
    return cliente.condicion_iva_receptor
  }
  const tax = normalizeTaxConditionFromApi(cliente.tax_condition)
  if (tax) return afipCondicionFromTaxCondition(tax)
  if (cliente.personeria === "persona_juridica") return 1
  if (cliente.personeria === "consumidor_final") return 5
  return null
}

/** Bloquea emitir como consumidor final (5) si el cliente tiene otra condición fiscal (salvo Factura B + monotributo WSFE). */
export function validateNoConsumidorFinalSiOtraCondicion(
  payload: FacturarSaleRequest,
  cliente: Cliente | null
): string | null {
  const condicionPayload = payload.condicionIvaReceptor ?? 5
  if (condicionPayload !== 5) return null

  const tipo = payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(condicionPayload)
  const condicionErp = clienteCondicionIvaErp(cliente)
  if (
    isComprobanteClaseB(tipo) &&
    condicionErp != null &&
    isCondicionIvaMonotributoErp(condicionErp)
  ) {
    return null
  }

  if (condicionErp != null && condicionErp !== 5) {
    return `El cliente tiene condición IVA ${condicionErp} (${labelCondicionIvaFromErp(condicionErp)}) en el ERP; no se puede facturar como Consumidor final (5). Revisá los datos fiscales o consultá padrón ARCA.`
  }

  const tax = normalizeTaxConditionFromApi(cliente?.tax_condition)
  if (tax && tax !== "consumidor_final") {
    return `El cliente está registrado como «${formatTaxConditionLabel(tax)}»; no corresponde emitir con condición Consumidor final (5).`
  }

  const cuit = clienteCuitDigitos(cliente)
  if (
    cuit.length === 11 &&
    cliente?.personeria !== "consumidor_final" &&
    (tax == null || tax !== "consumidor_final")
  ) {
    return "El cliente tiene CUIT/CUIL pero no está marcado como consumidor final. Completá la condición fiscal en el ERP o consultá padrón ARCA antes de emitir."
  }

  return null
}

function labelCondicionIvaFromErp(codigo: number): string {
  const labels: Record<number, string> = {
    1: "Responsable Inscripto",
    4: "Exento",
    5: "Consumidor final",
    6: "Monotributo",
    7: "Sujeto no categorizado",
  }
  return labels[codigo] ?? `código ${codigo}`
}

/** docTipo 80 + condición 5: solo consumidor final real o venta sin identificar; no monotributo/RI. */
export function validateReceptorDocumentoCondicion(payload: FacturarSaleRequest): string | null {
  const docTipo = payload.docTipo ?? 99
  const docNro = payload.docNro ?? 0
  const condicion = payload.condicionIvaReceptor ?? 5
  const tipo = payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(condicion)

  if (docTipo === 80 && docNro > 0 && condicion === 5 && !isComprobanteClaseB(tipo)) {
    return "Con CUIT/CUIL (docTipo 80) y condición Consumidor final (5) solo corresponde Factura B a un consumidor final identificado. Para RI usá Factura A (tipo 1) con condición 1."
  }

  if (docTipo === 80 && docNro > 0 && condicion === 1 && isComprobanteClaseB(tipo)) {
    return "El receptor es Responsable Inscripto (condición 1): corresponde Factura A (tipo 1), no Factura B."
  }

  return null
}

/** Condición IVA WSFE en el body de POST /sales/:id/facturar (Factura B + monotributo ERP → 5). */
export function applyWsfeCondicionToFacturarPayload(payload: FacturarSaleRequest): FacturarSaleRequest {
  const condicionErp = payload.condicionIvaReceptor ?? 5
  const tipo = payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(condicionErp)
  const condicionWsfe = resolveCondicionIvaReceptorForWsfe(tipo, condicionErp)
  if (condicionWsfe === condicionErp && payload.tipo === tipo) return payload
  return { ...payload, tipo, condicionIvaReceptor: condicionWsfe }
}

/** Evita combinaciones inválidas graves; no bloquea pruebas manuales distintas a la sugerencia ARCA. */
export function validateFacturarPayloadCoherence(payload: FacturarSaleRequest): string | null {
  const docCondicionErr = validateReceptorDocumentoCondicion(payload)
  if (docCondicionErr) return docCondicionErr

  const tipo = payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(payload.condicionIvaReceptor ?? 5)
  const condicion = payload.condicionIvaReceptor ?? 5
  const docTipo = payload.docTipo ?? 99
  const docNro = payload.docNro ?? 0

  if (tipo === 1) {
    const condicionOkFacturaA = condicion === 1 || isCondicionIvaMonotributoErp(condicion)
    if (!condicionOkFacturaA) {
      return "Factura A corresponde a receptor Responsable Inscripto (1) o Monotributo (6) con CUIT."
    }
    if (docTipo !== 80 || docNro <= 0) {
      return "Factura A requiere el CUIT del receptor (docTipo 80 con 11 dígitos)."
    }
  }

  if (condicion === 1 && (docTipo !== 80 || docNro <= 0)) {
    return "Un receptor Responsable Inscripto requiere CUIT válido (docTipo 80)."
  }

  return null
}

/** CUIT/CUIL del cliente (campo nuevo o legacy `primary_tax_id`). */
export function clienteCuitDigitos(cliente?: Cliente | null): string {
  const raw = cliente?.cuil_cuit ?? cliente?.primary_tax_id ?? ""
  return soloDigitosDoc(raw)
}

/** Arma docTipo/docNro/condición/tipo según el cliente del ERP. */
export function applyClienteToFacturarForm(
  base: FacturarSaleRequest,
  cliente: Cliente | null
): FacturarSaleRequest {
  if (!cliente) {
    const fiscal = resolveFacturacionDesdeCliente(null)
    return {
      ...base,
      docTipo: 99,
      docNro: 0,
      condicionIvaReceptor: fiscal.condicionIvaReceptor,
      tipo: fiscal.tipoComprobante,
    }
  }

  const fiscal = resolveFacturacionDesdeCliente(cliente)
  const cuit = clienteCuitDigitos(cliente)
  const docKind = classifyClientTaxId(cuit)

  if (docKind === "cuil_cuit") {
    return {
      ...base,
      docTipo: 80,
      docNro: parseInt(cuit, 10),
      condicionIvaReceptor: fiscal.condicionIvaReceptor,
      tipo: fiscal.tipoComprobante,
    }
  }

  if (docKind === "dni") {
    return {
      ...base,
      docTipo: 96,
      docNro: parseInt(cuit, 10),
      condicionIvaReceptor: fiscal.condicionIvaReceptor,
      tipo: fiscal.tipoComprobante,
    }
  }

  return {
    ...base,
    docTipo: 99,
    docNro: 0,
    condicionIvaReceptor: fiscal.condicionIvaReceptor,
    tipo: fiscal.tipoComprobante,
  }
}

/**
 * Incorpora hints del backend (GET /facturar/sugerencia).
 * Si el cliente ERP ya tiene datos fiscales, no pisa condición/tipo/doc (evita Factura A + CF).
 */
export function mergeSugerenciaIntoFacturarForm(
  form: FacturarSaleRequest,
  sugerencia: FacturarSugerenciaData | null | undefined,
  cliente?: Cliente | null
): FacturarSaleRequest {
  if (!sugerencia) return form

  if (sugerencia.emisorRegimen) {
    setEmisorRegimenFromApi(sugerencia.emisorRegimen)
  }

  const next: FacturarSaleRequest = { ...form }
  const erpFiscal = clienteTieneDatosFiscalesErp(cliente)

  if (
    !erpFiscal &&
    sugerencia.condicionIvaReceptor != null &&
    Number.isFinite(sugerencia.condicionIvaReceptor) &&
    sugerencia.condicionIvaReceptor > 0
  ) {
    next.condicionIvaReceptor = sugerencia.condicionIvaReceptor
  }

  const condicionFinal = next.condicionIvaReceptor ?? 5
  const tipoSugeridoApi = sugerencia.sugerencia?.tipo
  if (tipoSugeridoApi != null && Number.isFinite(tipoSugeridoApi) && tipoSugeridoApi > 0) {
    next.tipo = tipoSugeridoApi
  } else {
    next.tipo = resolveTipoComprobanteFromCondicionIvaReceptor(condicionFinal)
  }

  return next
}

/**
 * Body definitivo para POST /facturar.
 * Respeta las opciones del formulario (configuración fiscal manual); solo autocompleta
 * docTipo/docNro desde el cliente cuando el receptor no está identificado (99 / 0).
 */
export function buildFacturarPayload(
  form: FacturarSaleRequest,
  cliente: Cliente | null,
  options?: { manualFiscalConfig?: boolean }
): FacturarSaleRequest {
  const defaults = applyClienteToFacturarForm({ concepto: 1 }, cliente)
  const manualFiscal = options?.manualFiscalConfig === true || form.fiscalManualConfig === true

  const docSinIdentificar =
    (form.docTipo == null || form.docTipo === 99) &&
    (form.docNro == null || form.docNro === 0)

  const payload: FacturarSaleRequest = {
    ...form,
    concepto: form.concepto ?? defaults.concepto ?? 1,
    tipo: form.tipo ?? defaults.tipo,
    condicionIvaReceptor: form.condicionIvaReceptor ?? defaults.condicionIvaReceptor,
    docTipo: docSinIdentificar ? defaults.docTipo : (form.docTipo ?? defaults.docTipo),
    docNro: docSinIdentificar ? defaults.docNro : (form.docNro ?? defaults.docNro),
  }

  if (manualFiscal) {
    return {
      ...payload,
      fiscalManualConfig: true,
      skipPadronCondicionCheck: true,
    }
  }

  return applyWsfeCondicionToFacturarPayload(payload)
}

export function validateFacturarReceptorFiscal(
  sale: { client_id?: number | null; client_name?: string | null },
  cliente: Cliente | null,
  payload: FacturarSaleRequest,
  options?: { manualFiscalConfig?: boolean }
): string | null {
  const manualFiscal =
    options?.manualFiscalConfig === true || payload.fiscalManualConfig === true

  if (manualFiscal) {
    if (!sale.client_id) return null
    const cuit = clienteCuitDigitos(cliente)
    const esConsumidorFinalAfip = payload.docTipo === 99 && (payload.docNro ?? 0) === 0
    if (cuit.length === 11 && esConsumidorFinalAfip) {
      return "La venta tiene un cliente con CUIT/CUIL en el ERP, pero el comprobante se emitiría sin documento (consumidor final). Revisá que el cliente tenga el CUIT cargado o consultá el padrón ARCA antes de emitir."
    }
    return null
  }

  const cfErr = validateNoConsumidorFinalSiOtraCondicion(payload, cliente)
  if (cfErr) return cfErr

  if (!sale.client_id) return null

  const cuit = clienteCuitDigitos(cliente)
  const esConsumidorFinalAfip = payload.docTipo === 99 && (payload.docNro ?? 0) === 0

  if (cuit.length === 11 && esConsumidorFinalAfip) {
    return "La venta tiene un cliente con CUIT/CUIL en el ERP, pero el comprobante se emitiría sin documento (consumidor final). Revisá que el cliente tenga el CUIT cargado o consultá el padrón ARCA antes de emitir."
  }

  if (cliente) {
    const esperada = resolveFacturacionDesdeCliente(cliente).condicionIvaReceptor
    const enviada = payload.condicionIvaReceptor ?? 5
    const tipo = payload.tipo ?? resolveTipoComprobanteFromCondicionIvaReceptor(enviada)
    const esMonotributoFacturaB =
      isComprobanteClaseB(tipo) && isCondicionIvaMonotributoErp(esperada) && enviada === 5
    if (esperada !== 5 && enviada === 5 && cuit.length === 11 && !esMonotributoFacturaB) {
      return `La condición IVA del cliente no es consumidor final, pero el comprobante se enviaría como condición ${enviada}. Revisá los datos fiscales del cliente antes de emitir.`
    }

    const tieneCondicionEnErp =
      normalizeTaxConditionFromApi(cliente.tax_condition) != null ||
      (cliente.condicion_iva_receptor != null && cliente.condicion_iva_receptor > 0)
    if (
      cuit.length === 11 &&
      !tieneCondicionEnErp &&
      cliente.personeria !== "persona_juridica" &&
      (payload.docTipo ?? 99) === 80
    ) {
      return "El cliente tiene CUIT/CUIL pero falta la condición IVA en el ERP. Editá el cliente, consultá padrón ARCA en la confirmación, o verificá que la condición fiscal sea la correcta antes de emitir."
    }
  }

  const nombre = (sale.client_name ?? cliente?.name ?? "").trim().toLowerCase()
  if (
    esConsumidorFinalAfip &&
    nombre &&
    nombre !== "consumidor final" &&
    !cliente
  ) {
    return "La venta tiene un cliente asignado pero no se pudieron cargar sus datos fiscales. Esperá a que termine la carga o revisá el cliente en el ERP antes de emitir."
  }

  const incoherencia = validateFacturarPayloadCoherence(payload)
  if (incoherencia) return incoherencia

  return null
}

/** Defaults de configuración + cliente + sugerencia API (flujo de emisión). */
export function buildFacturarFormForSale(
  cliente: Cliente | null,
  sugerencia?: FacturarSugerenciaData | null
): FacturarSaleRequest {
  const base = buildDefaultFacturarFormRequest()
  const withCliente = applyClienteToFacturarForm(base, cliente)
  return mergeSugerenciaIntoFacturarForm(withCliente, sugerencia, cliente)
}
