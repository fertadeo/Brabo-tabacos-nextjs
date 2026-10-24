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
import { Plus, Trash2, FileText, AlertCircle, Info } from "lucide-react"
import { 
  createSupplierInvoice, 
  updateSupplierInvoice,
  getSupplierInvoice,
  getSuppliers, 
  getPurchases,
  getProducts,
  type Supplier, 
  type SupplierInvoice,
  type CreateSupplierInvoiceRequest,
  type CreateSupplierInvoiceItemRequest,
  type Purchase,
  type Product
} from "@/lib/api"
import { toast } from "sonner"

interface SupplierInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  invoiceId?: number | null
  mode: 'create' | 'edit' | 'view'
  supplierId?: number | null
}

interface InvoiceItem {
  material_code?: string | null
  product_id?: number | null
  product_name?: string
  description: string
  quantity: number
  unit_price: number
  unit_cost?: number
  total_price: number
  affects_production_cost: boolean
  purchase_item_id?: number | null
}

export function SupplierInvoiceModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  invoiceId,
  mode,
  supplierId: initialSupplierId
}: SupplierInvoiceModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  
  const [formData, setFormData] = useState({
    invoice_number: "",
    supplier_id: initialSupplierId || null as number | null,
    purchase_id: null as number | null,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: null as string | null,
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    notes: ""
  })
  
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadInitialData()
      if (invoiceId && (mode === 'edit' || mode === 'view')) {
        loadInvoice()
      } else if (mode === 'create') {
        resetForm()
      }
    }
  }, [isOpen, invoiceId, mode])

  // Cargar compras cuando cambie el proveedor
  useEffect(() => {
    if (selectedSupplier?.id) {
      loadPurchasesForSupplier(selectedSupplier.id)
    }
  }, [selectedSupplier])

  const loadInitialData = async () => {
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        getSuppliers({ all: true }),
        getProducts()
      ])
      
      if (suppliersRes.success) {
        setSuppliers(suppliersRes.data.suppliers)
        if (initialSupplierId) {
          const supplier = suppliersRes.data.suppliers.find(s => s.id === initialSupplierId)
          if (supplier) {
            setSelectedSupplier(supplier)
            setFormData(prev => ({ ...prev, supplier_id: supplier.id }))
          }
        }
      }
      
      if (Array.isArray(productsRes)) {
        setProducts(productsRes)
      }
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar datos iniciales")
    }
  }

  const loadPurchasesForSupplier = async (supplierId: number) => {
    try {
      const response = await getPurchases({ supplier_id: supplierId, all: true })
      if (response.success) {
        setPurchases(response.data.purchases)
      }
    } catch (error) {
      console.error("Error al cargar compras:", error)
    }
  }

  const loadInvoice = async () => {
    if (!invoiceId) return

    try {
      setIsLoading(true)
      const response = await getSupplierInvoice(invoiceId)
      if (response.success) {
        const invoice = response.data
        setFormData({
          invoice_number: invoice.invoice_number,
          supplier_id: invoice.supplier_id,
          purchase_id: invoice.purchase_id || null,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date || null,
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          total_amount: invoice.total_amount,
          notes: invoice.notes || ""
        })

        // Cargar proveedor
        const supplier = suppliers.find(s => s.id === invoice.supplier_id)
        if (supplier) {
          setSelectedSupplier(supplier)
        }

        // Cargar OC si existe
        if (invoice.purchase_id) {
          const purchase = purchases.find(p => p.id === invoice.purchase_id)
          if (purchase) {
            setSelectedPurchase(purchase)
          }
        }

        // Cargar items
        if (invoice.items) {
          setItems(invoice.items.map(item => ({
            material_code: item.material_code || null,
            product_id: item.product_id || null,
            product_name: item.product_name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_cost: item.unit_cost,
            total_price: item.total_price,
            affects_production_cost: item.affects_production_cost,
            purchase_item_id: item.purchase_item_id || null
          })))
        }
      }
    } catch (error) {
      console.error("Error al cargar factura:", error)
      toast.error("Error al cargar la factura")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      invoice_number: "",
      supplier_id: initialSupplierId || null,
      purchase_id: null,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: null,
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      notes: ""
    })
    setItems([])
    setSelectedSupplier(null)
    setSelectedPurchase(null)
    setSearchTerm("")
  }

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id.toString() === supplierId)
    setSelectedSupplier(supplier || null)
    setFormData(prev => ({ ...prev, supplier_id: supplier?.id || null }))
    setSelectedPurchase(null)
    setFormData(prev => ({ ...prev, purchase_id: null }))
  }

  const handlePurchaseSelect = (purchaseId: string) => {
    const purchase = purchases.find(p => p.id.toString() === purchaseId)
    setSelectedPurchase(purchase || null)
    setFormData(prev => ({ ...prev, purchase_id: purchase?.id || null }))
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      material_code: null,
      product_id: null,
      product_name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      affects_production_cost: selectedSupplier?.supplier_type === 'productivo',
      purchase_item_id: null
    }
    setItems([...items, newItem])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
    recalculateTotals()
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number | boolean | null) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalcular total_price si cambia quantity o unit_price
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity
      const unitPrice = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price
      updatedItems[index].total_price = quantity * unitPrice
    }

    // Si cambia product_id, actualizar product_name
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === Number(value))
      if (product) {
        updatedItems[index].product_name = product.name
      }
    }

    setItems(updatedItems)
    recalculateTotals()
  }

  const recalculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)
    const taxAmount = subtotal * 0.21 // IVA 21%
    const totalAmount = subtotal + taxAmount
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    }))
  }

  useEffect(() => {
    recalculateTotals()
  }, [items])

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!formData.invoice_number.trim()) {
      toast.error("El número de factura es requerido")
      return
    }

    if (!selectedSupplier) {
      toast.error("Selecciona un proveedor")
      return
    }

    if (items.length === 0) {
      toast.error("Agrega al menos un item")
      return
    }

    // Validaciones según tipo de proveedor
    if (selectedSupplier.supplier_type === 'productivo') {
      const itemsWithoutMaterialCode = items.filter(item => !item.material_code || item.material_code.trim() === "")
      if (itemsWithoutMaterialCode.length > 0) {
        toast.error("Los proveedores productivos requieren código de material en todos los items")
        return
      }
    }

    // Validar items
    const invalidItems = items.some(item => 
      !item.description.trim() || item.quantity <= 0 || item.unit_price <= 0
    )

    if (invalidItems) {
      toast.error("Completa todos los campos de los items")
      return
    }

    setIsLoading(true)

    try {
      const invoiceData: CreateSupplierInvoiceRequest = {
        invoice_number: formData.invoice_number,
        supplier_id: selectedSupplier.id,
        purchase_id: formData.purchase_id || null,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        subtotal: formData.subtotal,
        tax_amount: formData.tax_amount,
        total_amount: formData.total_amount,
        notes: formData.notes || undefined,
        items: items.map(item => ({
          material_code: item.material_code || null,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost,
          affects_production_cost: item.affects_production_cost,
          purchase_item_id: item.purchase_item_id || null
        }))
      }

      let response
      if (mode === 'create') {
        response = await createSupplierInvoice(invoiceData)
      } else if (mode === 'edit' && invoiceId) {
        response = await updateSupplierInvoice(invoiceId, invoiceData)
      } else {
        return
      }
      
      if (response.success) {
        toast.success(mode === 'create' ? "Factura creada exitosamente" : "Factura actualizada exitosamente")
        onSuccess()
        handleClose()
      } else {
        toast.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} la factura`)
      }
    } catch (error) {
      console.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} factura:`, error)
      toast.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} la factura`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isReadOnly = mode === 'view'
  const title = mode === 'create' ? 'Nueva Factura de Proveedor' : mode === 'edit' ? 'Editar Factura' : 'Ver Factura'
  const isProductivo = selectedSupplier?.supplier_type === 'productivo'
  const isNoProductivo = selectedSupplier?.supplier_type === 'no_productivo'

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && "Crea una nueva factura de proveedor"}
            {mode === 'edit' && "Modifica la información de la factura"}
            {mode === 'view' && "Información de la factura"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Proveedor */}
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
                  disabled={isReadOnly || !!initialSupplierId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor *</Label>
                <Select
                  value={selectedSupplier?.id.toString() || ""}
                  onValueChange={handleSupplierSelect}
                  disabled={isReadOnly || !!initialSupplierId}
                >
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.code} - {supplier.name}
                        {supplier.supplier_type && (
                          <Badge variant="outline" className="ml-2">
                            {supplier.supplier_type}
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSupplier && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tipo:</span>
                    <Badge variant={
                      selectedSupplier.supplier_type === 'productivo' ? 'default' :
                      selectedSupplier.supplier_type === 'no_productivo' ? 'secondary' : 'outline'
                    }>
                      {selectedSupplier.supplier_type === 'productivo' ? 'Productivo' :
                       selectedSupplier.supplier_type === 'no_productivo' ? 'No Productivo' : 'Otro Pasivo'}
                    </Badge>
                  </div>
                  {isProductivo && (
                    <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <span>Este proveedor requiere código de material en todos los items</span>
                    </div>
                  )}
                  {isNoProductivo && (
                    <div className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <Info className="h-4 w-4 mt-0.5" />
                      <span>Este proveedor puede tener facturas sin OC previa. El código de material es opcional.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Orden de Compra (Opcional) */}
              <div className="space-y-2">
                <Label htmlFor="purchase">Orden de Compra (Opcional)</Label>
                <Select
                  value={selectedPurchase?.id.toString() || ""}
                  onValueChange={handlePurchaseSelect}
                  disabled={isReadOnly || !selectedSupplier}
                >
                  <SelectTrigger id="purchase">
                    <SelectValue placeholder="Seleccionar OC (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin OC</SelectItem>
                    {purchases.map((purchase) => (
                      <SelectItem key={purchase.id} value={purchase.id.toString()}>
                        {purchase.purchase_number} - {formatCurrency(purchase.total_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isNoProductivo && (
                  <p className="text-xs text-muted-foreground">
                    Los proveedores no productivos pueden tener facturas sin OC previa
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información de la Factura */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de la Factura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Número de Factura *</Label>
                  <Input
                    id="invoice_number"
                    placeholder="FC-2024-001"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Fecha de Factura *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value || null }))}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionales..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  disabled={isReadOnly}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items de la Factura */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Items de la Factura</CardTitle>
                {!isReadOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay items agregados</p>
                  {!isReadOnly && (
                    <Button type="button" variant="outline" className="mt-4" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Primer Item
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-12 gap-4">
                        {/* Código de Material (Requerido para productivos) */}
                        <div className="col-span-12 md:col-span-3 space-y-2">
                          <Label>
                            Código de Material {isProductivo && <span className="text-red-500">*</span>}
                          </Label>
                          <Input
                            placeholder="MAT-001"
                            value={item.material_code || ""}
                            onChange={(e) => updateItem(index, 'material_code', e.target.value || null)}
                            disabled={isReadOnly}
                            className={isProductivo && !item.material_code ? "border-red-500" : ""}
                          />
                          {isProductivo && !item.material_code && (
                            <p className="text-xs text-red-500">Requerido para proveedores productivos</p>
                          )}
                        </div>

                        {/* Producto */}
                        <div className="col-span-12 md:col-span-3 space-y-2">
                          <Label>Producto</Label>
                          <Select
                            value={item.product_id?.toString() || ""}
                            onValueChange={(value) => {
                              updateItem(index, 'product_id', value ? parseInt(value) : null)
                              const product = products.find(p => p.id === parseInt(value))
                              if (product) {
                                updateItem(index, 'product_name', product.name)
                                updateItem(index, 'description', product.description || product.name)
                              }
                            }}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar producto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Sin producto</SelectItem>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.code} - {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Descripción */}
                        <div className="col-span-12 md:col-span-6 space-y-2">
                          <Label>Descripción *</Label>
                          <Input
                            placeholder="Descripción del item"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            disabled={isReadOnly}
                          />
                        </div>

                        {/* Cantidad */}
                        <div className="col-span-12 md:col-span-2 space-y-2">
                          <Label>Cantidad *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={isReadOnly}
                          />
                        </div>

                        {/* Precio Unitario */}
                        <div className="col-span-12 md:col-span-2 space-y-2">
                          <Label>Precio Unit. *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            disabled={isReadOnly}
                          />
                        </div>

                        {/* Costo Unitario */}
                        <div className="col-span-12 md:col-span-2 space-y-2">
                          <Label>Costo Unit.</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_cost || ""}
                            onChange={(e) => updateItem(index, 'unit_cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                            disabled={isReadOnly}
                          />
                        </div>

                        {/* Total */}
                        <div className="col-span-12 md:col-span-3 space-y-2">
                          <Label>Total</Label>
                          <Input
                            value={formatCurrency(item.total_price)}
                            disabled
                            className="font-medium"
                          />
                        </div>

                        {/* Afecta Costo de Producción */}
                        <div className="col-span-12 md:col-span-2 space-y-2 flex items-end">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={item.affects_production_cost}
                              onChange={(e) => updateItem(index, 'affects_production_cost', e.target.checked)}
                              disabled={isReadOnly || isProductivo}
                              className="rounded"
                            />
                            <Label className="text-sm">Afecta costo producción</Label>
                          </div>
                        </div>

                        {/* Botón Eliminar */}
                        {!isReadOnly && (
                          <div className="col-span-12 md:col-span-1 flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (21%):</span>
                  <span className="font-medium">{formatCurrency(formData.tax_amount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(formData.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {isReadOnly ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear Factura' : 'Actualizar Factura'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount)
}

