import {
  getDashboardInsights,
  getSales,
  getOrders,
  getRepairOrders,
  getRepairOrderStats,
  getProductStats,
  getClienteById,
  type DashboardInsightsPayload,
  type DashboardInsightAlert,
  type DashboardTopProductByUnitPrice,
  type DashboardTopRepairOrder,
  type DashboardTopClient,
  type Sale,
  type Order,
  type RepairOrder,
  type SaleItemResponse,
  type OrderItem,
  type ProductStats,
} from "@/lib/api"
import { getCalendarMonthRange } from "@/lib/dashboard-monthly-sales"

export interface DashboardInsightsView {
  period: { dateFrom: string; dateTo: string }
  topProduct: DashboardTopProductByUnitPrice | null
  topRepair: DashboardTopRepairOrder | null
  topClient: DashboardTopClient | null
  alerts: DashboardInsightAlert[]
  repairPipeline: {
    byStatus: Record<string, number>
    openCount: number
    monthAverageTicket: number
    amountInWorkshop: number
  }
  fromApi: boolean
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^\d.-]/g, "") || "0")
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const CLIENT_PLACEHOLDER_RE = /^Cliente\s*#\d+$/i

function needsClientNameResolution(name: string | undefined | null, clientId?: number | null): boolean {
  if (clientId == null || clientId <= 0) return false
  const n = (name ?? "").trim()
  return !n || n === "—" || n === "Cliente" || CLIENT_PLACEHOLDER_RE.test(n)
}

async function resolveClientNamesByIds(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((id) => id > 0))]
  const map = new Map<number, string>()
  if (!unique.length) return map

  const results = await Promise.allSettled(unique.map((id) => getClienteById(id)))
  results.forEach((result, index) => {
    if (result.status !== "fulfilled") return
    const name = result.value.name?.trim()
    if (name) map.set(unique[index], name)
  })
  return map
}

async function enrichInsightsWithClientNames(view: DashboardInsightsView): Promise<DashboardInsightsView> {
  const idsToResolve: number[] = []
  if (
    view.topRepair?.client_id != null &&
    needsClientNameResolution(view.topRepair.client_name, view.topRepair.client_id)
  ) {
    idsToResolve.push(view.topRepair.client_id)
  }
  if (
    view.topClient?.client_id != null &&
    needsClientNameResolution(view.topClient.client_name, view.topClient.client_id)
  ) {
    idsToResolve.push(view.topClient.client_id)
  }

  const names = await resolveClientNamesByIds(idsToResolve)
  if (!names.size) return view

  let topRepair = view.topRepair
  let topClient = view.topClient

  if (topRepair?.client_id != null) {
    const resolved = names.get(topRepair.client_id)
    if (resolved) topRepair = { ...topRepair, client_name: resolved }
  }
  if (topClient?.client_id != null) {
    const resolved = names.get(topClient.client_id)
    if (resolved) topClient = { ...topClient, client_name: resolved }
  }

  return { ...view, topRepair, topClient }
}

function pickRecord(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return undefined
}

function normalizeTopProduct(raw: unknown): DashboardTopProductByUnitPrice | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const name = String(o.product_name ?? o.productName ?? "").trim()
  const price = toNumber(o.unit_price ?? o.unitPrice)
  if (!name || price <= 0) return null
  const source = (o.source === "woocommerce" ? "woocommerce" : "pos") as "pos" | "woocommerce"
  return {
    product_id: (o.product_id ?? o.productId) as number | null | undefined,
    product_name: name,
    unit_price: price,
    source,
    reference_type: (o.reference_type ?? o.referenceType) as string | undefined,
    reference_id: toNumber(o.reference_id ?? o.referenceId) || undefined,
    reference_label: (o.reference_label ?? o.referenceLabel) as string | undefined,
  }
}

function normalizeTopRepair(raw: unknown): DashboardTopRepairOrder | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id = toNumber(o.id)
  if (!id) return null
  return {
    id,
    repair_number: String(o.repair_number ?? o.repairNumber ?? `#${id}`),
    client_id: toNumber(o.client_id ?? o.clientId) || undefined,
    client_name: String(o.client_name ?? o.clientName ?? "—"),
    total_amount: toNumber(o.total_amount ?? o.totalAmount),
    status: (o.status as string) || undefined,
    reception_date: (o.reception_date ?? o.receptionDate) as string | undefined,
  }
}

function normalizeTopClient(raw: unknown): DashboardTopClient | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const name = String(o.client_name ?? o.clientName ?? "").trim()
  const total = toNumber(o.total_amount ?? o.totalAmount)
  if (!name && total <= 0) return null
  return {
    client_id: (o.client_id ?? o.clientId) as number | null,
    client_name: name || "Cliente",
    total_amount: total,
    from_pos: toNumber(o.from_pos ?? o.fromPos),
    from_orders: toNumber(o.from_orders ?? o.fromOrders),
    from_repairs: toNumber(o.from_repairs ?? o.fromRepairs),
  }
}

function normalizeAlerts(raw: unknown): DashboardInsightAlert[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const o = item as Record<string, unknown>
      const id = String(o.id ?? "")
      if (!id) return null
      const severity = o.severity === "danger" || o.severity === "warning" ? o.severity : "info"
      return {
        id,
        severity,
        title: String(o.title ?? ""),
        count: toNumber(o.count),
        href: (o.href as string) || undefined,
        description: (o.description as string) || undefined,
      }
    })
    .filter((a): a is DashboardInsightAlert => a != null && !!a.title)
}

function normalizePipeline(raw: unknown): DashboardInsightsView["repairPipeline"] {
  const empty = { byStatus: {}, openCount: 0, monthAverageTicket: 0, amountInWorkshop: 0 }
  if (!raw || typeof raw !== "object") return empty
  const o = raw as Record<string, unknown>
  const byRaw = (o.by_status ?? o.byStatus) as Record<string, number> | undefined
  const byStatus: Record<string, number> = {}
  if (byRaw && typeof byRaw === "object") {
    for (const [k, v] of Object.entries(byRaw)) {
      byStatus[k] = toNumber(v)
    }
  }
  return {
    byStatus,
    openCount: toNumber(o.open_count ?? o.openCount) || Object.values(byStatus).reduce((s, n) => s + n, 0),
    monthAverageTicket: toNumber(o.month_average_ticket ?? o.monthAverageTicket),
    amountInWorkshop: toNumber(o.amount_in_workshop ?? o.amountInWorkshop),
  }
}

function normalizeApiPayload(data: DashboardInsightsPayload): DashboardInsightsView {
  const h = data.highlights as Record<string, unknown>
  return {
    period: {
      dateFrom: data.period.date_from,
      dateTo: data.period.date_to,
    },
    topProduct: normalizeTopProduct(
      pickRecord(h, "top_product_by_unit_price", "topProductByUnitPrice")
    ),
    topRepair: normalizeTopRepair(pickRecord(h, "top_repair_order", "topRepairOrder")),
    topClient: normalizeTopClient(pickRecord(h, "top_client", "topClient")),
    alerts: normalizeAlerts(data.alerts),
    repairPipeline: normalizePipeline(data.repair_pipeline),
    fromApi: true,
  }
}

function lineName(item: SaleItemResponse | OrderItem): string {
  return (
    String(item.product_name ?? "").trim() ||
    String((item as SaleItemResponse).description ?? "").trim() ||
    String((item as OrderItem).description ?? "").trim() ||
    "Ítem"
  )
}

function considerUnitPrice(
  current: DashboardTopProductByUnitPrice | null,
  candidate: {
    productName: string
    unitPrice: number
    source: "pos" | "woocommerce"
    referenceLabel?: string
    referenceId?: number
    productId?: number | null
  }
): DashboardTopProductByUnitPrice | null {
  if (candidate.unitPrice <= 0) return current
  if (!current || candidate.unitPrice > current.unit_price) {
    return {
      product_name: candidate.productName,
      unit_price: candidate.unitPrice,
      source: candidate.source,
      product_id: candidate.productId,
      reference_label: candidate.referenceLabel,
      reference_id: candidate.referenceId,
      reference_type: candidate.source === "pos" ? "sale" : "order",
    }
  }
  return current
}

async function paginateSales(dateFrom: string, dateTo: string): Promise<Sale[]> {
  const all: Sale[] = []
  let page = 1
  const limit = 100
  for (;;) {
    const res = await getSales({ date_from: dateFrom, date_to: dateTo, page, limit })
    const raw = res.data
    const list = raw?.sales ?? []
    all.push(...list)
    const total = raw?.total ?? list.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    if (page >= totalPages || list.length < limit) break
    page += 1
    if (page > 30) break
  }
  return all
}

async function paginateOrders(dateFrom: string, dateTo: string): Promise<Order[]> {
  const all: Order[] = []
  let page = 1
  const limit = 100
  for (;;) {
    const res = await getOrders({ date_from: dateFrom, date_to: dateTo, page, limit })
    const list = res.data?.orders ?? []
    all.push(...list)
    const pagination = res.data?.pagination
    const totalPages = pagination?.totalPages ?? (list.length < limit ? page : page + 1)
    if (page >= totalPages || list.length < limit) break
    page += 1
    if (page > 30) break
  }
  return all
}

async function paginateRepairs(dateFrom: string, dateTo: string): Promise<RepairOrder[]> {
  const all: RepairOrder[] = []
  let page = 1
  const limit = 100
  for (;;) {
    const res = await getRepairOrders({ date_from: dateFrom, date_to: dateTo, page, limit })
    const data = res.data
    const list = data?.repair_orders ?? []
    all.push(...list)
    const total = data?.total ?? list.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    if (page >= totalPages || list.length < limit) break
    page += 1
    if (page > 30) break
  }
  return all
}

function isRepairOverdue(order: RepairOrder): boolean {
  if (!order.delivery_date_estimated) return false
  if (order.status === "entregado" || order.status === "cancelado") return false
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const est = new Date(order.delivery_date_estimated)
  if (Number.isNaN(est.getTime())) return false
  est.setHours(0, 0, 0, 0)
  return est < hoy
}

async function computeInsightsClientSide(
  dateFrom: string,
  dateTo: string,
  productStats: ProductStats | null
): Promise<DashboardInsightsView> {
  const [sales, orders, repairsMonth, repairsOpenRes, pendingOrdersRes, pendingSyncRes, repairStatsRes] =
    await Promise.all([
      paginateSales(dateFrom, dateTo).catch(() => [] as Sale[]),
      paginateOrders(dateFrom, dateTo).catch(() => [] as Order[]),
      paginateRepairs(dateFrom, dateTo).catch(() => [] as RepairOrder[]),
      getRepairOrders({ limit: 200, page: 1 }).catch(() => null),
      getOrders({ status: "pendiente_preparacion", limit: 1, page: 1 }).catch(() => null),
      getSales({ sync_status: "pending", limit: 1, page: 1 }).catch(() => null),
      getRepairOrderStats().catch(() => null),
    ])

  let topProduct: DashboardTopProductByUnitPrice | null = null
  for (const sale of sales) {
    for (const item of sale.items ?? []) {
      topProduct = considerUnitPrice(topProduct, {
        productName: lineName(item),
        unitPrice: toNumber(item.unit_price),
        source: "pos",
        referenceLabel: sale.sale_number,
        referenceId: sale.id,
        productId: item.product_id,
      })
    }
  }
  for (const order of orders) {
    if (order.status === "cancelado" || order.status === "cancelled") continue
    for (const item of order.items ?? []) {
      topProduct = considerUnitPrice(topProduct, {
        productName: lineName(item),
        unitPrice: toNumber(item.unit_price),
        source: "woocommerce",
        referenceLabel: order.order_number ?? `Pedido #${order.id}`,
        referenceId: order.id,
        productId: item.product_id,
      })
    }
  }

  let topRepair: DashboardTopRepairOrder | null = null
  for (const r of repairsMonth) {
    if (r.status === "cancelado") continue
    const amount = toNumber(r.total_amount)
    if (!topRepair || amount > topRepair.total_amount) {
      topRepair = {
        id: r.id,
        repair_number: r.repair_number,
        client_id: r.client_id,
        client_name: r.client?.name ?? `Cliente #${r.client_id}`,
        total_amount: amount,
        status: r.status,
        reception_date: r.reception_date,
      }
    }
  }

  const clientTotals = new Map<
    number,
    { name: string; pos: number; orders: number; repairs: number }
  >()

  const addClient = (
    clientId: number | null | undefined,
    name: string,
    bucket: "pos" | "orders" | "repairs",
    amount: number
  ) => {
    if (!clientId || amount <= 0) return
    const cur = clientTotals.get(clientId) ?? { name, pos: 0, orders: 0, repairs: 0 }
    if (name && name !== "—") cur.name = name
    cur[bucket] += amount
    clientTotals.set(clientId, cur)
  }

  for (const sale of sales) {
    if (sale.client_id) {
      addClient(sale.client_id, sale.client_name ?? `Cliente #${sale.client_id}`, "pos", toNumber(sale.total_amount))
    }
  }
  for (const order of orders) {
    if (order.status === "cancelado" || order.status === "cancelled") continue
    addClient(
      order.client_id,
      order.client_name ?? `Cliente #${order.client_id}`,
      "orders",
      toNumber(order.total_amount)
    )
  }
  for (const r of repairsMonth) {
    if (r.status === "cancelado") continue
    addClient(r.client_id, r.client?.name ?? `Cliente #${r.client_id}`, "repairs", toNumber(r.total_amount))
  }

  let topClient: DashboardTopClient | null = null
  for (const [clientId, agg] of clientTotals) {
    const total = agg.pos + agg.orders + agg.repairs
    if (!topClient || total > topClient.total_amount) {
      topClient = {
        client_id: clientId,
        client_name: agg.name,
        total_amount: total,
        from_pos: agg.pos,
        from_orders: agg.orders,
        from_repairs: agg.repairs,
      }
    }
  }

  const openRepairs = repairsOpenRes?.data?.repair_orders ?? []
  const overdueCount = openRepairs.filter(isRepairOverdue).length

  const lowStock =
    (productStats?.low_stock_count ?? 0) + (productStats?.out_of_stock_count ?? 0)

  const pendingOrdersCount =
    pendingOrdersRes?.data?.pagination?.total ??
    pendingOrdersRes?.data?.total ??
    (pendingOrdersRes?.data?.orders?.length ?? 0)

  const pendingSyncRaw = pendingSyncRes?.data
  const pendingSyncCount =
    typeof pendingSyncRaw?.total === "number"
      ? pendingSyncRaw.total
      : (pendingSyncRaw?.sales?.length ?? 0)

  const alerts: DashboardInsightAlert[] = []
  if (overdueCount > 0) {
    alerts.push({
      id: "repairs_overdue_delivery",
      severity: "warning",
      title: "Reparaciones con retiro vencido",
      count: overdueCount,
      href: "/reparaciones",
    })
  }
  if (lowStock > 0) {
    alerts.push({
      id: "products_low_stock",
      severity: "warning",
      title: "Productos con stock crítico",
      count: lowStock,
      href: "/productos",
      description: "Bajo mínimo o sin stock",
    })
  }
  if (pendingOrdersCount > 0) {
    alerts.push({
      id: "orders_pending_preparation",
      severity: "info",
      title: "Pedidos pendientes de preparación",
      count: pendingOrdersCount,
      href: "/pedidos",
    })
  }
  if (pendingSyncCount > 0) {
    alerts.push({
      id: "pos_pending_arca_sync",
      severity: "info",
      title: "Ventas POS pendientes de sincronizar",
      count: pendingSyncCount,
      href: "/ventas",
    })
  }

  const byStatus: Record<string, number> = {}
  let amountInWorkshop = 0
  for (const r of openRepairs) {
    if (r.status === "entregado" || r.status === "cancelado") continue
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
    amountInWorkshop += toNumber(r.total_amount)
  }

  const statsData = repairStatsRes?.data as Record<string, unknown> | undefined
  const statsByStatus = (statsData?.by_status ?? statsData?.byStatus) as Record<string, number> | undefined
  if (statsByStatus && Object.keys(byStatus).length === 0) {
    for (const [k, v] of Object.entries(statsByStatus)) {
      if (k !== "entregado" && k !== "cancelado") byStatus[k] = toNumber(v)
    }
  }

  const openCount = Object.values(byStatus).reduce((s, n) => s + n, 0)
  const repairAmounts = repairsMonth.filter((r) => r.status !== "cancelado").map((r) => toNumber(r.total_amount))
  const monthAverageTicket =
    repairAmounts.length > 0 ? repairAmounts.reduce((a, b) => a + b, 0) / repairAmounts.length : 0

  return {
    period: { dateFrom, dateTo },
    topProduct,
    topRepair,
    topClient,
    alerts,
    repairPipeline: {
      byStatus,
      openCount,
      monthAverageTicket,
      amountInWorkshop,
    },
    fromApi: false,
  }
}

/**
 * Insights del dashboard: prioriza GET /api/dashboard/insights; si no existe (404), calcula en cliente.
 */
export async function fetchDashboardInsights(
  productStats?: ProductStats | null
): Promise<DashboardInsightsView> {
  const { dateFrom, dateTo } = getCalendarMonthRange()

  try {
    const res = await getDashboardInsights({ date_from: dateFrom, date_to: dateTo })
    if (res.data?.highlights) {
      return enrichInsightsWithClientNames(normalizeApiPayload(res.data))
    }
  } catch (e) {
    const status = (e as Error & { status?: number })?.status
    if (status !== 404 && status !== 501) {
      /* fallback */
    }
  }

  let stats = productStats
  if (!stats) {
    try {
      stats = (await getProductStats()) ?? null
    } catch {
      stats = null
    }
  }

  const computed = await computeInsightsClientSide(dateFrom, dateTo, stats)
  return enrichInsightsWithClientNames(computed)
}
