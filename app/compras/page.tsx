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
import { ShoppingCart, Search, Plus, Clock, CheckCircle, AlertTriangle, Filter, Download, Eye, RefreshCw, DollarSign, FileText, Upload, Pencil, Trash2 } from "lucide-react"
import { NewPurchaseModal } from "@/components/new-purchase-modal"
import { ImportSupplierDocumentModal } from "@/components/import-supplier-document-modal"
import { EditPurchaseModal } from "@/components/edit-purchase-modal"
import { PurchaseSourcePdfModal } from "@/components/purchase-source-pdf-modal"
import { 
  getPurchases, 
  getPurchaseStats, 
  getSuppliers,
  deletePurchase,
  type Purchase, 
  type PurchaseStats,
  type Supplier 
} from "@/lib/api"
import { toast } from "sonner"

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [stats, setStats] = useState<PurchaseStats | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null)
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<number | null>(null)
  const [pdfPreviewPurchase, setPdfPreviewPurchase] = useState<Purchase | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [supplierFilter, setSupplierFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [])

  // Cargar compras cuando cambien los filtros
  useEffect(() => {
    loadPurchases()
  }, [searchTerm, statusFilter, supplierFilter, currentPage])

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadPurchases(),
        loadStats(),
        loadSuppliers()
      ])
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setIsLoading(false)
    }
  }

  const loadPurchases = async () => {
    try {
      const params: any = {
        page: currentPage,
        limit: 10
      }

      if (searchTerm) params.search = searchTerm
      if (statusFilter !== "all") params.status = statusFilter
      if (supplierFilter !== "all") params.supplier_id = parseInt(supplierFilter)

      const response = await getPurchases(params)
      if (response.success && Array.isArray(response.data?.purchases)) {
        setPurchases(response.data.purchases)
        setTotalPages(response.data.pagination?.totalPages ?? 1)
      } else {
        setPurchases([])
        setTotalPages(1)
      }
    } catch (error) {
      console.error("Error al cargar compras:", error)
      toast.error("Error al cargar las compras")
      setPurchases([])
      setTotalPages(1)
    }
  }

  const loadStats = async () => {
    try {
      const response = await getPurchaseStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    }
  }

  const loadSuppliers = async () => {
    try {
      const response = await getSuppliers({ all: true })
      if (response.success) {
        setSuppliers(response.data.suppliers)
      }
    } catch (error) {
      console.error("Error al cargar proveedores:", error)
    }
  }

  const handleRefresh = () => {
    loadData()
  }

  const handleModalSuccess = () => {
    loadData()
  }

  const handleDeletePurchase = async (purchase: Purchase) => {
    const confirmed = window.confirm(
      `¿Eliminar la orden ${purchase.purchase_number}? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    setDeletingPurchaseId(purchase.id)
    try {
      await deletePurchase(purchase.id)
      toast.success("Orden eliminada")
      loadData()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la orden")
    } finally {
      setDeletingPurchaseId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendiente", variant: "outline" as const },
      received: { label: "Recibida", variant: "default" as const },
      cancelled: { label: "Cancelada", variant: "destructive" as const }
    }
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: "outline" as const }
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }
  return (
    <Protected requiredRoles={['gerencia', 'finanzas', 'admin']}>
      <ERPLayout activeItem="compras">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Compras</h1>
            <p className="text-muted-foreground">Administra órdenes de compra y proveedores</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar PDF
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.pending_purchases || 0}
              </div>
              <p className="text-xs text-muted-foreground">Esperando aprobación</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.total_amount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">En todas las órdenes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Órdenes Recibidas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.received_purchases || 0}
              </div>
              <p className="text-xs text-muted-foreground">Completadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Órdenes Canceladas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.cancelled_purchases || 0}
              </div>
              <p className="text-xs text-muted-foreground">Canceladas</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Órdenes de Compra</CardTitle>
            <CardDescription>Lista de todas las órdenes de compra</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 mb-4 md:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar órdenes..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="received">Recibida</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Cargando compras...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Compromiso</TableHead>
                    <TableHead>Deuda</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Recibida</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No se encontraron compras
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchases.map((purchase) => {
                      const debtType = purchase.debt_type ?? null;
                      const commitmentAmount = purchase.commitment_amount ?? 0;
                      const debtAmount = purchase.debt_amount ?? 0;

                      // Función para obtener el badge del tipo de deuda
                      const getDebtTypeBadge = () => {
                        if (!debtType) {
                          return <Badge variant="outline" className="bg-gray-100 text-gray-600">Sin tipo</Badge>;
                        }
                        switch (debtType) {
                          case 'compromiso':
                            return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">Compromiso</Badge>;
                          case 'deuda_directa':
                            return <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-white">Deuda Directa</Badge>;
                          default:
                            return <Badge variant="outline">{debtType}</Badge>;
                        }
                      };

                      return (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                          <TableCell>{purchase.supplier_name}</TableCell>
                          <TableCell>{formatDate(purchase.purchase_date)}</TableCell>
                          <TableCell>
                            {getDebtTypeBadge()}
                          </TableCell>
                          <TableCell>
                            {commitmentAmount > 0 ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-blue-500" />
                                <span className="font-medium text-blue-600">
                                  {formatCurrency(commitmentAmount)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {debtAmount > 0 ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-orange-500" />
                                <span className="font-medium text-orange-600">
                                  {formatCurrency(debtAmount)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(purchase.total_amount)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(purchase.status)}
                          </TableCell>
                          <TableCell>
                            {purchase.received_date ? formatDate(purchase.received_date) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {purchase.notes || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {purchase.has_source_pdf ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPdfPreviewPurchase(purchase)}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Ver PDF
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingPurchaseId(purchase.id)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deletingPurchaseId === purchase.id}
                                onClick={() => void handleDeletePurchase(purchase)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
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

        {/* Modal para nueva orden */}
        <NewPurchaseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
        <ImportSupplierDocumentModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
        <EditPurchaseModal
          isOpen={editingPurchaseId != null}
          purchaseId={editingPurchaseId}
          onClose={() => setEditingPurchaseId(null)}
          onSuccess={handleModalSuccess}
          onDeleted={handleModalSuccess}
        />
        <PurchaseSourcePdfModal
          isOpen={pdfPreviewPurchase != null}
          purchase={pdfPreviewPurchase}
          onClose={() => setPdfPreviewPurchase(null)}
        />
      </ERPLayout>
    </Protected>
  )
}
