"use client"

import { useState } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  PackageCheck, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Filter, 
  Download, 
  Eye,
  Printer,
  Truck,
  PackageX,
  Package,
  FileText,
  MapPin,
  Calendar
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RemitoPdfModal } from "@/components/remito-pdf-modal"
import { NewRemitoModal } from "@/components/new-remito-modal"

// Datos de ejemplo de remitos
const remitosData = [
  {
    id: "REM001",
    numeroRemito: "0001-00000123",
    pedidoId: "PED001",
    cliente: "María González",
    direccion: "Av. Corrientes 1234, CABA",
    fecha: "2024-01-22",
    fechaEntrega: "2024-01-25",
    estado: "Pendiente",
    items: 3,
    bultos: 2,
    peso: "15.5 kg",
    transporte: "Transporte Propio",
    observaciones: "Entregar en horario de mañana",
    prioridad: "Normal",
  },
  {
    id: "REM002",
    numeroRemito: "0001-00000124",
    pedidoId: "PED002",
    cliente: "Comercial San Martín",
    direccion: "San Martín 567, Rosario",
    fecha: "2024-01-21",
    fechaEntrega: "2024-01-24",
    estado: "En Preparación",
    items: 12,
    bultos: 8,
    peso: "87.3 kg",
    transporte: "Andreani",
    observaciones: "Mercadería frágil",
    prioridad: "Alta",
  },
  {
    id: "REM003",
    numeroRemito: "0001-00000125",
    pedidoId: "PED003",
    cliente: "Juan Pérez",
    direccion: "Mitre 890, La Plata",
    fecha: "2024-01-20",
    fechaEntrega: "2024-01-23",
    estado: "Despachado",
    items: 2,
    bultos: 1,
    peso: "8.2 kg",
    transporte: "OCA",
    observaciones: "",
    prioridad: "Normal",
  },
  {
    id: "REM004",
    numeroRemito: "0001-00000126",
    pedidoId: "PED004",
    cliente: "Distribuidora Tech Solutions",
    direccion: "Belgrano 234, Córdoba",
    fecha: "2024-01-19",
    fechaEntrega: "2024-01-22",
    estado: "Entregado",
    items: 8,
    bultos: 5,
    peso: "45.8 kg",
    transporte: "Transporte Propio",
    observaciones: "Entregado y firmado por recepción",
    prioridad: "Normal",
    fechaEntregaReal: "2024-01-22",
  },
  {
    id: "REM005",
    numeroRemito: "0001-00000127",
    pedidoId: "PED005",
    cliente: "Tienda Central",
    direccion: "Rivadavia 1500, CABA",
    fecha: "2024-01-22",
    fechaEntrega: "2024-01-26",
    estado: "Pendiente",
    items: 5,
    bultos: 3,
    peso: "23.4 kg",
    transporte: "Correo Argentino",
    observaciones: "",
    prioridad: "Normal",
  },
  {
    id: "REM006",
    numeroRemito: "0001-00000128",
    pedidoId: "PED006",
    cliente: "Decoraciones SA",
    direccion: "Santa Fe 3456, CABA",
    fecha: "2024-01-18",
    fechaEntrega: "2024-01-21",
    estado: "Con Incidencia",
    items: 4,
    bultos: 2,
    peso: "12.7 kg",
    transporte: "OCA",
    observaciones: "Cliente ausente - 2do intento programado",
    prioridad: "Alta",
  },
]

// Función para obtener el color del badge según el estado
const getEstadoBadgeVariant = (estado: string) => {
  switch (estado) {
    case "Entregado":
      return "default"
    case "Despachado":
      return "secondary"
    case "En Preparación":
      return "outline"
    case "Con Incidencia":
      return "destructive"
    default:
      return "outline"
  }
}

// Función para obtener el color del badge según la prioridad
const getPrioridadBadgeVariant = (prioridad: string) => {
  switch (prioridad) {
    case "Crítica":
      return "destructive"
    case "Alta":
      return "secondary"
    default:
      return "outline"
  }
}

export default function LogisticaPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("todos")
  const [isNewRemitoOpen, setIsNewRemitoOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [selectedRemito, setSelectedRemito] = useState<any>(null)

  // Filtrar remitos según búsqueda y filtros
  const remitosFiltrados = remitosData.filter(remito => {
    const matchSearch = searchTerm === "" || 
      remito.numeroRemito.toLowerCase().includes(searchTerm.toLowerCase()) ||
      remito.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      remito.pedidoId.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchEstado = estadoFilter === "todos" || remito.estado === estadoFilter

    return matchSearch && matchEstado
  })

  // Calcular estadísticas
  const totalRemitos = remitosData.length
  const pendientes = remitosData.filter(r => r.estado === "Pendiente").length
  const enPreparacion = remitosData.filter(r => r.estado === "En Preparación").length
  const despachados = remitosData.filter(r => r.estado === "Despachado").length
  const entregados = remitosData.filter(r => r.estado === "Entregado").length
  const conIncidencia = remitosData.filter(r => r.estado === "Con Incidencia").length

  const handleViewRemito = (remito: any) => {
    setSelectedRemito(remito)
    setIsPdfModalOpen(true)
  }

  const handlePrintRemito = (remito: any) => {
    setSelectedRemito(remito)
    setIsPdfModalOpen(true)
  }

  return (
    <Protected requiredRoles={['gerencia', 'logistica', 'ventas', 'admin']}>
      <ERPLayout activeItem="remitos">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <PackageCheck className="h-8 w-8 text-primary" />
                Gestión de Remitos
              </h1>
              <p className="text-muted-foreground mt-1">
                Control de despacho, entregas y movimientos de mercadería
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" onClick={() => {
                if (remitosFiltrados.length > 0) {
                  handleViewRemito(remitosFiltrados[0])
                }
              }}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={() => setIsNewRemitoOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Remito
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Remitos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRemitos}</div>
                <p className="text-xs text-muted-foreground">Este mes</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendientes}</div>
                <p className="text-xs text-muted-foreground">Por procesar</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Preparación</CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{enPreparacion}</div>
                <p className="text-xs text-muted-foreground">En proceso</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despachados</CardTitle>
                <Truck className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{despachados}</div>
                <p className="text-xs text-muted-foreground">En tránsito</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregados</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{entregados}</div>
                <p className="text-xs text-muted-foreground">Completados</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Con Incidencia</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{conIncidencia}</div>
                <p className="text-xs text-muted-foreground">Requieren atención</p>
              </CardContent>
            </Card>
          </div>

          {/* Información del Flujo */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Truck className="h-5 w-5" />
                Flujo del Remito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-white dark:bg-slate-900">
                  📋 Pedido de Venta
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-white dark:bg-slate-900">
                  📦 Preparación de Mercadería
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-white dark:bg-slate-900">
                  📄 Remito Generado
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-white dark:bg-slate-900">
                  🚚 Despacho
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-white dark:bg-slate-900">
                  ✅ Entrega Confirmada
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-white dark:bg-slate-900">
                  💰 Factura
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                El remito es el puente entre el pedido y la factura, representando la entrega efectiva de la mercadería.
              </p>
            </CardContent>
          </Card>

          {/* Remitos Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Remitos</CardTitle>
              <CardDescription>
                Todos los remitos con seguimiento de estado y entrega
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros y Búsqueda */}
              <div className="flex gap-4 mb-4 flex-wrap">
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por remito, cliente o pedido..." 
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En Preparación">En Preparación</SelectItem>
                    <SelectItem value="Despachado">Despachado</SelectItem>
                    <SelectItem value="Entregado">Entregado</SelectItem>
                    <SelectItem value="Con Incidencia">Con Incidencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabla de Remitos */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Remito</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>F. Entrega</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Bultos</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Transporte</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remitosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                          No se encontraron remitos con los filtros aplicados
                        </TableCell>
                      </TableRow>
                    ) : (
                      remitosFiltrados.map((remito) => (
                        <TableRow key={remito.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{remito.numeroRemito}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{remito.pedidoId}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{remito.cliente}</TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="flex items-start gap-1 text-sm">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                              <span className="line-clamp-2">{remito.direccion}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {remito.fecha}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {remito.fechaEntrega}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getEstadoBadgeVariant(remito.estado)}>
                              {remito.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{remito.items}</TableCell>
                          <TableCell className="text-center">{remito.bultos}</TableCell>
                          <TableCell>{remito.peso}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Truck className="h-3 w-3 text-muted-foreground" />
                              {remito.transporte}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPrioridadBadgeVariant(remito.prioridad)}>
                              {remito.prioridad}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Ver detalles"
                                onClick={() => handleViewRemito(remito)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Imprimir remito"
                                onClick={() => handlePrintRemito(remito)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Resultados */}
              <div className="mt-4 text-sm text-muted-foreground">
                Mostrando {remitosFiltrados.length} de {totalRemitos} remitos
              </div>
            </CardContent>
          </Card>

          {/* Información adicional sobre Remitos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📦 Función del Remito</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>Documento no fiscal</strong> que acompaña la mercadería desde el depósito hasta el cliente.
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>Genera movimiento de salida en el stock</li>
                  <li>Sirve como comprobante de entrega</li>
                  <li>Base para emitir la factura correspondiente</li>
                  <li>Control de trazabilidad de mercadería</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔄 Estados del Remito</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Pendiente</Badge>
                  <span className="text-muted-foreground">→ Por procesar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">En Preparación</Badge>
                  <span className="text-muted-foreground">→ Armando mercadería</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Despachado</Badge>
                  <span className="text-muted-foreground">→ En camino al cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Entregado</Badge>
                  <span className="text-muted-foreground">→ Recibido por cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Con Incidencia</Badge>
                  <span className="text-muted-foreground">→ Requiere intervención</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de Nuevo Remito */}
        <NewRemitoModal
          isOpen={isNewRemitoOpen}
          onClose={() => setIsNewRemitoOpen(false)}
          onSuccess={() => {
            setIsNewRemitoOpen(false)
            // Aquí podrías agregar lógica para refrescar la lista de remitos
            console.log('Remito creado exitosamente')
          }}
        />

        {/* Modal de Vista PDF del Remito */}
        <RemitoPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => {
            setIsPdfModalOpen(false)
            setSelectedRemito(null)
          }}
          remito={selectedRemito}
        />
      </ERPLayout>
    </Protected>
  )
}

