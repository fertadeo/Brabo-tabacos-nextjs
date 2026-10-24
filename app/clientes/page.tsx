"use client"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClienteDetailModal } from "@/components/cliente-detail-modal"
import { Users, Search, Plus, Mail, Phone, Filter, Download, UserPlus, AlertCircle, CreditCard, Calendar, Edit, User, Activity, Trash2 } from "lucide-react"
import { ClienteUbicacion } from "@/components/cliente-ubicacion"
import { useState, useEffect } from "react"
import { getClientes, getClienteStats, deleteCliente, type Cliente } from "@/lib/api"
import { mapClienteApiToUi, type ClienteUI } from "@/lib/cliente-ui-map"
import { toast } from "sonner"
import { NewClientModal } from "@/components/new-client-modal"
import { Pagination } from "@/components/ui/pagination"
import { getSalesChannelConfig } from "@/lib/utils"
import { ClienteActivityModal } from "@/components/cliente-activity-modal"  
import { CuentaCorrienteStatusBadge } from "@/components/cuenta-corriente-status-badge"
import { EditClientModal } from "@/components/edit-client-modal"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"


export default function ClientesPage() {
  const [selectedCliente, setSelectedCliente] = useState<ClienteUI | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [selectedClienteForActivity, setSelectedClienteForActivity] = useState<ClienteUI | null>(null)
  const [clienteToEdit, setClienteToEdit] = useState<ClienteUI | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [channelFilter, setChannelFilter] = useState<"all" | "sistema_principal" | "woocommerce_mayorista" | "woocommerce_minorista" | "mercadolibre" | "manual">("all")
  const [clienteToDelete, setClienteToDelete] = useState<ClienteUI | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Función para cargar clientes reales desde la API
  const loadData = async (page: number = 1, search: string = "", status: string = "all", channel: string = "all") => {
    console.log('🚀 [COMPONENT] Cargando clientes desde API para página:', page);
    
    try {
      setLoading(true)
      setError(null)
      
      const statusParam = status === "all" ? undefined : (status as "active" | "inactive")
      const clientsResponse = await getClientes(page, 10, search, statusParam)
      const statsResponse = await getClienteStats()

      const channelFilteredClients = channel === "all"
        ? clientsResponse.clients
        : clientsResponse.clients.filter((cliente: any) => cliente.sales_channel === channel)

      console.log('✅ [COMPONENT] Clientes recibidos desde API:', channelFilteredClients)
      setClientes(channelFilteredClients)
      setPagination(clientsResponse.pagination)

      console.log('✅ [COMPONENT] Estadísticas recibidas desde API:', statsResponse)
      setStats(statsResponse)

      console.log('🎉 [COMPONENT] Datos API cargados exitosamente')
    } catch (err) {
      console.error('💥 [COMPONENT] Error al cargar datos de clientes:', err)
      setError('Error al cargar los datos')
      setClientes([])
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 })
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos al montar el componente y cuando cambien los filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(currentPage, searchTerm, statusFilter, channelFilter)
    }, searchTerm ? 500 : 0) // Debounce para búsqueda
    
    return () => clearTimeout(timer)
  }, [currentPage, searchTerm, statusFilter, channelFilter])

  const handleVerPerfil = (cliente: ClienteUI) => {
    setSelectedCliente(cliente)
    setIsModalOpen(true)
  }

  const handleVerActividad = (cliente: ClienteUI) => {
    setSelectedClienteForActivity(cliente)
    setIsActivityModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedCliente(null)
  }

  const handleCloseActivityModal = () => {
    setIsActivityModalOpen(false)
    setSelectedClienteForActivity(null)
  }

  const handleNewClientSuccess = () => {
    console.log('🔄 [COMPONENT] Recargando datos después de crear nuevo cliente')
    // Recargar los datos de la página actual
    loadData(currentPage)
  }

  const handlePageChange = (page: number) => {
    console.log('📄 [COMPONENT] Cambiando a página:', page)
    setCurrentPage(page)
  }

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return
    setDeleting(true)
    try {
      const res = await deleteCliente(clienteToDelete.dbId)
      const msg = res?.message ?? (res?.data?.message ?? "Cliente eliminado o inactivado correctamente.")
      toast.success(msg)
      setClienteToDelete(null)
      loadData(currentPage, searchTerm, statusFilter, channelFilter)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al eliminar el cliente."
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  // Función helper para mapear estadísticas de la API al formato esperado por la UI
  const mapStatsForUI = (apiStats: any) => {
    if (!apiStats) return null;
    
    return {
      totalClientes: apiStats.total_clients || 0,
      clientesActivos: parseInt(apiStats.active_clients) || 0,
      clientesInactivos: parseInt(apiStats.inactive_clients) || 0,
      ciudadesCount: apiStats.cities_count || 0,
      paisesCount: apiStats.countries_count || 0,
      // Valores calculados para la UI
      porcentajeActivos: apiStats.total_clients > 0 ? 
        Math.round((parseInt(apiStats.active_clients) / apiStats.total_clients) * 100) : 0,
      // Creados último mes (desde API si existe)
      nuevosEsteMes: apiStats.created_last_month ?? 0,
      valorPromedio: 0, // La API no proporciona este dato
      crecimientoPorcentaje: 0, // La API no proporciona este dato
      crecimientoNuevos: 0 // La API no proporciona este dato
    };
  };

  // Función helper para mapear clientes hardcodeados al formato esperado por la UI
  const comprasPorCliente: Record<number, number> = {
    1: 450000,
    2: 850000,
    3: 320000,
    4: 0,
    5: 680000,
  }

  const mapClienteForUI = (apiCliente: Cliente): ClienteUI => ({
    ...mapClienteApiToUi(apiCliente),
    totalCompras: comprasPorCliente[apiCliente.id] || 0,
  })

  const refreshAfterClienteUpdate = async (updated?: Cliente) => {
    await loadData(currentPage, searchTerm, statusFilter, channelFilter)
    if (updated && selectedCliente?.dbId === updated.id) {
      setSelectedCliente(mapClienteForUI(updated))
    }
  }

  // Mapear clientes a formato UI (sin filtro local, el filtro se hace en el backend)
  const clientesUI = Array.isArray(clientes) ? clientes.map(mapClienteForUI) : []

  // Mapear estadísticas para la UI
  const uiStats = mapStatsForUI(stats);

  return (
    <Protected requiredRoles={['gerencia', 'ventas', 'admin']}>
      <ERPLayout activeItem="clientes">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-muted-foreground">Administra tu base de clientes y relaciones comerciales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setIsNewClientModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : (uiStats?.totalClientes || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? "Cargando..." : `${uiStats?.ciudadesCount || 0} ciudades registradas`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <UserPlus className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">
                {loading ? "..." : (uiStats?.clientesActivos || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? "Cargando..." : `${uiStats?.porcentajeActivos || 0}% del total`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Inactivos</CardTitle>
              <Plus className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading ? "..." : (uiStats?.clientesInactivos || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? "Cargando..." : `Clientes inactivos`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Creados último mes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : (uiStats?.nuevosEsteMes ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Clientes creados en el último mes</p>
            </CardContent>
          </Card>

        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Base de Clientes</CardTitle>
            <CardDescription>
              {loading ? "Cargando..." : `Mostrando ${clientes.length} de ${pagination.total} clientes registrados`}
              <br />
              <span className="text-xs text-muted-foreground">
                💡 Haga clic en cualquier fila para ver la actividad completa del cliente
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4 flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nombre, email o código..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={channelFilter} onValueChange={(value: any) => setChannelFilter(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Canal de Venta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Canales</SelectItem>
                  <SelectItem value="sistema_principal">Sistema Principal</SelectItem>
                  <SelectItem value="woocommerce_mayorista">WooCommerce Mayorista</SelectItem>
                  <SelectItem value="woocommerce_minorista">WooCommerce Minorista</SelectItem>
                  <SelectItem value="mercadolibre">MercadoLibre</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700">{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="ml-auto"
                >
                  Reintentar
                </Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead>Cuenta Corriente</TableHead>
                  <TableHead>Saldo / Límite</TableHead>
<TableHead className="sticky right-0 z-10 w-[160px] min-w-[160px] text-right bg-muted/50 dark:bg-muted/30 border-l border-border shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.3)]">
                    Acciones
                </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Estado de carga
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        Cargando clientes...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : clientesUI.length === 0 ? (
                  // Sin resultados
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {searchTerm || statusFilter !== "all" || channelFilter !== "all" ? "No se encontraron clientes que coincidan con los filtros" : "No hay clientes registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  // Datos de clientes
                  clientesUI.map((cliente) => (
                  <TableRow 
                    key={cliente.id} 
                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleVerActividad(cliente)}
                  >
                    <TableCell>
                      <Badge variant={cliente.tipo === "Mayorista" ? "default" : cliente.tipo === "Personalizado" ? "outline" : "secondary"}>
                        {cliente.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{cliente.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cliente.nombre}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {cliente.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {cliente.telefono}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ClienteUbicacion
                        address={cliente.direccion}
                        city={cliente.ciudad}
                        variant="table"
                        emptyLabel="Sin ubicación"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${getSalesChannelConfig(cliente.salesChannel).color} border`}
                        title={getSalesChannelConfig(cliente.salesChannel).description}
                      >
                        <span className="mr-1">{getSalesChannelConfig(cliente.salesChannel).icon}</span>
                        {getSalesChannelConfig(cliente.salesChannel).shortLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cliente.estado === "Activo" ? "default" : "secondary"}>{cliente.estado}</Badge>
                    </TableCell>
                    <TableCell>{cliente.ultimaCompra}</TableCell>
                    <TableCell>
                      <CuentaCorrienteStatusBadge 
                        hasAccount={cliente.ccEnabled ?? false}
                        balance={cliente.ccBalance ?? 0}
                        creditLimit={cliente.ccLimit ?? 0}
                        isActive={cliente.ccEnabled ?? false}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      {cliente.ccEnabled && cliente.ccLimit !== undefined ? (
                        <div className="text-sm font-semibold">
                          ${Math.abs(cliente.ccBalance ?? 0).toLocaleString()} {cliente.ccBalance && cliente.ccBalance < 0 ? "(deuda)" : ""}
                          <span className="text-muted-foreground"> / ${cliente.ccLimit.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin CC</span>
                      )}
                    </TableCell>
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="sticky right-0 z-10 w-[160px] min-w-[160px] text-right bg-card group-hover:bg-muted/50 border-l border-border shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.3)] transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title="Editar cliente"
                          onClick={(e) => {
                            e.stopPropagation()
                            setClienteToEdit(cliente)
                            setIsEditModalOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Ver perfil"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVerPerfil(cliente)
                          }}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Ver actividad"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVerActividad(cliente)
                          }}
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Eliminar / inactivar cliente"
                          onClick={(e) => {
                            e.stopPropagation()
                            setClienteToDelete(cliente)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Paginación */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              isLoading={loading}
            />
          </div>
        )}

        {/* Modal de detalles del cliente */}
        <ClienteDetailModal
          cliente={selectedCliente as unknown as any}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onClientUpdated={(updated) => void refreshAfterClienteUpdate(updated)}
        />

        {/* Modal para nuevo cliente */}
        <NewClientModal
          isOpen={isNewClientModalOpen}
          onClose={() => setIsNewClientModalOpen(false)}
          onSuccess={handleNewClientSuccess}
        />

        {/* Modal de actividad del cliente */}
        {selectedClienteForActivity && (
          <ClienteActivityModal
            cliente={selectedClienteForActivity}
            isOpen={isActivityModalOpen}
            onClose={handleCloseActivityModal}
          />
        )}

        {/* Modal de edición de cliente (desde tabla) */}
        <EditClientModal
          cliente={clienteToEdit}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setClienteToEdit(null)
          }}
          onSuccess={(updated) => {
            void refreshAfterClienteUpdate(updated)
            setIsEditModalOpen(false)
            setClienteToEdit(null)
          }}
        />

        {/* Modal de confirmación para eliminar / inactivar cliente */}
        <Dialog open={!!clienteToDelete} onOpenChange={(open) => !open && setClienteToDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Eliminar cliente
              </DialogTitle>
              <DialogDescription>
                {clienteToDelete && (
                  <>
                    ¿Eliminar a <strong>{clienteToDelete.nombre}</strong>?
                    <br />
                    <span className="mt-2 block text-sm">
                      El cliente se <strong>inactivará</strong> (no se borra de la base de datos). Si no tiene pedidos asociados, se eliminará definitivamente.
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setClienteToDelete(null)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </ERPLayout>
    </Protected>
  )
}
