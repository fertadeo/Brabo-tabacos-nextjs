"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  User, 
  DollarSign, 
  ShoppingCart, 
  Plus,
  Trash2,
  ClipboardList,
  MapPin,
  HelpCircle,
  X,
  Package,
  Percent,
  Calculator,
  Search,
  ChevronDown
} from "lucide-react"
import { getClientes, type Cliente } from "@/lib/api"
import { IvaRateSelect } from "@/components/iva-rate-select"
import {
  clienteRequiresZeroItemIva,
  effectiveSaleItemIvaRate,
} from "@/lib/facturacion-cliente-fiscal"
import { computeSaleIvaBreakdown, DEFAULT_SALE_IVA_RATE, formatSaleIvaRateLabel, type SaleIvaRate } from "@/lib/sale-iva"

interface NewOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface OrderItem {
  id: string
  product: string
  description: string
  quantity: number
  ivaRate: SaleIvaRate
  recovery: number
  unitPrice: number
  subtotal: number
}

interface FormData {
  date: string
  client: string
  currency: string
  quote: number
  priceList: string
  seller: string
  responsible: string
  invoice: boolean
  deliveryAddress: string
  observations: string
  status: string
  shippingCompany: string
  packagesCount: number
  finalDiscount: number
}

export function NewOrderModal({ isOpen, onClose, onSuccess }: NewOrderModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [clients, setClients] = useState<Cliente[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [filteredClients, setFilteredClients] = useState<Cliente[]>([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/'),
    client: "",
    currency: "pesos",
    quote: 1.0,
    priceList: "general",
    seller: "administracion",
    responsible: "otro_contacto",
    invoice: false,
    deliveryAddress: "",
    observations: "",
    status: "para_preparar",
    shippingCompany: "",
    packagesCount: 0,
    finalDiscount: 0
  })

  const [currentItem, setCurrentItem] = useState({
    product: "",
    description: "",
    quantity: 1,
    ivaRate: DEFAULT_SALE_IVA_RATE as SaleIvaRate,
    recovery: 0.0,
    unitPrice: 0
  })

  const [items, setItems] = useState<OrderItem[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

  // Cargar clientes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadClients()
    }
  }, [isOpen])

  // Filtrar clientes cuando cambie la búsqueda
  useEffect(() => {
    if (clientSearch.trim() === "") {
      setFilteredClients(clients)
    } else {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
        client.code.toLowerCase().includes(clientSearch.toLowerCase())
      )
      setFilteredClients(filtered)
    }
  }, [clientSearch, clients])

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadClients = async () => {
    try {
      const response = await getClientes(1, 100)
      setClients(response.clients || [])
      setFilteredClients(response.clients || [])
    } catch (error) {
      console.error('Error al cargar clientes:', error)
    }
  }

  const handleClientSelect = (client: Cliente) => {
    setSelectedCliente(client)
    setFormData(prev => ({ ...prev, client: client.name }))
    setClientSearch(client.name)
    setShowClientDropdown(false)
    setFormData(prev => ({ ...prev, deliveryAddress: client.address || "" }))
  }

  const handleClientSearch = (value: string) => {
    setClientSearch(value)
    setShowClientDropdown(true)
    if (value !== formData.client) {
      setFormData(prev => ({ ...prev, client: "" }))
      setSelectedCliente(null)
    }
  }

  const requiresZeroItemIva = useMemo(
    () => clienteRequiresZeroItemIva(selectedCliente),
    [selectedCliente]
  )

  useEffect(() => {
    if (!requiresZeroItemIva) return
    setItems((prev) =>
      prev.some((item) => item.ivaRate !== 0)
        ? prev.map((item) => (item.ivaRate === 0 ? item : { ...item, ivaRate: 0 as SaleIvaRate }))
        : prev
    )
    setCurrentItem((prev) => (prev.ivaRate === 0 ? prev : { ...prev, ivaRate: 0 }))
  }, [requiresZeroItemIva, selectedCliente?.id])

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    if (error) setError(null)
  }

  const handleItemChange = (field: keyof typeof currentItem, value: string | number) => {
    setCurrentItem(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addItem = () => {
    if (!currentItem.product || !currentItem.description) {
      setError("Debe completar producto y descripción")
      return
    }

    const subtotal = currentItem.quantity * currentItem.unitPrice
    const newItem: OrderItem = {
      id: Date.now().toString(),
      product: currentItem.product,
      description: currentItem.description,
      quantity: currentItem.quantity,
      ivaRate: effectiveSaleItemIvaRate(currentItem.ivaRate, selectedCliente),
      recovery: currentItem.recovery,
      unitPrice: currentItem.unitPrice,
      subtotal
    }

    setItems(prev => [...prev, newItem])
    
    // Resetear campos del item actual
    setCurrentItem({
      product: "",
      description: "",
      quantity: 1,
      ivaRate: requiresZeroItemIva ? 0 : DEFAULT_SALE_IVA_RATE,
      recovery: 0.0,
      unitPrice: 0
    })
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const ivaBreakdown = computeSaleIvaBreakdown(
      items.map((item) => ({ subtotal: item.subtotal, iva_rate: item.ivaRate }))
    )
    const discount = subtotal * (formData.finalDiscount / 100)
    const total = subtotal - discount

    return {
      subtotal,
      netoGravado: ivaBreakdown.netoGravado,
      iva21: ivaBreakdown.iva21,
      iva105: ivaBreakdown.iva105,
      exempt: ivaBreakdown.ivaExento,
      ivaTotal: ivaBreakdown.ivaTotal,
      discount,
      total
    }
  }

  const totals = calculateTotals()

  const validateForm = () => {
    if (!formData.client.trim()) {
      setError("Debe seleccionar un cliente")
      return false
    }
    if (items.length === 0) {
      setError("Debe agregar al menos un producto")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      // Aquí iría la lógica para enviar el pedido a la API
      console.log('Creando pedido:', { formData, items, totals })
      
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess()
        onClose()
        resetForm()
      }, 1500)

    } catch (err) {
      console.error('Error al crear pedido:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '/'),
      client: "",
      currency: "pesos",
      quote: 1.0,
      priceList: "general",
      seller: "administracion",
      responsible: "otro_contacto",
      invoice: false,
      deliveryAddress: "",
      observations: "",
      status: "para_preparar",
      shippingCompany: "",
      packagesCount: 0,
      finalDiscount: 0
    })
    setItems([])
    setCurrentItem({
      product: "",
      description: "",
      quantity: 1,
      ivaRate: DEFAULT_SALE_IVA_RATE,
      recovery: 0.0,
      unitPrice: 0
    })
    setClientSearch("")
    setShowClientDropdown(false)
    setSelectedCliente(null)
    setError(null)
    setSuccess(false)
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  const selectedClient = clients.find(c => c.name === formData.client)

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 -m-6 mb-6 rounded-t-lg border-b border-slate-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-turquoise-600 rounded-lg">
                <ClipboardList className="h-6 w-6" />
              </div>
              <span>Alta Pedido</span>
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Ayuda"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-300 hover:text-white hover:bg-slate-700 transition-colors" 
                onClick={handleClose}
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos Generales del Pedido */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-turquoise-600" />
                  Datos Generales
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Información básica del pedido</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium text-slate-700 dark:text-slate-300">Fecha</Label>
                  <div className="relative">
                    <Input
                      id="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="pl-8"
                    />
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="client" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cliente *
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input
                      id="client"
                      value={clientSearch}
                      onChange={(e) => handleClientSearch(e.target.value)}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Buscar cliente por nombre, email o código..."
                      className="pl-10 pr-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-turquoise-500 focus:ring-turquoise-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </div>
                    
                    {/* Dropdown de clientes */}
                    {showClientDropdown && filteredClients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredClients.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => handleClientSelect(client)}
                            className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {client.name}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {client.email}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {client.code}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Mensaje cuando no hay resultados */}
                    {showClientDropdown && filteredClients.length === 0 && clientSearch.trim() !== "" && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg">
                        <div className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                          No se encontraron clientes
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-sm font-medium text-slate-700 dark:text-slate-300">Moneda</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pesos">Pesos</SelectItem>
                      <SelectItem value="dolares">Dólares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quote" className="text-sm font-medium text-slate-700 dark:text-slate-300">Cotiz.</Label>
                  <Input
                    id="quote"
                    type="number"
                    step="0.01"
                    value={formData.quote}
                    onChange={(e) => handleInputChange('quote', parseFloat(e.target.value) || 0)}
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceList" className="text-sm font-medium text-slate-700 dark:text-slate-300">Lista de Precios</Label>
                  <Select value={formData.priceList} onValueChange={(value) => handleInputChange('priceList', value)}>
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="mayorista">Mayorista</SelectItem>
                      <SelectItem value="minorista">Minorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Venta y Entrega */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User className="h-5 w-5 text-turquoise-600" />
                  Información de Venta y Entrega
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Detalles de venta y entrega del pedido</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seller" className="text-sm font-medium text-slate-700 dark:text-slate-300">Vendedor</Label>
                  <Select value={formData.seller} onValueChange={(value) => handleInputChange('seller', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administracion">Administración C</SelectItem>
                      <SelectItem value="ventas">Ventas</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible" className="text-sm font-medium">Elija el encargado</Label>
                  <Select value={formData.responsible} onValueChange={(value) => handleInputChange('responsible', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="otro_contacto">Otro Contacto</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice" className="text-sm font-medium">Facturar</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="invoice"
                        checked={formData.invoice}
                        onChange={() => handleInputChange('invoice', true)}
                        className="text-turquoise-600"
                      />
                      <span className="text-sm">Sí</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="invoice"
                        checked={!formData.invoice}
                        onChange={() => handleInputChange('invoice', false)}
                        className="text-turquoise-600"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">Estado</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="para_preparar">Para preparar</SelectItem>
                      <SelectItem value="en_proceso">En Proceso</SelectItem>
                      <SelectItem value="listo">Listo</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress" className="text-sm font-medium">Domicilio de Entrega</Label>
                  <Input
                    id="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                    placeholder="SELECCIONE UN CLIENTE"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations" className="text-sm font-medium">Observaciones</Label>
                  <Input
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => handleInputChange('observations', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección de Productos */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Agregar Productos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Producto</Label>
                    <Input
                      value={currentItem.product}
                      onChange={(e) => handleItemChange('product', e.target.value)}
                      placeholder="Buscar producto..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Alícuota IVA</Label>
                    <IvaRateSelect
                      value={requiresZeroItemIva ? 0 : currentItem.ivaRate}
                      onChange={(rate) => handleItemChange("ivaRate", rate)}
                      disabled={requiresZeroItemIva}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cantidad</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentItem.quantity}
                      onChange={(e) => handleItemChange('quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">% Rec.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentItem.recovery}
                      onChange={(e) => handleItemChange('recovery', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">P.Unitario</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentItem.unitPrice}
                      onChange={(e) => handleItemChange('unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">&nbsp;</Label>
                    <Button 
                      type="button" 
                      onClick={addItem}
                      className="w-full"
                      disabled={!currentItem.product || !currentItem.description}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Descripción</Label>
                  <Input
                    value={currentItem.description}
                    onChange={(e) => handleItemChange('description', e.target.value)}
                    placeholder="Descripción del producto..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Productos */}
          {items.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Productos del Pedido</h3>
                  
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cant.</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Alicuota</TableHead>
                          <TableHead>% Rec.</TableHead>
                          <TableHead>P.Unitario</TableHead>
                          <TableHead>Sub Total</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.quantity.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>{formatSaleIvaRateLabel(item.ivaRate)}</TableCell>
                            <TableCell>{item.recovery.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell>$ {item.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="font-medium">$ {item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {items.length} items {items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumen y Totales */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Resumen del Pedido
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Subtotal (con IVA)</Label>
                    <div className="text-lg font-semibold">$ {totals.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Neto gravado</Label>
                    <div className="text-lg font-semibold">$ {totals.netoGravado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">IVA 21%</Label>
                    <div className="text-lg font-semibold">$ {totals.iva21.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">IVA 10,5%</Label>
                    <div className="text-lg font-semibold">$ {totals.iva105.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Exento</Label>
                    <div className="text-lg font-semibold">$ {totals.exempt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Rec.(%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.finalDiscount}
                      onChange={(e) => handleInputChange('finalDiscount', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Rec.($) Final</Label>
                    <div className="text-lg font-semibold">$ {totals.discount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total</Label>
                    <div className="text-2xl font-bold text-turquoise-600">
                      $ {totals.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingCompany" className="text-sm font-medium">Empresa de Transporte</Label>
                    <Input
                      id="shippingCompany"
                      value={formData.shippingCompany}
                      onChange={(e) => handleInputChange('shippingCompany', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="packagesCount" className="text-sm font-medium">Cantidad de Bultos</Label>
                    <Input
                      id="packagesCount"
                      type="number"
                      value={formData.packagesCount}
                      onChange={(e) => handleInputChange('packagesCount', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mensajes de Error/Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700">Pedido creado exitosamente</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || items.length === 0}
              className="bg-gradient-to-r from-turquoise-500 to-turquoise-600 hover:from-turquoise-600 hover:to-turquoise-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aceptar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
