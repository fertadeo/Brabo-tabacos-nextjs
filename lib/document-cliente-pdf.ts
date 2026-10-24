import type jsPDF from "jspdf"
import type { Cliente } from "@/lib/api"
import { formatTaxConditionLabel } from "@/lib/client-tax-condition"
import {
  formatClienteCuitDisplay,
  formatClienteUbicacion,
  getClienteDisplayName,
} from "@/lib/cliente-display"

export interface DocumentClientePdfFields {
  clientName: string
  clientCode?: string
  clientCuit?: string
  clientPhone?: string
  clientEmail?: string
  clientAddressLines?: string[]
  clientTaxCondition?: string
}

export interface DocumentClienteSnapshot {
  client_id?: number | null
  client_name?: string | null
  client_code?: string | null
  client_email?: string | null
  client_phone?: string | null
  client_address?: string | null
  client_city?: string | null
  client_cuil_cuit?: string | null
  tax_condition?: string | null
  client?: {
    phone?: string | null
    address?: string | null
    city?: string | null
    code?: string | null
    email?: string | null
    cuil_cuit?: string | null
    tax_condition?: string | null
  } | null
}

function joinAddressLines(address?: string | null, city?: string | null): string[] | undefined {
  const a = address?.trim()
  const c = city?.trim()
  if (a && c) return [a, c]
  if (a) return [a]
  if (c) return [c]
  return undefined
}

function formatCuitFromRaw(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 11) return raw.trim()
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

export function documentClientePdfFromCliente(cliente: Cliente): DocumentClientePdfFields {
  const ubicacion = formatClienteUbicacion(cliente)
  return {
    clientName: getClienteDisplayName(cliente),
    clientCode: cliente.code?.trim() || undefined,
    clientCuit: formatClienteCuitDisplay(cliente) ?? undefined,
    clientPhone: cliente.phone?.trim() || undefined,
    clientEmail: cliente.email?.trim() || undefined,
    clientAddressLines: ubicacion ? ubicacion.split(" · ") : undefined,
    clientTaxCondition: cliente.tax_condition
      ? formatTaxConditionLabel(cliente.tax_condition)
      : undefined,
  }
}

export function documentClientePdfFromSnapshot(snapshot: DocumentClienteSnapshot): DocumentClientePdfFields {
  const phone = snapshot.client_phone?.trim() || snapshot.client?.phone?.trim() || undefined
  const email = snapshot.client_email?.trim() || snapshot.client?.email?.trim() || undefined
  const address = snapshot.client_address?.trim() || snapshot.client?.address?.trim() || undefined
  const city = snapshot.client_city?.trim() || snapshot.client?.city?.trim() || undefined
  const code = snapshot.client_code?.trim() || snapshot.client?.code?.trim() || undefined
  const cuit =
    formatCuitFromRaw(snapshot.client_cuil_cuit) ||
    formatCuitFromRaw(snapshot.client?.cuil_cuit) ||
    undefined
  const tax = snapshot.tax_condition || snapshot.client?.tax_condition

  return {
    clientName:
      snapshot.client_name?.trim() ||
      (snapshot.client_id != null ? `Cliente #${snapshot.client_id}` : "Consumidor final"),
    clientCode: code,
    clientCuit: cuit,
    clientPhone: phone,
    clientEmail: email,
    clientAddressLines: joinAddressLines(address, city),
    clientTaxCondition: tax ? formatTaxConditionLabel(tax) : undefined,
  }
}

/** Líneas de detalle del cliente (debajo del nombre) en PDFs de comprobantes. */
export function drawDocumentClientePdfDetails(
  doc: jsPDF,
  x: number,
  yStart: number,
  fields: Pick<
    DocumentClientePdfFields,
    "clientCode" | "clientCuit" | "clientPhone" | "clientEmail" | "clientAddressLines" | "clientTaxCondition"
  >,
  lineHeight = 11
): number {
  let y = yStart
  const lines: string[] = []

  if (fields.clientCode?.trim()) lines.push(`Cód: ${fields.clientCode.trim()}`)
  if (fields.clientCuit?.trim()) lines.push(`CUIT/CUIL: ${fields.clientCuit.trim()}`)
  if (fields.clientPhone?.trim()) lines.push(`Tel: ${fields.clientPhone.trim()}`)
  if (fields.clientEmail?.trim()) lines.push(fields.clientEmail.trim())
  if (fields.clientAddressLines?.length) {
    fields.clientAddressLines.forEach((line) => {
      if (line.trim()) lines.push(line.trim())
    })
  }
  if (fields.clientTaxCondition?.trim()) lines.push(fields.clientTaxCondition.trim())

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  lines.forEach((line) => {
    doc.text(line, x, y)
    y += lineHeight
  })

  return y
}

export function pdfClientContactFields(
  source: Cliente | DocumentClienteSnapshot
): Omit<DocumentClientePdfFields, never> {
  if ("client_type" in source && source.client_type) {
    return documentClientePdfFromCliente(source as Cliente)
  }
  return documentClientePdfFromSnapshot(source as DocumentClienteSnapshot)
}

export function mergeDocumentClientePdfFields(
  base: DocumentClientePdfFields,
  extra?: Partial<DocumentClientePdfFields>
): DocumentClientePdfFields {
  if (!extra) return base
  return {
    clientName: extra.clientName?.trim() || base.clientName,
    clientCode: extra.clientCode?.trim() || base.clientCode,
    clientCuit: extra.clientCuit?.trim() || base.clientCuit,
    clientPhone: extra.clientPhone?.trim() || base.clientPhone,
    clientEmail: extra.clientEmail?.trim() || base.clientEmail,
    clientAddressLines: extra.clientAddressLines?.length ? extra.clientAddressLines : base.clientAddressLines,
    clientTaxCondition: extra.clientTaxCondition?.trim() || base.clientTaxCondition,
  }
}
