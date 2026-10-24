"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ERPLayout } from "@/components/erp-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRole } from "@/app/hooks/useRole"
import {
  getClienteStats,
  getProductStats,
  getDashboardStats,
  REPAIR_ORDER_STATUS_LABELS,
  type ProductStats,
  type DashboardStats,
  type RepairOrderStatus,
} from "@/lib/api"
import { fetchMonthlySalesBreakdown, type MonthlySalesBreakdown } from "@/lib/dashboard-monthly-sales"
import { fetchDashboardInsights, type DashboardInsightsView } from "@/lib/dashboard-insights"
import {
  fetchDashboardChartData,
  type DashboardChartData,
  type DashboardChartPeriod,
} from "@/lib/dashboard-chart-data"
import { DashboardCharts } from "@/components/dashboard-charts"
import {
  Package,
  DollarSign,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Zap,
  Users,
  ShoppingCart,
  Bell,
  ArrowUpRight,
  Calendar,
  Shield,
  Loader2,
  Trophy,
  Wrench,
  Crown,
  AlertCircle,
} from "lucide-react"

export default function Dashboard() {
  const { getCurrentRole, getCurrentRoleLabel, canViewSales, canViewLogistics, canViewFinance, canViewAdministration } = useRole()
  
  // Estados para los datos de la API
  const [loading, setLoading] = useState(true)
  const [clienteStats, setClienteStats] = useState<{ total_clients: number; active_clients: string } | null>(null)
  const [productStats, setProductStats] = useState<ProductStats | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [monthlySales, setMonthlySales] = useState<MonthlySalesBreakdown | null>(null)
  const [insights, setInsights] = useState<DashboardInsightsView | null>(null)
  const [chartData, setChartData] = useState<DashboardChartData | null>(null)
  const [chartPeriod, setChartPeriod] = useState<DashboardChartPeriod>("14d")
  const [salesBlockLoading, setSalesBlockLoading] = useState(false)
  const [repairByStatus, setRepairByStatus] = useState<Record<string, number>>({})

  const loadChartData = async (
    period: DashboardChartPeriod,
    repairStatus: Record<string, number>
  ) => {
    const charts = await fetchDashboardChartData(
      period,
      repairStatus,
      REPAIR_ORDER_STATUS_LABELS
    ).catch(() => null)
    if (charts) setChartData(charts)
  }

  // Cargar datos al montar el componente (incl. GET /api/dashboard/stats para gerencia/finanzas)
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)

        const [clientesData, productosData, dashboardData] = await Promise.allSettled([
          getClienteStats().catch(() => null),
          getProductStats().catch(() => null),
          getDashboardStats().catch(() => null),
        ])

        let productStatsData: ProductStats | null = null

        if (clientesData.status === "fulfilled" && clientesData.value) {
          setClienteStats(clientesData.value)
        }

        if (productosData.status === "fulfilled" && productosData.value) {
          productStatsData = productosData.value
          setProductStats(productStatsData)
        }

        if (dashboardData.status === "fulfilled" && dashboardData.value?.data) {
          setDashboardStats(dashboardData.value.data)
        }

        const monthlyData = await fetchMonthlySalesBreakdown(
          dashboardData.status === "fulfilled" ? dashboardData.value?.data ?? null : null
        ).catch(() => ({
          total: 0,
          fromPos: 0,
          fromOrders: 0,
          fromAggregatedApi: false,
        }))
        setMonthlySales(monthlyData)

        const insightsData = await fetchDashboardInsights(productStatsData).catch(() => null)
        if (insightsData) setInsights(insightsData)

        const repairStatus = insightsData?.repairPipeline.byStatus ?? {}
        setRepairByStatus(repairStatus)
        await loadChartData("14d", repairStatus)
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const handleChartPeriodChange = async (period: DashboardChartPeriod) => {
    setChartPeriod(period)
    setSalesBlockLoading(true)
    try {
      await loadChartData(period, repairByStatus)
    } finally {
      setSalesBlockLoading(false)
    }
  }

  const inventoryValue = (() => {
    const raw = productStats?.total_stock_value
    if (raw == null) return 0
    return parseFloat(String(raw).replace(/[^\d.-]/g, "") || "0") || 0
  })()

  return (
    <ERPLayout activeItem="dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {getCurrentRoleLabel()}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Resumen general de venta minorista -{" "}
                {new Date().toLocaleDateString("es-ES", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Filtrar período
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notificaciones
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  0
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(canViewSales() || canViewFinance()) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-turquoise-600">
                      ${(dashboardStats?.dailySales ?? 0).toLocaleString("es-AR")}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-turquoise-500" />
                      {dashboardStats?.dailySalesFromOrders != null || dashboardStats?.dailySalesFromPos != null ? (
                        <span>
                          Pedidos: ${(dashboardStats?.dailySalesFromOrders ?? 0).toLocaleString('es-AR')} · POS: ${(dashboardStats?.dailySalesFromPos ?? 0).toLocaleString('es-AR')}
                        </span>
                      ) : (
                        'Pedidos del día + ventas POS del día'
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos activos</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.activeOrders ?? 0}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ClipboardList className="h-3 w-3 text-turquoise-500" />
                    Pendientes / en proceso
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {clienteStats?.active_clients || '0'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-turquoise-500" />
                    De {clienteStats?.total_clients || 0} totales
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    {(productStats?.low_stock_count || 0) + (productStats?.out_of_stock_count || 0)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">Stock bajo mínimo</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stock y Ventas */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventario Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-turquoise-600">
                    ${inventoryValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Package className="h-3 w-3 text-turquoise-500" />
                    {(productStats?.total_stock_quantity ?? 0).toLocaleString("es-AR")} unidades (
                    {productStats?.active_products ?? "—"} activos)
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-turquoise-600">
                    ${(monthlySales?.total ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <TrendingUp className="h-3 w-3 text-turquoise-500" />
                    {monthlySales && monthlySales.total > 0 ? (
                      <span>
                        POS: ${monthlySales.fromPos.toLocaleString("es-AR")} · WooCommerce:{" "}
                        ${monthlySales.fromOrders.toLocaleString("es-AR")}
                      </span>
                    ) : (
                      <span>Sin ventas registradas este mes</span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <DashboardCharts
          loading={loading}
          salesBlockLoading={salesBlockLoading}
          data={chartData}
          period={chartPeriod}
          onPeriodChange={(p) => void handleChartPeriodChange(p)}
        />

        {/* Destacados del mes */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Destacados del mes</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Mayor precio unitario vendido
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : insights?.topProduct ? (
                  <>
                    <p className="font-semibold line-clamp-2">{insights.topProduct.product_name}</p>
                    <p className="text-2xl font-bold text-turquoise-600 mt-1">
                      ${insights.topProduct.unit_price.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {insights.topProduct.source === "pos" ? "POS" : "WooCommerce"}
                      {insights.topProduct.reference_label
                        ? ` · ${insights.topProduct.reference_label}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin líneas de venta con precio en el mes</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-turquoise-500" />
                  Reparación más elevada
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : insights?.topRepair ? (
                  <>
                    <p className="font-semibold">{insights.topRepair.client_name}</p>
                    <p className="text-2xl font-bold text-turquoise-600 mt-1">
                      ${insights.topRepair.total_amount.toLocaleString("es-AR")}
                    </p>
                    <Link
                      href={`/reparaciones/${insights.topRepair.id}`}
                      className="text-xs text-turquoise-500 hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      {insights.topRepair.repair_number}
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin reparaciones registradas en el mes</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Mejor cliente del mes
                </CardTitle>
                <CardDescription>Ventas POS + pedidos + reparaciones</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : insights?.topClient ? (
                  <>
                    <p className="font-semibold line-clamp-2">{insights.topClient.client_name}</p>
                    <p className="text-2xl font-bold text-turquoise-600 mt-1">
                      ${insights.topClient.total_amount.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      POS: ${insights.topClient.from_pos.toLocaleString("es-AR")} · Pedidos:{" "}
                      ${insights.topClient.from_orders.toLocaleString("es-AR")} · Taller:{" "}
                      ${insights.topClient.from_repairs.toLocaleString("es-AR")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin movimientos por cliente en el mes</p>
                )}
              </CardContent>
            </Card>
          </div>
          {insights && !insights.fromApi && (
            <p className="text-xs text-muted-foreground mt-2">
              Calculado en el navegador. Cuando el backend exponga{" "}
              <code className="text-xs">GET /api/dashboard/insights</code> será más rápido y preciso (ver{" "}
              <code className="text-xs">docs/dashboard-insights-backend.md</code>).
            </p>
          )}
        </div>

        {/* Atención hoy + Taller */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Atención hoy
              </CardTitle>
              <CardDescription>Pendientes que requieren acción</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : insights?.alerts.length ? (
                <ul className="space-y-3">
                  {insights.alerts.map((alert) => (
                    <li key={alert.id}>
                      <Link
                        href={alert.href ?? "#"}
                        className="flex items-center justify-between gap-2 rounded-md border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{alert.title}</p>
                          {alert.description && (
                            <p className="text-xs text-muted-foreground">{alert.description}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            alert.severity === "danger"
                              ? "destructive"
                              : alert.severity === "warning"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {alert.count}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground py-2">Nada urgente por ahora</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-5 w-5" />
                Taller de reparaciones
              </CardTitle>
              <CardDescription>Órdenes abiertas y ticket del mes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{insights?.repairPipeline.openCount ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Órdenes abiertas</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-turquoise-600">
                        ${(insights?.repairPipeline.amountInWorkshop ?? 0).toLocaleString("es-AR")}
                      </div>
                      <div className="text-xs text-muted-foreground">Monto en taller</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ticket promedio (mes)</span>
                    <span className="font-medium">
                      ${(insights?.repairPipeline.monthAverageTicket ?? 0).toLocaleString("es-AR", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  {insights?.repairPipeline.byStatus &&
                    Object.keys(insights.repairPipeline.byStatus).length > 0 && (
                      <div className="space-y-1 border-t pt-3">
                        {Object.entries(insights.repairPipeline.byStatus).map(([status, count]) => (
                          <div key={status} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {REPAIR_ORDER_STATUS_LABELS[status as RepairOrderStatus] ?? status}
                            </span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                    <Link href="/reparaciones">Ver reparaciones</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pedidos y Integraciones */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Resumen de Pedidos
              </CardTitle>
              <CardDescription>Estado general de pedidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{dashboardStats?.activeOrders ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">Pedidos activos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-turquoise-600">
                    ${(dashboardStats?.dailySalesFromOrders ?? 0).toLocaleString('es-AR')}
                  </div>
                  <div className="text-xs text-muted-foreground">Ventas hoy (pedidos)</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Activos (pendientes / en proceso)</span>
                  <Badge variant="outline">{dashboardStats?.activeOrders ?? '—'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Estado de Integraciones
              </CardTitle>
              <CardDescription>Conexiones con servicios externos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-turquoise-500 rounded-full"></div>
                    <span className="text-sm">WooCommerce</span>
                  </div>
                  <Badge variant="default" className="bg-turquoise-500">
                    Activo
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-turquoise-500 rounded-full"></div>
                    <span className="text-sm">ARCA</span>
                  </div>
                  <Badge variant="default" className="bg-turquoise-500">
                    Activo
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                <Zap className="h-4 w-4 mr-2" />
                Configurar integraciones
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </ERPLayout>
  )
}
