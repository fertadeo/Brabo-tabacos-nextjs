"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PeriodSelectorModal } from "@/components/period-selector-modal"
import { ExportCashModal } from "@/components/export-cash-modal"
import { CashSummaryCards } from "@/components/cash-summary-cards"
import { CashMovementsTable } from "@/components/cash-movements-table"
import { 
  getDayCashSummary, 
  getPeriodCashSummary, 
  getMonthlyCashSummary, 
  getCashMovements,
  DayCashSummary,
  PeriodCashSummary,
  MonthlyCashSummary,
  CashMovement
} from "@/lib/api"
import { Calendar, Download, AlertCircle } from "lucide-react"

export default function CajaPage() {
  // Estados para los datos
  const [daySummary, setDaySummary] = useState<DayCashSummary | undefined>(undefined)
  const [periodSummary, setPeriodSummary] = useState<PeriodCashSummary | undefined>(undefined)
  const [monthlySummary, setMonthlySummary] = useState<MonthlyCashSummary | undefined>(undefined)
  const [movements, setMovements] = useState<CashMovement[]>([])
  
  // Estados de carga
  const [loading, setLoading] = useState(true)
  const [loadingMovements, setLoadingMovements] = useState(false)
  
  // Estados de error
  const [error, setError] = useState<string | null>(null)
  
  // Estados para el período seleccionado
  const [selectedPeriod, setSelectedPeriod] = useState<{from: string, to: string} | null>(null)

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Cargar datos del día actual y resumen mensual (críticos)
      const [dayData, monthlyData] = await Promise.all([
        getDayCashSummary(),
        getMonthlyCashSummary()
      ])
      
      setDaySummary(dayData)
      setMonthlySummary(monthlyData)
      
      // Intentar cargar movimientos por separado (no crítico)
      try {
        const movementsData = await getCashMovements(20)
        setMovements(movementsData)
      } catch (movementsError) {
        console.warn('No se pudieron cargar los movimientos:', movementsError)
        // No establecer error global, solo mostrar mensaje en la tabla
        setMovements([])
      }
    } catch (err) {
      console.error('Error cargando datos iniciales:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodSelect = async (from: string, to: string) => {
    try {
      setLoadingMovements(true)
      setError(null)
      
      // Cargar resumen del período (crítico)
      const periodData = await getPeriodCashSummary(from, to)
      setPeriodSummary(periodData)
      setSelectedPeriod({ from, to })
      
      // Intentar cargar movimientos del período (no crítico)
      try {
        const movementsData = await getCashMovements(50, from, to)
        setMovements(movementsData)
      } catch (movementsError) {
        console.warn('No se pudieron cargar los movimientos del período:', movementsError)
        setMovements([])
      }
    } catch (err) {
      console.error('Error cargando datos del período:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los datos del período')
    } finally {
      setLoadingMovements(false)
    }
  }

  const handleExport = async (format: 'csv' | 'excel', from?: string, to?: string) => {
    try {
      // Aquí implementarías la lógica de exportación
      console.log('Exportando datos:', { format, from, to })
      alert(`Exportando datos en formato ${format.toUpperCase()}${from && to ? ` del ${from} al ${to}` : ''}`)
    } catch (err) {
      console.error('Error exportando datos:', err)
      setError(err instanceof Error ? err.message : 'Error al exportar los datos')
    }
  }

  const resetToDayView = () => {
    setPeriodSummary(undefined)
    setSelectedPeriod(null)
    loadInitialData()
  }

  return (
    <Protected requiredRoles={['gerencia', 'finanzas', 'admin']}>
      <ERPLayout activeItem="caja">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Control de Caja</h1>
              <p className="text-muted-foreground">Gestiona ingresos, egresos y flujo de efectivo</p>
              {selectedPeriod && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">
                    Período: {selectedPeriod.from} - {selectedPeriod.to}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToDayView}
                    className="text-xs"
                  >
                    Ver día actual
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <PeriodSelectorModal onPeriodSelect={handlePeriodSelect} />
              <ExportCashModal onExport={handleExport} />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-600 text-sm">{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Cerrar
              </Button>
            </div>
          )}

          {/* Summary Cards */}
          <CashSummaryCards 
            daySummary={daySummary}
            periodSummary={periodSummary}
            monthlySummary={monthlySummary}
            loading={loading}
          />

          {/* Monthly Summary */}
          {monthlySummary && !selectedPeriod && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Resumen Mensual</CardTitle>
                  <CardDescription>
                    {new Date(monthlySummary.period.year, monthlySummary.period.month - 1).toLocaleDateString('es-AR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Ingresos</span>
                    <span className="text-lg font-semibold text-turquoise-600">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(monthlySummary.current.incomes)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Egresos</span>
                    <span className="text-lg font-semibold text-red-600">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(monthlySummary.current.expenses)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Balance Mensual</span>
                      <span className={`text-xl font-bold ${monthlySummary.current.balance >= 0 ? 'text-turquoise-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('es-AR', {
                          style: 'currency',
                          currency: 'ARS',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(monthlySummary.current.balance)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Comparación con Mes Anterior</CardTitle>
                  <CardDescription>Variaciones respecto al mes anterior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Ingresos</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${monthlySummary.delta.incomes >= 0 ? 'text-turquoise-600' : 'text-red-600'}`}>
                        {monthlySummary.delta.incomes >= 0 ? '+' : ''}{((monthlySummary.delta.incomes / monthlySummary.previous.incomes) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Egresos</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${monthlySummary.delta.expenses >= 0 ? 'text-red-600' : 'text-turquoise-600'}`}>
                        {monthlySummary.delta.expenses >= 0 ? '+' : ''}{((monthlySummary.delta.expenses / monthlySummary.previous.expenses) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Balance</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${monthlySummary.delta.balance >= 0 ? 'text-turquoise-600' : 'text-red-600'}`}>
                        {monthlySummary.delta.balance >= 0 ? '+' : ''}{((monthlySummary.delta.balance / monthlySummary.previous.balance) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Movements */}
          <Card>
            <CardHeader>
              <CardTitle>Movimientos Recientes</CardTitle>
              <CardDescription>
                {selectedPeriod 
                  ? `Movimientos del período ${selectedPeriod.from} - ${selectedPeriod.to}`
                  : 'Últimas transacciones registradas'
                }
                {movements.length === 0 && !loadingMovements && (
                  <span className="text-amber-600 text-xs ml-2">
                    (Servicio de movimientos no disponible)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CashMovementsTable 
                movements={movements} 
                loading={loadingMovements}
              />
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
