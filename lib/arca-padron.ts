import { CONDICIONES_IVA_RECEPTOR } from "@/lib/facturacion-comprobantes"

/** Respuesta normalizada de GET /api/clients|suppliers/padron/{cuit} */
export interface ArcaPadronResult {
  cuit: string
  name?: string
  razonSocial?: string
  personeriaSugerida?: "persona_fisica" | "persona_juridica" | "consumidor_final"
  condicionIvaSugerida?: string
  condicionIvaLabel?: string
  condicionIvaCodigo?: number
  padronParcial?: boolean
  advertencias?: string[]
  alcancesTecnicos?: string[]
}

export type ArcaPadronEntity = "client" | "supplier"

export interface ArcaPadronFiscalSummary {
  label: string
  shortLabel: string
  codigoAfip?: number
  facturacionHint: string
}

export interface ArcaPadronBusinessSummary {
  displayName: string
  cuitFormatted: string
  personeriaLabel: string | null
  condicionFiscal: ArcaPadronFiscalSummary | null
  padronParcial: boolean
  notas: string[]
  verificadoEnArca: boolean
}

export const PERSONERIA_PADRON_LABELS: Record<
  NonNullable<ArcaPadronResult["personeriaSugerida"]>,
  string
> = {
  persona_fisica: "Persona física",
  persona_juridica: "Persona jurídica",
  consumidor_final: "Consumidor final",
}

export const ARCA_PADRON_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CUIT: "El CUIT debe tener exactamente 11 dígitos.",
  CUIT_EMISOR_REQUERIDO:
    "Falta el CUIT emisor. Configuralo en Facturación o en variables del servidor.",
  QUOTA_FEATURE_DISABLED: "Tu plan de MultiCUIT no incluye consulta de padrón ARCA.",
  PADRON_SIN_DATOS: "No se encontraron datos en ARCA para ese CUIT.",
  PADRON_MULTI_SCOPE_FAILED:
    "El certificado no está autorizado para padrón A13/constancia. Revisá MultiCUIT.",
  FACTURADOR_NOT_CONFIGURED: "El facturador no está configurado en el servidor (URL o API key).",
}

const FACTURACION_HINTS: Record<number, string> = {
  1: "Cliente inscripto en IVA: suele corresponder Factura A o B según tu condición y el monto.",
  4: "IVA exento: confirmá con tu contador el tipo de comprobante antes de emitir.",
  5: "Consumidor final: en la mayoría de los casos Factura B o ticket fiscal.",
  6: "Cliente monotributo (condición IVA 6). Con emisor Responsable Inscripto corresponde Factura A; con emisor monotributo, Factura C.",
  9: "Cliente del exterior: revisá comprobante de exportación / exento.",
  10: "IVA liberado: validá el tratamiento fiscal con tu asesor.",
}

function pickString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return undefined
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && /^\d+$/.test(v.trim())) return parseInt(v, 10)
  }
  return undefined
}

export function normalizeCuitDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11)
}

export function formatCuitDisplay(value: string): string {
  const d = normalizeCuitDigits(value)
  if (d.length <= 2) return d
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

export function isValidCuitDigits(value: string): boolean {
  return normalizeCuitDigits(value).length === 11
}

export function normalizePersoneriaSugerida(
  raw?: string | null
): ArcaPadronResult["personeriaSugerida"] | undefined {
  if (!raw?.trim()) return undefined
  const s = raw.trim().toLowerCase().replace(/\s+/g, "_")
  if (s.includes("juridica") || s === "persona_juridica") return "persona_juridica"
  if (s.includes("fisica") || s === "persona_fisica") return "persona_fisica"
  if (s.includes("consumidor") || s === "consumidor_final") return "consumidor_final"
  return undefined
}

function isTechnicalPadronMessage(msg: string): boolean {
  const m = msg.trim().toLowerCase()
  if (!m) return true
  if (/^alcance\s+[\w_]+:\s*contribuyente encontrado/i.test(msg)) return true
  if (/^scope\s+[\w_]+:/i.test(msg)) return true
  if (m === "contribuyente encontrado") return true
  return false
}

function splitAdvertencias(raw?: string[]): { ownerNotes: string[]; technical: string[] } {
  const ownerNotes: string[] = []
  const technical: string[] = []
  for (const line of raw ?? []) {
    const t = line.trim()
    if (!t) continue
    if (isTechnicalPadronMessage(t)) technical.push(t)
    else ownerNotes.push(t)
  }
  return { ownerNotes, technical }
}

function inferCondicionFromText(text: string): ArcaPadronFiscalSummary | null {
  const t = text.toLowerCase()
  if (!t.trim()) return null

  if (t.includes("monotrib")) return buildFiscalSummary("Responsable Monotributo", 6)
  if (t.includes("responsable inscript") || /\biva\s*ri\b/.test(t) || t.includes("resp. inscript")) {
    return buildFiscalSummary("IVA Responsable Inscripto", 1)
  }
  if (t.includes("exento") && t.includes("iva")) return buildFiscalSummary("IVA Sujeto Exento", 4)
  if (t.includes("consumidor final") || t.includes("cons.final")) {
    return buildFiscalSummary("Consumidor final", 5)
  }
  if (t.includes("liberado")) return buildFiscalSummary("IVA Liberado", 10)

  return null
}

function buildFiscalSummary(
  label: string,
  codigoAfip?: number,
  customHint?: string
): ArcaPadronFiscalSummary {
  const short =
    codigoAfip === 6
      ? "Monotributo"
      : codigoAfip === 1
        ? "Responsable Inscripto"
        : codigoAfip === 4
          ? "IVA Exento"
          : codigoAfip === 5
            ? "Consumidor final"
            : label

  return {
    label,
    shortLabel: short,
    codigoAfip,
    facturacionHint:
      customHint ??
      (codigoAfip != null ? FACTURACION_HINTS[codigoAfip] : undefined) ??
      "Confirmá el tipo de comprobante con tu contador antes de facturar.",
  }
}

function resolveCondicionFiscal(data: {
  label?: string
  codeRaw?: string
  codeNum?: number
  extraText?: string
}): ArcaPadronFiscalSummary | null {
  const fromAfipList =
    data.codeNum != null
      ? CONDICIONES_IVA_RECEPTOR.find((c) => c.value === data.codeNum)
      : undefined
  if (fromAfipList) return buildFiscalSummary(fromAfipList.label, fromAfipList.value)

  const combined = [data.label, data.codeRaw, data.extraText].filter(Boolean).join(" ")
  const inferred = inferCondicionFromText(combined)
  if (inferred) return inferred

  const cleanLabel = data.label?.trim()
  if (cleanLabel) {
    const again = inferCondicionFromText(cleanLabel)
    if (again) return again
    return buildFiscalSummary(cleanLabel)
  }

  return null
}

function extractCondicionFromNested(inner: Record<string, unknown>): {
  label?: string
  code?: number
} {
  const direct = {
    label: pickString(
      inner.condicionIvaLabel,
      inner.condicion_iva_label,
      inner.condicionIvaDescripcion,
      inner.condicionFiscal,
      inner.condicion_fiscal
    ),
    code: pickNumber(
      inner.condicionIvaCodigo,
      inner.condicion_iva_codigo,
      inner.condicionIvaReceptor
    ),
  }
  if (direct.label || direct.code) return direct

  const impuestos = inner.impuestos ?? inner.Impuestos
  if (Array.isArray(impuestos)) {
    for (const item of impuestos) {
      if (!item || typeof item !== "object") continue
      const row = item as Record<string, unknown>
      const desc = pickString(row.descripcion, row.description, row.impuesto, row.nombre, row.name)
      const id = pickNumber(row.id, row.codigo, row.code)
      if (desc?.toLowerCase().includes("iva") || desc?.toLowerCase().includes("monotrib")) {
        return { label: desc, code: id }
      }
    }
  }

  const datos = inner.datos ?? inner.contribuyente ?? inner.padron
  if (datos && typeof datos === "object") {
    const nested = extractCondicionFromNested(datos as Record<string, unknown>)
    if (nested.label || nested.code) return nested
  }

  return {}
}

export function normalizeArcaPadronPayload(raw: unknown): ArcaPadronResult {
  const o =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {}
  const inner =
    o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : o

  const cuit = String(inner.cuit ?? inner.Cuit ?? "").replace(/\D/g, "").slice(0, 11)
  const name = pickString(inner.name, inner.nombre)
  const razonSocial = pickString(inner.razonSocial, inner.razon_social, inner.razonSocialProveedor)

  const personeriaRaw = pickString(inner.personeriaSugerida, inner.personeria_sugerida, inner.personeria)

  const condicionIvaSugerida = pickString(
    inner.condicionIvaSugerida,
    inner.condicion_iva_sugerida,
    inner.condicionIva,
    inner.condicion_iva,
    inner.regimen,
    inner.regimenFiscal
  )

  const condicionIvaLabel = pickString(
    inner.condicionIvaLabel,
    inner.condicion_iva_label,
    inner.condicionIvaSugeridaLabel,
    inner.condicionIvaDescripcion,
    inner.condicion_iva_descripcion
  )

  const nestedCondicion = extractCondicionFromNested(inner)

  const condicionIvaCodigo = pickNumber(
    inner.condicionIvaCodigo,
    inner.condicion_iva_codigo,
    inner.condicionIvaReceptor,
    inner.codigoCondicionIva,
    nestedCondicion.code
  )

  const advertenciasRaw = Array.isArray(inner.advertencias)
    ? inner.advertencias.filter((a): a is string => typeof a === "string")
    : Array.isArray(inner.warnings)
      ? inner.warnings.filter((a): a is string => typeof a === "string")
      : undefined

  const { ownerNotes, technical } = splitAdvertencias(advertenciasRaw)
  const extraText = [...ownerNotes, ...technical].join(" ")

  return {
    cuit,
    name,
    razonSocial,
    personeriaSugerida: normalizePersoneriaSugerida(personeriaRaw),
    condicionIvaSugerida: condicionIvaSugerida ?? nestedCondicion.label,
    condicionIvaLabel: condicionIvaLabel ?? nestedCondicion.label,
    condicionIvaCodigo,
    padronParcial: Boolean(inner.padronParcial ?? inner.padron_parcial),
    advertencias: ownerNotes.length > 0 ? ownerNotes : advertenciasRaw,
    alcancesTecnicos: technical,
  }
}

export function getArcaPadronDisplayName(data: ArcaPadronResult): string {
  return (data.razonSocial || data.name || "").trim()
}

export function getArcaPadronIvaHint(data: ArcaPadronResult): string | null {
  const fiscal = buildArcaPadronBusinessSummary(data).condicionFiscal
  if (!fiscal) return null
  if (fiscal.codigoAfip != null) return `${fiscal.label} (cód. AFIP ${fiscal.codigoAfip})`
  return fiscal.label
}

export function buildArcaPadronBusinessSummary(data: ArcaPadronResult): ArcaPadronBusinessSummary {
  const displayName = getArcaPadronDisplayName(data)
  const personeriaLabel = data.personeriaSugerida
    ? PERSONERIA_PADRON_LABELS[data.personeriaSugerida]
    : null

  const extraText = [...(data.advertencias ?? []), ...(data.alcancesTecnicos ?? [])].join(" ")

  const condicionFiscal = resolveCondicionFiscal({
    label: data.condicionIvaLabel ?? data.condicionIvaSugerida,
    codeRaw: data.condicionIvaSugerida,
    codeNum: data.condicionIvaCodigo,
    extraText,
  })

  const notas: string[] = []
  if (data.padronParcial) {
    notas.push("ARCA devolvió datos incompletos. Completá email, teléfono y domicilio manualmente.")
  }
  for (const line of data.advertencias ?? []) {
    const t = line.trim()
    if (t && !notas.includes(t)) notas.push(t)
  }
  if (condicionFiscal && !notas.some((n) => n.includes(condicionFiscal.facturacionHint))) {
    notas.push(condicionFiscal.facturacionHint)
  }
  if (!notas.some((n) => n.toLowerCase().includes("contador"))) {
    notas.push("La condición fiscal es orientativa: confirmala con tu contador antes de emitir.")
  }

  return {
    displayName,
    cuitFormatted: formatCuitDisplay(data.cuit),
    personeriaLabel,
    condicionFiscal,
    padronParcial: Boolean(data.padronParcial),
    notas,
    verificadoEnArca: Boolean(displayName || (data.alcancesTecnicos?.length ?? 0) > 0),
  }
}

export function formatArcaPadronError(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>
    const code = typeof o.code === "string" ? o.code : undefined
    if (code && ARCA_PADRON_ERROR_MESSAGES[code]) {
      return ARCA_PADRON_ERROR_MESSAGES[code]
    }
    if (typeof o.message === "string" && o.message.trim()) return o.message.trim()
    if (typeof o.error === "string" && o.error.trim()) return o.error.trim()
  }
  if (status === 404) return ARCA_PADRON_ERROR_MESSAGES.PADRON_SIN_DATOS
  if (status === 403) return ARCA_PADRON_ERROR_MESSAGES.QUOTA_FEATURE_DISABLED
  if (status === 502) return ARCA_PADRON_ERROR_MESSAGES.PADRON_MULTI_SCOPE_FAILED
  if (status === 503) return ARCA_PADRON_ERROR_MESSAGES.FACTURADOR_NOT_CONFIGURED
  if (status === 400) return ARCA_PADRON_ERROR_MESSAGES.INVALID_CUIT
  return `No se pudo consultar el padrón ARCA (error ${status}).`
}
