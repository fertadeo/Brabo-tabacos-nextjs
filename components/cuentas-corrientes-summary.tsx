"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Eye,
  Edit
} from "lucide-react"
// Tipos para datos hardcodeados
interface CuentaCorriente {
  id: number
  client_id: number
  client_name: string
  client_code: string
  balance: number
  credit_limit: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CuentaCorrienteStats {
  total_accounts: number
  active_accounts: number
  inactive_accounts: number
  total_balance: number
  total_credit_limit: number
  accounts_in_red: number
  accounts_near_limit: number
}

// Datos hardcodeados para cuentas corrientes
const cuentasHardcoded: CuentaCorriente[] = [
  {
    id: 1,
    client_id: 1,
    client_name: "Empresa ABC S.A.",
    client_code: "CLI001",
    balance: -15000,
    credit_limit: 100000,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z"
  },
  {
    id: 2,
    client_id: 2,
    client_name: "Distribuidora XYZ",
    client_code: "CLI002",
    balance: 25000,
    credit_limit: 200000,
    is_active: true,
    created_at: "2024-01-05T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z"
  },
  {
    id: 3,
    client_id: 3,
    client_name: "Comercial Tech Solutions",
    client_code: "CLI003",
    balance: -50000,
    credit_limit: 500000,
    is_active: true,
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-01-25T00:00:00Z"
  },
  {
    id: 4,
    client_id: 4,
    client_name: "Ventas Directas SRL",
    client_code: "CLI004",
    balance: 0,
    credit_limit: 50000,
    is_active: false,
    created_at: "2023-12-20T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z"
  }
]

const statsHardcoded: CuentaCorrienteStats = {
  total_accounts: 4,
  active_accounts: 3,
  inactive_accounts: 1,
  total_balance: -40000,
  total_credit_limit: 850000,
  accounts_in_red: 2,
  accounts_near_limit: 1
}
import { CuentaCorrienteModal } from "./cuenta-corriente-modal"

interface CuentasCorrientesSummaryProps {
  onRefresh?: () => void
}

export function CuentasCorrientesSummary({ onRefresh }: CuentasCorrientesSummaryProps) {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([])
  const [stats, setStats] = useState<CuentaCorrienteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaCorriente | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null)
  const [selectedClienteNombre, setSelectedClienteNombre] = useState<string>("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Usar datos hardcodeados
      setCuentas(cuentasHardcoded)
      setStats(statsHardcoded)
      
      // TODO: Descomentar para usar API real
      // const [cuentasResponse, statsResponse] = await Promise.all([
      //   getCuentasCorrientes({ limit: 10 }),
      //   getCuentaCorrienteStats()
      // ])
      // 
      // if (cuentasResponse.success) {
      //   setCuentas(cuentasResponse.data.accounts)
      // }
      // 
      // if (statsResponse.success) {
      //   setStats(statsResponse.data)
      // }
    } catch (err) {
      console.error('Error al cargar cuentas corrientes:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar las cuentas corrientes')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCuenta = (cuenta: CuentaCorriente) => {
    setSelectedCuenta(cuenta)
    setSelectedClienteId(cuenta.client_id)
    setSelectedClienteNombre(cuenta.client_name)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedCuenta(null)
    setSelectedClienteId(null)
    setSelectedClienteNombre("")
  }

  const handleSuccess = () => {
    loadData()
    if (onRefresh) onRefresh()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600"
    if (balance < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getBalanceIcon = (balance: number) => {
    if (balance > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (balance < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <DollarSign className="h-4 w-4 text-gray-500" />
  }

  const getStatusBadge = (cuenta: CuentaCorriente) => {
    if (!cuenta.is_active) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Inactiva
        </Badge>
      )
    }
    
    if (cuenta.balance < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          En Rojo
        </Badge>
      )
    }
    
    if (cuenta.balance > cuenta.credit_limit * 0.8) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-orange-600">
          <AlertTriangle className="h-3 w-3" />
          Cerca del Límite
        </Badge>
      )
    }
    
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Activa
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cuentas Corrientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2">Cargando cuentas corrientes...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cuentas Corrientes
          </CardTitle>
          <CardDescription>
            Resumen de las cuentas corrientes de clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-red-700">{error}</span>
              <Button variant="outline" size="sm" onClick={loadData} className="ml-auto">
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Estadísticas */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <div className="p-1.5 bg-blue-200 dark:bg-blue-800/30 rounded-md">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        Total Cuentas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {stats.total_accounts}
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {stats.active_accounts} activas
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-300">
                        <div className="p-1.5 bg-green-200 dark:bg-green-800/30 rounded-md">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        Saldo Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(stats.total_balance)}
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {stats.active_accounts} con saldo
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <div className="p-1.5 bg-purple-200 dark:bg-purple-800/30 rounded-md">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        Límite Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {formatCurrency(stats.total_credit_limit)}
                      </div>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Crédito disponible
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700 dark:text-orange-300">
                        <div className="p-1.5 bg-orange-200 dark:bg-orange-800/30 rounded-md">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        En Rojo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {stats.accounts_near_limit}
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        cuentas en rojo
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tabla de cuentas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Cuentas Recientes</h3>
                  <Button variant="outline" size="sm" onClick={loadData}>
                    Actualizar
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Saldo</TableHead>
                        <TableHead>Límite</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuentas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No hay cuentas corrientes registradas
                          </TableCell>
                        </TableRow>
                      ) : (
                        cuentas.map((cuenta) => (
                          <TableRow key={cuenta.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{cuenta.client_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {cuenta.client_code}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getBalanceIcon(cuenta.balance)}
                                <span className={`font-medium ${getBalanceColor(cuenta.balance)}`}>
                                  {formatCurrency(cuenta.balance)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(cuenta.credit_limit)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(cuenta)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenCuenta(cuenta)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de cuenta corriente */}
      {selectedClienteId && (
        <CuentaCorrienteModal
          clienteId={selectedClienteId}
          clienteNombre={selectedClienteNombre}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
