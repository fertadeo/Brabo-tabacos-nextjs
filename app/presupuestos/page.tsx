"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { useRole } from "@/app/hooks/useRole"
import type { Role } from "@/app/config/menu"
import { getCommercialBudgets, getCommercialBudgetStats, ensureCommercialBudgetApproved, type CommercialBudgetDetail, type CommercialBudgetSummary } from "@/lib/api"
import { BudgetConvertSaleDialog } from "@/components/budget-convert-sale-dialog"
import { saleClientUbicacion } from "@/lib/sale-cliente"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { Calculator, CheckCircle2, Eye, Loader2, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

const ROLES_VER: Role[] = [
  "admin",
  "gerencia",
  "ventas",
  "finanzas",
  "logistica",
  "manager",
  "employee",
  "viewer",
]

const ROLES_EDITAR: Role[] = ["admin", "gerencia", "ventas"]

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function canConvertBudget(status: CommercialBudgetSummary["status"]) {
  return status !== "rejected" && status !== "expired"
}

export default function PresupuestosPage() {
  const router = useRouter()
  const { hasAnyOfRoles } = useRole()
  const puedeCrear = hasAnyOfRoles(ROLES_EDITAR)

  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [rows, setRows] = useState<CommercialBudgetSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [search, setSearch] = useState("")
  const [stats, setStats] = useState<{
    total: number
    total_amount_draft: number
    total_amount_sent: number
  } | null>(null)
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertBudget, setConvertBudget] = useState<CommercialBudgetDetail | null>(null)
  const [convertingId, setConvertingId] = useState<number | null>(null)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await getCommercialBudgetStats()
      const d = res.data
      setStats(
        d
          ? {
              total: d.total,
              total_amount_draft: d.total_amount_draft,
              total_amount_sent: d.total_amount_sent,
            }
          : null
      )
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCommercialBudgets({
        page,
        limit,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      const data = res.data
      setRows(data?.budgets ?? [])
      setTotal(typeof data?.total === "number" ? data.total : 0)
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 401) {
        toast.error("Sesión expirada.")
        router.replace("/login")
        return
      }
      if (err?.status === 403) {
        toast.error("No tenés permiso para ver presupuestos.")
        router.replace("/403")
        return
      }
      toast.error(err?.message ?? "No se pudieron cargar los presupuestos")
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, dateFrom, dateTo, router])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadList()
  }, [loadList])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const num = (r.budget_number || "").toLowerCase()
      const name = (r.client_name || "").toLowerCase()
      const code = (r.client_code || "").toLowerCase()
      return num.includes(q) || name.includes(q) || code.includes(q)
    })
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const montoCotizado =
    (stats?.total_amount_draft ?? 0) + (stats?.total_amount_sent ?? 0)

  async function handleConvertClick(budget: CommercialBudgetSummary) {
    setConvertingId(budget.id)
    try {
      const approved = await ensureCommercialBudgetApproved(budget.id)
      setConvertBudget(approved)
      setConvertOpen(true)
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "No se pudo preparar la venta")
    } finally {
      setConvertingId(null)
    }
  }

  return (
    <Protected requiredRoles={ROLES_VER}>
      <ERPLayout activeItem="presupuestos">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
              <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
                Cotizaciones con productos del catálogo y cliente. No mueven stock hasta convertir a venta. Es un
                flujo distinto de las{" "}
                <Link href="/reparaciones" className="text-primary underline-offset-4 hover:underline font-medium">
                  órdenes de reparación
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => { loadStats(); loadList(); }} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading || statsLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              {puedeCrear && (
                <Button asChild className="gap-2 shadow-md">
                  <Link href="/presupuestos/nuevo">
                    <Plus className="h-4 w-4" />
                    Nuevo presupuesto
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-t-4 border-t-primary shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Presupuestos registrados</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {statsLoading ? "—" : (stats?.total ?? 0).toLocaleString("es-AR")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Histórico completo</CardContent>
            </Card>
            <Card className="border-t-4 border-t-sky-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Monto en cotización activa</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {statsLoading ? "—" : formatMoney(montoCotizado)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Suma de presupuestos pendientes de cierre
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
              <CardDescription>Los filtros de fecha aplican sobre la fecha de creación en el servidor.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Número, cliente o código…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-44 space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
              </div>
              <div className="w-full sm:w-44 space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Listado</CardTitle>
                <CardDescription>
                  {search.trim()
                    ? `${filteredRows.length} resultado(s) en esta página (filtro local)`
                    : `${total} registro(s) en el servidor`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Ítems</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right w-[220px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin inline mr-2 align-middle" />
                          Cargando…
                        </TableCell>
                      </TableRow>
                    ) : filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                          No hay presupuestos con los criterios elegidos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((b) => {
                        const clientUbicacion = saleClientUbicacion(b)
                        return (
                        <TableRow key={b.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono font-medium">{b.budget_number}</TableCell>
                          <TableCell>
                            <div className="font-medium leading-tight">{b.client_name || `Cliente #${b.client_id}`}</div>
                            {clientUbicacion && (
                              <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                                {clientUbicacion}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatMoney(b.total_amount)}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{b.item_count ?? "—"}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{formatDate(b.valid_until)}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{formatDate(b.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 flex-wrap">
                              <Button variant="ghost" size="sm" asChild className="gap-1">
                                <Link href={`/presupuestos/${b.id}`}>
                                  <Eye className="h-4 w-4" />
                                  Ver
                                </Link>
                              </Button>
                              {puedeCrear && canConvertBudget(b.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  disabled={convertingId === b.id}
                                  onClick={() => void handleConvertClick(b)}
                                >
                                  {convertingId === b.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                  Convertir
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {!search.trim() && totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <BudgetConvertSaleDialog
          open={convertOpen}
          onOpenChange={(open) => {
            setConvertOpen(open)
            if (!open) setConvertBudget(null)
          }}
          budget={convertBudget}
          onSuccess={({ saleId, saleNumber }) => {
            toast.success("Venta registrada", { description: `${saleNumber} (id ${saleId})` })
            loadStats()
            loadList()
          }}
        />
      </ERPLayout>
    </Protected>
  )
}
