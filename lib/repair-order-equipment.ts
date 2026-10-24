/**
 * Equipo en órdenes de reparación: se persiste en `equipment_description` como texto estructurado
 * hasta que el backend exponga columnas propias.
 */

export type RepairEquipmentTypeValue = "" | "notebook" | "impresora" | "pc" | "otro"

export interface RepairEquipmentFormValues {
  brandModel: string
  equipmentType: RepairEquipmentTypeValue
  equipmentTypeOther: string
  serialNumber: string
}

export const REPAIR_EQUIPMENT_TYPE_LABELS: Record<Exclude<RepairEquipmentTypeValue, "">, string> = {
  notebook: "Notebook",
  impresora: "Impresora",
  pc: "PC",
  otro: "Otro",
}

export function emptyRepairEquipmentForm(): RepairEquipmentFormValues {
  return {
    brandModel: "",
    equipmentType: "",
    equipmentTypeOther: "",
    serialNumber: "",
  }
}

/** Serializa los tres campos al único campo que consume la API hoy. */
export function buildEquipmentDescriptionString(v: RepairEquipmentFormValues): string {
  const typeLine =
    v.equipmentType === "notebook"
      ? "Notebook"
      : v.equipmentType === "impresora"
        ? "Impresora"
        : v.equipmentType === "pc"
          ? "PC"
          : v.equipmentType === "otro"
            ? `Otro (${v.equipmentTypeOther.trim()})`
            : ""

  const lines = [`Marca y modelo: ${v.brandModel.trim()}`, `Tipo de equipo: ${typeLine}`]
  if (v.serialNumber.trim()) {
    lines.push(`N.º de serie: ${v.serialNumber.trim()}`)
  }
  return lines.join("\n")
}

/** Intenta leer el formato estructurado; si no coincide, devuelve legacy con todo en brandModel. */
export function parseEquipmentDescriptionString(text: string): RepairEquipmentFormValues & {
  legacy: boolean
} {
  const t = text.trim()
  if (!t) {
    return { ...emptyRepairEquipmentForm(), legacy: false }
  }

  const brand = /^\s*Marca y modelo:\s*(.+)$/im.exec(t)
  const tipo = /^\s*Tipo de equipo:\s*(.+)$/im.exec(t)
  const serie = /^\s*N\.?\s*º?\s*de\s*serie:\s*(.+)$/im.exec(t)

  if (brand && tipo) {
    const tipoLine = tipo[1].trim()
    let equipmentType: RepairEquipmentTypeValue = "otro"
    let equipmentTypeOther = ""

    if (/^notebook$/i.test(tipoLine)) {
      equipmentType = "notebook"
    } else if (/^impresora$/i.test(tipoLine)) {
      equipmentType = "impresora"
    } else if (/^pc$/i.test(tipoLine)) {
      equipmentType = "pc"
    } else {
      const m = /^Otro\s*\((.+)\)\s*$/i.exec(tipoLine)
      equipmentType = "otro"
      equipmentTypeOther = m ? m[1].trim() : tipoLine.replace(/^Otro\s*/i, "").trim()
    }

    return {
      brandModel: brand[1].trim(),
      equipmentType,
      equipmentTypeOther,
      serialNumber: serie ? serie[1].trim() : "",
      legacy: false,
    }
  }

  return {
    brandModel: t,
    equipmentType: "",
    equipmentTypeOther: "",
    serialNumber: "",
    legacy: true,
  }
}

export function formatEquipmentTypeDisplay(
  v: Pick<RepairEquipmentFormValues, "equipmentType" | "equipmentTypeOther">
): string {
  if (!v.equipmentType) return "—"
  if (v.equipmentType === "otro") {
    const o = v.equipmentTypeOther.trim()
    return o ? `Otro (${o})` : REPAIR_EQUIPMENT_TYPE_LABELS.otro
  }
  return REPAIR_EQUIPMENT_TYPE_LABELS[v.equipmentType]
}

/** Texto compacto para tablas (marca · tipo). */
export function getEquipmentListSummary(text: string, maxLen = 72): string {
  const p = parseEquipmentDescriptionString(text)
  if (p.legacy) {
    const t = text.trim()
    if (!t) return "—"
    return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
  }
  const typeStr = formatEquipmentTypeDisplay(p)
  const parts = [p.brandModel, typeStr].filter((x) => x && x !== "—")
  const s = parts.join(" · ")
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
}

export function validateRepairEquipmentFields(
  v: RepairEquipmentFormValues
): Record<string, string> {
  const err: Record<string, string> = {}
  if (!v.brandModel.trim()) {
    err.brandModel = "Indicá marca y modelo"
  }
  if (!v.equipmentType) {
    err.equipmentType = "Seleccioná el tipo de equipo"
  }
  if (v.equipmentType === "otro" && !v.equipmentTypeOther.trim()) {
    err.equipmentTypeOther = "Especificá el tipo de equipo"
  }
  return err
}
