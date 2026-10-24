"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  PackageCheck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Truck,
  Package,
  MapPin,
  User,
  FileText,
  ShoppingCart,
} from "lucide-react"

interface ProductItem {
  id: string
  producto: string
  cantidad: number
  precio: number
  stock: number
  lote?: string
}

interface NewRemitoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function NewRemitoModal({ isOpen, onClose, onSuccess }: NewRemitoModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    tipoRemito: "entrega_cliente",
    pedidoId: "",
    clienteId: "",
    clienteNombre: "",
    direccion: "",
    ciudad: "",
    contacto: "",
    telefono: "",
    fechaEntrega: "",
    empresaTransporte: "",
    costoTransporte: "",
    items: [] as ProductItem[],
    notasPreparacion: "",
    notasEntrega: "",
  })

  const productosEjemplo = [
    { id: "1", nombre: "Roller Sunscreen 1.80m", precio: 3500, stock: 25 },
    { id: "2", nombre: "Cortina Blackout 2.00m", precio: 4200, stock: 18 },
    { id: "3", nombre: "Riel de Aluminio 3m", precio: 850, stock: 50 },
    { id: "4", nombre: "Cortina Tradicional 1.50m", precio: 2800, stock: 30 },
    { id: "5", nombre: "Persiana Vertical PVC", precio: 5200, stock: 12 },
  ]

  const clientesEjemplo = [
    { id: "1", nombre: "María González", direccion: "Av. Corrientes 1234, CABA" },
    { id: "2", nombre: "Comercial San Martín", direccion: "San Martín 567, Rosario" },
    { id: "3", nombre: "Juan Pérez", direccion: "Mitre 890, La Plata" },
    { id: "4", nombre: "Distribuidora Tech Solutions", direccion: "Belgrano 234, Córdoba" },
  ]

  const pedidosEjemplo = [
    { id: "PED001", cliente: "María González", fecha: "2024-01-22", items: 3 },
    { id: "PED002", cliente: "Comercial San Martín", fecha: "2024-01-21", items: 12 },
    { id: "PED003", cliente: "Juan Pérez", fecha: "2024-01-20", items: 2 },
  ]

  const [selectedProducto, setSelectedProducto] = useState<any>(null)
  const [cantidadProducto, setCantidadProducto] = useState(1)
  const [loteProducto, setLoteProducto] = useState("")

  const handleAddProduct = () => {
    if (!selectedProducto) return

    const newItem: ProductItem = {
      id: Date.now().toString(),
      producto: selectedProducto.nombre,
      cantidad: cantidadProducto,
      precio: selectedProducto.precio,
      stock: selectedProducto.stock,
      lote: loteProducto || undefined,
    }

    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    })

    setSelectedProducto(null)
    setCantidadProducto(1)
    setLoteProducto("")
  }

  const handleRemoveProduct = (id: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.id !== id)
    })
  }

  const handleSelectCliente = (clienteId: string) => {
    const cliente = clientesEjemplo.find(c => c.id === clienteId)
    if (cliente) {
      setFormData({
        ...formData,
        clienteId,
        clienteNombre: cliente.nombre,
        direccion: cliente.direccion,
      })
    }
  }

  const handleSelectPedido = (pedidoId: string) => {
    const pedido = pedidosEjemplo.find(p => p.id === pedidoId)
    if (pedido) {
      setFormData({
        ...formData,
        pedidoId,
        clienteNombre: pedido.cliente,
      })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log("Creando remito:", formData)
    
    setIsSubmitting(false)
    onSuccess?.()
    handleClose()
  }

  const handleClose = () => {
    setFormData({
      tipoRemito: "entrega_cliente",
      pedidoId: "",
      clienteId: "",
      clienteNombre: "",
      direccion: "",
      ciudad: "",
      contacto: "",
      telefono: "",
      fechaEntrega: "",
      empresaTransporte: "",
      costoTransporte: "",
      items: [],
      notasPreparacion: "",
      notasEntrega: "",
    })
    onClose()
  }

  const totalItems = formData.items.reduce((acc, item) => acc + item.cantidad, 0)
  const totalValor = formData.items.reduce((acc, item) => acc + (item.cantidad * item.precio), 0)

  const canSubmit = formData.clienteId && formData.direccion && formData.ciudad && 
                     formData.contacto && formData.empresaTransporte && formData.items.length > 0

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 -m-6 mb-6 rounded-t-lg border-b border-slate-700">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="p-2 bg-turquoise-600 rounded-lg">
              <PackageCheck className="h-6 w-6" />
            </div>
            <span>Crear Nuevo Remito</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Complete todos los datos para generar el remito de entrega
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* SECCIÓN 1 & 2: Información General y Entrega en 2 columnas */}
          <div className="grid grid-cols-2 gap-4">
            {/* Columna Izquierda: Info General */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-turquoise-600" />
                  Información General
                </h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="tipoRemito" className="text-xs text-slate-700 dark:text-slate-300">Tipo *</Label>
                      <Select 
                        value={formData.tipoRemito} 
                        onValueChange={(value) => setFormData({ ...formData, tipoRemito: value })}
                      >
                        <SelectTrigger className="h-9 bg-white dark:bg-slate-800 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrega_cliente">🚚 Entrega Cliente</SelectItem>
                          <SelectItem value="traslado_interno">📦 Traslado Interno</SelectItem>
                          <SelectItem value="devolucion">🔄 Devolución</SelectItem>
                          <SelectItem value="consignacion">🛒 Consignación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="pedidoId" className="text-xs text-slate-700 dark:text-slate-300">Pedido</Label>
                      <Select 
                        value={formData.pedidoId}
                        onValueChange={handleSelectPedido}
                      >
                        <SelectTrigger className="h-9 bg-white dark:bg-slate-800 text-sm">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                          {pedidosEjemplo.map(pedido => (
                            <SelectItem key={pedido.id} value={pedido.id}>
                              {pedido.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="clienteId" className="text-xs text-slate-700 dark:text-slate-300">Cliente *</Label>
                    <Select 
                      value={formData.clienteId}
                      onValueChange={handleSelectCliente}
                    >
                      <SelectTrigger className="h-9 bg-white dark:bg-slate-800 text-sm">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientesEjemplo.map(cliente => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.clienteNombre && (
                    <div className="bg-turquoise-50 dark:bg-turquoise-900/20 border border-turquoise-200 dark:border-turquoise-800 rounded p-2">
                      <div className="flex items-center gap-2 text-turquoise-700 dark:text-turquoise-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">{formData.clienteNombre}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="empresaTransporte" className="text-xs text-slate-700 dark:text-slate-300">Transporte *</Label>
                      <Select 
                        value={formData.empresaTransporte}
                        onValueChange={(value) => setFormData({ ...formData, empresaTransporte: value })}
                      >
                        <SelectTrigger className="h-9 bg-white dark:bg-slate-800 text-sm">
                          <SelectValue placeholder="Empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transporte_propio">🚚 Propio</SelectItem>
                          <SelectItem value="oca">OCA</SelectItem>
                          <SelectItem value="andreani">Andreani</SelectItem>
                          <SelectItem value="correo_argentino">Correo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="costoTransporte" className="text-xs text-slate-700 dark:text-slate-300">Costo</Label>
                      <Input
                        id="costoTransporte"
                        type="number"
                        placeholder="0.00"
                        value={formData.costoTransporte}
                        onChange={(e) => setFormData({ ...formData, costoTransporte: e.target.value })}
                        className="h-9 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Columna Derecha: Info de Entrega */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-turquoise-600" />
                  Información de Entrega
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="direccion" className="text-xs text-slate-700 dark:text-slate-300">Dirección *</Label>
                    <Input
                      id="direccion"
                      placeholder="Calle, número, piso..."
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="h-9 bg-white dark:bg-slate-800 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ciudad" className="text-xs text-slate-700 dark:text-slate-300">Ciudad *</Label>
                      <Input
                        id="ciudad"
                        placeholder="CABA"
                        value={formData.ciudad}
                        onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                        className="h-9 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fechaEntrega" className="text-xs text-slate-700 dark:text-slate-300">Fecha Entrega</Label>
                      <Input
                        id="fechaEntrega"
                        type="date"
                        value={formData.fechaEntrega}
                        onChange={(e) => setFormData({ ...formData, fechaEntrega: e.target.value })}
                        className="h-9 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="contacto" className="text-xs text-slate-700 dark:text-slate-300">Contacto *</Label>
                      <Input
                        id="contacto"
                        placeholder="Nombre"
                        value={formData.contacto}
                        onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                        className="h-9 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefono" className="text-xs text-slate-700 dark:text-slate-300">Teléfono</Label>
                      <Input
                        id="telefono"
                        placeholder="11-1234-5678"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="h-9 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="notasPreparacion" className="text-xs text-slate-700 dark:text-slate-300">Notas Prep.</Label>
                      <Textarea
                        id="notasPreparacion"
                        placeholder="Cuidado especial..."
                        rows={2}
                        value={formData.notasPreparacion}
                        onChange={(e) => setFormData({ ...formData, notasPreparacion: e.target.value })}
                        className="bg-white dark:bg-slate-800 text-sm resize-none"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notasEntrega" className="text-xs text-slate-700 dark:text-slate-300">Notas Entrega</Label>
                      <Textarea
                        id="notasEntrega"
                        placeholder="Horario, instrucciones..."
                        rows={2}
                        value={formData.notasEntrega}
                        onChange={(e) => setFormData({ ...formData, notasEntrega: e.target.value })}
                        className="bg-white dark:bg-slate-800 text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECCIÓN 3: Productos */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-turquoise-600" />
                Productos a Entregar
              </h3>

              {/* Agregar Producto - Compacto */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-3">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Label className="text-xs text-slate-700 dark:text-slate-300">Producto</Label>
                    <Select 
                      value={selectedProducto?.id || ""}
                      onValueChange={(value) => {
                        const producto = productosEjemplo.find(p => p.id === value)
                        setSelectedProducto(producto)
                      }}
                    >
                      <SelectTrigger className="h-9 bg-white dark:bg-slate-800 text-sm">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {productosEjemplo.map(producto => (
                          <SelectItem key={producto.id} value={producto.id}>
                            {producto.nombre} (${producto.precio})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs text-slate-700 dark:text-slate-300">Cant.</Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedProducto?.stock || 999}
                      value={cantidadProducto}
                      onChange={(e) => setCantidadProducto(Number(e.target.value))}
                      className="h-9 bg-white dark:bg-slate-800 text-sm"
                      disabled={!selectedProducto}
                    />
                  </div>

                  <div className="col-span-3">
                    <Label className="text-xs text-slate-700 dark:text-slate-300">Lote</Label>
                    <Input
                      placeholder="Opcional"
                      value={loteProducto}
                      onChange={(e) => setLoteProducto(e.target.value)}
                      className="h-9 bg-white dark:bg-slate-800 text-sm"
                      disabled={!selectedProducto}
                    />
                  </div>

                  <div className="col-span-2 flex items-end">
                    <Button 
                      onClick={handleAddProduct} 
                      className="w-full h-9"
                      disabled={!selectedProducto}
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lista de Productos - Compacta */}
              {formData.items.length > 0 ? (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                          <th className="text-left p-2 text-xs font-semibold">Producto</th>
                          <th className="text-center p-2 text-xs font-semibold w-20">Cant.</th>
                          <th className="text-center p-2 text-xs font-semibold w-24">Lote</th>
                          <th className="text-right p-2 text-xs font-semibold w-24">P.Unit.</th>
                          <th className="text-right p-2 text-xs font-semibold w-28">Total</th>
                          <th className="text-center p-2 text-xs font-semibold w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item) => (
                          <tr key={item.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-2">{item.producto}</td>
                            <td className="p-2 text-center">{item.cantidad}</td>
                            <td className="p-2 text-center text-xs">
                              {item.lote ? (
                                <Badge variant="outline" className="text-xs">{item.lote}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-2 text-right">${item.precio.toLocaleString()}</td>
                            <td className="p-2 text-right font-semibold">
                              ${(item.cantidad * item.precio).toLocaleString()}
                            </td>
                            <td className="p-2 text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveProduct(item.id)}
                                className="h-7 w-7 p-0"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumen Compacto */}
                  <div className="mt-3 bg-turquoise-50 dark:bg-turquoise-900/20 border border-turquoise-200 dark:border-turquoise-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Total Items</p>
                          <p className="text-lg font-bold text-turquoise-600">{totalItems}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Productos</p>
                          <p className="text-lg font-bold text-turquoise-600">{formData.items.length}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Valor Total</p>
                        <p className="text-2xl font-bold text-turquoise-600">${totalValor.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 text-center">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50 text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">No hay productos agregados</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">Agregue al menos un producto</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer - Compacto */}
        <div className="flex justify-between items-center pt-3 border-t">
          {!canSubmit && (
            <span className="flex items-center gap-1 text-xs text-orange-600">
              <AlertCircle className="h-3 w-3" />
              Complete campos obligatorios (*)
            </span>
          )}
          {canSubmit && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              Listo para crear
            </span>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting} size="sm">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit || isSubmitting}
              className="bg-turquoise-600 hover:bg-turquoise-700"
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 mr-2" />
                  Crear Remito
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
