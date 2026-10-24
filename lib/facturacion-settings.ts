/**
 * Preferencias de facturación ARCA guardadas en el navegador (localStorage).
 * La API key del facturador NO debe confiar solo del cliente en producción: ver copy en Configuración.
 */

import type { FacturarSaleRequest } from "@/lib/api"

export const FACTURACION_STORAGE_KEYS = {
  CUIT_EMISOR: "mf_facturacion_cuit_emisor",
  PUNTO_VENTA: "mf_facturacion_punto_venta",
  FACTURADOR_API_KEY: "mf_facturacion_facturador_api_key",
  TIPO_COMPROBANTE: "mf_facturacion_tipo_comprobante",
  CONDICION_IVA: "mf_facturacion_condicion_iva",
  CONCEPTO: "mf_facturacion_concepto",
  /** Si es "1", el modal de emisión usa solo los defaults (un clic) salvo que el usuario abra opciones avanzadas */
  EMITIR_CON_DEFAULTS: "mf_facturacion_emitir_con_defaults",
} as const

export interface FacturacionFormDefaults {
  tipo: number
  condicionIvaReceptor: number
  concepto: 1 | 2 | 3
}

const DEFAULT_TIPO = 6
const DEFAULT_CONDICION_IVA = 5
const DEFAULT_CONCEPTO = 1 as const

function soloDigitos(s: string): string {
  return s.replace(/\D/g, "")
}

function parseEnvTipo(): number | null {
  if (typeof process === "undefined") return null
  const raw = process.env.NEXT_PUBLIC_FACTURADOR_TIPO_DEFAULT?.trim()
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** CUIT sin guiones para enviar al backend (11 dígitos) o null si está vacío / inválido */
export function normalizeCuitEmisor(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const d = soloDigitos(raw.trim())
  if (d.length !== 11) return null
  return d
}

export function getStoredFacturacionCuitEmisor(): string | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(FACTURACION_STORAGE_KEYS.CUIT_EMISOR)
  return normalizeCuitEmisor(raw ?? "")
}

export function getStoredFacturacionPuntoVenta(): number | undefined {
  if (typeof window === "undefined") return undefined
  const raw = localStorage.getItem(FACTURACION_STORAGE_KEYS.PUNTO_VENTA)?.trim()
  if (!raw) return undefined
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1 || n > 99999) return undefined
  return n
}

/**
 * Clave del API facturador guardada en el navegador.
 * Solo tiene utilidad si MF API acepta cabecera `x-facturador-api-key` (u otro contrato acordado).
 */
export function getStoredFacturadorApiKey(): string | null {
  if (typeof window === "undefined") return null
  const v = localStorage.getItem(FACTURACION_STORAGE_KEYS.FACTURADOR_API_KEY)?.trim()
  return v || null
}

export function getStoredFacturacionFormDefaults(): FacturacionFormDefaults {
  const envTipo = parseEnvTipo()
  if (typeof window === "undefined") {
    return {
      tipo: envTipo ?? DEFAULT_TIPO,
      condicionIvaReceptor: DEFAULT_CONDICION_IVA,
      concepto: DEFAULT_CONCEPTO,
    }
  }

  const tipoRaw = localStorage.getItem(FACTURACION_STORAGE_KEYS.TIPO_COMPROBANTE)
  const condRaw = localStorage.getItem(FACTURACION_STORAGE_KEYS.CONDICION_IVA)
  const conceptoRaw = localStorage.getItem(FACTURACION_STORAGE_KEYS.CONCEPTO)

  let tipo = envTipo ?? DEFAULT_TIPO
  if (tipoRaw) {
    const n = parseInt(tipoRaw, 10)
    if (Number.isFinite(n) && n > 0) tipo = n
  }

  let condicionIvaReceptor = DEFAULT_CONDICION_IVA
  if (condRaw) {
    const n = parseInt(condRaw, 10)
    if (Number.isFinite(n) && n > 0) condicionIvaReceptor = n
  }

  let concepto: 1 | 2 | 3 = DEFAULT_CONCEPTO
  if (conceptoRaw) {
    const n = parseInt(conceptoRaw, 10)
    if (n === 1 || n === 2 || n === 3) concepto = n
  }

  return { tipo, condicionIvaReceptor, concepto }
}

/** Formulario inicial / emisión rápida según Configuración → Facturación ARCA */
export function buildDefaultFacturarFormRequest(): FacturarSaleRequest {
  const d = getStoredFacturacionFormDefaults()
  return {
    tipo: d.tipo,
    condicionIvaReceptor: d.condicionIvaReceptor,
    concepto: d.concepto,
    force: false,
    docTipo: 99,
    docNro: 0,
  }
}

export function getEmitirConDefaultsGuardados(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(FACTURACION_STORAGE_KEYS.EMITIR_CON_DEFAULTS) === "1"
}

export function setEmitirConDefaultsGuardados(enabled: boolean): void {
  if (typeof window === "undefined") return
  if (enabled) {
    localStorage.setItem(FACTURACION_STORAGE_KEYS.EMITIR_CON_DEFAULTS, "1")
  } else {
    localStorage.removeItem(FACTURACION_STORAGE_KEYS.EMITIR_CON_DEFAULTS)
  }
}

export function saveFacturacionFormDefaults(defaults: FacturacionFormDefaults): void {
  if (typeof window === "undefined") return
  localStorage.setItem(FACTURACION_STORAGE_KEYS.TIPO_COMPROBANTE, String(defaults.tipo))
  localStorage.setItem(FACTURACION_STORAGE_KEYS.CONDICION_IVA, String(defaults.condicionIvaReceptor))
  localStorage.setItem(FACTURACION_STORAGE_KEYS.CONCEPTO, String(defaults.concepto))
}
