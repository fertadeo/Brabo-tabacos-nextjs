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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

interface NewMaterialOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const PRIORITIES = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
]

export function NewMaterialOrderModal({ isOpen, onClose, onSuccess }: NewMaterialOrderModalProps) {
  const [formData, setFormData] = useState({
    material: "",
    supplier: "",
    quantity: "",
    unitPrice: "",
    expectedDate: format(new Date(), "yyyy-MM-dd"),
    priority: "media",
    notes: "",
    recognizeAsDebt: false,
  })

  const handleClose = () => {
    onClose()
    setFormData({
      material: "",
      supplier: "",
      quantity: "",
      unitPrice: "",
      expectedDate: format(new Date(), "yyyy-MM-dd"),
      priority: "media",
      notes: "",
      recognizeAsDebt: false,
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.material || !formData.supplier || !formData.quantity) {
      toast.error("Completa material, proveedor y cantidad")
      return
    }

    const payload = {
      ...formData,
      quantity: Number(formData.quantity),
      unitPrice: Number(formData.unitPrice || 0),
      total: Number(formData.quantity || 0) * Number(formData.unitPrice || 0),
      commitmentType: formData.recognizeAsDebt ? "deuda_real" : "compromiso",
    }

    console.log("[MATERIALES] Nueva orden de compra", payload)

    if (formData.recognizeAsDebt) {
      toast.success("Orden registrada como deuda real (factura recibida)")
    } else {
      toast.success("Orden registrada como compromiso pendiente de facturar")
    }

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
          <DialogTitle>Nueva orden de compra productiva</DialogTitle>
          <DialogDescription>
            Genera una orden para materiales productivos. Mientras no haya factura asociada se registrará como compromiso.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="Ej. Tela Blackout 2.80"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Proveedor productivo"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Ej. 500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Costo unitario</Label>
              <Input
                id="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="Ej. 4500"
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedDate">Fecha estimada de entrega</Label>
              <Input
                id="expectedDate"
                type="date"
                value={formData.expectedDate}
                onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                ETA: {format(new Date(formData.expectedDate), "PPP", { locale: es })}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas para depósito</Label>
              <Textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Aclaraciones de embalaje, identificaciones, etc."
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="recognizeAsDebt"
              checked={formData.recognizeAsDebt}
              onCheckedChange={(checked) => setFormData({ ...formData, recognizeAsDebt: Boolean(checked) })}
            />
            <div className="space-y-1">
              <Label htmlFor="recognizeAsDebt">Factura recibida</Label>
              <p className="text-xs text-muted-foreground">
                Activa esta casilla sólo si la factura ingresó junto con el remito. De lo contrario, quedará como compromiso hasta que se reciba.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar orden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}

