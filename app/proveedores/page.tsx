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
import { Building2, Search, Plus, RefreshCw, Eye, Edit, Trash2, Users, MapPin, Phone, Mail } from "lucide-react"
import { SupplierModal } from "@/components/supplier-modal"
import { SupplierDetailModal } from "@/components/supplier-detail-modal"
import { 
  getSuppliers, 
  getSupplierStats, 
  deleteSupplier,
  type Supplier, 
  type SupplierStats 
} from "@/lib/api"
import { toast } from "sonner"

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [supplierTypeFilter, setSupplierTypeFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [])

  // Cargar proveedores cuando cambien los filtros
  useEffect(() => {
    loadSuppliers()
  }, [searchTerm, statusFilter, supplierTypeFilter, currentPage])

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadSuppliers(),
        loadStats()
      ])
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setIsLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const params: any = {}

      if (searchTerm) params.search = searchTerm
      if (statusFilter !== "all") params.is_active = statusFilter === "active"
      if (supplierTypeFilter !== "all") {
        params.supplier_type = supplierTypeFilter as 'productivo' | 'no_productivo' | 'otro_pasivo'
      }

      console.log('🔍 [PROVEEDORES] Filtros aplicados:', params);

      const response = await getSuppliers(Object.keys(params).length > 0 ? params : undefined)
      if (response.success) {
        setSuppliers(response.data.suppliers)
        // Manejar paginación si existe, sino usar total directo
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages)
        } else {
          // Sin paginación, calcular totalPages basado en total
          const total = response.data.total || response.data.suppliers.length
          setTotalPages(Math.max(1, Math.ceil(total / 10)))
        }
      }
    } catch (error) {
      console.error("Error al cargar proveedores:", error)
      toast.error("Error al cargar los proveedores")
    }
  }

  const loadStats = async () => {
    try {
      const response = await getSupplierStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    }
  }

  const handleRefresh = () => {
    loadData()
  }

  const handleModalSuccess = () => {
    loadData()
  }

  const handleCreateSupplier = () => {
    setModalMode('create')
    setSelectedSupplierId(null)
    setIsModalOpen(true)
  }

  const handleViewSupplier = (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId)
    if (supplier) {
      setSelectedSupplier(supplier)
      setIsDetailModalOpen(true)
    }
  }

  const handleEditSupplier = (supplierId: number) => {
    setModalMode('edit')
    setSelectedSupplierId(supplierId)
    setIsModalOpen(true)
  }

  const handleDeleteSupplier = async (supplierId: number, supplierName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el proveedor "${supplierName}"?`)) {
      return
    }

    try {
      const response = await deleteSupplier(supplierId)
      if (response.success) {
        toast.success("Proveedor eliminado exitosamente")
        loadData()
      } else {
        toast.error("Error al eliminar el proveedor")
      }
    } catch (error) {
      console.error("Error al eliminar proveedor:", error)
      toast.error("Error al eliminar el proveedor")
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "secondary"}>
        {isActive ? "Activo" : "Inactivo"}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR')
  }

  return (
    <Protected requiredRoles={['gerencia', 'finanzas', 'admin']}>
      <ERPLayout activeItem="proveedores">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestión de Proveedores</h1>
              <p className="text-muted-foreground">Administra la información de proveedores</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button onClick={handleCreateSupplier}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_suppliers || 0}
                </div>
                <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.active_suppliers || 0}
                </div>
                <p className="text-xs text-muted-foreground">Disponibles para compras</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Proveedores Inactivos</CardTitle>
                <Building2 className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.inactive_suppliers || 0}
                </div>
                <p className="text-xs text-muted-foreground">Desactivados</p>
              </CardContent>
            </Card>
          </div>

          {/* Proveedores Table */}
          <Card>
            <CardHeader>
              <CardTitle>Proveedores</CardTitle>
              <CardDescription>Lista de todos los proveedores registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-4 md:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar proveedores..." 
                      className="pl-8" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={supplierTypeFilter} onValueChange={setSupplierTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="productivo">Productivo</SelectItem>
                      <SelectItem value="no_productivo">No Productivo</SelectItem>
                      <SelectItem value="otro_pasivo">Otro Pasivo</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Cargando proveedores...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Razón Social</TableHead>
                      <TableHead>Nombre de Fantasía</TableHead>
                      <TableHead>Frecuencia de Compra</TableHead>
                      <TableHead>Tipo de Identificación</TableHead>
                      <TableHead>CUIT</TableHead>
                      <TableHead>Ingresos Brutos</TableHead>
                      <TableHead>Condición IVA</TableHead>
                      <TableHead>Descripción de Cuenta</TableHead>
                      <TableHead>Producto/Servicio</TableHead>
                      <TableHead>Cuenta Resumen Integral</TableHead>
                      <TableHead>Costo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                          No se encontraron proveedores
                        </TableCell>
                      </TableRow>
                    ) : (
                      suppliers.map((supplier) => {
                        // Manejar valores null/undefined correctamente
                        const legalName = supplier.legal_name ?? null;
                        const tradeName = supplier.trade_name ?? null;
                        const purchaseFreq = supplier.purchase_frequency ?? null;
                        const idType = supplier.id_type ?? null;
                        const taxId = supplier.tax_id ?? null;
                        const grossIncome = supplier.gross_income ?? null;
                        const vatCondition = supplier.vat_condition ?? null;
                        const accountDesc = supplier.account_description ?? null;
                        const productService = supplier.product_service ?? null;
                        const integralAccount = supplier.integral_summary_account ?? null;
                        const cost = supplier.cost ?? null;
                        const supplierType = supplier.supplier_type ?? null;

                        // Función para obtener el badge del tipo de proveedor
                        const getSupplierTypeBadge = () => {
                          if (!supplierType) {
                            return <Badge variant="outline" className="bg-gray-100 text-gray-600">Sin tipo</Badge>;
                          }
                          switch (supplierType) {
                            case 'productivo':
                              return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">Productivo</Badge>;
                            case 'no_productivo':
                              return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">No Productivo</Badge>;
                            case 'otro_pasivo':
                              return <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-white">Otro Pasivo</Badge>;
                            default:
                              return <Badge variant="outline">{supplierType}</Badge>;
                          }
                        };

                        return (
                        <TableRow 
                          key={supplier.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleViewSupplier(supplier.id)}
                        >
                          <TableCell>
                            {getSupplierTypeBadge()}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Badge variant="outline">{supplier.id}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {legalName || supplier.name || '-'}
                          </TableCell>
                          <TableCell>
                            {tradeName || '-'}
                          </TableCell>
                          <TableCell>
                            {purchaseFreq ? (
                              <Badge variant="outline">
                                {purchaseFreq === 'diario' ? 'Diario' :
                                 purchaseFreq === 'semanal' ? 'Semanal' :
                                 purchaseFreq === 'quincenal' ? 'Quincenal' :
                                 purchaseFreq === 'mensual' ? 'Mensual' :
                                 purchaseFreq === 'bimestral' ? 'Bimestral' :
                                 purchaseFreq === 'trimestral' ? 'Trimestral' :
                                 purchaseFreq === 'semestral' ? 'Semestral' :
                                 purchaseFreq === 'anual' ? 'Anual' :
                                 purchaseFreq === 'ocasional' ? 'Ocasional' :
                                 purchaseFreq}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {idType || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {taxId || '-'}
                          </TableCell>
                          <TableCell>
                            {grossIncome || '-'}
                          </TableCell>
                          <TableCell>
                            {vatCondition || '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {accountDesc || '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {productService || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {integralAccount || '-'}
                          </TableCell>
                          <TableCell>
                            {cost != null ? (
                              <span className="font-medium">
                                {new Intl.NumberFormat('es-AR', {
                                  style: 'currency',
                                  currency: 'ARS'
                                }).format(cost)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(supplier.is_active)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewSupplier(supplier.id);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSupplier(supplier.id);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSupplier(supplier.id, supplier.name);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal de detalle del proveedor */}
        <SupplierDetailModal
          supplier={selectedSupplier}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedSupplier(null)
          }}
          onEdit={() => {
            if (selectedSupplier) {
              setIsDetailModalOpen(false)
              setModalMode('edit')
              setSelectedSupplierId(selectedSupplier.id)
              setIsModalOpen(true)
            }
          }}
          onRefresh={() => {
            loadSuppliers()
          }}
        />

        {/* Modal para crear/editar proveedor */}
        <SupplierModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedSupplierId(null)
          }}
          onSuccess={() => {
            handleModalSuccess()
            setIsModalOpen(false)
            setSelectedSupplierId(null)
          }}
          supplierId={selectedSupplierId}
          mode={modalMode}
        />
      </ERPLayout>
    </Protected>
  )
}