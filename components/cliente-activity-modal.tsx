"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  CreditCard, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
  Search,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getCuentaCorrienteByClient,
  getMovimientosCuentaCorriente,
  type CuentaCorriente,
  type MovimientoCuentaCorriente,
} from "@/lib/api"
import {
  fetchClienteCompras,
  computeClienteComprasStats,
  type ClienteCompra,
} from "@/lib/cliente-compras"

interface ClienteActivityModalProps {
  cliente: {
    id: string
    dbId: number
    nombre: string
    email: string
    telefono: string
    ciudad: string
    tipo: "Minorista" | "Mayorista" | "Personalizado"
    estado: "Activo" | "Inactivo"
    ultimaCompra: string
    totalCompras: number
    direccion?: string
    salesChannel: string
    cuit?: string
    cuitSecundario?: string
    personType?: "Persona Física" | "Persona Jurídica" | "Consumidor final"
    taxCondition?: string
    ccLimit?: number
    ccBalance?: number
    ccEnabled?: boolean
  }
  isOpen: boolean
  onClose: () => void
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

export function ClienteActivityModal({ cliente, isOpen, onClose }: ClienteActivityModalProps) {
  const [cuenta, setCuenta] = useState<CuentaCorriente | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoCuentaCorriente[]>([])
  const [compras, setCompras] = useState<ClienteCompra[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'resumen' | 'cuenta-corriente' | 'compras'>('resumen')
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [movimientoFilter, setMovimientoFilter] = useState<'all' | 'debit' | 'credit'>('all')
  const [compraFilter, setCompraFilter] = useState<'all' | 'entregado' | 'en-proceso' | 'cancelado'>('all')

  const loadActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [comprasData, ccResult] = await Promise.all([
        fetchClienteCompras(cliente.dbId),
        getCuentaCorrienteByClient(cliente.dbId).catch(() => null),
      ])

      setCompras(comprasData)

      if (ccResult?.success && ccResult.data) {
        setCuenta(ccResult.data)
        try {
          const movResult = await getMovimientosCuentaCorriente(ccResult.data.id, { limit: 100 })
          if (movResult.success) {
            setMovimientos(movResult.data.movements)
          }
        } catch {
          setMovimientos([])
        }
      } else {
        setCuenta(null)
        setMovimientos([])
      }
    } catch (err) {
      console.error('Error al cargar actividad del cliente:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar la actividad del cliente')
    } finally {
      setLoading(false)
    }
  }, [cliente.dbId])

  useEffect(() => {
    if (isOpen && cliente.dbId) {
      loadActivity()
    }
  }, [isOpen, cliente.dbId, loadActivity])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR')
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600"
    if (balance < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getMovimientoIcon = (type: 'debit' | 'credit') => {
    return type === 'debit' ? (
      <TrendingDown className="h-4 w-4 text-red-500" />
    ) : (
      <TrendingUp className="h-4 w-4 text-green-500" />
    )
  }

  const getCompraStatusBadge = (estado: string) => {
    switch (estado) {
      case 'Entregado':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Entregado</Badge>
      case 'En Proceso':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />En Proceso</Badge>
      case 'Cancelado':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Cancelado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const getMetodoPagoIcon = (metodo: string) => {
    const lower = metodo.toLowerCase()
    if (lower.includes('cuenta') || lower.includes('corriente')) {
      return <CreditCard className="h-4 w-4 text-blue-500" />
    }
    if (lower.includes('efectivo')) {
      return <DollarSign className="h-4 w-4 text-green-500" />
    }
    if (lower.includes('transfer') || lower.includes('tarjeta')) {
      return <TrendingUp className="h-4 w-4 text-purple-500" />
    }
    return <DollarSign className="h-4 w-4 text-gray-500" />
  }

  // Filtrar movimientos
  const filteredMovimientos = movimientos.filter(movimiento => {
    const matchesSearch = movimiento.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = movimientoFilter === 'all' || movimiento.type === movimientoFilter
    return matchesSearch && matchesType
  })

  // Filtrar compras
  const filteredCompras = compras.filter(compra => {
    const matchesSearch = compra.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         compra.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = compraFilter === 'all' || 
                         (compraFilter === 'entregado' && compra.estado === 'Entregado') ||
                         (compraFilter === 'en-proceso' && compra.estado === 'En Proceso') ||
                         (compraFilter === 'cancelado' && compra.estado === 'Cancelado')
    return matchesSearch && matchesStatus
  })

  const comprasStats = computeClienteComprasStats(compras)
  const totalCompras = comprasStats.totalMonto
  const comprasEntregadas = comprasStats.entregadas
  const comprasEnProceso = comprasStats.enProceso

  const personType = cliente.personType ?? (cliente.cuit ? "Persona Jurídica" : "Consumidor final")
  const taxCondition = formatTaxCondition(
    cliente.taxCondition,
    personType === "Persona Jurídica" ? "Responsable Inscripto" : "Consumidor Final"
  )
  const personaBadgeVariant = personType === "Persona Jurídica" ? "default" : "outline"
  const ccEnabled = cliente.ccEnabled ?? (cliente.tipo === "Mayorista")
  const ccLimit = typeof cliente.ccLimit === 'number' ? cliente.ccLimit : (ccEnabled ? 0 : undefined)
  const ccBalance = typeof cliente.ccBalance === 'number' ? cliente.ccBalance : (ccEnabled ? 0 : undefined)
  const ccAvailable = ccLimit !== undefined && ccBalance !== undefined ? ccLimit + ccBalance : undefined
  const ccAvailableBadgeVariant = ccAvailable !== undefined && ccAvailable <= 0 ? "destructive" : "secondary"

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl h-[95vh] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Actividad del Cliente: {cliente.nombre}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs de navegación */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 flex flex-col">
          <div className="px-6 py-2 border-b bg-background">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="resumen" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="cuenta-corriente" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Cuenta Corriente
              </TabsTrigger>
              <TabsTrigger value="compras" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Compras
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[calc(95vh-200px)]">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">Cargando actividad...</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {!loading && !error && (
              <>
                 <TabsContent value="resumen" className="space-y-6 overflow-y-auto max-h-[calc(95vh-300px)]">
                  {/* Información del cliente */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Información del Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                          <p className="text-lg font-semibold">{cliente.nombre}</p>
                          <p className="text-sm text-muted-foreground">ID: {cliente.id}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Contacto</p>
                          <p className="text-sm">{cliente.email}</p>
                          <p className="text-sm">{cliente.telefono}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Ubicación</p>
                          <p className="text-sm">{cliente.ciudad}</p>
                          <Badge variant={cliente.estado === "Activo" ? "default" : "secondary"}>
                            {cliente.estado}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Tipo de Persona</p>
                          <Badge variant={personaBadgeVariant}>{personType}</Badge>
                          <p className="text-xs text-muted-foreground">Condición: {taxCondition}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {cliente.cuit || 'CUIT no registrado'}
                          </p>
                          {cliente.cuitSecundario && (
                            <p className="text-xs text-muted-foreground font-mono">
                              Secundario: {cliente.cuitSecundario}
                            </p>
                          )}
                          {ccEnabled ? (
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>Límite CC: {ccLimit !== undefined ? formatCurrency(ccLimit) : 'Sin asignar'}</p>
                              <p>Saldo actual: {ccBalance !== undefined ? formatCurrency(ccBalance) : 'N/A'}</p>
                              {ccAvailable !== undefined && (
                                <p className="flex items-center gap-2">
                                  Disponible: {formatCurrency(ccAvailable)}
                                  <Badge variant={ccAvailableBadgeVariant} className="text-[10px]">
                                    {ccAvailable <= 0 ? 'Excedido' : 'Disponible'}
                                  </Badge>
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Cuenta corriente no habilitada.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Estadísticas generales */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-300">
                          <div className="p-1.5 bg-blue-200 dark:bg-blue-800/30 rounded-md">
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                          Total Compras
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {formatCurrency(totalCompras)}
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {comprasStats.totalTransacciones} transacciones
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-300">
                          <div className="p-1.5 bg-green-200 dark:bg-green-800/30 rounded-md">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          Entregadas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {comprasEntregadas}
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          compras completadas
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700 dark:text-orange-300">
                          <div className="p-1.5 bg-orange-200 dark:bg-orange-800/30 rounded-md">
                            <Clock className="h-4 w-4" />
                          </div>
                          En Proceso
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {comprasEnProceso}
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          compras pendientes
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700 dark:text-purple-300">
                          <div className="p-1.5 bg-purple-200 dark:bg-purple-800/30 rounded-md">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          Saldo CC
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getBalanceColor((cuenta?.balance ?? ccBalance ?? 0))}`}>
                          {cuenta ? formatCurrency(cuenta.balance) : ccBalance !== undefined ? formatCurrency(ccBalance) : 'N/A'}
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          {ccEnabled ? 'Cuenta activa' : 'Sin cuenta'}
                        </p>
                        {ccLimit !== undefined && (
                          <p className="text-xs text-purple-600 dark:text-purple-400">Límite: {formatCurrency(ccLimit)}</p>
                        )}
                        {ccAvailable !== undefined && (
                          <p className="text-xs text-purple-600 dark:text-purple-400">Disponible: {formatCurrency(ccAvailable)}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actividad reciente */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Actividad Reciente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filteredCompras.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">
                            No hay actividad de compras registrada
                          </p>
                        ) : (
                          filteredCompras.slice(0, 3).map((compra) => (
                          <div key={compra.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <ShoppingCart className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="font-medium">{compra.producto}</p>
                                <p className="text-sm text-muted-foreground">{compra.id} - {compra.fecha}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(compra.total)}</p>
                              {getCompraStatusBadge(compra.estado)}
                            </div>
                          </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                 <TabsContent value="cuenta-corriente" className="space-y-4 overflow-y-auto max-h-[calc(95vh-300px)]">
                  {cuenta ? (
                    <>
                      {/* Información de la cuenta */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Información de la Cuenta Corriente
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Saldo Actual</p>
                              <p className={`text-2xl font-bold ${getBalanceColor(cuenta.balance)}`}>
                                {formatCurrency(cuenta.balance)}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Límite de Crédito</p>
                              <p className="text-lg font-semibold">{formatCurrency(cuenta.credit_limit)}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Estado</p>
                              <Badge variant={cuenta.is_active ? "default" : "secondary"}>
                                {cuenta.is_active ? "Activa" : "Inactiva"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Filtros */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filtros
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  placeholder="Buscar en descripciones..." 
                                  className="pl-8" 
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                />
                              </div>
                            </div>
                            <Select value={movimientoFilter} onValueChange={(value: any) => setMovimientoFilter(value)}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tipo de movimiento" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="credit">Créditos</SelectItem>
                                <SelectItem value="debit">Débitos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Movimientos */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Historial de Movimientos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Descripción</TableHead>
                                  <TableHead>Monto</TableHead>
                                  <TableHead>Usuario</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredMovimientos.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                      No hay movimientos registrados
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  filteredMovimientos.map((movimiento) => (
                                    <TableRow key={movimiento.id}>
                                      <TableCell className="text-sm">
                                        {formatDate(movimiento.created_at)}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {getMovimientoIcon(movimiento.type)}
                                          <Badge variant={movimiento.type === 'credit' ? 'default' : 'secondary'}>
                                            {movimiento.type === 'credit' ? 'Crédito' : 'Débito'}
                                          </Badge>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm">{movimiento.description}</TableCell>
                                      <TableCell className={`font-medium ${movimiento.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                        {movimiento.type === 'credit' ? '+' : '-'}{formatCurrency(movimiento.amount)}
                                      </TableCell>
                                      <TableCell className="text-sm">{movimiento.created_by_name ?? '—'}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Sin Cuenta Corriente</h3>
                        <p className="text-muted-foreground">
                          Este cliente no tiene una cuenta corriente asociada.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                 <TabsContent value="compras" className="space-y-4 overflow-y-auto max-h-[calc(95vh-300px)]">
                  {/* Filtros de compras */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros de Compras
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="Buscar por producto o ID..." 
                              className="pl-8" 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>
                        <Select value={compraFilter} onValueChange={(value: any) => setCompraFilter(value)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="entregado">Entregados</SelectItem>
                            <SelectItem value="en-proceso">En Proceso</SelectItem>
                            <SelectItem value="cancelado">Cancelados</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tabla de compras */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Historial de Compras
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead>Cantidad</TableHead>
                              <TableHead>Precio Unit.</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Método Pago</TableHead>
                              <TableHead>Vendedor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredCompras.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                  No hay compras registradas
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredCompras.map((compra) => (
                                <TableRow key={compra.id}>
                                  <TableCell className="font-medium text-sm">{compra.id}</TableCell>
                                  <TableCell className="text-sm">{compra.fecha}</TableCell>
                                  <TableCell className="text-sm">{compra.producto}</TableCell>
                                  <TableCell className="text-sm">{compra.cantidad}</TableCell>
                                  <TableCell className="text-sm">{formatCurrency(compra.precioUnitario)}</TableCell>
                                  <TableCell className="font-medium text-sm">
                                    {formatCurrency(compra.total)}
                                  </TableCell>
                                  <TableCell>
                                    {getCompraStatusBadge(compra.estado)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {getMetodoPagoIcon(compra.metodoPago)}
                                      <span className="text-sm">{compra.metodoPago}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{compra.vendedor ?? '—'}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}