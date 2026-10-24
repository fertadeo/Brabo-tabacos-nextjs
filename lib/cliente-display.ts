import type { Cliente } from "@/lib/api"
import { formatCuitDisplay } from "@/lib/arca-padron"
import { formatTaxConditionLabel } from "@/lib/client-tax-condition"
import { formatClienteNombreDisplay } from "@/lib/format-client-name"
import { clienteCuitDigitos } from "@/lib/facturacion-form-from-cliente"

export interface ClienteDisplayDetail {
  label: string
  value: string
  mono?: boolean
}

const CLIENT_TYPE_LABELS: Record<Cliente["client_type"], string> = {
  minorista: "Minorista",
  mayorista: "Mayorista",
  personalizado: "Personalizado",
}

const PERSONERIA_LABELS: Record<NonNullable<Cliente["personeria"]>, string> = {
  persona_fisica: "Persona física",
  persona_juridica: "Persona jurídica",
  consumidor_final: "Consumidor final",
}

export function formatClienteCuitDisplay(cliente?: Cliente | null): string | null {
  const digits = clienteCuitDigitos(cliente)
  if (digits.length !== 11) return null
  return formatCuitDisplay(digits)
}

export function formatClienteTipo(cliente?: Cliente | null): string | null {
  if (!cliente?.client_type) return null
  return CLIENT_TYPE_LABELS[cliente.client_type] ?? cliente.client_type
}

export interface ClienteUbicacionParts {
  address: string | null
  city: string | null
  country: string | null
}

export function getClienteUbicacionParts(cliente?: Cliente | null): ClienteUbicacionParts {
  return {
    address: cliente?.address?.trim() || null,
    city: cliente?.city?.trim() || null,
    country: cliente?.country?.trim() || null,
  }
}

export function formatClienteUbicacion(cliente?: Cliente | null): string | null {
  const { address, city } = getClienteUbicacionParts(cliente)
  if (address && city) return `${address} · ${city}`
  return address || city || null
}

export function formatClienteUbicacionFromParts(parts: ClienteUbicacionParts): string | null {
  if (parts.address && parts.city) return `${parts.address} · ${parts.city}`
  return parts.address || parts.city || null
}

export function formatClientePersoneria(cliente?: Cliente | null): string | null {
  if (!cliente?.personeria) return null
  return PERSONERIA_LABELS[cliente.personeria] ?? cliente.personeria
}

export function getClienteInitials(name?: string | null): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return "CF"
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
}

/** Línea secundaria para distinguir homónimos en listados (dirección, CUIT, código). */
export function getClienteDistinguishingSubtitle(cliente: Cliente): string {
  const parts = [
    formatClienteUbicacion(cliente),
    formatClienteCuitDisplay(cliente),
    cliente.code?.trim() ? `Cód. ${cliente.code.trim()}` : null,
  ].filter(Boolean) as string[]
  return parts.join(" · ") || cliente.email?.trim() || "Sin datos adicionales"
}

export function getClienteDisplayDetails(cliente: Cliente): ClienteDisplayDetail[] {
  const details: ClienteDisplayDetail[] = []

  if (cliente.code?.trim()) {
    details.push({ label: "Código", value: cliente.code.trim(), mono: true })
  }

  const cuit = formatClienteCuitDisplay(cliente)
  if (cuit) {
    details.push({ label: "CUIT/CUIL", value: cuit, mono: true })
  }

  const ubicacion = formatClienteUbicacionFromParts(getClienteUbicacionParts(cliente))
  if (ubicacion) {
    details.push({ label: "Ubicación", value: ubicacion })
  }

  if (cliente.phone?.trim()) {
    details.push({ label: "Teléfono", value: cliente.phone.trim() })
  }

  if (cliente.email?.trim()) {
    details.push({ label: "Email", value: cliente.email.trim() })
  }

  const tipo = formatClienteTipo(cliente)
  if (tipo) {
    details.push({ label: "Tipo", value: tipo })
  }

  const personeria = formatClientePersoneria(cliente)
  if (personeria) {
    details.push({ label: "Personería", value: personeria })
  }

  if (cliente.tax_condition) {
    details.push({
      label: "Condición fiscal",
      value: formatTaxConditionLabel(cliente.tax_condition),
    })
  }

  return details
}

export function getClienteDisplayName(cliente?: Cliente | null): string {
  if (!cliente?.name?.trim()) return "Consumidor final"
  return formatClienteNombreDisplay(cliente.name)
}
