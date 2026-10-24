"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  DASHBOARD_CHART_PERIOD_OPTIONS,
  getSalesBlockTitles,
  type DailySalesPoint,
  type DashboardChartData,
  type DashboardChartPeriod,
} from "@/lib/dashboard-chart-data"
import { cn } from "@/lib/utils"
import { Loader2, LineChart, PieChartIcon, Wrench } from "lucide-react"
import type { TooltipProps } from "recharts"

const salesChartConfig = {
  pos: { label: "POS", color: "var(--color-chart-1)" },
  orders: { label: "WooCommerce", color: "var(--color-chart-2)" },
  total: { label: "Total", color: "var(--color-chart-3)" },
} satisfies ChartConfig

const channelChartConfig = {
  pos: { label: "Punto de venta", color: "var(--color-chart-1)" },
  woo: { label: "WooCommerce", color: "var(--color-chart-2)" },
} satisfies ChartConfig

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toLocaleString("es-AR")}`
}

const salesTooltipRows = [
  { key: "pos" as const, label: "POS", color: "var(--color-chart-1)" },
  { key: "orders" as const, label: "WooCommerce", color: "var(--color-chart-2)" },
]

function SalesChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.payload as DailySalesPoint | undefined
  if (!point) return null

  return (
    <div
      className={cn(
        "pointer-events-none min-w-[11.5rem] rounded-xl border border-border/70",
        "bg-popover/95 px-3.5 py-3 shadow-xl backdrop-blur-md",
        "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
    >
      <p className="mb-2.5 border-b border-border/50 pb-2 text-[13px] font-semibold capitalize leading-tight tracking-tight text-foreground">
        {label}
      </p>
      <ul className="space-y-2">
        {salesTooltipRows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-5">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full ring-1 ring-border/40"
                style={{ backgroundColor: row.color }}
                aria-hidden
              />
              <span className="truncate text-xs text-muted-foreground">{row.label}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold tabular-nums tracking-tight text-foreground">
              {formatCurrency(point[row.key])}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex items-center justify-between gap-5 border-t border-border/50 pt-2.5">
        <span className="text-xs font-medium text-muted-foreground">Total</span>
        <span className="text-sm font-bold tabular-nums tracking-tight text-turquoise-600 dark:text-turquoise-400">
          {formatCurrency(point.total)}
        </span>
      </div>
    </div>
  )
}

interface DashboardChartsProps {
  loading?: boolean
  salesBlockLoading?: boolean
  data: DashboardChartData | null
  period: DashboardChartPeriod
  onPeriodChange: (period: DashboardChartPeriod) => void
}

export function DashboardCharts({
  loading,
  salesBlockLoading,
  data,
  period,
  onPeriodChange,
}: DashboardChartsProps) {
  const salesLoading = loading || salesBlockLoading
  const titles = getSalesBlockTitles(period)
  const hasDailyData = data?.dailySales.some((d) => d.total > 0) ?? false
  const channelTotal =
    data?.channelMix.reduce((s, c) => s + (c.channel !== "sin_datos" ? c.amount : 0), 0) ?? 0
  const hasChannelData = channelTotal > 0
  const hasRepairData = (data?.repairByStatus.length ?? 0) > 0
  const emptyPeriodText = `Sin ventas en ${titles.salesTitle.replace("Ventas — ", "el ")}`

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Análisis visual</h2>
          <p className="text-sm text-muted-foreground">
            Tendencia de ventas y mix de canales · {titles.salesTitle.replace("Ventas — ", "")}
          </p>
        </div>
        <div
          className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1 w-full sm:w-auto"
          role="group"
          aria-label="Filtrar período de ventas"
        >
          {DASHBOARD_CHART_PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={period === opt.value ? "default" : "ghost"}
              className={cn(
                "h-8 flex-1 sm:flex-none px-2.5 sm:px-3 text-xs sm:text-sm",
                period === opt.value && "shadow-sm"
              )}
              disabled={salesLoading}
              onClick={() => onPeriodChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="h-4 w-4 text-turquoise-500 shrink-0" />
              <span className="min-w-0">{titles.salesTitle}</span>
            </CardTitle>
            <CardDescription>{titles.salesDescription}</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {salesLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !hasDailyData ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground text-center px-4">
                {emptyPeriodText}
              </div>
            ) : (
              <ChartContainer config={salesChartConfig} className="h-[280px] w-full">
                <AreaChart data={data!.dailySales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={period === "1y" ? 8 : period === "3m" ? 20 : 24}
                    tick={{ fontSize: period === "1y" || period === "3m" ? 10 : 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={56}
                    tickFormatter={(v) => formatCurrency(Number(v))}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "var(--color-border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                    content={<SalesChartTooltip />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="pos"
                    stackId="sales"
                    stroke="var(--color-chart-1)"
                    fill="url(#fillPos)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stackId="sales"
                    stroke="var(--color-chart-2)"
                    fill="url(#fillOrders)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-turquoise-500 shrink-0" />
              <span className="min-w-0">{titles.mixTitle}</span>
            </CardTitle>
            <CardDescription>Participación POS vs WooCommerce</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {salesLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !hasChannelData ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground text-center px-4">
                Sin ventas en el período
              </div>
            ) : (
              <ChartContainer config={channelChartConfig} className="mx-auto h-[280px] w-full max-w-[320px]">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Pie
                    data={data!.channelMix}
                    dataKey="amount"
                    nameKey="channel"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="var(--color-card)"
                  >
                    {data!.channelMix.map((entry) => (
                      <Cell key={entry.channel} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="channel" />}
                    className="-translate-y-2 flex-wrap gap-2"
                  />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-turquoise-500" />
            Taller — órdenes abiertas por estado
          </CardTitle>
          <CardDescription>Distribución actual del pipeline de reparaciones</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          {loading ? (
            <div className="flex h-[220px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !hasRepairData ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No hay órdenes abiertas en taller
            </div>
          ) : (
            <ChartContainer
              config={Object.fromEntries(
                data!.repairByStatus.map((r) => [r.status, { label: r.label, color: r.fill }])
              )}
              className="h-[220px] w-full"
            >
              <BarChart
                data={data!.repairByStatus}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                  {data!.repairByStatus.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
