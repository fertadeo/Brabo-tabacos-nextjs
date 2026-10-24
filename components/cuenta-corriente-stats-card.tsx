"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react"
import { 
  CuentaCorrienteStats,
  getCuentaCorrienteStats
} from "@/lib/api"

interface CuentaCorrienteStatsCardProps {
  onViewDetails?: () => void
}

export function CuentaCorrienteStatsCard({ onViewDetails }: CuentaCorrienteStatsCardProps) {
  const [stats, setStats] = useState<CuentaCorrienteStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await getCuentaCorrienteStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (err) {
      console.error('Error al cargar estadísticas de cuentas corrientes:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar las estadísticas')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const getUtilizationPercentage = () => {
    if (!stats || stats.total_credit_limit === 0) return 0
    return Math.round((Math.abs(stats.total_balance) / stats.total_credit_limit) * 100)
  }

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600"
    if (percentage >= 70) return "text-orange-600"
    return "text-green-600"
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
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2">Cargando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cuentas Corrientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
            <Button variant="outline" size="sm" onClick={loadStats} className="ml-auto">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cuentas Corrientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  const utilizationPercentage = getUtilizationPercentage()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cuentas Corrientes
          </CardTitle>
          {onViewDetails && (
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalles
            </Button>
          )}
        </div>
        <CardDescription>
          Resumen de las cuentas corrientes activas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Total Cuentas</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{stats.total_accounts}</p>
              <Badge variant={stats.active_accounts > 0 ? "default" : "secondary"}>
                {stats.active_accounts} activas
              </Badge>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Saldo Total</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${stats.total_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.total_balance)}
              </p>
              {stats.total_balance >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* Límite de crédito y utilización */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Límite Total</p>
            <p className="text-sm font-semibold">{formatCurrency(stats.total_credit_limit)}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Utilización</p>
              <p className={`text-sm font-medium ${getUtilizationColor(utilizationPercentage)}`}>
                {utilizationPercentage}%
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  utilizationPercentage >= 90 ? 'bg-red-500' : 
                  utilizationPercentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Alertas */}
        {stats.accounts_over_limit > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-700">
                {stats.accounts_over_limit} cuenta{stats.accounts_over_limit !== 1 ? 's' : ''} en rojo
              </p>
              <p className="text-xs text-red-600">
                Requieren atención inmediata
              </p>
            </div>
          </div>
        )}

        {/* Resumen de estados */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{stats.active_accounts}</p>
            <p className="text-xs text-muted-foreground">Activas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-600">{stats.inactive_accounts}</p>
            <p className="text-xs text-muted-foreground">Inactivas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{stats.accounts_with_balance}</p>
            <p className="text-xs text-muted-foreground">Con Saldo</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
