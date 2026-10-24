/**
 * Mensajes de error de facturación ARCA (MultiCUIT vía MF API).
 * Alineado con integración ERP: WSFE, idempotencia, CAE y persistencia.
 */

export type FacturacionErrorSeverity = "error" | "warning"

export interface FacturacionErrorInfo {
  code: string
  title: string
  message: string
  actionHint?: string
  severity: FacturacionErrorSeverity
  canRetry: boolean
  /** Mostrar campo force / reintento forzado en UI */
  suggestForceRetry?: boolean
  /** No reemitir sin reconciliar (PERSIST_DB_ERROR, posible duplicado ARCA) */
  blockBlindReemit?: boolean
  showRequestId?: boolean
  /** Mensaje técnico de ARCA / MultiCUIT cuando difiere del resumen */
  remoteDetail?: string
  /** Sugerencias del backend o del catálogo de errores */
  suggestions?: string[]
  /** Issues de validación fiscal (COMPROBANTE_TIPO_INVALIDO, etc.) */
  issues?: Array<{ code?: string; message: string }>
  /** Diagnóstico legible para operador (causa probable) */
  diagnosis?: string
  /** Datos del receptor enviados o inferidos (para depuración) */
  receptorContext?: {
    docTipo?: number
    docNro?: number | string | null
    condicionIvaReceptor?: number
    condicionLabel?: string
    tipoComprobante?: number
  }
}

export interface ResolveFacturacionErrorInput {
  code?: string | null
  httpStatus?: number
  rawMessage?: string | null
  requestId?: string | null
  sugerencias?: string[] | null
  remoteDetail?: string | null
  issues?: Array<{ code?: string; message: string }> | null
  receptorContext?: FacturacionErrorInfo["receptorContext"]
}

export interface ExtractedFacturacionError {
  code?: string
  message?: string
  requestId?: string
  sugerencias?: string[]
  httpStatus?: number
  remoteDetail?: string
  issues?: Array<{ code?: string; message: string }>
  action?: string
  suggestedTipo?: number
  suggestedLabel?: string
  condicionIvaReceptor?: number
  docTipo?: number
  docNro?: number | string | null
  tipoComprobante?: number
}

/** Convierte vencimiento CAE AFIP YYYYMMDD → YYYY-MM-DD */
export function vencimientoCaeAfipAIso(yyyymmdd: string | number | null | undefined): string | null {
  const s = String(yyyymmdd ?? "").replace(/\D/g, "")
  if (s.length !== 8) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v)
}

function readNestedCode(obj: Record<string, unknown>): string | undefined {
  const err = obj.error
  if (isRecord(err) && err.code != null) return String(err.code).trim()
  return undefined
}

function readNestedMessage(obj: Record<string, unknown>): string | undefined {
  const err = obj.error
  if (isRecord(err) && typeof err.message === "string") return err.message
  if (typeof obj.message === "string") return obj.message
  return undefined
}

function readNestedRequestId(obj: Record<string, unknown>): string | undefined {
  if (typeof obj.requestId === "string") return obj.requestId
  const err = obj.error
  if (isRecord(err) && typeof err.requestId === "string") return err.requestId
  return undefined
}

function readSugerencias(obj: Record<string, unknown>): string[] | undefined {
  const err = obj.error
  if (!isRecord(err)) return undefined
  const details = err.details
  if (!isRecord(details)) return undefined
  const s = details.sugerencias
  if (!Array.isArray(s)) return undefined
  return s.filter((x): x is string => typeof x === "string")
}

function readNestedErrores(obj: Record<string, unknown>): string[] | undefined {
  const err = obj.error
  if (!isRecord(err)) return undefined
  const details = err.details
  if (!isRecord(details)) return undefined
  const raw = details.errores
  if (!Array.isArray(raw)) return undefined
  return raw.filter((x): x is string => typeof x === "string")
}

function readIssues(obj: Record<string, unknown>): ExtractedFacturacionError["issues"] {
  const raw = obj.issues
  if (!Array.isArray(raw)) return undefined
  return raw
    .map((item) => {
      if (!isRecord(item) || typeof item.message !== "string") return null
      return {
        code: item.code != null ? String(item.code) : undefined,
        message: item.message,
      }
    })
    .filter((x): x is { code?: string; message: string } => x != null)
}

function mergeExtracted(
  base: ExtractedFacturacionError,
  patch: ExtractedFacturacionError
): ExtractedFacturacionError {
  return {
    ...base,
    code: base.code ?? patch.code,
    message: base.message ?? patch.message,
    requestId: base.requestId ?? patch.requestId,
    sugerencias: base.sugerencias?.length ? base.sugerencias : patch.sugerencias,
    remoteDetail: base.remoteDetail ?? patch.remoteDetail,
    issues: base.issues?.length ? base.issues : patch.issues,
    action: base.action ?? patch.action,
    suggestedTipo: base.suggestedTipo ?? patch.suggestedTipo,
    suggestedLabel: base.suggestedLabel ?? patch.suggestedLabel,
    condicionIvaReceptor: base.condicionIvaReceptor ?? patch.condicionIvaReceptor,
    docTipo: base.docTipo ?? patch.docTipo,
    docNro: base.docNro ?? patch.docNro,
    tipoComprobante: base.tipoComprobante ?? patch.tipoComprobante,
  }
}

function extractFromDataBlock(data: Record<string, unknown>): ExtractedFacturacionError {
  const out: ExtractedFacturacionError = {}
  if (data.code != null) out.code = String(data.code).trim()
  if (typeof data.message === "string") out.message = data.message
  if (typeof data.remoteMessage === "string") out.remoteDetail = data.remoteMessage
  if (typeof data.remoteDetail === "string") out.remoteDetail = data.remoteDetail
  if (typeof data.action === "string") out.action = data.action
  if (typeof data.requestId === "string") out.requestId = data.requestId
  if (Array.isArray(data.suggestions)) {
    out.sugerencias = data.suggestions.filter((x): x is string => typeof x === "string")
  }
  out.issues = readIssues(data)
  if (data.suggestedTipo != null) out.suggestedTipo = Number(data.suggestedTipo)
  if (typeof data.suggestedLabel === "string") out.suggestedLabel = data.suggestedLabel
  if (data.condicionIvaReceptor != null) out.condicionIvaReceptor = Number(data.condicionIvaReceptor)
  if (data.docTipo != null) out.docTipo = Number(data.docTipo)
  if (data.docNro != null) out.docNro = data.docNro as number | string
  if (data.tipo != null) out.tipoComprobante = Number(data.tipo)
  if (data.tipoComprobante != null) out.tipoComprobante = Number(data.tipoComprobante)
  if (data.details && typeof data.details === "object" && !Array.isArray(data.details)) {
    const details = data.details as Record<string, unknown>
    const errores = details.errores
    if (Array.isArray(errores)) {
      const joined = errores.filter((x): x is string => typeof x === "string").join(" ")
      if (joined) out.remoteDetail = out.remoteDetail ? `${out.remoteDetail} ${joined}` : joined
    }
    const permitidas = details.condicionesPermitidas ?? details.condicionesValidas
    if (Array.isArray(permitidas) && permitidas.length > 0) {
      const hint = `Condiciones permitidas WSFE: ${permitidas.join(", ")}`
      out.sugerencias = [...(out.sugerencias ?? []), hint]
    }
    const esperada = details.condicionEsperada ?? details.condicionSugerida
    if (esperada != null) {
      out.sugerencias = [
        ...(out.sugerencias ?? []),
        `Condición esperada por ARCA/preflight: ${String(esperada)}`,
      ]
    }
  }
  return out
}

/**
 * Extrae código, mensaje y requestId desde respuestas MF API o MultiCUIT anidadas.
 */
export function extractFacturacionErrorFromPayload(
  payload: unknown,
  httpStatus?: number
): ExtractedFacturacionError {
  const out: ExtractedFacturacionError = { httpStatus }

  if (!isRecord(payload)) return out

  // MultiCUIT directo: { ok: false, error: { code, message, details } }
  const multicuitCode = readNestedCode(payload)
  if (multicuitCode) {
    out.code = multicuitCode
    out.message = readNestedMessage(payload)
    out.requestId = readNestedRequestId(payload)
    out.sugerencias = readSugerencias(payload)
    const errores = readNestedErrores(payload)
    if (errores?.length) {
      out.remoteDetail = errores.join(" ")
      out.sugerencias = [...(out.sugerencias ?? []), ...errores]
    }
    return out
  }

  // MF API: { success: false, data: { code, ... }, error, message }
  if (typeof payload.error === "string" && !out.message) out.message = payload.error
  if (typeof payload.message === "string") out.message = payload.message

  const data = payload.data
  if (isRecord(data)) {
    const fromData = extractFromDataBlock(data)
    Object.assign(out, mergeExtracted(out, fromData))

    const sale = data.sale
    if (isRecord(sale)) {
      if (!out.code && sale.arca_error_code) out.code = String(sale.arca_error_code).trim()
      if (!out.message && typeof sale.arca_error_message === "string") {
        out.message = sale.arca_error_message
      }
      if (!out.remoteDetail && typeof sale.arca_error_message === "string") {
        out.remoteDetail = sale.arca_error_message
      }
    }

    const arca = data.arca
    if (isRecord(arca)) {
      const remote = arca.response
      if (isRecord(remote)) {
        const nested = extractFacturacionErrorFromPayload(remote, httpStatus)
        Object.assign(out, mergeExtracted(out, nested))
      }
    }
  }

  return out
}

const KNOWN_ERRORS: Record<string, Omit<FacturacionErrorInfo, "code">> = {
  VALIDATION_ERROR: {
    title: "Datos del comprobante inválidos",
    message:
      "AFIP rechazó el payload antes de emitir. Revisá tipo de comprobante, condición IVA, importes, documento del receptor y fechas de servicio.",
    actionHint:
      "Verificá en Configuración → Facturación ARCA que el tipo sea el correcto (ej. Factura B = 6 para consumidor final, no Factura C = 11). Corregí y volvé a intentar.",
    severity: "error",
    canRetry: true,
  },
  IDEMPOTENCY_CONFLICT: {
    title: "Conflicto de idempotencia",
    message:
      "Ya existe un intento de emisión con la misma clave pero con datos distintos. El sistema no puede duplicar la operación automáticamente.",
    actionHint:
      "Revisá si la venta ya fue facturada (ver comprobante). Si fue un error de red, contactá soporte con el ID de venta antes de forzar una nueva emisión.",
    severity: "error",
    canRetry: false,
    blockBlindReemit: true,
  },
  IDEMPOTENCY_REQUIRES_DB: {
    title: "Idempotencia no disponible",
    message: "El facturador no tiene base de datos configurada para registrar claves de idempotencia.",
    actionHint: "Es un problema de configuración del servidor MultiCUIT. Informá a sistemas.",
    severity: "error",
    canRetry: false,
    showRequestId: true,
  },
  WSFE_NO_CAE: {
    title: "AFIP no devolvió CAE",
    message:
      "La emisión en WSFE finalizó sin CAE. La venta no debe considerarse facturada ni autorizada ante AFIP.",
    actionHint:
      "Revisá punto de venta, tipo de comprobante, homologación vs producción y certificados del CUIT emisor. No reintentés con force hasta validar la causa.",
    severity: "error",
    canRetry: true,
    blockBlindReemit: true,
  },
  PERSIST_DB_ERROR: {
    title: "Error al guardar la factura emitida",
    message:
      "Es posible que AFIP haya autorizado el comprobante, pero falló el guardado en MultiCUIT. No asignes un nuevo número ni reemitas sin reconciliar.",
    actionHint:
      "Contactá a operaciones o soporte con el requestId. Consultá el detalle de la factura en MultiCUIT antes de volver a emitir.",
    severity: "warning",
    canRetry: false,
    blockBlindReemit: true,
    showRequestId: true,
  },
  AUTH_INVALID_KEY: {
    title: "Clave del facturador inválida",
    message: "La API key de MultiCUIT fue rechazada (401).",
    actionHint: "Revisá la clave en Configuración → Facturación ARCA o la variable FACTURADOR_API_KEY en el servidor.",
    severity: "error",
    canRetry: false,
  },
  AUTH_MISSING_KEY: {
    title: "Falta configurar el facturador",
    message: "No hay API key del facturador configurada en el servidor.",
    actionHint: "Configurá FACTURADOR_API_KEY en MF API o la clave en Configuración → Facturación ARCA.",
    severity: "error",
    canRetry: false,
  },
  FACTURADOR_UNAVAILABLE: {
    title: "Facturador no disponible",
    message: "No se pudo contactar al servicio de facturación ARCA.",
    actionHint: "Verificá conectividad y estado del backend MultiCUIT. Reintentá en unos minutos.",
    severity: "error",
    canRetry: true,
  },
  FACTURA_C_NO_APLICA_EMISOR_RI: {
    title: "Factura C no corresponde con emisor RI",
    message:
      "El servidor tiene configurado el emisor como Responsable Inscripto. En ese caso, a un cliente monotributo se le factura con Factura B (tipo 6), no Factura C (11).",
    actionHint:
      "Si tu empresa es monotributo, pedí a sistemas que configure FACTURADOR_EMISOR_REGIMEN=monotributo en la API. Si sos RI, usá Factura B como sugiere GET /facturar/sugerencia.",
    severity: "error",
    canRetry: true,
  },
  COMPROBANTE_TIPO_INVALIDO: {
    title: "Tipo de comprobante incorrecto",
    message: "La combinación de tipo de factura, condición IVA del receptor y régimen del emisor no es válida.",
    actionHint:
      "Usá GET /facturar/sugerencia o el mensaje del backend (suggestedTipo). El padrón indica la condición del cliente, no el tipo B/C.",
    severity: "error",
    canRetry: true,
  },
  RECEPTOR_CUIT_CONDICION_INVALIDA: {
    title: "CUIT/CUIL incompatible con consumidor final",
    message:
      "Con CUIT/CUIL (docTipo 80) la condición Consumidor final (5) solo es válida en Factura B para un consumidor final real.",
    actionHint:
      "No emitas como consumidor final si el cliente tiene otra condición fiscal. Monotributo en Factura B se envía como condición 6.",
    severity: "error",
    canRetry: true,
  },
  RECEPTOR_CF_CON_CONDICION_ERP: {
    title: "Consumidor final no corresponde al cliente",
    message: "No se puede facturar como Consumidor final si el cliente tiene otra condición IVA en el ERP.",
    actionHint: "Revisá tax_condition / condicion_iva_receptor del cliente o consultá padrón ARCA.",
    severity: "error",
    canRetry: true,
  },
  WSFE_PREFLIGHT_VALIDATION: {
    title: "Validación WSFE del comprobante",
    message:
      "Los datos del comprobante no coinciden con las tablas habilitadas en AFIP/WSFE para este CUIT y tipo de factura.",
    actionHint:
      "Revisá condición IVA del receptor según el padrón ARCA: monotributo=6, consumidor final=5, responsable inscripto=1. El tipo de comprobante (A/B/C) es independiente de la condición IVA.",
    severity: "error",
    canRetry: true,
  },
  IVA_PAYLOAD_INVALID: {
    title: "Desglose IVA inválido",
    message:
      "El importe fiscal no coincide con el array iva[] (bases + cuotas) según centavos WSFE, o falta el desglose.",
    actionHint:
      "Precios con IVA incluido: neto = round(total / (1 + alícuota/100)); cuota = total − neto. importe = suma(iva[].base + iva[].cuota). Revisá alícuota por ítem en la venta.",
    severity: "error",
    canRetry: false,
  },
  RECEPTOR_CONDICION_PADRON_MISMATCH: {
    title: "Condición IVA distinta al padrón ARCA",
    message: "La condición IVA del comprobante no coincide con la registrada en ARCA para ese CUIT.",
    actionHint:
      "Consultá el padrón ARCA y corregí condicionIvaReceptor antes de emitir (monotributo=6, consumidor final=5, responsable inscripto=1).",
    severity: "error",
    canRetry: true,
  },
  PADRON_CONDICION_UNAVAILABLE: {
    title: "Padrón ARCA no disponible",
    message: "No se pudo consultar el padrón ARCA para validar la condición IVA del receptor.",
    actionHint:
      "Reintentá en unos minutos o usá «Buscar en ARCA» en el modal de emisión. Solo en casos excepcionales el backend acepta skipPadronCondicionCheck=true.",
    severity: "warning",
    canRetry: true,
  },
  SALE_ALREADY_INVOICED: {
    title: "Venta ya facturada",
    message: "Esta venta ya tiene comprobante autorizado en ARCA.",
    actionHint: "Usá «Ver comprobante». Solo activá reintento forzado (force) si operaciones confirma que debés corregir.",
    severity: "warning",
    canRetry: false,
    suggestForceRetry: true,
  },
  SALE_NOT_FOUND: {
    title: "Venta no encontrada",
    message: "No se encontró la venta indicada para facturar.",
    severity: "error",
    canRetry: false,
  },
  SALE_INVALID_ITEMS: {
    title: "Ítems de venta inválidos",
    message: "La venta no tiene ítems válidos para armar el comprobante.",
    actionHint: "Revisá productos, cantidades e importes de la venta antes de facturar.",
    severity: "error",
    canRetry: true,
  },
  EMPTY_CAE: {
    title: "Respuesta sin CAE",
    message:
      "El servidor respondió éxito pero no devolvió un CAE válido. La venta no debe marcarse como facturada.",
    actionHint: "Revisá logs del backend y el estado en MultiCUIT antes de reintentar.",
    severity: "error",
    canRetry: true,
    blockBlindReemit: true,
  },
  NETWORK_ERROR: {
    title: "Error de conexión",
    message: "No se pudo comunicar con MF API. Comprobá tu conexión a internet.",
    actionHint:
      "Si la red se cortó durante la emisión, no generes un nuevo intento manual: el backend reutiliza la misma clave de idempotencia al reintentar la misma venta.",
    severity: "warning",
    canRetry: true,
  },
  RATE_LIMITED: {
    title: "Demasiados intentos",
    message: "El servidor limitó temporalmente las emisiones (HTTP 429).",
    actionHint: "Esperá el tiempo indicado antes de volver a intentar.",
    severity: "warning",
    canRetry: true,
  },
}

/** Códigos numéricos habituales de observaciones ARCA/WSFE */
const ARCA_NUMERIC_ERRORS: Record<string, Omit<FacturacionErrorInfo, "code">> = {
  "10003": {
    title: "Comprobante posiblemente duplicado",
    message: "AFIP indica que el comprobante podría estar duplicado (código 10003).",
    actionHint:
      "No reemitas con un número nuevo. Reconciliá con MultiCUIT o AFIP si hubo timeout en un intento anterior.",
    severity: "warning",
    canRetry: false,
    blockBlindReemit: true,
  },
  "10016": {
    title: "Datos del comprobante rechazados",
    message: "AFIP rechazó el comprobante por datos inconsistentes (código 10016).",
    actionHint: "Revisá receptor, importes, IVA, fechas y tipo de comprobante según el detalle de ARCA.",
    severity: "error",
    canRetry: true,
  },
  "10048": {
    title: "Fecha del comprobante inválida",
    message: "La fecha de emisión está fuera del rango permitido por AFIP (código 10048).",
    actionHint: "Revisá la fecha del comprobante, fechas de servicio y el reloj del servidor.",
    severity: "error",
    canRetry: true,
  },
  "10051": {
    title: "Punto de venta no habilitado",
    message: "El punto de venta no está habilitado para este tipo de comprobante (código 10051).",
    actionHint: "Verificá el PV en Configuración y en AFIP / certificados del CUIT emisor.",
    severity: "error",
    canRetry: true,
  },
  "10054": {
    title: "Documento del receptor inválido",
    message: "El tipo o número de documento del receptor no es válido para AFIP (código 10054).",
    actionHint:
      "Revisá docTipo (80=CUIT, 99=sin documento), docNro y que el CUIT/CUIL tenga 11 dígitos. Consultá padrón ARCA si hace falta.",
    severity: "error",
    canRetry: true,
  },
  "10056": {
    title: "Condición IVA del receptor incorrecta",
    message: "La condición frente al IVA del receptor no coincide con lo esperado por AFIP (código 10056).",
    actionHint:
      "Ajustá condicionIvaReceptor según el padrón (ej. monotributo=6, RI=1). Con CUIT/CUIL no uses consumidor final (5).",
    severity: "error",
    canRetry: true,
  },
  "10071": {
    title: "Condición IVA del receptor (RG)",
    message: "AFIP rechazó la condición frente al IVA del receptor (código 10071).",
    actionHint: "Consultá padrón ARCA y alineá condicionIvaReceptor con el tipo de comprobante elegido.",
    severity: "error",
    canRetry: true,
  },
}

function isArcaNumericCode(code: string): boolean {
  return /^\d{4,6}$/.test(code)
}

function enrichResolvedError(
  base: FacturacionErrorInfo,
  input: ResolveFacturacionErrorInput
): FacturacionErrorInfo {
  const suggestions = input.sugerencias?.length ? [...input.sugerencias] : base.suggestions
  const issues = input.issues?.length ? input.issues : base.issues
  const remoteDetail =
    input.remoteDetail?.trim() &&
    input.remoteDetail.trim() !== base.message &&
    !base.message.includes(input.remoteDetail.trim())
      ? input.remoteDetail.trim()
      : base.remoteDetail

  const diagnosis = buildFacturacionErrorDiagnosis({
    code: base.code,
    rawMessage: input.rawMessage,
    remoteDetail: remoteDetail ?? input.remoteDetail,
    receptorContext: input.receptorContext,
  })

  return {
    ...base,
    remoteDetail: remoteDetail ?? undefined,
    suggestions: suggestions?.length ? suggestions : undefined,
    issues: issues?.length ? issues : undefined,
    diagnosis: diagnosis ?? undefined,
    receptorContext: input.receptorContext ?? base.receptorContext,
    showRequestId: base.showRequestId || Boolean(input.requestId),
  }
}

/** Causa probable legible para operador según código ARCA / validación local. */
export function buildFacturacionErrorDiagnosis(input: {
  code?: string | null
  rawMessage?: string | null
  remoteDetail?: string | null
  receptorContext?: FacturacionErrorInfo["receptorContext"]
}): string | null {
  const code = input.code?.trim() ?? ""
  const text = `${input.rawMessage ?? ""} ${input.remoteDetail ?? ""}`.toLowerCase()
  const ctx = input.receptorContext

  if (code === "WSFE_PREFLIGHT_VALIDATION") {
    return "El facturador rechazó el comprobante en validación previa WSFE. Revisá el detalle técnico (condiciones permitidas y condición esperada para ese CUIT). En Factura B, monotributo del padrón (6) se envía como consumidor final (5)."
  }

  if (code === "IVA_PAYLOAD_INVALID") {
    return "El desglose IVA no cuadra con el importe total (centavos WSFE). Revisá alícuota por ítem y que el total de la venta sea la suma de las líneas con IVA incluido."
  }

  if (/condici[oó]n.*iva.*receptor/.test(text)) {
    return "La condición IVA del receptor no coincide con lo registrado en AFIP para ese CUIT. Consultá el padrón ARCA: monotributo=6, consumidor final=5, responsable inscripto=1."
  }

  if (
    code === "RECEPTOR_CUIT_CONDICION_INVALIDA" ||
    (ctx?.docTipo === 80 && ctx?.condicionIvaReceptor === 5 && ctx?.tipoComprobante === 1)
  ) {
    return "Se intentó emitir Factura A con CUIT pero condición Consumidor final (5). Para RI usá condición 1; no uses consumidor final si el cliente tiene otra condición fiscal."
  }

  if (code === "RECEPTOR_CF_CON_CONDICION_ERP") {
    return "El comprobante se enviaría como Consumidor final (5) pero el cliente tiene otra condición IVA en el ERP. Revisá los datos fiscales o consultá padrón ARCA."
  }

  if (code === "10056" || code === "10071" || /condici[oó]n.*iva|10056|10071/.test(text)) {
    return "La condición IVA del receptor no coincide con lo registrado en AFIP para ese CUIT/CUIL. Consultá el padrón ARCA y actualizá el cliente."
  }

  if (code === "10054" || /documento.*receptor|10054|docnro|doctipo/.test(text)) {
    return "El documento del receptor (tipo o número) no es válido para AFIP. Verificá que el CUIT/CUIL tenga 11 dígitos y docTipo 80."
  }

  if (code === "COMPROBANTE_TIPO_INVALIDO" || code === "FACTURA_C_NO_APLICA_EMISOR_RI") {
    return "El tipo de comprobante no corresponde al régimen del emisor o a la condición IVA del receptor."
  }

  if (code === "RECEPTOR_CONDICION_PADRON_MISMATCH") {
    return "La condición IVA enviada no coincide con el padrón ARCA del receptor. Corregí condicionIvaReceptor según la sugerencia del padrón antes de emitir."
  }

  if (code === "PADRON_CONDICION_UNAVAILABLE") {
    return "No se pudo validar la condición IVA contra ARCA. Consultá el padrón manualmente o reintentá cuando el servicio esté disponible."
  }

  if (ctx?.docTipo === 80 && ctx.condicionIvaReceptor === 7 && ctx.tipoComprobante === 6) {
    return "El payload llevaba condición 7 (No categorizado) en Factura B; si el cliente es monotributista debe ir condición 6 según el padrón ARCA."
  }

  return null
}

export function resolveFacturacionErrorFromExtracted(
  extracted: ExtractedFacturacionError,
  httpStatus?: number
): FacturacionErrorInfo {
  const receptorContext =
    extracted.docTipo != null ||
    extracted.docNro != null ||
    extracted.condicionIvaReceptor != null ||
    extracted.tipoComprobante != null
      ? {
          docTipo: extracted.docTipo,
          docNro: extracted.docNro,
          condicionIvaReceptor: extracted.condicionIvaReceptor,
          tipoComprobante: extracted.tipoComprobante,
        }
      : undefined

  return resolveFacturacionError({
    code: extracted.code,
    httpStatus: extracted.httpStatus ?? httpStatus,
    rawMessage: extracted.message,
    requestId: extracted.requestId,
    sugerencias: extracted.sugerencias,
    remoteDetail: extracted.remoteDetail ?? extracted.action,
    issues: extracted.issues,
    receptorContext,
  })
}

export function resolveFacturacionError(input: ResolveFacturacionErrorInput): FacturacionErrorInfo {
  const code = (input.code?.trim() || "").toUpperCase() || undefined
  const numericCode = input.code?.trim() && isArcaNumericCode(input.code.trim()) ? input.code.trim() : undefined

  if (input.httpStatus === 429) {
    return enrichResolvedError({ code: "RATE_LIMITED", ...KNOWN_ERRORS.RATE_LIMITED }, input)
  }

  if (code && KNOWN_ERRORS[code]) {
    return enrichResolvedError({ code, ...KNOWN_ERRORS[code] }, input)
  }

  if (numericCode && ARCA_NUMERIC_ERRORS[numericCode]) {
    return enrichResolvedError({ code: numericCode, ...ARCA_NUMERIC_ERRORS[numericCode] }, input)
  }

  const sugerenciasText =
    input.sugerencias && input.sugerencias.length > 0
      ? ` Sugerencias: ${input.sugerencias.join(" ")}`
      : ""

  const raw = input.rawMessage?.trim()
  const fallbackMessage = raw
    ? `${raw}${sugerenciasText}`
    : code
      ? `Error de facturación (${code}).${sugerenciasText}`
      : `Error al facturar en ARCA.${sugerenciasText}`

  return enrichResolvedError(
    {
      code: code || numericCode || "UNKNOWN",
      title: "No se pudo emitir el comprobante",
      message: fallbackMessage,
      actionHint:
        input.httpStatus === 502
          ? "Si el problema persiste, revisá certificados, entorno homologación/producción y contactá soporte."
          : "Revisá los datos del comprobante. Si el error continúa, guardá el mensaje y el requestId para soporte.",
      severity: "error",
      canRetry: input.httpStatus !== 409,
      showRequestId: Boolean(input.requestId),
    },
    input
  )
}

/** Mensaje principal legible para operadores (sin jerga técnica si hay diagnóstico). */
export function formatFacturacionErrorSummaryForUi(info: FacturacionErrorInfo): string {
  if (info.diagnosis?.trim()) return info.diagnosis.trim()
  if (info.message?.trim()) return info.message.trim()
  return "No se pudo completar la facturación. Revisá los datos del comprobante o contactá a soporte."
}

export function formatFacturacionErrorForUi(info: FacturacionErrorInfo, requestId?: string | null): string {
  const main = formatFacturacionErrorSummaryForUi(info)
  const parts: string[] = [main]
  if (info.actionHint?.trim()) {
    const hint = info.actionHint.trim()
    if (!main.includes(hint.slice(0, Math.min(48, hint.length)))) {
      parts.push(hint)
    }
  }
  if (info.showRequestId && requestId) {
    parts.push(`Referencia para soporte: ${requestId}`)
  }
  return parts.join(" ")
}

export interface FacturacionEmisionData {
  cae: string
  vencimientoCaeIso: string | null
  facturaId: string | null
  numero: number | null
  puntoVenta: number | null
  tipo: number | null
  qrUrl: string | null
  fechaEmision?: string | null
  cuitEmisor?: string | null
  importe?: number | null
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

function pickNumber(...values: unknown[]): number | null {
  for (const v of values) {
    if (typeof v === "number" && !Number.isNaN(v)) return v
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v)
  }
  return null
}

/** Extrae CAE, vencimiento y metadatos desde respuesta MF API (incluye payload MultiCUIT anidado). */
export function extractFacturacionEmisionFromResponse(payload: unknown): FacturacionEmisionData | null {
  if (!isRecord(payload)) return null

  const data = payload.data
  if (!isRecord(data)) return null

  const sale = isRecord(data.sale) ? data.sale : null
  const arca = isRecord(data.arca) ? data.arca : null
  const remote = arca && isRecord(arca.response) ? arca.response : null
  const remoteData = remote && isRecord(remote.data) ? remote.data : null

  const cae = pickString(arca?.cae, sale?.arca_cae, remoteData?.cae)
  if (!cae) return null

  const vtoRaw = pickString(
    arca?.vencimientoCae,
    arca?.cae_vto,
    sale?.arca_cae_vto,
    remoteData?.vencimientoCae,
    remoteData?.cae_vto
  )

  let vencimientoCaeIso: string | null = null
  if (vtoRaw) {
    vencimientoCaeIso =
      /^\d{8}$/.test(vtoRaw.replace(/\D/g, "")) && vtoRaw.replace(/\D/g, "").length === 8
        ? vencimientoCaeAfipAIso(vtoRaw)
        : vtoRaw.includes("-")
          ? vtoRaw.slice(0, 10)
          : vencimientoCaeAfipAIso(vtoRaw)
  }

  const persistencia = remote && isRecord(remote.persistencia) ? remote.persistencia : null

  return {
    cae,
    vencimientoCaeIso,
    facturaId: pickString(arca?.facturaId, sale?.arca_factura_id, persistencia?.facturaId),
    numero: pickNumber(remoteData?.numero),
    puntoVenta: pickNumber(remoteData?.puntoVenta, arca?.puntoVenta),
    tipo: pickNumber(remoteData?.tipo),
    qrUrl: pickString(remoteData?.qrUrl, arca?.qrUrl),
    fechaEmision: pickString(remoteData?.fechaEmision, remoteData?.fecha_cbte),
    cuitEmisor: pickString(remoteData?.cuitEmisor, remoteData?.cuit_emisor),
    importe: pickNumber(remoteData?.importe, remoteData?.importeTotal),
  }
}

export function isCaeValido(cae: string | null | undefined): boolean {
  return Boolean(cae && String(cae).trim().length > 0)
}

/** Mensaje corto para listados según código persistido en la venta */
export function resolveFacturacionErrorFromSale(
  arcaErrorCode?: string | null,
  arcaErrorMessage?: string | null
): FacturacionErrorInfo | null {
  if (!arcaErrorCode && !arcaErrorMessage) return null
  return resolveFacturacionError({
    code: arcaErrorCode,
    rawMessage: arcaErrorMessage,
  })
}
