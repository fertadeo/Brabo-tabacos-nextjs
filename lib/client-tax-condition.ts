import {
  buildArcaPadronBusinessSummary,
  type ArcaPadronResult,
} from "@/lib/arca-padron"

/** Valores que acepta la API de clientes (`tax_condition`). */
export type ClientTaxCondition =
  | "inscripto"
  | "consumidor_final"
  | "monotributo"
  | "responsable_inscripto"
  | "exento"

export type ClientPersoneria = "persona_fisica" | "persona_juridica" | "consumidor_final"

export const CLIENT_TAX_CONDITION_OPTIONS: { value: ClientTaxCondition; label: string }[] = [
  { value: "responsable_inscripto", label: "IVA Responsable Inscripto" },
  { value: "monotributo", label: "Responsable Monotributo" },
  { value: "exento", label: "IVA Sujeto Exento" },
  { value: "consumidor_final", label: "Consumidor final" },
  { value: "inscripto", label: "IVA Responsable Inscripto" },
]

export const TAX_CONDITION_LABELS: Record<ClientTaxCondition, string> = {
  responsable_inscripto: "Responsable Inscripto",
  inscripto: "IVA Responsable Inscripto",
  consumidor_final: "Consumidor Final",
  monotributo: "Monotributo",
  exento: "Exento",
}

export function formatTaxConditionLabel(
  value?: string | null,
  fallback: string = "N/A"
): string {
  if (!value) return fallback
  const normalized = value.toLowerCase().replace(/\s+/g, "_") as ClientTaxCondition
  return TAX_CONDITION_LABELS[normalized] ?? value
}

export function normalizeTaxConditionFromApi(
  value?: string | null
): ClientTaxCondition | undefined {
  if (!value?.trim()) return undefined
  const n = value.trim().toLowerCase().replace(/\s+/g, "_")
  const allowed: ClientTaxCondition[] = [
    "inscripto",
    "consumidor_final",
    "monotributo",
    "responsable_inscripto",
    "exento",
  ]
  return allowed.includes(n as ClientTaxCondition) ? (n as ClientTaxCondition) : undefined
}

export function defaultTaxConditionForPersoneria(
  personeria: ClientPersoneria
): ClientTaxCondition {
  if (personeria === "persona_juridica") return "responsable_inscripto"
  return "consumidor_final"
}

/** Opciones válidas según personería (reglas de negocio del ERP). */
export function getTaxConditionOptionsForPersoneria(personeria: ClientPersoneria) {
  if (personeria === "consumidor_final") {
    return CLIENT_TAX_CONDITION_OPTIONS.filter((o) => o.value === "consumidor_final")
  }
  if (personeria === "persona_juridica") {
    return CLIENT_TAX_CONDITION_OPTIONS.filter((o) =>
      ["responsable_inscripto", "exento"].includes(o.value)
    )
  }
  return CLIENT_TAX_CONDITION_OPTIONS.filter((o) =>
    ["inscripto", "consumidor_final", "monotributo"].includes(o.value)
  )
}

export function isTaxConditionAllowedForPersoneria(
  personeria: ClientPersoneria,
  taxCondition: ClientTaxCondition
): boolean {
  return getTaxConditionOptionsForPersoneria(personeria).some((o) => o.value === taxCondition)
}

/** Código AFIP WSFE `condicionIvaReceptor` a partir de `tax_condition`. */
export function afipCondicionFromTaxCondition(
  taxCondition: ClientTaxCondition
): number {
  const map: Record<ClientTaxCondition, number> = {
    responsable_inscripto: 1,
    inscripto: 1,
    exento: 4,
    consumidor_final: 5,
    monotributo: 6,
  }
  return map[taxCondition]
}

/**
 * Personería sugerida cuando el backend no envía `personeriaSugerida`
 * (p. ej. solo razón social + condición IVA).
 */
export function inferPersoneriaFromArcaPadron(
  data: ArcaPadronResult
): ClientPersoneria | undefined {
  if (data.personeriaSugerida) return data.personeriaSugerida
  if (data.razonSocial?.trim()) return "persona_juridica"

  const cuit = (data.cuit ?? "").replace(/\D/g, "")
  if (cuit.length >= 2) {
    const prefix = cuit.slice(0, 2)
    if (["30", "33", "34"].includes(prefix)) return "persona_juridica"
    if (["20", "23", "27"].includes(prefix)) return "persona_fisica"
  }

  const displayName = (data.razonSocial || data.name || "").trim()
  if (
    /\b(s\.?a\.?|s\.?r\.?l\.?|s\.?a\.?s\.?|asociacion|fundacion|cooperativa|sociedad|ltda)\b/i.test(
      displayName
    )
  ) {
    return "persona_juridica"
  }
  if (data.name?.trim() && !data.razonSocial?.trim()) return "persona_fisica"

  return undefined
}

/**
 * Condición fiscal del cliente a partir de la respuesta del padrón ARCA.
 */
export function taxConditionFromArcaPadron(data: ArcaPadronResult): ClientTaxCondition | undefined {
  const summary = buildArcaPadronBusinessSummary(data)
  const code = summary.condicionFiscal?.codigoAfip
  const personeria = inferPersoneriaFromArcaPadron(data) ?? data.personeriaSugerida

  if (code === 6) return "monotributo"
  if (code === 5) return "consumidor_final"
  if (code === 4 || code === 10) return "exento"
  if (code === 1) {
    return personeria === "persona_fisica" ? "inscripto" : "responsable_inscripto"
  }
  if (code === 9) return "consumidor_final"

  const label = (
    data.condicionIvaLabel ??
    data.condicionIvaSugerida ??
    summary.condicionFiscal?.label ??
    ""
  ).toLowerCase()

  if (label.includes("monotrib")) return "monotributo"
  if (label.includes("consumidor") || label.includes("cons.final")) return "consumidor_final"
  if (label.includes("exento") || label.includes("liberado")) return "exento"
  if (label.includes("responsable inscript") || label.includes("resp. inscript")) {
    return personeria === "persona_fisica" ? "inscripto" : "responsable_inscripto"
  }
  if (label.includes("inscript") && !label.includes("no inscript")) {
    return personeria === "persona_fisica" ? "inscripto" : "responsable_inscripto"
  }

  return undefined
}
