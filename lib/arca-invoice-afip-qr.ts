import { toNumber } from "@/lib/arca-invoice-format"

function decodeAfipQrPayloadBase64(p: string): string | null {
  try {
    const normalized = p.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
    if (typeof window !== "undefined") {
      return decodeURIComponent(
        Array.from(atob(padded), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
      )
    }
    return Buffer.from(padded, "base64").toString("utf-8")
  } catch {
    return null
  }
}

/** Lee tipoDocRec / nroDocRec del QR AFIP persistido (fuente fiable tras emitir). */
export function parseAfipQrReceptorDoc(
  qrUrl: string | null | undefined
): { docTipo?: number; docNro?: number } {
  if (!qrUrl?.trim()) return {}

  try {
    const url = new URL(qrUrl.trim())
    const p = url.searchParams.get("p")
    if (!p) return {}

    const json = decodeAfipQrPayloadBase64(p)
    if (!json) return {}

    const data = JSON.parse(json) as Record<string, unknown>
    const nroRaw = data.nroDocRec ?? data.nro_doc_rec
    const tipoRaw = data.tipoDocRec ?? data.tipo_doc_rec
    const nroDigits = String(nroRaw ?? "").replace(/\D/g, "")
    if (!nroDigits || nroDigits === "0") return {}

    const docNro = Number(nroDigits)
    if (!Number.isFinite(docNro) || docNro <= 0) return {}

    const docTipo = tipoRaw != null ? Number(tipoRaw) : 80
    return {
      docTipo: Number.isFinite(docTipo) && docTipo > 0 ? docTipo : 80,
      docNro,
    }
  } catch {
    return {}
  }
}

/** Construye la URL del QR AFIP (RG 4290) cuando la API no devolvió qrUrl. */
export function buildAfipQrUrl(params: {
  fechaEmision: string
  cuitEmisor: string | number
  puntoVenta: number
  tipoComprobante: number
  numeroComprobante: number
  importe: number
  moneda?: string
  cotizacion?: number
  docTipoReceptor: number
  docNroReceptor: number
  cae: string
}): string {
  const cuit = String(params.cuitEmisor).replace(/\D/g, "")
  const payload = {
    ver: 1,
    fecha: params.fechaEmision.slice(0, 10),
    cuit: Number(cuit),
    ptoVta: params.puntoVenta,
    tipoCmp: params.tipoComprobante,
    nroCmp: params.numeroComprobante,
    importe: Math.round(toNumber(params.importe) * 100) / 100,
    moneda: params.moneda ?? "PES",
    ctz: params.cotizacion ?? 1,
    tipoDocRec: params.docTipoReceptor,
    nroDocRec: params.docNroReceptor,
    tipoCodAut: "E",
    codAut: Number(String(params.cae).replace(/\D/g, "")) || params.cae,
  }

  const json = JSON.stringify(payload)
  const p =
    typeof window !== "undefined"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf-8").toString("base64")

  return `https://www.afip.gob.ar/fe/qr/?p=${p}`
}
