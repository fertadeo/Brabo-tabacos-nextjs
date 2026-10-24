"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { DayCashSummary, PeriodCashSummary, MonthlyCashSummary } from "@/lib/api"

interface CashSummaryCardsProps {
  daySummary?: DayCashSummary | undefined
  periodSummary?: PeriodCashSummary | undefined
  monthlySummary?: MonthlyCashSummary | undefined
  loading?: boolean
}

export function CashSummaryCards({ 
  daySummary, 
  periodSummary, 
  monthlySummary, 
  loading = false 
}: CashSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
              <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Usar datos del día por defecto, o del período si está disponible
  const summary = daySummary || periodSummary
  const isPeriod = !!periodSummary

  if (!summary) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin datos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">No hay datos disponibles</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDeltaPercentage = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const getDeltaIcon = (delta: number) => {
    return delta >= 0 ? (
      <TrendingUp className="h-3 w-3 text-turquoise-500" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-500" />
    )
  }

  const getDeltaColor = (delta: number) => {
    return delta >= 0 ? "text-turquoise-500" : "text-red-500"
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isPeriod ? 'Balance del Período' : 'Balance del Día'}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-turquoise-600' : 'text-red-600'}`}>
            {formatCurrency(summary.balance)}
          </div>
          {monthlySummary && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {getDeltaIcon(monthlySummary.delta.balance)}
              <span className={getDeltaColor(monthlySummary.delta.balance)}>
                {getDeltaPercentage(monthlySummary.current.balance, monthlySummary.previous.balance).toFixed(1)}% vs mes anterior
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingresos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isPeriod ? 'Ingresos del Período' : 'Ingresos del Día'}
          </CardTitle>
          <ArrowUpRight className="h-4 w-4 text-turquoise-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-turquoise-600">
            {formatCurrency(summary.incomes)}
          </div>
          {monthlySummary && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {getDeltaIcon(monthlySummary.delta.incomes)}
              <span className={getDeltaColor(monthlySummary.delta.incomes)}>
                {getDeltaPercentage(monthlySummary.current.incomes, monthlySummary.previous.incomes).toFixed(1)}% vs mes anterior
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Egresos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isPeriod ? 'Egresos del Período' : 'Egresos del Día'}
          </CardTitle>
          <ArrowDownRight className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">
            {formatCurrency(summary.expenses)}
          </div>
          {monthlySummary && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {getDeltaIcon(monthlySummary.delta.expenses)}
              <span className={getDeltaColor(monthlySummary.delta.expenses)}>
                {getDeltaPercentage(monthlySummary.current.expenses, monthlySummary.previous.expenses).toFixed(1)}% vs mes anterior
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
