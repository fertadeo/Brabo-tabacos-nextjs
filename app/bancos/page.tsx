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
import { 
  Building2, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Settings, 
  HelpCircle, 
  Headphones,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  BarChart3,
  Table as TableIcon,
  PieChart,
  Percent
} from "lucide-react"

// Interfaces para los datos
interface CuentaBancaria {
  id: number
  banco: string
  sucursal: string
  numero_cuenta: string
  tipo_cuenta: string
  moneda: string
  saldo_actual: number
  saldo_verificado: string
  is_active: boolean
}

interface MovimientoBancario {
  id: string
  fecha: string
  movimiento: string
  numero_operacion: string
  detalle: string
  comprobante: string
  debito: number
  credito: number
  saldo: number
  is_conciliado: boolean
}

// Datos de ejemplo basados en el sistema actual
const cuentasBancarias: CuentaBancaria[] = [
  {
    id: 1,
    banco: "Cuentas de Tesorería",
    sucursal: "Central",
    numero_cuenta: "Consolidado",
    tipo_cuenta: "Resumen Tesorería",
    moneda: "ARS",
    saldo_actual: 125000000.45,
    saldo_verificado: "HACE 1",
    is_active: true
  },
  {
    id: 2,
    banco: "Banco Santander",
    sucursal: "Casa Central",
    numero_cuenta: "205-423281/8",
    tipo_cuenta: "Cuenta Corriente ARS",
    moneda: "ARS",
    saldo_actual: 82500000.12,
    saldo_verificado: "HACE 2",
    is_active: true
  },
  {
    id: 3,
    banco: "Banco Santander",
    sucursal: "Casa Central",
    numero_cuenta: "205-987654/2",
    tipo_cuenta: "Cuenta Corriente USD",
    moneda: "USD",
    saldo_actual: 357500.75,
    saldo_verificado: "HACE 2",
    is_active: true
  },
  {
    id: 4,
    banco: "Banco Patagonia",
    sucursal: "Córdoba",
    numero_cuenta: "123-456789/0",
    tipo_cuenta: "Cuenta Corriente ARS",
    moneda: "ARS",
    saldo_actual: 31250000.0,
    saldo_verificado: "HACE 3",
    is_active: true
  },
  {
    id: 5,
    banco: "Mercado Pago",
    sucursal: "Cuenta Digital",
    numero_cuenta: "MP-556677",
    tipo_cuenta: "Cuenta Digital ARS",
    moneda: "ARS",
    saldo_actual: 22800000.64,
    saldo_verificado: "HACE 1",
    is_active: true
  },
  {
    id: 6,
    banco: "IOL",
    sucursal: "Broker",
    numero_cuenta: "IOL-AR-778899",
    tipo_cuenta: "Cuenta de Inversión ARS",
    moneda: "ARS",
    saldo_actual: 18450000.3,
    saldo_verificado: "HACE 4",
    is_active: true
  },
  {
    id: 7,
    banco: "IOL",
    sucursal: "Broker",
    numero_cuenta: "IOL-US-445566",
    tipo_cuenta: "Cuenta de Inversión USD",
    moneda: "USD",
    saldo_actual: 215000.0,
    saldo_verificado: "HACE 4",
    is_active: true
  },
  {
    id: 8,
    banco: "Financiera",
    sucursal: "Acuerdos",
    numero_cuenta: "FIN-001",
    tipo_cuenta: "Línea de Financiamiento",
    moneda: "ARS",
    saldo_actual: 12850000.0,
    saldo_verificado: "HACE 5",
    is_active: true
  },
  {
    id: 9,
    banco: "Efectivo",
    sucursal: "Caja Principal",
    numero_cuenta: "Caja Central",
    tipo_cuenta: "Caja Fisica",
    moneda: "ARS",
    saldo_actual: 9450000.5,
    saldo_verificado: "HACE 1",
    is_active: true
  },
  {
    id: 10,
    banco: "Cheques emitidos / recibidos",
    sucursal: "Carpeta",
    numero_cuenta: "CHQ-001",
    tipo_cuenta: "Administrador de Cheques",
    moneda: "ARS",
    saldo_actual: 6450000.0,
    saldo_verificado: "HACE 6",
    is_active: true
  }
]

const movimientosData: MovimientoBancario[] = [
  {
    id: "MOV001",
    fecha: "20/12/2024",
    movimiento: "Transferencia Recibida",
    numero_operacion: "1987",
    detalle: "Ingreso de cobranza Mercado Pago",
    comprobante: "REC 0001-00004567",
    debito: 0,
    credito: 3250000.0,
    saldo: 125000000.45,
    is_conciliado: true
  },
  {
    id: "MOV002",
    fecha: "19/12/2024",
    movimiento: "Transferencia Enviada",
    numero_operacion: "1991",
    detalle: "Pago a proveedor vía Banco Santander",
    comprobante: "TRA 0002-00001234",
    debito: 2750000.0,
    credito: 0,
    saldo: 121750000.45,
    is_conciliado: true
  },
  {
    id: "MOV003",
    fecha: "18/12/2024",
    movimiento: "Movimiento Interno",
    numero_operacion: "1994",
    detalle: "Traspaso a cuenta IOL USD",
    comprobante: "INT 0003-00000056",
    debito: 850000.0,
    credito: 0,
    saldo: 118200000.45,
    is_conciliado: false
  },
  {
    id: "MOV004",
    fecha: "17/12/2024",
    movimiento: "Transferencia Recibida",
    numero_operacion: "1976",
    detalle: "Cobro de factura en Banco Patagonia",
    comprobante: "REC 0004-00007891",
    debito: 0,
    credito: 2150000.0,
    saldo: 119050000.45,
    is_conciliado: true
  },
  {
    id: "MOV005",
    fecha: "16/12/2024",
    movimiento: "Depósito en Efectivo",
    numero_operacion: "1955",
    detalle: "Arqueo de caja sucursal",
    comprobante: "DEP 0005-00002345",
    debito: 0,
    credito: 450000.0,
    saldo: 117900000.45,
    is_conciliado: false
  }
]

// Datos para gráficos
const evolucionCuentasData = [
  { mes: "2024-01", valor: 450000000, ingresos: 65000000, egresos: 42000000 },
  { mes: "2024-02", valor: 473000000, ingresos: 72000000, egresos: 44000000 },
  { mes: "2024-03", valor: 501000000, ingresos: 68000000, egresos: 40000000 },
  { mes: "2024-04", valor: 529000000, ingresos: 75000000, egresos: 47000000 },
  { mes: "2024-05", valor: 557000000, ingresos: 71000000, egresos: 43000000 },
  { mes: "2024-06", valor: 585000000, ingresos: 82000000, egresos: 44000000 },
  { mes: "2024-07", valor: 623000000, ingresos: 78000000, egresos: 40000000 },
  { mes: "2024-08", valor: 661000000, ingresos: 80000000, egresos: 42000000 },
  { mes: "2024-09", valor: 703000000, ingresos: 85000000, egresos: 32000000 },
  { mes: "2024-10", valor: 756000000, ingresos: 92000000, egresos: 39000000 },
  { mes: "2024-11", valor: 809000000, ingresos: 88000000, egresos: 35000000 },
  { mes: "2024-12", valor: 862000000, ingresos: 95000000, egresos: 38000000 }
]

const totalesPorEntidad = [
  { entidad: "Cuentas de Tesorería", valor: 125000000, porcentaje: 34.8, color: "from-slate-500 to-slate-600" },
  { entidad: "Banco Santander (ARS)", valor: 82500000, porcentaje: 22.9, color: "from-blue-500 to-blue-600" },
  { entidad: "Banco Santander (USD)", valor: 31500000, porcentaje: 8.7, color: "from-blue-700 to-blue-500" },
  { entidad: "Banco Patagonia", valor: 31250000, porcentaje: 8.7, color: "from-green-500 to-green-600" },
  { entidad: "Mercado Pago", valor: 22800000, porcentaje: 6.3, color: "from-indigo-500 to-indigo-600" },
  { entidad: "IOL (ARS)", valor: 18450000, porcentaje: 5.1, color: "from-purple-500 to-purple-600" },
  { entidad: "IOL (USD)", valor: 21000000, porcentaje: 5.8, color: "from-purple-700 to-purple-500" },
  { entidad: "Financiera", valor: 12850000, porcentaje: 3.6, color: "from-orange-500 to-orange-600" },
  { entidad: "Efectivo", valor: 9450000, porcentaje: 2.6, color: "from-amber-500 to-amber-600" },
  { entidad: "Cheques emitidos / recibidos", valor: 6450000, porcentaje: 1.8, color: "from-rose-500 to-rose-600" }
]

const evolucionCuentasUSD = [
  { mes: "2024-01", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-02", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-03", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-04", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-05", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-06", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-07", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-08", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-09", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-10", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-11", valor: 0, ingresos: 0, egresos: 0 },
  { mes: "2024-12", valor: 0, ingresos: 0, egresos: 0 }
]

// Datos de prueba para cuentas USD (simulando que no hay datos)
const tieneDatosUSD = false

// Datos adicionales para estadísticas
const estadisticasMensuales = {
  totalIngresos: 950000000,
  totalEgresos: 480000000,
  saldoNeto: 470000000,
  crecimientoMensual: 15.2,
  promedioDiario: 31000000
}

const costosFinancieros = [
  {
    id: "tesoreria",
    plataforma: "Cuentas de Tesorería",
    tipo: "Custodia centralizada",
    base: 125000000,
    comision: 4.1,
    descripcion: "Costo administrativo por gestión consolidada de tesorería.",
    moneda: "ARS"
  },
  {
    id: "santander-ars",
    plataforma: "Banco Santander (ARS)",
    tipo: "Cuenta corriente",
    base: 82500000,
    comision: 4.8,
    descripcion: "Mantenimiento y transferencias nacionales.",
    moneda: "ARS"
  },
  {
    id: "santander-usd",
    plataforma: "Banco Santander (USD)",
    tipo: "Cuenta corriente",
    base: 31500000,
    comision: 5.0,
    descripcion: "Servicios de custodia para cuentas en dólares.",
    moneda: "USD"
  },
  {
    id: "patagonia",
    plataforma: "Banco Patagonia",
    tipo: "Cuenta corriente",
    base: 31250000,
    comision: 4.3,
    descripcion: "Costos por transferencias y acreditaciones ARS.",
    moneda: "ARS"
  },
  {
    id: "mercado-pago",
    plataforma: "Mercado Pago",
    tipo: "Cobranza digital",
    base: 22800000,
    comision: 8.2,
    descripcion: "Comisión por cobros con acreditación inmediata.",
    moneda: "ARS"
  },
  {
    id: "iol-ars",
    plataforma: "IOL (ARS)",
    tipo: "Cuenta de inversión",
    base: 18450000,
    comision: 6.1,
    descripcion: "Gastos de movimientos en pesos dentro del broker.",
    moneda: "ARS"
  },
  {
    id: "iol-usd",
    plataforma: "IOL (USD)",
    tipo: "Cuenta de inversión",
    base: 21000000,
    comision: 6.8,
    descripcion: "Gastos operativos por conversiones y transferencias.",
    moneda: "USD"
  },
  {
    id: "financiera",
    plataforma: "Financiera",
    tipo: "Línea de financiamiento",
    base: 12850000,
    comision: 11.5,
    descripcion: "Interés promedio sobre líneas rotativas.",
    moneda: "ARS"
  },
  {
    id: "efectivo",
    plataforma: "Efectivo",
    tipo: "Caja física",
    base: 9450000,
    comision: 4.0,
    descripcion: "Costos logísticos de traslado y custodia.",
    moneda: "ARS"
  },
  {
    id: "cheques",
    plataforma: "Cheques emitidos / recibidos",
    tipo: "Administrador de cheques",
    base: 6450000,
    comision: 5.4,
    descripcion: "Gastos por clearing y endosos.",
    moneda: "ARS"
  }
]

export default function BancosPage() {
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaBancaria>(cuentasBancarias[0])
  const [movimientos, setMovimientos] = useState<MovimientoBancario[]>(movimientosData)
  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroConciliacion, setFiltroConciliacion] = useState("todos")
  const [paginaActual, setPaginaActual] = useState(1)
  const [itemsPorPagina] = useState(10)
  const [vistaActual, setVistaActual] = useState<"numeros" | "graficos">("numeros")

  // Filtrar movimientos
  const movimientosFiltrados = movimientos.filter(mov => {
    const coincideTexto = mov.detalle.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                         mov.comprobante.toLowerCase().includes(filtroTexto.toLowerCase())
    const coincideTipo = filtroTipo === "todos" || mov.movimiento.toLowerCase().includes(filtroTipo.toLowerCase())
    const coincideConciliacion = filtroConciliacion === "todos" || 
                                (filtroConciliacion === "conciliado" && mov.is_conciliado) ||
                                (filtroConciliacion === "pendiente" && !mov.is_conciliado)
    
    return coincideTexto && coincideTipo && coincideConciliacion
  })

  // Paginación
  const totalPaginas = Math.ceil(movimientosFiltrados.length / itemsPorPagina)
  const movimientosPaginados = movimientosFiltrados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  )

  // Calcular estadísticas
  const totalIngresos = movimientosFiltrados.reduce((sum, mov) => sum + mov.credito, 0)
  const totalEgresos = movimientosFiltrados.reduce((sum, mov) => sum + mov.debito, 0)
  const saldoNeto = totalIngresos - totalEgresos
  const movimientosConciliados = movimientosFiltrados.filter(mov => mov.is_conciliado).length
  const movimientosPendientes = movimientosFiltrados.length - movimientosConciliados

  const totalCostosFinancieros = costosFinancieros.reduce((sum, item) => sum + (item.base * item.comision / 100), 0)
  const promedioComision = costosFinancieros.reduce((sum, item) => sum + item.comision, 0) / costosFinancieros.length

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(valor)
  }

  const formatearFecha = (fecha: string) => {
    return fecha
  }

  return (
    <Protected requiredRoles={['admin', 'gerencia']}>
      <ERPLayout activeItem="bancos">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión Bancaria</h1>
            <p className="text-muted-foreground">Administra cuentas bancarias y movimientos</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Período
            </Button>
            <Button 
              variant="outline"
              className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button 
              variant="outline"
              className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Sistema de Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border">
          <Button
            variant={vistaActual === "numeros" ? "default" : "ghost"}
            onClick={() => setVistaActual("numeros")}
            className={`flex items-center gap-2 px-4 py-2 transition-all duration-200 ${
              vistaActual === "numeros"
                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <TableIcon className="h-4 w-4" />
            Vista de Números
          </Button>
          <Button
            variant={vistaActual === "graficos" ? "default" : "ghost"}
            onClick={() => setVistaActual("graficos")}
            className={`flex items-center gap-2 px-4 py-2 transition-all duration-200 ${
              vistaActual === "graficos"
                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Vista de Gráficos
          </Button>
        </div>

        {/* Información de Cuenta Seleccionada */}
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {cuentaSeleccionada.banco}
                  </h2>
                  <p className="text-blue-700 dark:text-blue-300">
                    SUC.: {cuentaSeleccionada.sucursal} :: {cuentaSeleccionada.tipo_cuenta} Nº {cuentaSeleccionada.numero_cuenta}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    SALDO VERIFICADO {cuentaSeleccionada.saldo_verificado}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {formatearMoneda(cuentaSeleccionada.saldo_actual)}
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {cuentaSeleccionada.moneda}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenido Principal */}
        {vistaActual === "numeros" ? (
          <>
            {/* Estadísticas Rápidas */}
            <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
              <TrendingUp className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">
                {formatearMoneda(totalIngresos)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatearMoneda(totalEgresos)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Movimientos Conciliados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {movimientosConciliados}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {movimientosPendientes}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Costos Financieros */}
        <Card className="border-amber-200 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Percent className="h-5 w-5" />
              Costos financieros por plataforma
            </CardTitle>
            <CardDescription>Cálculo de comisiones (rango 4% - 12%) sobre saldos operativos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-white/70 dark:bg-slate-900/40 rounded-lg border border-amber-100 dark:border-amber-900/40">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Impacto estimado mensual</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {formatearMoneda(totalCostosFinancieros)}
                </p>
              </div>
              <div className="p-4 bg-white/70 dark:bg-slate-900/40 rounded-lg border border-amber-100 dark:border-amber-900/40">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Promedio de comisión</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {promedioComision.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-white/70 dark:bg-slate-900/40 rounded-lg border border-amber-100 dark:border-amber-900/40">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Plataformas monitoreadas</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {costosFinancieros.length}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 overflow-hidden">
              <Table>
                <TableHeader className="bg-amber-100/80 dark:bg-amber-900/20">
                  <TableRow>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Base estimada</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                    <TableHead className="text-right">Costo mensual</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costosFinancieros.map((item) => {
                    const costo = item.base * item.comision / 100
                    const esAlta = item.comision >= 10
                    const esMedia = item.comision >= 7
                    return (
                      <TableRow key={item.id} className="bg-white/80 dark:bg-slate-900/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="uppercase text-[10px] tracking-wide">
                              {item.moneda}
                            </Badge>
                            {item.plataforma}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.tipo}</TableCell>
                        <TableCell className="text-right">{formatearMoneda(item.base)}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={esAlta ? "destructive" : esMedia ? "default" : "secondary"}
                            className={esAlta ? "bg-red-500/90" : esMedia ? "bg-amber-500/80" : "bg-emerald-500/70"}
                          >
                            {item.comision.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-amber-700 dark:text-amber-300">
                          {formatearMoneda(costo)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.descripcion}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Controles de Filtro */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Selector de Cuenta */}
                <Select value={cuentaSeleccionada.id.toString()} onValueChange={(value) => {
                  const cuenta = cuentasBancarias.find(c => c.id.toString() === value)
                  if (cuenta) setCuentaSeleccionada(cuenta)
                }}>
                  <SelectTrigger className="w-full md:w-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentasBancarias.map((cuenta) => (
                      <SelectItem key={cuenta.id} value={cuenta.id.toString()}>
                        {cuenta.banco} - {cuenta.numero_cuenta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en movimientos..."
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    className="pl-9 w-full md:w-80"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Modo Conciliación
                </Button>
              </div>
            </div>

            {/* Filtros Adicionales */}
            <div className="flex gap-4 mt-4">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo de movimiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="deposito">Depósitos</SelectItem>
                  <SelectItem value="transferencia">Transferencias</SelectItem>
                  <SelectItem value="retiro">Retiros</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroConciliacion} onValueChange={setFiltroConciliacion}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Estado conciliación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="conciliado">Conciliados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Movimientos */}
        <Card>
          <CardHeader>
            <CardTitle>Movimientos Bancarios</CardTitle>
            <CardDescription>
              {movimientosFiltrados.length} movimientos encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Movimiento</TableHead>
                    <TableHead>Nº Operación</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosPaginados.map((movimiento) => (
                    <TableRow key={movimiento.id} className={movimiento.is_conciliado ? "bg-green-50 dark:bg-green-900/10" : ""}>
                      <TableCell className="font-medium">
                        {formatearFecha(movimiento.fecha)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={movimiento.movimiento.includes("Deposito") ? "default" : "secondary"}>
                          {movimiento.movimiento}
                        </Badge>
                      </TableCell>
                      <TableCell>{movimiento.numero_operacion}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {movimiento.detalle}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {movimiento.comprobante}
                      </TableCell>
                      <TableCell className="text-right">
                        {movimiento.debito > 0 ? formatearMoneda(movimiento.debito) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {movimiento.credito > 0 ? formatearMoneda(movimiento.credito) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatearMoneda(movimiento.saldo)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={movimiento.is_conciliado ? "default" : "secondary"}
                          className={movimiento.is_conciliado ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : ""}
                        >
                          {movimiento.is_conciliado ? "Conciliado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Mostrando {((paginaActual - 1) * itemsPorPagina) + 1} a {Math.min(paginaActual * itemsPorPagina, movimientosFiltrados.length)} de {movimientosFiltrados.length} movimientos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                  disabled={paginaActual === 1}
                  className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-all duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {paginaActual} / {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-all duration-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Barra de Herramientas Inferior */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros Avanzados
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-200"
                >
                  <Headphones className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Vista de Gráficos */
          <div className="space-y-6">
            {/* Resumen de Saldos */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Saldo Bancarios ($)</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">0</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Saldo Bancarios (USD)</p>
                      <p className="text-3xl font-bold text-green-900 dark:text-green-100">0,00</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Saldo Bancarios (total $)</p>
                      <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">0</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Evolución de Cuentas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Evolución de Ingresos
                  </CardTitle>
                  <CardDescription>Evolución mensual de los ingresos bancarios</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full relative">
                    {/* Líneas de referencia de fondo */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[0, 20, 40, 60, 80, 100].map((line, index) => {
                        const maxIngresos = Math.max(...evolucionCuentasData.map(d => d.ingresos))
                        const valorLinea = Math.round((100 - line) * maxIngresos / 100 / 1000000)
                        return (
                          <div key={index} className="flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700 opacity-60"></div>
                            <span className="text-xs text-muted-foreground ml-2 font-medium">
                              {valorLinea}M
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Gráfico de Barras Simulado - Solo Ingresos */}
                    <div className="h-full flex items-end justify-between gap-1 relative z-10">
                      {(() => {
                        // Calcular el valor máximo de ingresos una sola vez
                        const maxIngresos = Math.max(...evolucionCuentasData.map(d => d.ingresos))
                        console.log('Max ingresos calculado:', maxIngresos)
                        
                        return evolucionCuentasData.map((item, index) => {
                          // Normalizar a porcentaje del contenedor (altura máxima 95% para mejor uso del espacio)
                          const altura = Math.max((item.ingresos / maxIngresos) * 95, 5) // Altura mínima de 5%
                          
                          // Debug: verificar valores
                          if (index === 0) {
                            console.log('Debug gráfico:', {
                              maxIngresos,
                              itemIngresos: item.ingresos,
                              altura,
                              alturaPx: `${altura}%`
                            })
                          }
                        
                        return (
                          <div key={index} className="flex flex-col items-center gap-2 flex-1 group">
                            {/* Barra principal de ingresos */}
                            <div 
                              className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all duration-500 hover:from-green-600 hover:to-green-500 relative group/bar shadow-sm border border-green-600"
                              style={{ height: `${altura}%` }}
                              title={`${item.mes}: Ingresos ${formatearMoneda(item.ingresos)}`}
                            >
                              {/* Valor en la parte superior de la barra */}
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-slate-600 dark:text-slate-400 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                {Math.round(item.ingresos / 1000000)}M
                              </div>
                              
                              {/* Tooltip con información detallada */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
                                <div className="font-semibold">{item.mes}</div>
                                <div className="text-green-300">Ingresos: {formatearMoneda(item.ingresos)}</div>
                                <div className="text-slate-300">Egresos: {formatearMoneda(item.egresos)}</div>
                                <div className="text-slate-300">Saldo: {formatearMoneda(item.valor)}</div>
                              </div>
                            </div>
                            
                            <span className="text-xs text-muted-foreground transform -rotate-45 origin-left">
                              {item.mes.split('-')[1]}
                            </span>
                          </div>
                        )
                        })
                      })()}
                    </div>
                    
                    {/* Leyenda del gráfico */}
                    <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-muted-foreground font-medium">Ingresos Mensuales</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Totales por Entidad */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Totales por Entidad
                  </CardTitle>
                  <CardDescription>Distribución de saldos por banco</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Pie Chart Simulado con múltiples segmentos */}
                    <div className="flex items-center justify-center h-64">
                      <div className="relative w-48 h-48">
                        {/* Segmentos del pie chart */}
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                          {totalesPorEntidad.map((entidad, index) => {
                            const startAngle = index === 0 ? 0 : totalesPorEntidad.slice(0, index).reduce((acc, e) => acc + (e.porcentaje * 3.6), 0)
                            const endAngle = startAngle + (entidad.porcentaje * 3.6)
                            const isLargeArc = entidad.porcentaje > 50 ? 1 : 0
                            
                            // Crear path para el segmento
                            const radius = 96
                            const centerX = 96
                            const centerY = 96
                            
                            const startX = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180)
                            const startY = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180)
                            const endX = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180)
                            const endY = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180)
                            
                            const pathData = [
                              `M ${centerX} ${centerY}`,
                              `L ${startX} ${startY}`,
                              `A ${radius} ${radius} 0 ${isLargeArc} 1 ${endX} ${endY}`,
                              'Z'
                            ].join(' ')
                            
                            // Mapear colores de Tailwind a colores hexadecimales
                            const colorMap: { [key: string]: string } = {
                              'from-blue-500 to-blue-600': '#3b82f6',
                              'from-green-500 to-green-600': '#10b981',
                              'from-purple-500 to-purple-600': '#8b5cf6',
                              'from-orange-500 to-orange-600': '#f97316',
                              'from-pink-500 to-pink-600': '#ec4899',
                              'from-gray-500 to-gray-600': '#6b7280',
                              'from-slate-500 to-slate-600': '#64748b',
                              'from-blue-700 to-blue-500': '#1d4ed8',
                              'from-indigo-500 to-indigo-600': '#6366f1',
                              'from-purple-700 to-purple-500': '#6d28d9',
                              'from-amber-500 to-amber-600': '#f59e0b',
                              'from-rose-500 to-rose-600': '#f43f5e'
                            }
                            
                            return (
                              <div key={index} className="absolute inset-0 w-full h-full group" title={`${entidad.entidad}: ${entidad.porcentaje}% (${formatearMoneda(entidad.valor)})`}>
                                <svg className="w-full h-full">
                                  <path
                                    d={pathData}
                                    fill={colorMap[entidad.color] || '#6b7280'}
                                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                  />
                                </svg>
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* Centro del pie chart */}
                        <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-inner">
                          <div className="text-center">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total</span>
                            <div className="text-xs text-muted-foreground">
                              {formatearMoneda(totalesPorEntidad.reduce((sum, e) => sum + e.valor, 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Leyenda mejorada */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {totalesPorEntidad.map((entidad, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${entidad.color} shadow-sm`}></div>
                            <div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {entidad.entidad}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                {entidad.porcentaje}% del total
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {formatearMoneda(entidad.valor)}
                            </p>
                            <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                              <div 
                                className={`h-1.5 rounded-full bg-gradient-to-r ${entidad.color}`}
                                style={{ width: `${entidad.porcentaje}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Evolución de Cuentas USD */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Evolución de Cuentas USD
                </CardTitle>
                <CardDescription>Evolución mensual de cuentas en dólares</CardDescription>
              </CardHeader>
              <CardContent>
                {tieneDatosUSD ? (
                  <div className="h-48 w-full">
                    {/* Gráfico de USD si hubiera datos */}
                    <div className="h-full flex items-end justify-between gap-1">
                      {evolucionCuentasUSD.map((item, index) => {
                        const altura = (item.valor / 1000000) * 100 // Normalizar a porcentaje
                        return (
                          <div key={index} className="flex flex-col items-center gap-2 flex-1 group">
                            <div 
                              className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all duration-500 hover:from-green-600 hover:to-green-500"
                              style={{ height: `${altura}%` }}
                              title={`${item.mes}: $${item.valor.toLocaleString()}`}
                            />
                            <span className="text-xs text-muted-foreground transform -rotate-45 origin-left">
                              {item.mes.split('-')[1]}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                    <div className="text-center max-w-md">
                      <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <DollarSign className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Sin cuentas en USD
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Actualmente no tienes cuentas bancarias en dólares estadounidenses configuradas.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Configurar Cuenta USD
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estadísticas Adicionales */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Crecimiento Mensual</p>
                      <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                        +{estadisticasMensuales.crecimientoMensual}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Promedio Diario</p>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                        {formatearMoneda(estadisticasMensuales.promedioDiario)}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 border-violet-200 dark:border-violet-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Saldo Neto</p>
                      <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">
                        {formatearMoneda(estadisticasMensuales.saldoNeto)}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-violet-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        </div>
      </ERPLayout>
    </Protected>
  )
}
