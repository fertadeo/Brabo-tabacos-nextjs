"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface NewMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const UNITS = [
  { value: "unidad", label: "Unidad" },
  { value: "metro", label: "Metro" },
  { value: "metro_lineal", label: "Metro lineal" },
  { value: "metro_cuadrado", label: "Metro cuadrado" },
  { value: "kilogramo", label: "Kilogramo" },
  { value: "litro", label: "Litro" },
]

export function NewMaterialModal({ isOpen, onClose, onSuccess }: NewMaterialModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "",
    description: "",
    unit: "unidad",
    minStock: "",
    leadTime: "",
    requiresBatch: false,
  })

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      category: "",
      description: "",
      unit: "unidad",
      minStock: "",
      leadTime: "",
      requiresBatch: false,
    })
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.code || !formData.name) {
      toast.error("Completa al menos el código y el nombre del material")
      return
    }

    console.log("[MATERIALES] Nuevo material productivo", formData)
    toast.success("Material registrado como pendiente de aprobación")

    onSuccess?.()
    handleClose()
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo material productivo</DialogTitle>
          <DialogDescription>
            Registra el material con su información básica. Luego podrás asociarlo a proveedores productivos.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código interno</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ej. MAT-0001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Tela Blackout 2.80"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Textiles, Motores, Accesorios…"
              />
            </div>
            <div className="space-y-2">
              <Label>Unidad de medida</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona unidad" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minStock">Stock mínimo recomendado</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                placeholder="Ej. 500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTime">Lead time (días)</Label>
              <Input
                id="leadTime"
                type="number"
                min="0"
                value={formData.leadTime}
                onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                placeholder="Ej. 7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción técnica</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Observaciones técnicas, ficha, usos habituales, equivalencias…"
            />
          </div>

          <div className="flex items-center space-x-2 rounded-lg border p-3">
            <Checkbox
              id="requiresBatch"
              checked={formData.requiresBatch}
              onCheckedChange={(checked) => setFormData({ ...formData, requiresBatch: Boolean(checked) })}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="requiresBatch">Requiere seguimiento por lote</Label>
              <p className="text-xs text-muted-foreground">
                Activa esta opción si el material necesita trazabilidad por lote/serie.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar material
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}

