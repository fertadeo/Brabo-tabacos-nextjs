"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { ClienteUbicacion } from "@/components/cliente-ubicacion"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  ShoppingCart, 
  FileText, 
  TrendingUp,
  Building,
  CreditCard,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  AlertTriangle,
  IdCard,
  Link
} from "lucide-react"
import { EditClientModal } from "./edit-client-modal"
import { deleteCliente, type Cliente as ClienteApi } from "@/lib/api"
import { CuentaCorrienteModal } from "./cuenta-corriente-modal"
import { ImportClientInvoiceModal } from "@/components/import-client-invoice-modal"
import {
  fetchClienteCompras,
  fetchClienteFacturas,
  computeClienteComprasStats,
  type ClienteCompra,
  type ClienteFactura,
} from "@/lib/cliente-compras"

interface Cliente {
  id: string // Código del cliente (MAY001, etc)
  dbId: number // ID numérico de la base de datos
  salesChannel: "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_principal" | "manual" | "otro"
  nombre: string
  email: string
  telefono: string
  ciudad: string
  tipo: "Minorista" | "Mayorista" | "Personalizado"
  estado: "Activo" | "Inactivo"
  ultimaCompra: string
  totalCompras: number
  direccion?: string
  cuit?: string
  cuitSecundario?: string
  personType?: "Persona Física" | "Persona Jurídica" | "Consumidor final"
  personeria?: "persona_fisica" | "persona_juridica" | "consumidor_final"
  taxCondition?: "Inscripto" | "Consumidor Final" | "Monotributo" | "Responsable Inscripto" | "Exento" | string
  taxConditionCode?: string
  fechaRegistro?: string
  descuento?: number
  limiteCredito?: number
  ccBalance?: number
  ccEnabled?: boolean
  vendedor?: string
}

interface ClienteDetailModalProps {
  cliente: Cliente | null
  isOpen: boolean
  onClose: () => void
  onClientUpdated?: (updated?: ClienteApi) => void
}

const TAX_CONDITION_LABELS: Record<string, string> = {
  responsable_inscripto: "Responsable Inscripto",
  inscripto: "Inscripto",
  consumidor_final: "Consumidor Final",
  monotributo: "Monotributo",
  exento: "Exento"
}

const formatTaxCondition = (value?: string, fallback: string = "N/A") => {
  if (!value) return fallback
  const normalized = value.toLowerCase().replace(/\s+/g, '_')
  return TAX_CONDITION_LABELS[normalized] ?? value
}

export function ClienteDetailModal({ cliente, isOpen, onClose, onClientUpdated }: ClienteDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'compras' | 'facturacion' | 'cuenta-corriente'>('info')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isCuentaCorrienteModalOpen, setIsCuentaCorrienteModalOpen] = useState(false)
  const [compras, setCompras] = useState<ClienteCompra[]>([])
  const [facturas, setFacturas] = useState<ClienteFactura[]>([])
  const [loadingCompras, setLoadingCompras] = useState(false)
  const [isImportInvoiceOpen, setIsImportInvoiceOpen] = useState(false)

  const reloadFacturas = () => {
    if (!cliente?.dbId) return
    fetchClienteFacturas(cliente.dbId).then(setFacturas).catch(() => setFacturas([]))
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  useEffect(() => {
    if (!isOpen || !cliente?.dbId) return
    let cancelled = false
    setLoadingCompras(true)
    Promise.all([
      fetchClienteCompras(cliente.dbId),
      fetchClienteFacturas(cliente.dbId),
    ])
      .then(([comprasData, facturasData]) => {
        if (!cancelled) {
          setCompras(comprasData)
          setFacturas(facturasData)
        }
      })
      .catch((err) => {
        console.error("Error al cargar actividad del cliente:", err)
        if (!cancelled) {
          setCompras([])
          setFacturas([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCompras(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, cliente?.dbId])

  if (!cliente) return null

  const comprasStats = computeClienteComprasStats(compras)
  const totalCompras = comprasStats.totalMonto
  const totalFacturado = facturas.reduce((sum, f) => sum + f.monto, 0)
  const facturasPendientes = facturas.filter((f) => f.estado === "Pendiente").length

  const personType = cliente.personType ?? (cliente.cuit ? "Persona Jurídica" : "Consumidor final")
  const taxCondition = formatTaxCondition(
    cliente.taxCondition,
    personType === "Persona Jurídica" ? "Responsable Inscripto" : "Consumidor Final"
  )
  const primaryTaxLabel = personType === "Persona Jurídica" ? "CUIT" : "CUIT/CUIL/DNI"
  const personaBadgeVariant = personType === "Persona Jurídica" ? "default" : "outline"
  const ccEnabled = cliente.ccEnabled ?? (cliente.tipo === "Mayorista")
  const ccLimit = typeof cliente.limiteCredito === 'number' ? cliente.limiteCredito : (ccEnabled ? 0 : undefined)
  const ccBalance = typeof cliente.ccBalance === 'number' ? cliente.ccBalance : (ccEnabled ? 0 : undefined)
  const ccAvailable = ccLimit !== undefined && ccBalance !== undefined ? ccLimit + ccBalance : undefined
  const ccAvailableBadgeVariant = ccAvailable !== undefined && ccAvailable <= 0 ? "destructive" : "secondary"

  const handleEditClient = () => {
    setIsEditModalOpen(true)
  }

  const handleEditModalClose = () => {
    setIsEditModalOpen(false)
  }

  const handleEditSuccess = (updated?: ClienteApi) => {
    setIsEditModalOpen(false)
    onClientUpdated?.(updated)
  }

  const handleDeleteClient = async () => {
    if (!cliente) return
    
    setIsDeleting(true)
    try {
      // Usar el ID numérico de la base de datos
      await deleteCliente(cliente.dbId)
      
      // Cerrar modal y notificar éxito
      setShowDeleteConfirm(false)
      onClose()
      
      if (onClientUpdated) {
        onClientUpdated()
      }
    } catch (error) {
      console.error('Error al eliminar cliente:', error)
      alert(error instanceof Error ? error.message : 'Error al eliminar el cliente')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Perfil del Cliente: {cliente.nombre}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs de navegación */}
        <div className="flex gap-1 border-b bg-background px-6 py-2 overflow-x-auto">
          <Button
            variant={activeTab === 'info' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('info')}
            className="flex-shrink-0"
          >
            <User className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Información</span>
            <span className="sm:hidden">Info</span>
          </Button>
          <Button
            variant={activeTab === 'compras' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('compras')}
            className="flex-shrink-0"
          >
            <ShoppingCart className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Compras</span>
            <span className="sm:hidden">Compras</span>
          </Button>
          <Button
            variant={activeTab === 'facturacion' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('facturacion')}
            className="flex-shrink-0"
          >
            <FileText className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Facturación</span>
            <span className="sm:hidden">Facturas</span>
          </Button>
          <Button
            variant={activeTab === 'cuenta-corriente' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('cuenta-corriente')}
            className="flex-shrink-0"
          >
            <CreditCard className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Cuenta Corriente</span>
            <span className="sm:hidden">Cuenta</span>
          </Button>
        </div>

        {/* Contenido de las pestañas */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'info' && (
            <div className="space-y-6">
            {/* Información Personal */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/20 rounded-lg">
                    <User className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
                  </div>
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna izquierda */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nombre Completo</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{cliente.nombre}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
                        <p className="text-base text-gray-900 dark:text-white break-all">{cliente.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <Phone className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Teléfono</p>
                        <p className="text-base text-gray-900 dark:text-white">{cliente.telefono}</p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <ClienteUbicacion
                        address={cliente.direccion}
                        city={cliente.ciudad}
                        variant="detail"
                        emptyLabel="Sin ubicación registrada"
                      />
                    </div>
                  </div>
                  
                  {/* Columna derecha */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <Building className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo de Cliente</p>
                        <Badge variant={
                          cliente.tipo === "Mayorista" ? "default" : 
                          cliente.tipo === "Personalizado" ? "outline" : 
                          "secondary"
                        } className="mt-1">
                          {cliente.tipo}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <IdCard className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo de Persona</p>
                        <Badge variant={personaBadgeVariant} className="mt-1">
                          {personType}
                        </Badge>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Condición fiscal: {taxCondition}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <CheckCircle className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Estado</p>
                        <Badge variant={cliente.estado === "Activo" ? "default" : "secondary"} className="mt-1">
                          <div className="flex items-center gap-1">
                            {cliente.estado === "Activo" ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {cliente.estado}
                          </div>
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Última Compra</p>
                        <p className="text-base text-gray-900 dark:text-white">
                          {comprasStats.ultimaCompra ?? cliente.ultimaCompra}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-turquoise-50 dark:bg-turquoise-900/20 rounded-lg border border-turquoise-200 dark:border-turquoise-800">
                      <DollarSign className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-turquoise-600 dark:text-turquoise-400">Total Compras</p>
                        <p className="text-xl font-bold text-turquoise-700 dark:text-turquoise-300">
                          ${totalCompras.toLocaleString("es-AR")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información Comercial */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/20 rounded-lg">
                    <Building className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
                  </div>
                  Información Comercial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna izquierda */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{primaryTaxLabel}</p>
                        <p className="text-base text-gray-900 dark:text-white font-mono">
                          {cliente.cuit || (personType === "Persona Jurídica" ? "Sin CUIT asignado" : "Sin documento registrado")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {personType === "Persona Jurídica"
                            ? "Obligatorio para facturación y retenciones"
                            : "Usar CUIT/CUIL o DNI según corresponda"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <Link className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CUIT Secundario</p>
                        <p className="text-base text-gray-900 dark:text-white font-mono">
                          {cliente.cuitSecundario || "Sin cuenta secundaria"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Identificación para cuentas secundarias o sub-razones sociales
                        </p>
                      </div>
                    </div>

                    
                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha de Registro</p>
                        <p className="text-base text-gray-900 dark:text-white">{cliente.fechaRegistro || "2023-06-15"}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Columna derecha */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Descuento Aplicado</p>
                        <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{cliente.descuento || 5}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-turquoise-50 dark:bg-turquoise-900/20 rounded-lg border border-turquoise-200 dark:border-turquoise-800">
                      <CreditCard className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-turquoise-600 dark:text-turquoise-400">Límite de Crédito</p>
                        <p className="text-lg font-bold text-turquoise-700 dark:text-turquoise-300">
                          {ccLimit !== undefined ? `$${ccLimit.toLocaleString()}` : "Sin límite asignado"}
                        </p>
                        {ccEnabled ? (
                          <div className="text-xs text-turquoise-700 dark:text-turquoise-300 space-y-1 mt-1">
                            <p>Saldo actual: ${ccBalance?.toLocaleString() ?? "0"}</p>
                            {ccAvailable !== undefined && (
                              <p className="flex items-center gap-2">
                                Disponible: ${ccAvailable.toLocaleString()}
                                <Badge variant={ccAvailableBadgeVariant} className="text-[10px]">
                                  {ccAvailable <= 0 ? "Excedido" : "Dentro del límite"}
                                </Badge>
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">Cuenta corriente no habilitada para este cliente.</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-soft dark:bg-soft-card rounded-lg">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vendedor Asignado</p>
                        <p className="text-base text-gray-900 dark:text-white">{cliente.vendedor || "Carlos Mendoza"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-turquoise-700 dark:text-turquoise-300">
                    <div className="p-1.5 bg-turquoise-200 dark:bg-turquoise-800/30 rounded-md">
                      <FileText className="h-4 w-4" />
                    </div>
                    Total Facturado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-turquoise-700 dark:text-turquoise-300">
                    ${totalFacturado.toLocaleString()}
                  </div>
                  <p className="text-xs text-turquoise-600 dark:text-turquoise-400 mt-1">
                    {facturas.length} facturas emitidas
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-turquoise-700 dark:text-turquoise-300">
                    <div className="p-1.5 bg-turquoise-200 dark:bg-turquoise-800/30 rounded-md">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    Total Compras
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-turquoise-700 dark:text-turquoise-300">
                    ${totalCompras.toLocaleString()}
                  </div>
                  <p className="text-xs text-turquoise-600 dark:text-turquoise-400 mt-1">
                    {comprasStats.totalTransacciones} transacciones realizadas
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <div className="p-1.5 bg-orange-200 dark:bg-orange-800/30 rounded-md">
                      <Clock className="h-4 w-4" />
                    </div>
                    Facturas Pendientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {facturasPendientes}
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    facturas por cobrar
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

          {activeTab === 'compras' && (
            <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Historial de Compras
                </CardTitle>
                <CardDescription>
                  Registro completo de todas las compras realizadas por el cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCompras ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Cargando historial de compras...
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">ID Compra</TableHead>
                        <TableHead className="min-w-[100px]">Fecha</TableHead>
                        <TableHead className="min-w-[150px]">Producto</TableHead>
                        <TableHead className="min-w-[80px]">Cantidad</TableHead>
                        <TableHead className="min-w-[100px]">Precio Unit.</TableHead>
                        <TableHead className="min-w-[100px]">Total</TableHead>
                        <TableHead className="min-w-[100px]">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compras.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No hay compras registradas para este cliente
                          </TableCell>
                        </TableRow>
                      ) : (
                      compras.map((compra) => (
                        <TableRow key={compra.id}>
                          <TableCell className="font-medium text-sm">{compra.id}</TableCell>
                          <TableCell className="text-sm">{compra.fecha}</TableCell>
                          <TableCell className="text-sm">{compra.producto}</TableCell>
                          <TableCell className="text-sm">{compra.cantidad}</TableCell>
                          <TableCell className="text-sm">${compra.precioUnitario.toLocaleString("es-AR")}</TableCell>
                          <TableCell className="font-medium text-sm">
                            ${compra.total.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={compra.estado === "Entregado" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {compra.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen de compras */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Productos Más Comprados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {comprasStats.topProductos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin datos de productos</p>
                    ) : (
                      comprasStats.topProductos.map((p) => (
                        <div key={p.nombre} className="flex justify-between items-center">
                          <span className="text-sm">{p.nombre}</span>
                          <Badge variant="secondary">{p.cantidad} unidades</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Frecuencia de Compras</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Transacciones</span>
                      <span className="font-medium">{comprasStats.totalTransacciones}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Valor promedio</span>
                      <span className="font-medium">
                        ${comprasStats.promedioMonto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Última compra</span>
                      <span className="font-medium">{comprasStats.ultimaCompra ?? "Sin datos"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

          {activeTab === 'facturacion' && (
            <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Historial de Facturación
                  </CardTitle>
                  <CardDescription>
                    Facturas emitidas por el sistema e importadas desde ARCA externo
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsImportInvoiceOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Importar PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Número</TableHead>
                        <TableHead className="min-w-[100px]">Fecha</TableHead>
                        <TableHead className="min-w-[100px]">Tipo</TableHead>
                        <TableHead className="min-w-[100px]">Monto</TableHead>
                        <TableHead className="min-w-[100px]">Vencimiento</TableHead>
                        <TableHead className="min-w-[100px]">Estado</TableHead>
                        <TableHead className="min-w-[90px]">Origen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No hay facturas emitidas para este cliente
                          </TableCell>
                        </TableRow>
                      ) : (
                      facturas.map((factura) => (
                        <TableRow key={factura.id}>
                          <TableCell className="font-medium text-sm">{factura.numero}</TableCell>
                          <TableCell className="text-sm">{factura.fecha}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{factura.tipo}</Badge>
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            ${factura.monto.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-sm">{factura.vencimiento ?? "—"}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={factura.estado === "Emitida" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {factura.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                factura.origen === "importada" || factura.origen === "vinculada"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="text-xs"
                              title={
                                factura.origen === "importada"
                                  ? "Registrada desde PDF externo; sin emisión ni NC por API"
                                  : factura.origen === "vinculada"
                                    ? "Factura externa vinculada a venta POS; sin emisión ni NC por API"
                                    : "Emitida por el sistema vía ARCA"
                              }
                            >
                              {factura.origen === "importada"
                                ? "Importada"
                                : factura.origen === "vinculada"
                                  ? "Vinculada"
                                  : "Sistema"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Resumen financiero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-turquoise-500" />
                    Pagadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-turquoise-600">
                    ${facturas.filter(f => f.estado === 'Emitida').reduce((sum, f) => sum + f.monto, 0).toLocaleString("es-AR")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {facturas.filter(f => f.estado === 'Emitida').length} facturas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Pendientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${facturas.filter(f => f.estado === 'Pendiente').reduce((sum, f) => sum + f.monto, 0).toLocaleString("es-AR")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {facturas.filter(f => f.estado === 'Pendiente').length} facturas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-turquoise-500" />
                    Promedio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-turquoise-600">
                    ${facturas.length > 0 ? Math.round(totalFacturado / facturas.length).toLocaleString("es-AR") : "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    por factura
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
          )}

          {activeTab === 'cuenta-corriente' && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Cuenta Corriente
                  </CardTitle>
                  <CardDescription>
                    Gestión de la cuenta corriente del cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Administre la cuenta corriente, movimientos y límites de crédito del cliente.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Puede crear una nueva cuenta corriente o gestionar una existente.
                      </p>
                    </div>
                    <Button onClick={() => setIsCuentaCorrienteModalOpen(true)}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Gestionar Cuenta Corriente
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Información adicional sobre cuentas corrientes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <div className="p-1.5 bg-blue-200 dark:bg-blue-800/30 rounded-md">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      ¿Qué es una Cuenta Corriente?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Una cuenta corriente permite al cliente realizar compras a crédito con un límite establecido. 
                      Los movimientos se registran automáticamente con cada transacción.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-300">
                      <div className="p-1.5 bg-green-200 dark:bg-green-800/30 rounded-md">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      Beneficios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                      <li>• Control de límites de crédito</li>
                      <li>• Historial completo de movimientos</li>
                      <li>• Seguimiento de pagos y cobros</li>
                      <li>• Reportes automáticos</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row justify-between gap-2 p-4 border-t bg-muted/30">
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteConfirm(true)} 
            className="w-full sm:w-auto flex items-center gap-2"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar Cliente
          </Button>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cerrar
            </Button>
            <Button onClick={handleEditClient} className="w-full sm:w-auto flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Editar Cliente
            </Button>
          </div>
        </div>

        {/* Confirmación de Eliminación */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <Card className="w-[90%] max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmar Eliminación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  ¿Está seguro que desea eliminar el cliente <strong>{cliente.nombre}</strong>?
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Si el cliente tiene pedidos asociados, será desactivado. Si no tiene pedidos, será eliminado permanentemente.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteClient}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Sí, Eliminar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </DialogContent>
    </Dialog>

    <EditClientModal
      cliente={cliente}
      isOpen={isEditModalOpen}
      onClose={handleEditModalClose}
      onSuccess={handleEditSuccess}
    />

    <CuentaCorrienteModal
      clienteId={cliente.dbId}
      clienteNombre={cliente.nombre}
      isOpen={isCuentaCorrienteModalOpen}
      onClose={() => setIsCuentaCorrienteModalOpen(false)}
      onSuccess={() => {
        setIsCuentaCorrienteModalOpen(false)
        onClientUpdated?.()
      }}
    />

    <ImportClientInvoiceModal
      isOpen={isImportInvoiceOpen}
      onClose={() => setIsImportInvoiceOpen(false)}
      defaultClientId={cliente.dbId}
      onSuccess={() => {
        reloadFacturas()
        onClientUpdated?.()
      }}
    />

    {confirmDialog}
    </>
  )
}

