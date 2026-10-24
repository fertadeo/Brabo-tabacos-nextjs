"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NewOrderModal } from "@/components/new-order-modal"
import { ClipboardList, Search, Plus, Clock, CheckCircle, AlertTriangle, Filter, Download, Eye, RefreshCw } from "lucide-react"
import { 
  getOrders, 
  getOrderStats, 
  type Order, 
  type OrderStats 
} from "@/lib/api"
import { toast } from "sonner"
import { OrderDetailModal } from "@/components/order-detail-modal"
import { Pagination } from "@/components/ui/pagination"

// Funciones auxiliares
const formatDate = (dateString: string) => {
  if (!dateString) return "-"
  try {
    return new Date(dateString).toLocaleDateString('es-AR')
  } catch {
    return dateString
  }
}

// Colores de WooCommerce para estados
const getStatusBadgeStyle = (status: string) => {
  const statusLower = status.toLowerCase()
  
  // Mapeo de estados locales a estados WooCommerce
  const statusMap: Record<string, { bgColor: string; textColor: string; borderColor?: string }> = {
    // Estados WooCommerce directos
    "pending": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7" },
    "processing": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "on-hold": { bgColor: "#f8dda7", textColor: "#94660c", borderColor: "#f0b849" },
    "completed": { bgColor: "#c8e6c9", textColor: "#155724", borderColor: "#46b450" },
    "cancelled": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#dc3232" },
    "refunded": { bgColor: "#e5e5e5", textColor: "#777", borderColor: "#999" },
    "failed": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#a00" },
    
    // Estados locales mapeados a WooCommerce
    "pendiente": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7" },
    "pendiente_preparacion": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7" },
    "en_proceso": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "aprobado": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "listo_despacho": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "pagado": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "completado": { bgColor: "#c8e6c9", textColor: "#155724", borderColor: "#46b450" },
    "cancelado": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#dc3232" },
    "atrasado": { bgColor: "#f8dda7", textColor: "#94660c", borderColor: "#f0b849" },
  }
  
  return statusMap[statusLower] || { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7" }
}

const getStatusBadgeVariant = (status: string) => {
  // Mantener compatibilidad con el sistema de variantes, pero usaremos estilos personalizados
  return "outline" as const
}

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    "pendiente_preparacion": "Pendiente Preparación",
    "listo_despacho": "Listo Despacho",
    "pagado": "Pagado",
    "aprobado": "Aprobado",
    "pendiente": "Pendiente",
    "en_proceso": "En Proceso",
    "completado": "Completado",
    "atrasado": "Atrasado",
    "cancelado": "Cancelado",
    "cancelled": "Cancelado"
  }
  return statusMap[status] || status
}

const getPriorityBadgeVariant = (priority?: string) => {
  switch (priority) {
    case "Crítica":
      return "destructive" as const
    case "Alta":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

const getSalesChannelLabel = (channel?: string) => {
  const channelMap: Record<string, string> = {
    "woocommerce": "WooCommerce",
    "local": "Venta en Local",
    "woocommerce_minorista": "WooCommerce", // Compatibilidad con datos antiguos
    "sistema_mf": "Venta en Local",
    "sistema_principal": "Venta en Local",
    "manual": "Venta en Local",
    "mercadolibre": "MercadoLibre",
    "otro": "Otro"
  }
  return channelMap[channel || ""] || "-"
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [allOrders, setAllOrders] = useState<Order[]>([]) // Almacenar todos los pedidos para calcular stats
  const [isLoading, setIsLoading] = useState(true)
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [])

  // Cargar pedidos cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1) // Resetear a página 1 cuando cambian los filtros
  }, [searchTerm, statusFilter])

  useEffect(() => {
    loadOrders()
  }, [searchTerm, statusFilter, currentPage])

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadOrders(),
        loadStats()
      ])
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setIsLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      const params: any = {
        page: currentPage,
        limit: 10
      }

      if (searchTerm) params.search = searchTerm
      if (statusFilter !== "all") params.status = statusFilter

      const response = await getOrders(params)
      
      // Verificar si hay datos reales de la BD
      const hasRealData = response.success && response.data.orders && response.data.orders.length > 0
      
      if (hasRealData) {
        // Usar datos reales de la BD
        setOrders(response.data.orders)
        // La respuesta puede tener pagination o solo total
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages)
          setTotalOrders(response.data.pagination.total)
        } else if (response.data.total) {
          // Calcular totalPages basado en total y limit
          const limit = params.limit || 10
          const total = response.data.total
          setTotalPages(Math.ceil(total / limit))
          setTotalOrders(total)
        } else {
          setTotalPages(1)
          setTotalOrders(response.data.orders.length)
        }
        // Guardar todos los pedidos para calcular estadísticas
        // Nota: Si la API devuelve paginación, solo tenemos los pedidos de la página actual
        // En ese caso, las estadísticas deben venir de la API
        setAllOrders(response.data.orders)
      } else {
        // Sin datos en la BD: mostrar lista vacía y estadísticas en cero
        setOrders([])
        setTotalPages(1)
        setTotalOrders(0)
        setAllOrders([])
        setStats(calculateStatsFromOrders([]))
      }
    } catch (error) {
      console.error("Error al cargar pedidos:", error)
      toast.error("Error al cargar los pedidos")
      setOrders([])
      setTotalPages(1)
      setTotalOrders(0)
      setAllOrders([])
      setStats(calculateStatsFromOrders([]))
    }
  }

  // Función para calcular estadísticas basándose en los pedidos
  const calculateStatsFromOrders = (ordersList: Order[]): OrderStats => {
    const total = ordersList.length
    
    // Estados que se consideran completados
    const completedStatuses = ['completado', 'completed']
    // Estados que se consideran pendientes
    const pendingStatuses = ['pendiente', 'pending', 'pendiente_preparacion', 'en_proceso', 'processing', 'aprobado', 'listo_despacho', 'pagado']
    // Estados que se consideran atrasados
    const delayedStatuses = ['atrasado', 'on-hold']
    
    const completed = ordersList.filter(order => {
      const status = (order.json?.status || order.status || '').toLowerCase()
      return completedStatuses.includes(status)
    }).length
    
    const pending = ordersList.filter(order => {
      const status = (order.json?.status || order.status || '').toLowerCase()
      return pendingStatuses.includes(status) && !completedStatuses.includes(status)
    }).length
    
    const delayed = ordersList.filter(order => {
      const status = (order.json?.status || order.status || '').toLowerCase()
      return delayedStatuses.includes(status)
    }).length
    
    // Calcular total y promedio de montos
    const totalAmount = ordersList.reduce((sum, order) => {
      const amount = typeof order.total_amount === 'string' 
        ? parseFloat(order.total_amount) 
        : order.total_amount
      return sum + (amount || 0)
    }, 0)
    
    const averageAmount = total > 0 ? totalAmount / total : 0
    
    return {
      total_orders: total,
      pending_orders: pending,
      completed_orders: completed,
      delayed_orders: delayed,
      total_amount: totalAmount,
      average_amount: averageAmount
    }
  }

  const loadStats = async () => {
    try {
      const response = await getOrderStats()
      
      // Verificar si hay datos reales de la BD
      const hasRealData = response.success && response.data && response.data.total_orders > 0
      
      if (hasRealData) {
        setStats(response.data)
      } else {
        setStats(calculateStatsFromOrders(allOrders))
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
      setStats(calculateStatsFromOrders(allOrders))
    }
  }


  return (
    <Protected requiredRoles={['gerencia', 'ventas', 'admin']}>
      <ERPLayout activeItem="pedidos">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
            <p className="text-muted-foreground">Administra y rastrea todos los pedidos de clientes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setIsNewOrderOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pedido
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stats?.total_orders.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {isLoading ? "..." : stats?.pending_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <CheckCircle className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">
                {isLoading ? "..." : stats?.completed_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats && stats.total_orders > 0 
                  ? `${Math.round((stats.completed_orders / stats.total_orders) * 100)}% del total`
                  : "0% del total"
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {isLoading ? "..." : stats?.delayed_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground">Acción requerida</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
            <CardDescription>Todos los pedidos ordenados por fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar pedidos..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente_preparacion">Pendiente Preparación</SelectItem>
                  <SelectItem value="listo_despacho">Listo Despacho</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="en_proceso">En Proceso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-turquoise-600 mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Cargando pedidos...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No se encontraron pedidos</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Canal de Venta</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow 
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedOrder(order)
                          setIsDetailModalOpen(true)
                        }}
                      >
                        <TableCell className="font-medium">
                          {order.order_number || `PED${order.id.toString().padStart(3, '0')}`}
                        </TableCell>
                        <TableCell>{order.client_name || `Cliente #${order.client_id}`}</TableCell>
                        <TableCell>{formatDate(order.order_date)}</TableCell>
                        <TableCell>
                          {(() => {
                            const style = getStatusBadgeStyle(order.status)
                            return (
                              <Badge 
                                variant="outline"
                                className="font-medium border-2"
                                style={{
                                  backgroundColor: style.bgColor,
                                  color: style.textColor,
                                  borderColor: style.borderColor || style.bgColor,
                                }}
                              >
                                {getStatusLabel(order.status)}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getSalesChannelLabel(order.canal_venta || order.sales_channel)}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.items_count || 0}</TableCell>
                        <TableCell>
                          ${typeof order.total_amount === 'string' 
                            ? parseFloat(order.total_amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })
                            : order.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })
                          }
                        </TableCell>
                        <TableCell>{formatDate(order.delivery_date || "")}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(order.priority)}>
                            {order.priority || "Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order)
                              setIsDetailModalOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Información de resultados y paginación */}
                <div className="mt-4 space-y-3">
                  {/* Información de resultados */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <p>
                      Mostrando {orders.length > 0 ? (currentPage - 1) * 10 + 1 : 0} - {Math.min(currentPage * 10, totalOrders)} de {totalOrders} pedidos
                    </p>
                  </div>
                  
                  {/* Componente de paginación */}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={(page) => setCurrentPage(page)}
                      isLoading={isLoading}
                    />
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Modal de Nuevo Pedido */}
        <NewOrderModal
          isOpen={isNewOrderOpen}
          onClose={() => setIsNewOrderOpen(false)}
          onSuccess={() => {
            setIsNewOrderOpen(false)
            loadData()
            toast.success("Pedido creado exitosamente")
          }}
        />

        {/* Modal de Detalles del Pedido */}
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedOrder(null)
          }}
          onStatusUpdate={() => {
            loadData() // Recargar datos cuando se actualice el estado
          }}
        />
      </ERPLayout>
    </Protected>
  )
}
