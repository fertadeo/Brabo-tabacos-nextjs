"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getSales,
  getSalesStats,
  getOrders,
  getOrderStats,
  getSale,
  getProductById,
  type Sale,
  type SalesStats,
  type Order,
  type OrderStats,
  type SaleResponseData,
  type SalePaymentMethod,
  type ApiErrorWithStatus,
} from "@/lib/api"
import { generateSaleReceiptPdf } from "@/lib/generate-sale-receipt-pdf"
import { saleItemsToReceiptItems, saleItemCatalogProductIds } from "@/lib/sale-items"
import { SaleDetailModal } from "@/components/sale-detail-modal"
import { SaleEditModal } from "@/components/sale-edit-modal"
import { OrderDetailModal } from "@/components/order-detail-modal"
import { useRole } from "@/app/hooks/useRole"
import { canEditSale } from "@/lib/sale-edit"
import { Pagination } from "@/components/ui/pagination"
import {
  Receipt,
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
  Loader2,
  TrendingUp,
  ExternalLink,
  FileDown,
} from "lucide-react"
import { toast } from "sonner"

type OrderStatusFilter =
  | "all"
  | "pendiente_preparacion"
  | "listo_despacho"
  | "pagado"
  | "aprobado"
  | "en_proceso"
  | "completado"
  | "cancelado"

const PAYMENT_METHODS: { value: SalePaymentMethod; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mixto", label: "Mixto" },
]

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

function getSyncStatusBadge(sync_status?: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendiente", variant: "secondary" },
    synced: { label: "Sincronizado", variant: "default" },
    error: { label: "Error", variant: "destructive" },
  }
  const s = map[sync_status ?? ""] ?? { label: sync_status ?? "—", variant: "outline" as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function getPaymentLabel(m: SalePaymentMethod) {
  return PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m
}

function pickClientPhone(saleData: SaleResponseData): string | undefined {
  const raw = saleData as SaleResponseData & {
    client_phone?: string | null
    client?: { phone?: string | null } | null
  }
  return raw.client_phone?.trim() || raw.client?.phone?.trim() || undefined
}

function pickClientAddress(saleData: SaleResponseData): string | undefined {
  const raw = saleData as SaleResponseData & {
    client_address?: string | null
    client_city?: string | null
    client?: { address?: string | null; city?: string | null } | null
  }
  const address = raw.client_address?.trim() || raw.client?.address?.trim() || ""
  const city = raw.client_city?.trim() || raw.client?.city?.trim() || ""
  const joined = [address, city].filter(Boolean).join(", ")
  return joined || undefined
}

export default function VentasPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"pos" | "pedidos">("pos")

  // Ventas POS
  const [sales, setSales] = useState<Sale[]>([])
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null)
  const [salesLoading, setSalesLoading] = useState(true)
  const [salesPage, setSalesPage] = useState(1)
  const [salesTotalPages, setSalesTotalPages] = useState(1)
  const [salesTotal, setSalesTotal] = useState(0)
  const [salesDateFrom, setSalesDateFrom] = useState("")
  const [salesDateTo, setSalesDateTo] = useState("")
  const [salesPaymentMethod, setSalesPaymentMethod] = useState<string>("all")
  const [salesSyncStatus, setSalesSyncStatus] = useState<string>("all")
  const { hasAnyOfRoles } = useRole()
  const [selectedSale, setSelectedSale] = useState<SaleResponseData | null>(null)
  const [saleDetailOpen, setSaleDetailOpen] = useState(false)
  const [saleEditOpen, setSaleEditOpen] = useState(false)
  const [downloadingPdfSaleId, setDownloadingPdfSaleId] = useState<number | null>(null)

  // Pedidos
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersStats, setOrdersStats] = useState<OrderStats | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersSearch, setOrdersSearch] = useState("")
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<OrderStatusFilter>("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)

  const loadSales = async () => {
    setSalesLoading(true)
    try {
      const params: Parameters<typeof getSales>[0] = {
        page: salesPage,
        limit: 20,
      }
      if (salesDateFrom) params.date_from = salesDateFrom
      if (salesDateTo) params.date_to = salesDateTo
      if (salesPaymentMethod !== "all") params.payment_method = salesPaymentMethod as SalePaymentMethod
      if (salesSyncStatus !== "all") params.sync_status = salesSyncStatus as "pending" | "synced" | "error"

      const res = await getSales(params)
      console.log("[Ventas POS] Respuesta getSales:", { params, res, dataKeys: res.data ? Object.keys(res.data as object) : [] })
      // Backend: GET /api/sales devuelve data.sales (array), data.total. En producción a veces hay un nivel extra (data.data.sales)
      const raw = res.data as { sales?: Sale[]; total?: number; limit?: number; data?: { sales?: Sale[]; total?: number } } | Sale[] | undefined
      const data = raw && typeof raw === "object" && !Array.isArray(raw) && raw.data && typeof raw.data === "object"
        ? raw.data
        : raw
      let list: Sale[] = []
      let total = 0
      const limit = params?.limit ?? 20
      if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.sales)) {
        list = data.sales
        total = typeof data.total === "number" ? data.total : list.length
      } else if (Array.isArray(data)) {
        list = data
        total = list.length
      }
      console.log("[Ventas POS] Datos parseados:", { listLength: list.length, total, limit, primeraVenta: list[0] ?? null })
      setSales(list)
      setSalesTotal(total)
      setSalesTotalPages(Math.max(1, Math.ceil(total / limit)))
    } catch (e) {
      const err = e as ApiErrorWithStatus
      const status = err?.status
      if (status === 401) {
        toast.error("Sesión expirada o no válida. Volvé a iniciar sesión.")
        router.replace("/login")
        return
      }
      if (status === 403) {
        toast.error("No tenés permiso para ver el listado de ventas.")
        router.replace("/403")
        return
      }
      const message = e instanceof Error ? e.message : "Error al cargar ventas POS"
      console.error("[Ventas POS] loadSales:", e)
      toast.error(message)
      setSales([])
    } finally {
      setSalesLoading(false)
    }
  }

  const loadSalesStats = async () => {
    try {
      const res = await getSalesStats()
      console.log("[Ventas POS] Estadísticas getSalesStats:", res.data)
      setSalesStats(res.data ?? null)
    } catch (e) {
      const err = e as ApiErrorWithStatus
      if (err?.status === 401) {
        toast.error("Sesión expirada o no válida. Volvé a iniciar sesión.")
        router.replace("/login")
        return
      }
      if (err?.status === 403) {
        toast.error("No tenés permiso para ver estadísticas de ventas.")
        router.replace("/403")
        return
      }
      setSalesStats(null)
    }
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const params: Parameters<typeof getOrders>[0] = {
        page: ordersPage,
        limit: 20,
      }
      if (ordersSearch) params.search = ordersSearch
      if (ordersStatusFilter !== "all") params.status = ordersStatusFilter

      const res = await getOrders(params)
      const list = res.data?.orders ?? []
      const pagination = res.data?.pagination

      setOrders(list)
      if (pagination) {
        setOrdersTotalPages(pagination.totalPages)
        setOrdersTotal(pagination.total)
      } else {
        setOrdersTotalPages(1)
        setOrdersTotal(list.length)
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar pedidos")
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadOrdersStats = async () => {
    try {
      const res = await getOrderStats()
      setOrdersStats(res.data ?? null)
    } catch {
      setOrdersStats(null)
    }
  }

  useEffect(() => {
    if (activeTab === "pos") {
      loadSales()
    }
  }, [activeTab, salesPage, salesDateFrom, salesDateTo, salesPaymentMethod, salesSyncStatus])

  useEffect(() => {
    if (activeTab === "pedidos") {
      loadOrders()
    }
  }, [activeTab, ordersPage, ordersSearch, ordersStatusFilter])

  useEffect(() => {
    if (activeTab === "pos") loadSalesStats()
    else loadOrdersStats()
  }, [activeTab])

  const openSaleDetail = async (sale: Sale) => {
    try {
      const res = await getSale(sale.id)
      console.log("[Ventas POS] Detalle venta getSale:", { saleId: sale.id, data: res.data, itemsCount: res.data?.items?.length ?? 0 })
      setSelectedSale(res.data)
      setSaleDetailOpen(true)
    } catch (e) {
      const err = e as ApiErrorWithStatus
      if (err?.status === 401) {
        toast.error("Sesión expirada. Volvé a iniciar sesión.")
        router.replace("/login")
        return
      }
      if (err?.status === 403) {
        toast.error("No tenés permiso para ver el detalle de la venta.")
        router.replace("/403")
        return
      }
      toast.error(e instanceof Error ? e.message : "Error al cargar detalle de la venta")
    }
  }

  const downloadSaleReceiptPdf = async (s: Sale) => {
    if (downloadingPdfSaleId != null) return
    setDownloadingPdfSaleId(s.id)
    try {
      const res = await getSale(s.id)
      const saleData = res.data
      if (!saleData?.items?.length) {
        toast.error("No hay ítems en esta venta para generar el comprobante.")
        return
      }
      const productIds = saleItemCatalogProductIds(saleData.items)
      const productNames =
        productIds.length > 0
          ? await Promise.all(
              productIds.map(async (id) => {
                try {
                  const p = await getProductById(id)
                  return { id, name: p.name }
                } catch {
                  return { id, name: `Producto #${id}` }
                }
              })
            ).then((arr) => Object.fromEntries(arr.map(({ id, name }) => [id, name])))
          : {}
      const cartItems = saleItemsToReceiptItems(saleData.items, productNames)
      generateSaleReceiptPdf({
        sale: saleData,
        cartItems,
        clientName: s.client_name ?? "Consumidor final",
        clientPhone: pickClientPhone(saleData),
        clientAddress: pickClientAddress(saleData),
      })
      toast.success("Comprobante descargado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar el comprobante")
    } finally {
      setDownloadingPdfSaleId(null)
    }
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
      <ERPLayout activeItem="ventas">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Ventas</h1>
              <p className="text-muted-foreground">
                Todas las ventas: POS (local) y pedidos (WooCommerce y otros canales)
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pos" | "pedidos")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="pos" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Ventas POS
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Pedidos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pos" className="space-y-4">
              {/* Stats POS */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total ventas</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesStats?.total_sales ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Registros</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monto total</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-turquoise-600">
                      ${(salesStats?.total_amount ?? 0).toLocaleString("es-AR")}
                    </div>
                    <p className="text-xs text-muted-foreground">POS</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ventas hoy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesStats?.sales_today ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Del día</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pend. sincronización</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesStats?.pending_sync ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Con WooCommerce</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Listado de ventas POS</CardTitle>
                  <CardDescription>Ventas realizadas en el punto de venta local</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Input
                      type="date"
                      placeholder="Desde (todo)"
                      className="w-40"
                      value={salesDateFrom}
                      onChange={(e) => setSalesDateFrom(e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="Hasta (todo)"
                      className="w-40"
                      value={salesDateTo}
                      onChange={(e) => setSalesDateTo(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSalesDateFrom("")
                        setSalesDateTo("")
                      }}
                    >
                      Limpiar fechas
                    </Button>
                    <Select value={salesPaymentMethod} onValueChange={setSalesPaymentMethod}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {PAYMENT_METHODS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={salesSyncStatus} onValueChange={setSalesSyncStatus}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Sincronización" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="synced">Sincronizado</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => loadSales()} disabled={salesLoading}>
                      <RefreshCw className={`h-4 w-4 ${salesLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>

                  {salesLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Cargando ventas...</p>
                    </div>
                  ) : sales.length === 0 ? (
                    <div className="text-center py-12">
                      <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No hay ventas POS con los filtros aplicados</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nº Venta</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Método de pago</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Sincronización</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sales.map((s) => (
                            <TableRow
                              key={s.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => openSaleDetail(s)}
                            >
                              <TableCell className="font-medium">{s.sale_number}</TableCell>
                              <TableCell>{formatDate(s.sale_date)}</TableCell>
                              <TableCell>{s.client_name ?? (s.client_id ? `#${s.client_id}` : "—")}</TableCell>
                              <TableCell>{getPaymentLabel(s.payment_method)}</TableCell>
                              <TableCell>
                                ${s.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>{getSyncStatusBadge(s.sync_status)}</TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openSaleDetail(s)}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadSaleReceiptPdf(s)}
                                    disabled={downloadingPdfSaleId === s.id}
                                    title="Descargar comprobante de venta"
                                  >
                                    {downloadingPdfSaleId === s.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <FileDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {salesTotalPages > 1 && (
                        <div className="mt-4">
                          <Pagination
                            currentPage={salesPage}
                            totalPages={salesTotalPages}
                            onPageChange={setSalesPage}
                            isLoading={salesLoading}
                          />
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        Mostrando {(salesPage - 1) * 20 + 1} - {Math.min(salesPage * 20, salesTotal)} de {salesTotal}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pedidos" className="space-y-4">
              {/* Stats Pedidos */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total pedidos</CardTitle>
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{ordersStats?.total_orders ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Registrados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{ordersStats?.pending_orders ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Requieren atención</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-turquoise-600">{ordersStats?.completed_orders ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Entregados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monto total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-turquoise-600">
                      ${(ordersStats?.total_amount ?? 0).toLocaleString("es-AR")}
                    </div>
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Listado de pedidos</CardTitle>
                    <CardDescription>Pedidos WooCommerce, mayorista y locales (no cobrados en caja POS)</CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/pedidos">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ir a Pedidos
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar pedidos..."
                        className="pl-8"
                        value={ordersSearch}
                        onChange={(e) => setOrdersSearch(e.target.value)}
                      />
                    </div>
                    <Select value={ordersStatusFilter} onValueChange={(v) => setOrdersStatusFilter(v as OrderStatusFilter)}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendiente_preparacion">Pendiente preparación</SelectItem>
                        <SelectItem value="en_proceso">En proceso</SelectItem>
                        <SelectItem value="completado">Completado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => loadOrders()} disabled={ordersLoading}>
                      <RefreshCw className={`h-4 w-4 ${ordersLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>

                  {ordersLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Cargando pedidos...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No hay pedidos con los filtros aplicados</p>
                      <Button asChild variant="link" className="mt-2">
                        <Link href="/pedidos">Abrir módulo de Pedidos</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((o) => (
                            <TableRow
                              key={o.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                setSelectedOrder(o)
                                setOrderDetailOpen(true)
                              }}
                            >
                              <TableCell className="font-medium">
                                {o.order_number ?? `PED-${o.id}`}
                              </TableCell>
                              <TableCell>{o.client_name ?? `#${o.client_id}`}</TableCell>
                              <TableCell>{formatDate(o.order_date ?? o.created_at)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{o.status ?? "—"}</Badge>
                              </TableCell>
                              <TableCell>
                                $
                                {typeof o.total_amount === "number"
                                  ? o.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })
                                  : String(o.total_amount ?? "0")}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(o)
                                    setOrderDetailOpen(true)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {ordersTotalPages > 1 && (
                        <div className="mt-4">
                          <Pagination
                            currentPage={ordersPage}
                            totalPages={ordersTotalPages}
                            onPageChange={setOrdersPage}
                            isLoading={ordersLoading}
                          />
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        Mostrando {(ordersPage - 1) * 20 + 1} - {Math.min(ordersPage * 20, ordersTotal)} de {ordersTotal}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <SaleDetailModal
          sale={selectedSale}
          isOpen={saleDetailOpen}
          onClose={() => {
            setSaleDetailOpen(false)
            setSelectedSale(null)
          }}
          canEdit={selectedSale ? canEditSale(selectedSale, hasAnyOfRoles) : false}
          onEdit={() => {
            setSaleDetailOpen(false)
            setSaleEditOpen(true)
          }}
        />
        <SaleEditModal
          sale={selectedSale}
          isOpen={saleEditOpen}
          onClose={() => setSaleEditOpen(false)}
          onSaved={(updated) => {
            setSelectedSale(updated)
            setSaleEditOpen(false)
            setSaleDetailOpen(true)
            void loadSales()
          }}
        />
        <OrderDetailModal
          order={selectedOrder}
          isOpen={orderDetailOpen}
          onClose={() => {
            setOrderDetailOpen(false)
            setSelectedOrder(null)
          }}
          onStatusUpdate={() => loadOrders()}
        />
      </ERPLayout>
    </Protected>
  )
}
