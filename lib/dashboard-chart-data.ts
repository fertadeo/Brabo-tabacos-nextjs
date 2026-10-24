import { getSales, getOrders, type Sale, type Order } from "@/lib/api"

export type DashboardChartPeriod = "14d" | "1m" | "3m" | "1y"

export const DASHBOARD_CHART_PERIOD_OPTIONS: {
  value: DashboardChartPeriod
  label: string
  shortLabel: string
}[] = [
  { value: "14d", label: "14 días", shortLabel: "14d" },
  { value: "1m", label: "1 mes", shortLabel: "1m" },
  { value: "3m", label: "3 meses", shortLabel: "3m" },
  { value: "1y", label: "1 año", shortLabel: "1a" },
]

export interface DailySalesPoint {
  date: string
  label: string
  pos: number
  orders: number
  total: number
}

export interface ChannelMixPoint {
  channel: string
  amount: number
  fill: string
}

export interface RepairStatusPoint {
  status: string
  label: string
  count: number
  fill: string
}

export interface DashboardChartData {
  dailySales: DailySalesPoint[]
  channelMix: ChannelMixPoint[]
  repairByStatus: RepairStatusPoint[]
  period: DashboardChartPeriod
  periodLabel: string
}

type BucketType = "day" | "week" | "month"

interface PeriodRange {
  dateFrom: string
  dateTo: string
  bucketKeys: string[]
  bucketType: BucketType
  periodLabel: string
  salesTitle: string
  mixTitle: string
}

function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^\d.-]/g, "") || "0")
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })
}

function formatWeekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString("es-AR", { month: "short", year: "2-digit" })
}

function weekStartKey(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return toYmd(date)
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** Últimos N días inclusive (YYYY-MM-DD). */
export function getLastNDaysRange(days: number): { dateFrom: string; dateTo: string; keys: string[] } {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    keys.push(toYmd(d))
  }
  return { dateFrom: keys[0], dateTo: keys[keys.length - 1], keys }
}

function getLastNWeeksRange(weeks: number): { dateFrom: string; dateTo: string; keys: string[] } {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const endKey = weekStartKey(toYmd(end))
  const keys: string[] = []
  const cursor = new Date(
    Number(endKey.slice(0, 4)),
    Number(endKey.slice(5, 7)) - 1,
    Number(endKey.slice(8, 10))
  )
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(cursor)
    d.setDate(cursor.getDate() - i * 7)
    keys.push(toYmd(d))
  }
  return { dateFrom: keys[0], dateTo: toYmd(end), keys }
}

function getLastNMonthsRange(months: number): { dateFrom: string; dateTo: string; keys: string[] } {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  const dateFrom = `${keys[0]}-01`
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
  const dateTo = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { dateFrom, dateTo, keys }
}

export function getPeriodRange(period: DashboardChartPeriod): PeriodRange {
  switch (period) {
    case "14d": {
      const { dateFrom, dateTo, keys } = getLastNDaysRange(14)
      return {
        dateFrom,
        dateTo,
        bucketKeys: keys,
        bucketType: "day",
        periodLabel: "últimos 14 días",
        salesTitle: "Ventas — últimos 14 días",
        mixTitle: "Mix — últimos 14 días",
      }
    }
    case "1m": {
      const { dateFrom, dateTo, keys } = getLastNDaysRange(30)
      return {
        dateFrom,
        dateTo,
        bucketKeys: keys,
        bucketType: "day",
        periodLabel: "último mes",
        salesTitle: "Ventas — último mes",
        mixTitle: "Mix — último mes",
      }
    }
    case "3m": {
      const { dateFrom, dateTo, keys } = getLastNWeeksRange(13)
      return {
        dateFrom,
        dateTo,
        bucketKeys: keys,
        bucketType: "week",
        periodLabel: "últimos 3 meses",
        salesTitle: "Ventas — últimos 3 meses",
        mixTitle: "Mix — últimos 3 meses",
      }
    }
    case "1y": {
      const { dateFrom, dateTo, keys } = getLastNMonthsRange(12)
      return {
        dateFrom,
        dateTo,
        bucketKeys: keys,
        bucketType: "month",
        periodLabel: "último año",
        salesTitle: "Ventas — último año",
        mixTitle: "Mix — último año",
      }
    }
  }
}

function saleDateKey(sale: Sale): string {
  const raw = sale.sale_date || sale.created_at
  if (!raw) return ""
  return raw.slice(0, 10)
}

function orderDateKey(order: Order): string {
  const raw = order.order_date || ""
  return raw.slice(0, 10)
}

function resolveBucketKey(isoDate: string, bucketType: BucketType): string {
  if (!isoDate) return ""
  if (bucketType === "day") return isoDate
  if (bucketType === "week") return weekStartKey(isoDate)
  return monthKey(isoDate)
}

function bucketLabel(key: string, bucketType: BucketType): string {
  if (bucketType === "day") return formatDayLabel(key)
  if (bucketType === "week") return formatWeekLabel(key)
  return formatMonthLabel(key)
}

async function fetchSalesInRange(dateFrom: string, dateTo: string): Promise<Sale[]> {
  const all: Sale[] = []
  let page = 1
  const limit = 100
  const maxPages = 50
  for (;;) {
    const res = await getSales({ date_from: dateFrom, date_to: dateTo, page, limit })
    const list = res.data?.sales ?? []
    all.push(...list)
    const total = res.data?.total ?? list.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    if (page >= totalPages || list.length < limit) break
    page += 1
    if (page > maxPages) break
  }
  return all
}

async function fetchOrdersInRange(dateFrom: string, dateTo: string): Promise<Order[]> {
  const all: Order[] = []
  let page = 1
  const limit = 100
  const maxPages = 50
  for (;;) {
    const res = await getOrders({ date_from: dateFrom, date_to: dateTo, page, limit })
    const list = res.data?.orders ?? []
    all.push(...list)
    const pagination = res.data?.pagination
    const totalPages = pagination?.totalPages ?? (list.length < limit ? page : page + 1)
    if (page >= totalPages || list.length < limit) break
    page += 1
    if (page > maxPages) break
  }
  return all
}

function buildSalesSeries(
  bucketKeys: string[],
  bucketType: BucketType,
  sales: Sale[],
  orders: Order[]
): DailySalesPoint[] {
  const posByBucket = new Map<string, number>()
  const ordersByBucket = new Map<string, number>()
  for (const key of bucketKeys) {
    posByBucket.set(key, 0)
    ordersByBucket.set(key, 0)
  }

  for (const sale of sales) {
    const rawKey = saleDateKey(sale)
    const key = resolveBucketKey(rawKey, bucketType)
    if (!key || !posByBucket.has(key)) continue
    posByBucket.set(key, (posByBucket.get(key) ?? 0) + toNumber(sale.total_amount))
  }

  for (const order of orders) {
    if (order.status === "cancelado" || order.status === "cancelled") continue
    const rawKey = orderDateKey(order)
    const key = resolveBucketKey(rawKey, bucketType)
    if (!key || !ordersByBucket.has(key)) continue
    ordersByBucket.set(key, (ordersByBucket.get(key) ?? 0) + toNumber(order.total_amount))
  }

  return bucketKeys.map((date) => {
    const pos = posByBucket.get(date) ?? 0
    const ord = ordersByBucket.get(date) ?? 0
    return {
      date,
      label: bucketLabel(date, bucketType),
      pos,
      orders: ord,
      total: pos + ord,
    }
  })
}

function buildChannelMix(posTotal: number, ordersTotal: number): ChannelMixPoint[] {
  const channelMix: ChannelMixPoint[] = []
  if (posTotal > 0) {
    channelMix.push({ channel: "pos", amount: posTotal, fill: CHANNEL_COLORS.pos })
  }
  if (ordersTotal > 0) {
    channelMix.push({ channel: "woo", amount: ordersTotal, fill: CHANNEL_COLORS.woo })
  }
  return channelMix
}

const CHANNEL_COLORS = {
  pos: "var(--color-chart-1)",
  woo: "var(--color-chart-2)",
}

const REPAIR_STATUS_COLORS: Record<string, string> = {
  consulta_recibida: "var(--color-chart-3)",
  presupuestado: "var(--color-chart-4)",
  aceptado: "var(--color-chart-2)",
  en_proceso_reparacion: "var(--color-chart-1)",
  listo_entrega: "var(--color-chart-5)",
}

/**
 * Series para gráficos del dashboard (ventas por período + mix + taller).
 */
export async function fetchDashboardChartData(
  period: DashboardChartPeriod,
  repairByStatus: Record<string, number>,
  statusLabels: Record<string, string>
): Promise<DashboardChartData> {
  const range = getPeriodRange(period)

  const [sales, orders] = await Promise.all([
    fetchSalesInRange(range.dateFrom, range.dateTo).catch(() => [] as Sale[]),
    fetchOrdersInRange(range.dateFrom, range.dateTo).catch(() => [] as Order[]),
  ])

  const dailySales = buildSalesSeries(range.bucketKeys, range.bucketType, sales, orders)

  let posTotal = 0
  let ordersTotal = 0
  for (const sale of sales) {
    posTotal += toNumber(sale.total_amount)
  }
  for (const order of orders) {
    if (order.status === "cancelado" || order.status === "cancelled") continue
    ordersTotal += toNumber(order.total_amount)
  }

  const channelMix = buildChannelMix(posTotal, ordersTotal)

  const repairByStatusPoints: RepairStatusPoint[] = Object.entries(repairByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count], i) => ({
      status,
      label: statusLabels[status] ?? status,
      count,
      fill: REPAIR_STATUS_COLORS[status] ?? `var(--color-chart-${(i % 5) + 1})`,
    }))

  return {
    dailySales,
    channelMix,
    repairByStatus: repairByStatusPoints,
    period,
    periodLabel: range.periodLabel,
  }
}

export function getSalesBlockTitles(period: DashboardChartPeriod): {
  salesTitle: string
  mixTitle: string
  salesDescription: string
} {
  const range = getPeriodRange(period)
  const granularity =
    range.bucketType === "day"
      ? "por día"
      : range.bucketType === "week"
        ? "por semana"
        : "por mes"
  return {
    salesTitle: range.salesTitle,
    mixTitle: range.mixTitle,
    salesDescription: `POS y WooCommerce apilados ${granularity}`,
  }
}
