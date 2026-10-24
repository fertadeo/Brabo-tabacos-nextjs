import { apiGet } from '@/lib/api-fetch'
import type { ApiResponse } from '@/lib/api'

// Tipos de respuestas para el módulo de Caja
export interface CashDaySummary {
  date: string
  incomes: number
  expenses: number
  balance: number
}

export interface CashPeriodSummary {
  from: string
  to: string
  incomes: number
  expenses: number
  balance: number
}

export interface CashMonthlySummary {
  period: { year: number; month: number }
  current: { incomes: number; expenses: number; balance: number }
  previous: { incomes: number; expenses: number; balance: number }
  delta: { incomes: number; expenses: number; balance: number }
}

export interface CashMovement {
  id: number
  type: 'Ingreso' | 'Egreso'
  concept: string
  amount: number
  date: string
  method: string
}

// GET /api/cash/day?date=YYYY-MM-DD
export async function getCashDay(date?: string): Promise<CashDaySummary> {
  const params = new URLSearchParams()
  if (date && date.trim()) params.set('date', date.trim())

  const path = params.toString() ? `/cash/day?${params.toString()}` : '/cash/day'
  const res = await apiGet(path)
  const data: ApiResponse<CashDaySummary> = await res.json()
  return data.data
}

// GET /api/cash/period?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getCashPeriod(from: string, to: string): Promise<CashPeriodSummary> {
  const params = new URLSearchParams()
  params.set('from', from)
  params.set('to', to)

  const res = await apiGet(`/cash/period?${params.toString()}`)
  const data: ApiResponse<CashPeriodSummary> = await res.json()
  return data.data
}

// GET /api/cash/monthly?year=YYYY&month=MM
export async function getCashMonthly(year?: number, month?: number): Promise<CashMonthlySummary> {
  const params = new URLSearchParams()
  if (typeof year === 'number') params.set('year', String(year))
  if (typeof month === 'number') params.set('month', String(month))

  const path = params.toString() ? `/cash/monthly?${params.toString()}` : '/cash/monthly'
  const res = await apiGet(path)
  const data: ApiResponse<CashMonthlySummary> = await res.json()
  return data.data
}

// GET /api/cash/movements?limit=20&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getCashMovements(options?: { limit?: number; from?: string; to?: string }): Promise<CashMovement[]> {
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.from && options.from.trim()) params.set('from', options.from.trim())
  if (options?.to && options.to.trim()) params.set('to', options.to.trim())

  const path = params.toString() ? `/cash/movements?${params.toString()}` : '/cash/movements'
  const res = await apiGet(path)
  const data: ApiResponse<CashMovement[]> = await res.json()
  return data.data
}
