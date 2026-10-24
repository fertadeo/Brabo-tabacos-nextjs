"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateRepairOrderItem, type RepairOrderItem } from "@/lib/api"
import { getRepairOrderItemDisplayName, isRepairOrderCustomItem } from "@/lib/repair-order-items"
import { CurrencyFieldInput } from "@/components/currency-field-input"
import { Loader2, Pencil } from "lucide-react"

interface RepairOrderEditItemModalProps {
  orderId: number | string
  item: RepairOrderItem | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RepairOrderEditItemModal({
  orderId,
  item,
  isOpen,
  onClose,
  onSuccess,
}: RepairOrderEditItemModalProps) {
  const [quantity, setQuantity] = useState("1")
  const [unitPrice, setUnitPrice] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !item) return
    setQuantity(String(item.quantity))
    setUnitPrice(parseFloat(String(item.unit_price)) || 0)
    setError(null)
  }, [isOpen, item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return
    const q = parseInt(quantity, 10)
    if (!Number.isFinite(q) || q < 1) {
      setError("La cantidad debe ser al menos 1")
      return
    }
    if (unitPrice < 0) {
      setError("El precio no puede ser negativo")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await updateRepairOrderItem(orderId, item.id, {
        quantity: q,
        unit_price: unitPrice,
      })
      onSuccess()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar ítem")
    } finally {
      setLoading(false)
    }
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  if (!item) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar ítem
            </DialogTitle>
            <DialogDescription>
              {getRepairOrderItemDisplayName(item)}
              {isRepairOrderCustomItem(item) ? " · ítem manual" : ""}
              {item.stock_deducted ? " · el stock ya fue descontado" : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Precio unitario ($)</Label>
              <CurrencyFieldInput
                placeholder="$0,00"
                value={unitPrice}
                onValueChange={setUnitPrice}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  )
}
