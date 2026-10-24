"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Order, updateOrder } from "@/lib/api"
import { toast } from "sonner"

interface OrderDetailModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onStatusUpdate?: () => void // Callback para refrescar la lista después de actualizar
}

export function OrderDetailModal({ order, isOpen, onClose, onStatusUpdate }: OrderDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<Order | null>(order)
  const [selectedStatus, setSelectedStatus] = useState<string>("")

  // Mapear estado actual a valor de WooCommerce
  const getCurrentWooCommerceStatus = () => {
    if (!currentOrder) return "pending"
    const jsonData = currentOrder.json || {}
    const currentStatus = (jsonData.status || currentOrder.status || '').toLowerCase()
    
    const statusMap: Record<string, string> = {
      "pending": "pending",
      "pendiente": "pending",
      "pendiente_preparacion": "pending",
      "processing": "processing",
      "en_proceso": "processing",
      "aprobado": "processing",
      "listo_despacho": "processing",
      "pagado": "processing",
      "on-hold": "on-hold",
      "atrasado": "on-hold",
      "completed": "completed",
      "completado": "completed",
      "cancelled": "cancelled",
      "cancelado": "cancelled",
      "refunded": "refunded",
      "reembolsado": "refunded",
      "failed": "failed",
      "fallido": "failed",
      "draft": "draft",
      "borrador": "draft",
    }
    return statusMap[currentStatus] || "pending"
  }

  // Actualizar el pedido cuando cambie el prop
  React.useEffect(() => {
    setCurrentOrder(order)
    if (order) {
      const jsonData = order.json || {}
      const currentStatus = (jsonData.status || order.status || '').toLowerCase()
      
      const statusMap: Record<string, string> = {
        "pending": "pending",
        "pendiente": "pending",
        "pendiente_preparacion": "pending",
        "processing": "processing",
        "en_proceso": "processing",
        "aprobado": "processing",
        "listo_despacho": "processing",
        "pagado": "processing",
        "on-hold": "on-hold",
        "atrasado": "on-hold",
        "completed": "completed",
        "completado": "completed",
        "cancelled": "cancelled",
        "cancelado": "cancelled",
        "refunded": "refunded",
        "reembolsado": "refunded",
        "failed": "failed",
        "fallido": "failed",
        "draft": "draft",
        "borrador": "draft",
      }
      const wooCommerceStatus = statusMap[currentStatus] || "pending"
      setSelectedStatus(wooCommerceStatus)
    }
  }, [order])

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  if (!currentOrder) return null

  const jsonData = currentOrder.json || {}
  const billing = jsonData.billing || {}
  const shipping = jsonData.shipping || {}
  const lineItems = jsonData.line_items || []
  const shippingLines = jsonData.shipping_lines || []

  // Estados de WooCommerce con sus mapeos
  const woocommerceStatuses = [
    { label: "Pendiente de pago", value: "pending", wcValue: "pending" },
    { label: "Procesando", value: "processing", wcValue: "processing" },
    { label: "En espera", value: "on-hold", wcValue: "on-hold" },
    { label: "Completado", value: "completed", wcValue: "completed" },
    { label: "Cancelado", value: "cancelled", wcValue: "cancelled" },
    { label: "Reembolsado", value: "refunded", wcValue: "refunded" },
    { label: "Fallido", value: "failed", wcValue: "failed" },
    { label: "Borrador", value: "draft", wcValue: "draft" },
  ]


  const handleApplyStatusChange = async () => {
    const currentWooCommerceStatus = getCurrentWooCommerceStatus()
    if (isUpdating || !selectedStatus || selectedStatus === currentWooCommerceStatus) return
    
    setIsUpdating(true)
    try {
      // Mapear el valor de WooCommerce al estado del sistema
      const statusMap: Record<string, string> = {
        "pending": "pendiente",
        "processing": "en_proceso",
        "on-hold": "atrasado",
        "completed": "completado",
        "cancelled": "cancelado",
        "refunded": "cancelado", // Reembolsado se mapea a cancelado
        "failed": "cancelado", // Fallido se mapea a cancelado
        "draft": "pendiente", // Borrador se mapea a pendiente
      }
      
      const systemStatus = statusMap[selectedStatus] || "pendiente"
      
      // Actualizar el pedido
      const response = await updateOrder(currentOrder.id, {
        status: systemStatus as any,
      })

      if (response.success) {
        // Actualizar el estado local
        const updatedOrder = { ...currentOrder, status: systemStatus as any }
        if (updatedOrder.json) {
          updatedOrder.json.status = selectedStatus
        } else {
          updatedOrder.json = { status: selectedStatus }
        }
        setCurrentOrder(updatedOrder)
        
        toast.success(`Estado del pedido actualizado a "${woocommerceStatuses.find(s => s.value === selectedStatus)?.label}"`)
        
        // Llamar al callback para refrescar la lista
        if (onStatusUpdate) {
          onStatusUpdate()
        }
      } else {
        throw new Error(response.message || "Error al actualizar el estado")
      }
    } catch (error) {
      console.error("Error al actualizar estado:", error)
      toast.error("Error al actualizar el estado del pedido")
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-"
    try {
      return new Date(dateString).toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: jsonData.currency || 'ARS',
      minimumFractionDigits: 2
    }).format(numAmount)
  }

  // Colores de WooCommerce para estados (igual que en la tabla)
  const getStatusBadgeStyle = (status: string) => {
    const statusLower = status.toLowerCase()
    const statusMap: Record<string, { bgColor: string; textColor: string; borderColor?: string; label: string }> = {
      "pending": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7", label: "Pendiente" },
      "processing": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "Procesando" },
      "on-hold": { bgColor: "#f8dda7", textColor: "#94660c", borderColor: "#f0b849", label: "En Espera" },
      "completed": { bgColor: "#c8e6c9", textColor: "#155724", borderColor: "#46b450", label: "Completado" },
      "cancelled": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#dc3232", label: "Cancelado" },
      "refunded": { bgColor: "#e5e5e5", textColor: "#777", borderColor: "#999", label: "Reembolsado" },
      "failed": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#a00", label: "Fallido" },
      "pendiente": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7", label: "Pendiente" },
      "pendiente_preparacion": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7", label: "Pendiente Preparación" },
      "en_proceso": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "En Proceso" },
      "aprobado": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "Aprobado" },
      "listo_despacho": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "Listo Despacho" },
      "pagado": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "Pagado" },
      "completado": { bgColor: "#c8e6c9", textColor: "#155724", borderColor: "#46b450", label: "Completado" },
      "cancelado": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#dc3232", label: "Cancelado" },
      "atrasado": { bgColor: "#f8dda7", textColor: "#94660c", borderColor: "#f0b849", label: "Atrasado" },
    }
    return statusMap[statusLower] || { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7", label: status }
  }

  // Verificar si las direcciones son iguales
  const addressesMatch = billing.address_1 && shipping.address_1 && 
    billing.address_1 === shipping.address_1 &&
    billing.city === shipping.city

  const statusInfo = getStatusBadgeStyle(jsonData.status || currentOrder.status)
  const clientName = billing.first_name && billing.last_name 
    ? `${billing.first_name} ${billing.last_name}`
    : currentOrder.client_name || `Cliente #${currentOrder.client_id}`
  const clientEmail = billing.email || currentOrder.client_email
  const clientPhone = billing.phone || currentOrder.delivery_phone || shipping.phone
  const currentWooCommerceStatus = getCurrentWooCommerceStatus()

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header estilo WooCommerce */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Pedido {currentOrder.order_number || `#${currentOrder.id}`}
            </DialogTitle>
            <Badge 
              variant="outline"
              className="font-medium border-2"
              style={{
                backgroundColor: statusInfo.bgColor,
                color: statusInfo.textColor,
                borderColor: statusInfo.borderColor || statusInfo.bgColor,
              }}
            >
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* Detalles de Facturación y Envío - Dos columnas como WooCommerce */}
          {(billing.address_1 || shipping.address_1) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Columna Facturación */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Detalles de facturación</h3>
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium">{clientName}</p>
                  {billing.address_1 && (
                    <>
                      <p className="text-muted-foreground">{billing.address_1}</p>
                      {billing.address_2 && <p className="text-muted-foreground">{billing.address_2}</p>}
                      <p className="text-muted-foreground">
                        {[billing.city, billing.state, billing.postcode].filter(Boolean).join(", ")}
                      </p>
                      {billing.country && <p className="text-muted-foreground">{billing.country}</p>}
                    </>
                  )}
                  {clientEmail && (
                    <p className="mt-2">
                      <a 
                        href={`mailto:${clientEmail}`} 
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {clientEmail}
                      </a>
                    </p>
                  )}
                  {clientPhone && (
                    <p>
                      <a 
                        href={`tel:${clientPhone.replace(/\s/g, '')}`} 
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {clientPhone}
                      </a>
                    </p>
                  )}
                  <p className="mt-3 text-muted-foreground">
                    <span className="font-medium">Método de pago:</span>{" "}
                    {jsonData.payment_method_title || jsonData.payment_method || currentOrder.payment_method_title || "-"}
                  </p>
                  {jsonData.transaction_id && (
                    <p className="text-xs text-muted-foreground">
                      ID Transacción: {jsonData.transaction_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Columna Envío */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Detalles de envío</h3>
                <div className="space-y-1.5 text-sm">
                  {shipping.address_1 ? (
                    <>
                      <p className="font-medium">
                        {shipping.first_name && shipping.last_name 
                          ? `${shipping.first_name} ${shipping.last_name}`
                          : clientName
                        }
                      </p>
                      <p className="text-muted-foreground">{shipping.address_1}</p>
                      {shipping.address_2 && <p className="text-muted-foreground">{shipping.address_2}</p>}
                      <p className="text-muted-foreground">
                        {[shipping.city, shipping.state, shipping.postcode].filter(Boolean).join(", ")}
                      </p>
                      {shipping.country && <p className="text-muted-foreground">{shipping.country}</p>}
                      {shipping.phone && (
                        <p className="mt-2">
                          <a 
                            href={`tel:${shipping.phone.replace(/\s/g, '')}`} 
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shipping.phone}
                          </a>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{clientName}</p>
                      {billing.address_1 && (
                        <>
                          <p className="text-muted-foreground">{billing.address_1}</p>
                          {billing.address_2 && <p className="text-muted-foreground">{billing.address_2}</p>}
                          <p className="text-muted-foreground">
                            {[billing.city, billing.state, billing.postcode].filter(Boolean).join(", ")}
                          </p>
                        </>
                      )}
                    </>
                  )}
                  <p className="mt-3 text-muted-foreground">
                    <span className="font-medium">Método de envío:</span>{" "}
                    {shippingLines.length > 0 
                      ? shippingLines.map((s: any) => s.method_title || currentOrder.transport_company || "-").join(", ")
                      : currentOrder.transport_company || "-"
                    }
                    {(jsonData.shipping_total && parseFloat(jsonData.shipping_total) > 0) && (
                      <span className="ml-1">({formatCurrency(jsonData.shipping_total)})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Productos - Estilo WooCommerce */}
          {lineItems.length > 0 && (
            <div className="mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Producto</TableHead>
                    <TableHead className="text-right w-[12%]">Cantidad</TableHead>
                    <TableHead className="text-right w-[16%]">Impuesto</TableHead>
                    <TableHead className="text-right w-[16%]">Precio</TableHead>
                    <TableHead className="text-right w-[16%]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item: any, index: number) => (
                    <TableRow key={item.id || index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.sku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.tax_total ? formatCurrency(item.tax_total) : formatCurrency(0)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Resumen Financiero - Al final como WooCommerce */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-sm">
                {jsonData.shipping_total && parseFloat(jsonData.shipping_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío:</span>
                    <span>{formatCurrency(jsonData.shipping_total)}</span>
                  </div>
                )}
                {jsonData.tax_total && parseFloat(jsonData.tax_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impuestos:</span>
                    <span>{formatCurrency(jsonData.tax_total)}</span>
                  </div>
                )}
                {jsonData.discount_total && parseFloat(jsonData.discount_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="text-green-600">-{formatCurrency(jsonData.discount_total)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(jsonData.total || currentOrder.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Selector de estado - Estilo WooCommerce */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Cambiar estado</label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {woocommerceStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-6">
                <Button
                  onClick={handleApplyStatusChange}
                  disabled={isUpdating || !selectedStatus || selectedStatus === getCurrentWooCommerceStatus()}
                  className="font-medium"
                >
                  {isUpdating ? "Aplicando..." : "Aplicar cambios"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
