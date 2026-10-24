"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  type RepairEquipmentFormValues,
  type RepairEquipmentTypeValue,
  REPAIR_EQUIPMENT_TYPE_LABELS,
  formatEquipmentTypeDisplay,
  parseEquipmentDescriptionString,
} from "@/lib/repair-order-equipment"

interface RepairOrderEquipmentFieldsProps {
  value: RepairEquipmentFormValues
  onChange: (next: RepairEquipmentFormValues) => void
  errors?: Record<string, string>
  idPrefix?: string
  className?: string
}

export function RepairOrderEquipmentFields({
  value,
  onChange,
  errors = {},
  idPrefix = "equipment",
  className,
}: RepairOrderEquipmentFieldsProps) {
  const set = (patch: Partial<RepairEquipmentFormValues>) =>
    onChange({ ...value, ...patch })

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_brand_model`}>Marca y modelo *</Label>
        <Input
          id={`${idPrefix}_brand_model`}
          placeholder="Ej. Dell Inspiron 15"
          value={value.brandModel}
          onChange={(e) => set({ brandModel: e.target.value })}
        />
        {errors.brandModel && (
          <p className="text-sm text-destructive">{errors.brandModel}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_type`}>Tipo de equipo *</Label>
        <Select
          value={value.equipmentType || undefined}
          onValueChange={(v) =>
            set({
              equipmentType: v as RepairEquipmentTypeValue,
              equipmentTypeOther: v === "otro" ? value.equipmentTypeOther : "",
            })
          }
        >
          <SelectTrigger id={`${idPrefix}_type`} className="w-full">
            <SelectValue placeholder="Seleccioná…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="notebook">{REPAIR_EQUIPMENT_TYPE_LABELS.notebook}</SelectItem>
            <SelectItem value="impresora">{REPAIR_EQUIPMENT_TYPE_LABELS.impresora}</SelectItem>
            <SelectItem value="pc">{REPAIR_EQUIPMENT_TYPE_LABELS.pc}</SelectItem>
            <SelectItem value="otro">{REPAIR_EQUIPMENT_TYPE_LABELS.otro}</SelectItem>
          </SelectContent>
        </Select>
        {errors.equipmentType && (
          <p className="text-sm text-destructive">{errors.equipmentType}</p>
        )}
      </div>

      {value.equipmentType === "otro" && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}_type_other`}>Especificá el tipo *</Label>
          <Input
            id={`${idPrefix}_type_other`}
            placeholder="Ej. monitor, fuente, tablet…"
            value={value.equipmentTypeOther}
            onChange={(e) => set({ equipmentTypeOther: e.target.value })}
          />
          {errors.equipmentTypeOther && (
            <p className="text-sm text-destructive">{errors.equipmentTypeOther}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_serial`}>N.º de serie del equipo</Label>
        <Input
          id={`${idPrefix}_serial`}
          placeholder="Opcional — útil para historial del mismo equipo"
          value={value.serialNumber}
          onChange={(e) => set({ serialNumber: e.target.value })}
          autoComplete="off"
        />
        {errors.serialNumber && (
          <p className="text-sm text-destructive">{errors.serialNumber}</p>
        )}
      </div>
    </div>
  )
}

/** Vista de solo lectura a partir del texto guardado en la API. */
export function RepairOrderEquipmentReadOnly({
  equipmentDescription,
  className,
}: {
  equipmentDescription: string
  className?: string
}) {
  const parsed = parseEquipmentDescriptionString(equipmentDescription)
  if (parsed.legacy) {
    return (
      <div className={cn("space-y-1", className)}>
        <p className="text-sm text-muted-foreground">
          Orden con descripción libre (sin campos estructurados).
        </p>
        <p className="whitespace-pre-wrap">
          <strong>Equipo:</strong> {equipmentDescription}
        </p>
      </div>
    )
  }
  return (
    <div className={cn("space-y-1.5 text-sm", className)}>
      <p>
        <strong>Marca y modelo:</strong> {parsed.brandModel}
      </p>
      <p>
        <strong>Tipo de equipo:</strong> {formatEquipmentTypeDisplay(parsed)}
      </p>
      {parsed.serialNumber ? (
        <p>
          <strong>N.º de serie:</strong> {parsed.serialNumber}
        </p>
      ) : (
        <p className="text-muted-foreground">
          <strong>N.º de serie:</strong> —
        </p>
      )}
    </div>
  )
}
