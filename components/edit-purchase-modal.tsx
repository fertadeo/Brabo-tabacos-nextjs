"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  deletePurchase,
  deletePurchaseItem,
  getPurchase,
  getPurchaseItems,
  updatePurchase,
  updatePurchaseItem,
  type Purchase,
  type PurchaseItem,
} from "@/lib/api"

interface EditPurchaseModalProps {
  isOpen: boolean
  purchaseId: number | null
  onClose: () => void
  onSuccess: () => void
  onDeleted?: () => void
}

export function EditPurchaseModal({
  isOpen,
  purchaseId,
  onClose,
  onSuccess,
  onDeleted,
}: EditPurchaseModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [status, setStatus] = useState<Purchase["status"]>("pending")
  const [notes, setNotes] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [receivedDate, setReceivedDate] = useState("")

  useEffect(() => {
    if (!isOpen || !purchaseId) {
      setPurchase(null)
      setItems([])
      return
    }
    void loadPurchase(purchaseId)
  }, [isOpen, purchaseId])

  const loadPurchase = async (id: number) => {
    setIsLoading(true)
    try {
      const [purchaseRes, itemsRes] = await Promise.all([getPurchase(id), getPurchaseItems(id)])
      if (purchaseRes.success) {
        const p = purchaseRes.data
        setPurchase(p)
        setStatus(p.status)
        setNotes(p.notes ?? "")
        setPurchaseDate(p.purchase_date?.slice(0, 10) ?? "")
        setReceivedDate(p.received_date?.slice(0, 10) ?? "")
      }
      if (itemsRes.success) {
        setItems(itemsRes.data)
      }
    } catch (error) {
      console.error(error)
      toast.error("No se pudo cargar la orden de compra")
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!purchaseId) return
    setIsSaving(true)
    try {
      const response = await updatePurchase(purchaseId, {
        status,
        notes: notes || undefined,
        purchase_date: purchaseDate || undefined,
        received_date: receivedDate || undefined,
      })
      if (response.success) {
        toast.success("Orden actualizada")
        onSuccess()
        onClose()
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!purchaseId) return
    if (!window.confirm("¿Eliminar este ítem de la orden?")) return
    try {
      await deletePurchaseItem(purchaseId, itemId)
      setItems((prev) => prev.filter((item) => item.id !== itemId))
      toast.success("Ítem eliminado")
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el ítem")
    }
  }

  const handleUpdateItem = async (item: PurchaseItem, field: "quantity" | "unit_price", value: string) => {
    if (!purchaseId) return
    const numeric = parseFloat(value)
    if (!Number.isFinite(numeric) || numeric < 0) return

    const quantity = field === "quantity" ? numeric : item.quantity
    const unitPrice = field === "unit_price" ? numeric : item.unit_price

    try {
      const response = await updatePurchaseItem(purchaseId, item.id, {
        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice,
      })
      if (response.success) {
        setItems((prev) => prev.map((row) => (row.id === item.id ? response.data : row)))
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el ítem")
    }
  }

  const handleDeletePurchase = async () => {
    if (!purchaseId || !purchase) return
    const confirmed = window.confirm(
      `¿Eliminar la orden ${purchase.purchase_number}? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deletePurchase(purchaseId)
      toast.success("Orden eliminada")
      onDeleted?.()
      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la orden")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar orden de compra
          </DialogTitle>
          <DialogDescription>
            {purchase
              ? `${purchase.purchase_number} · ${purchase.supplier_name}`
              : "Modifique datos o elimine la orden si ya no aplica."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Cargando orden…
          </div>
        ) : purchase ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Purchase["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="received">Recibida</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha de compra</Label>
                <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fecha de recepción</Label>
                <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Notas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>

            {items.length > 0 ? (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Precio unit.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{item.product_code}</p>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 w-20"
                            defaultValue={item.quantity}
                            onBlur={(e) => void handleUpdateItem(item, "quantity", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 w-24"
                            defaultValue={item.unit_price}
                            onBlur={(e) => void handleUpdateItem(item, "unit_price", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>${item.total_price.toLocaleString("es-AR")}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Esta orden no tiene ítems cargados.</p>
            )}
          </div>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDeletePurchase()}
            disabled={!purchase || isDeleting || isSaving}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Eliminar orden
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={!purchase || isSaving || isDeleting}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
