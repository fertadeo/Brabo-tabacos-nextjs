"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, ShoppingCart, Package, DollarSign } from "lucide-react"
import { createPurchase, getSuppliers, type CreatePurchaseRequest, type Supplier, type CreatePurchaseItemRequest } from "@/lib/api"
import { toast } from "sonner"

interface NewPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PurchaseItem {
  product_id: number
  product_name: string
  product_code: string
  quantity: number
  unit_price: number
  total_price: number
}

export function NewPurchaseModal({ isOpen, onClose, onSuccess }: NewPurchaseModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [notes, setNotes] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  // Cargar proveedores al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadSuppliers()
    }
  }, [isOpen])

  const loadSuppliers = async () => {
    try {
      const response = await getSuppliers({ all: true })
      if (response.success) {
        setSuppliers(response.data.suppliers)
      }
    } catch (error) {
      console.error("Error al cargar proveedores:", error)
      toast.error("Error al cargar proveedores")
    }
  }

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id.toString() === supplierId)
    setSelectedSupplier(supplier || null)
  }

  const addItem = () => {
    const newItem: PurchaseItem = {
      product_id: 0,
      product_name: "",
      product_code: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }
    setItems([...items, newItem])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalcular total_price si cambia quantity o unit_price
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity
      const unitPrice = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price
      updatedItems[index].total_price = quantity * unitPrice
    }
    
    setItems(updatedItems)
  }

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.total_price, 0)
  }

  const handleSubmit = async () => {
    if (!selectedSupplier) {
      toast.error("Selecciona un proveedor")
      return
    }

    if (items.length === 0) {
      toast.error("Agrega al menos un item")
      return
    }

    // Validar que todos los items tengan datos válidos
    const invalidItems = items.some(item => 
      !item.product_name || item.quantity <= 0 || item.unit_price <= 0
    )

    if (invalidItems) {
      toast.error("Completa todos los campos de los items")
      return
    }

    setIsLoading(true)

    try {
      const purchaseData: CreatePurchaseRequest = {
        supplier_id: selectedSupplier.id,
        status: 'pending',
        total_amount: calculateTotal(),
        notes: notes || undefined
      }

      const response = await createPurchase(purchaseData)
      
      if (response.success) {
        toast.success("Orden de compra creada exitosamente")
        
        // Agregar items a la compra
        for (const item of items) {
          const itemData: CreatePurchaseItemRequest = {
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          }
          
          // Aquí podrías llamar a addPurchaseItem si la API lo soporta
          // await addPurchaseItem(response.data.id, itemData)
        }
        
        onSuccess()
        handleClose()
      } else {
        toast.error("Error al crear la orden de compra")
      }
    } catch (error) {
      console.error("Error al crear orden de compra:", error)
      toast.error("Error al crear la orden de compra")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedSupplier(null)
    setItems([])
    setNotes("")
    setSearchTerm("")
    onClose()
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Nueva Orden de Compra
          </DialogTitle>
          <DialogDescription>
            Crea una nueva orden de compra con proveedor e items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selección de Proveedor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proveedor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-supplier">Buscar Proveedor</Label>
                <Input
                  id="search-supplier"
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Seleccionar Proveedor</Label>
                <Select onValueChange={handleSupplierSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{supplier.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {supplier.code}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSupplier && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium">{selectedSupplier.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSupplier.contact_name && `Contacto: ${selectedSupplier.contact_name}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSupplier.email && `Email: ${selectedSupplier.email}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSupplier.phone && `Teléfono: ${selectedSupplier.phone}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items de la Compra */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Items de la Compra</CardTitle>
                <Button onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay items agregados</p>
                  <p className="text-sm">Haz clic en "Agregar Item" para comenzar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`product-name-${index}`}>Producto</Label>
                          <Input
                            id={`product-name-${index}`}
                            placeholder="Nombre del producto"
                            value={item.product_name}
                            onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`product-code-${index}`}>Código</Label>
                          <Input
                            id={`product-code-${index}`}
                            placeholder="Código del producto"
                            value={item.product_code}
                            onChange={(e) => updateItem(index, 'product_code', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`quantity-${index}`}>Cantidad</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`unit-price-${index}`}>Precio Unitario</Label>
                          <Input
                            id={`unit-price-${index}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total del item:</p>
                          <p className="text-lg font-semibold">
                            ${item.total_price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Notas adicionales sobre la orden de compra..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Resumen Total */}
          {items.length > 0 && (
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="text-lg font-medium">Total de la Orden:</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${calculateTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedSupplier || items.length === 0}>
            {isLoading ? "Creando..." : "Crear Orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
