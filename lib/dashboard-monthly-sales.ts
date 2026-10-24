import {
  getSales,
  getOrders,
  getDashboardStats,
  getSalesStats,
  getOrderStats,
  type DashboardStats,
} from "@/lib/api"

export interface MonthlySalesBreakdown {
  total: number
  fromPos: number
  fromOrders: number
  /** true si vino de dashboard/stats o stats agregados; false si se calculó listando ventas/pedidos */
  fromAggregatedApi: boolean
}

/** Primer y último día del mes calendario (YYYY-MM-DD) en hora local. */
export function getCalendarMonthRange(reference = new Date()): { dateFrom: string; dateTo: string } {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const dateTo = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { dateFrom, dateTo }
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^\d.-]/g, "") || "0")
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function pickMonthlyFromDashboard(data: Record<string, unknown>): MonthlySalesBreakdown | null {
  const total =
    toNumber(data.monthlySales) ||
    toNumber(data.monthly_sales) ||
    toNumber(data.salesMonth) ||
    toNumber(data.sales_month_amount)
  const fromPos =
    toNumber(data.monthlySalesFromPos) ||
    toNumber(data.monthly_sales_from_pos) ||
    toNumber(data.salesMonthFromPos)
  const fromOrders =
    toNumber(data.monthlySalesFromOrders) ||
    toNumber(data.monthly_sales_from_orders) ||
    toNumber(data.salesMonthFromOrders)

  if (total > 0 || fromPos > 0 || fromOrders > 0) {
    return {
      total: total > 0 ? total : fromPos + fromOrders,
      fromPos,
      fromOrders,
      fromAggregatedApi: true,
    }
  }
  return null
}

async function sumPosSalesForRange(dateFrom: string, dateTo: string): Promise<number> {
  let total = 0
  let page = 1
  const limit = 100
  for (;;) {
    const res = await getSales({ date_from: dateFrom, date_to: dateTo, page, limit })
    const raw = res.data as { sales?: { total_amount: number }[]; total?: number } | { total_amount: number }[]
    const data =
      raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(raw.sales)
        ? raw
        : Array.isArray(raw)
          ? { sales: raw, total: raw.length }
          : { sales: [] as { total_amount: number }[], total: 0 }
    const list = data.sales ?? []
    for (const sale of list) {
      total += toNumber(sale.total_amount)
    }
    const totalRecords = typeof data.total === "number" ? data.total : list.length
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit))
    if (page >= totalPages || list.length < limit) break
    page += 1
    if (page > 50) break
  }
  return total
}

async function sumWooOrdersForRange(dateFrom: string, dateTo: string): Promise<number> {
  let total = 0
  let page = 1
  const limit = 100
  for (;;) {
    const res = await getOrders({ date_from: dateFrom, date_to: dateTo, page, limit })
    const data = res.data
    const list = data?.orders ?? []
    for (const order of list) {
      if (order.status === "cancelado") continue
      total += toNumber(order.total_amount)
    }
    const pagination = data?.pagination
    const totalPages = pagination?.totalPages ?? (list.length < limit ? page : page + 1)
    if (page >= totalPages || list.length < limit) break
    page += 1
    if (page > 50) break
  }
  return total
}

/**
 * Ventas del mes = POS (GET /api/sales) + pedidos WooCommerce (GET /api/orders).
 * Si el backend expone totales mensuales en dashboard/stats, se usan primero.
 */
export async function fetchMonthlySalesBreakdown(
  preloadedDashboard?: DashboardStats | null
): Promise<MonthlySalesBreakdown> {
  const { dateFrom, dateTo } = getCalendarMonthRange()

  if (preloadedDashboard) {
    const fromDash = pickMonthlyFromDashboard(preloadedDashboard as Record<string, unknown>)
    if (fromDash) return fromDash
  } else {
    try {
      const dash = await getDashboardStats()
      const fromDash = pickMonthlyFromDashboard((dash.data ?? {}) as Record<string, unknown>)
      if (fromDash) return fromDash
    } catch {
      /* seguir con listados */
    }
  }

  try {
    const [salesStatsRes, ordersStatsRes] = await Promise.allSettled([
      getSalesStats(),
      getOrderStats(),
    ])
    const salesData =
      salesStatsRes.status === "fulfilled"
        ? (salesStatsRes.value.data as Record<string, unknown>)
        : null
    const ordersData =
      ordersStatsRes.status === "fulfilled"
        ? (ordersStatsRes.value.data as Record<string, unknown>)
        : null

    const posMonth =
      toNumber(salesData?.sales_month_amount) ||
      toNumber(salesData?.monthly_amount) ||
      toNumber(salesData?.total_amount_month)
    const ordersMonth =
      toNumber(ordersData?.sales_month_amount) ||
      toNumber(ordersData?.monthly_amount) ||
      toNumber(ordersData?.total_amount_month)

    if (posMonth > 0 || ordersMonth > 0) {
      return {
        total: posMonth + ordersMonth,
        fromPos: posMonth,
        fromOrders: ordersMonth,
        fromAggregatedApi: true,
      }
    }
  } catch {
    /* listados */
  }

  const [fromPos, fromOrders] = await Promise.all([
    sumPosSalesForRange(dateFrom, dateTo).catch(() => 0),
    sumWooOrdersForRange(dateFrom, dateTo).catch(() => 0),
  ])

  return {
    total: fromPos + fromOrders,
    fromPos,
    fromOrders,
    fromAggregatedApi: false,
  }
}
