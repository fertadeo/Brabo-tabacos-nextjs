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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getRepairOrders,
  getRepairOrderStats,
  getClienteById,
  REPAIR_ORDER_STATUS_LABELS,
  type RepairOrder,
  type RepairOrderStatus,
  type RepairOrderStats,
} from "@/lib/api"
import { getEquipmentListSummary } from "@/lib/repair-order-equipment"
import { NewRepairOrderModal } from "@/components/new-repair-order-modal"
import { Wrench, Plus, Search, RefreshCw, Eye, Edit2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { Pagination } from "@/components/ui/pagination"

const STATUS_OPTIONS: { value: "" | RepairOrderStatus; label: string }[] = [
  { value: "", label: "Todos los estados" },
  ...(Object.entries(REPAIR_ORDER_STATUS_LABELS).map(([value, label]) => ({
    value: value as RepairOrderStatus,
    label,
  }))),
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

/** Fecha estimada de retiro ya pasó y la orden sigue activa. */
function isRetiroEstimadoVencido(order: RepairOrder): boolean {
  if (!order.delivery_date_estimated) return false
  if (order.status === "entregado" || order.status === "cancelado") return false
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const est = new Date(order.delivery_date_estimated)
  if (Number.isNaN(est.getTime())) return false
  est.setHours(0, 0, 0, 0)
  return est < hoy
}

function formatMoney(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Dígitos para wa.me (Argentina: agrega 54 si falta código país). */
function normalizeWhatsAppNumber(raw: string): string | null {
  let d = raw.replace(/\D/g, "")
  if (!d) return null
  if (d.startsWith("0")) d = d.slice(1)
  if (d.startsWith("54")) return d
  if (d.length >= 8 && d.length <= 11) return `54${d}`
  return d.length >= 12 ? d : null
}

function buildRepairReadyWhatsAppUrl(
  phone: string,
  order: RepairOrder,
  clientDisplayName?: string
): string | null {
  const num = normalizeWhatsAppNumber(phone)
  if (!num) return null
  const clientName =
    clientDisplayName?.trim() || order.client?.name?.trim() || "cliente"
  const text = `Hola ${clientName}, te avisamos que la reparación de tu equipo ya está lista para retirar. Orden: ${order.repair_number}. Saludos.`
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function getStatusVariant(
  status: RepairOrderStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "entregado":
      return "default"
    case "cancelado":
      return "destructive"
    case "consulta_recibida":
    case "presupuestado":
      return "secondary"
    default:
      return "outline"
  }
}

function getStatusClassName(status: RepairOrderStatus): string {
  switch (status) {
    case "consulta_recibida":
      return "bg-sky-100 text-sky-800 border-sky-200"
    case "presupuestado":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "aceptado":
      return "bg-indigo-100 text-indigo-800 border-indigo-200"
    case "en_proceso_reparacion":
      return "bg-violet-100 text-violet-800 border-violet-200"
    case "listo_entrega":
      return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "entregado":
      return "bg-green-100 text-green-800 border-green-200"
    case "cancelado":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return ""
  }
}

export default function ReparacionesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<RepairOrder[]>([])
  const [stats, setStats] = useState<RepairOrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [onlyPending, setOnlyPending] = useState(false)
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [clientNameById, setClientNameById] = useState<Record<number, string>>({})
  const [clientPhoneById, setClientPhoneById] = useState<Record<number, string>>({})

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params: Parameters<typeof getRepairOrders>[0] = {
        page,
        limit,
      }
      if (statusFilter) params.status = statusFilter as RepairOrderStatus
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const res = await getRepairOrders(params)
      const data = res.data as { repair_orders?: RepairOrder[]; total?: number; page?: number }
      const list = data?.repair_orders ?? []
      setOrders(list)
      setTotal(typeof data?.total === "number" ? data.total : list.length)
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 401) {
        toast.error("Sesión expirada. Volvé a iniciar sesión.")
        router.replace("/login")
        return
      }
      if (err?.status === 403) {
        toast.error("No tenés permiso para ver órdenes de reparación.")
        router.replace("/403")
        return
      }
      toast.error(err?.message ?? "Error al cargar órdenes de reparación")
      setOrders([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await getRepairOrderStats()
      setStats(res.data ?? null)
    } catch {
      setStats(null)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [page, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    const missingIds = [
      ...new Set(
        orders
          .filter((o) => {
            if (!o.client_id) return false
            const needName = !o.client?.name && !clientNameById[o.client_id]
            const needPhone = !o.client?.phone && !clientPhoneById[o.client_id]
            return needName || needPhone
          })
          .map((o) => o.client_id)
      ),
    ]
    if (missingIds.length === 0) return

    let active = true
    Promise.allSettled(missingIds.map((cid) => getClienteById(cid)))
      .then((results) => {
        if (!active) return
        const nextNames: Record<number, string> = {}
        const nextPhones: Record<number, string> = {}
        results.forEach((result, i) => {
          if (result.status !== "fulfilled") return
          const c = result.value
          const id = missingIds[i]
          nextNames[id] = c.name
          if (c.phone) nextPhones[id] = c.phone
        })
        if (Object.keys(nextNames).length > 0) {
          setClientNameById((prev) => ({ ...prev, ...nextNames }))
        }
        if (Object.keys(nextPhones).length > 0) {
          setClientPhoneById((prev) => ({ ...prev, ...nextPhones }))
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [orders, clientNameById, clientPhoneById])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredOrders = orders.filter((order) => {
    const statusMatches = onlyPending
      ? order.status !== "entregado" && order.status !== "cancelado"
      : true
    if (!statusMatches) return false
    if (!normalizedSearch) return true
    const searchable = [
      order.repair_number,
      order.client?.name,
      clientNameById[order.client_id],
      order.equipment_description,
      order.customer_declared_fault,
      REPAIR_ORDER_STATUS_LABELS[order.status],
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return searchable.includes(normalizedSearch)
  })

  const handleNewOrderSuccess = (createdId?: number) => {
    setNewOrderOpen(false)
    loadOrders()
    if (createdId) router.push(`/reparaciones/${createdId}`)
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
      <ERPLayout activeItem="reparaciones" fullWidth>
        <div className="min-w-0 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Órdenes de reparación</h1>
              <p className="text-muted-foreground">
                Gestión de equipos recibidos para reparación: recepción, presupuesto y entrega
              </p>
            </div>
            <Button onClick={() => setNewOrderOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva orden
            </Button>
          </div>

          {stats && typeof stats.total === "number" && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total órdenes</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Registradas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monto total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {typeof stats.total_amount === "number"
                      ? formatMoney(stats.total_amount)
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">Órdenes activas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Por estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {stats.by_status &&
                      Object.entries(stats.by_status)
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <span key={k} className="mr-2">
                            {REPAIR_ORDER_STATUS_LABELS[k as RepairOrderStatus] ?? k}: {String(v)}
                          </span>
                        ))}
                    {(!stats.by_status || Object.keys(stats.by_status).length === 0) && "—"}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>Listado de órdenes</CardTitle>
              <CardDescription>
                Filtros por estado y rango de fechas de recepción
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="relative min-w-[220px] flex-1 md:max-w-[340px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, cliente o equipo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Desde"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[140px]"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="date"
                    placeholder="Hasta"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => loadOrders()} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant={onlyPending ? "default" : "outline"}
                  onClick={() => setOnlyPending((prev) => !prev)}
                >
                  Pendientes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatusFilter("")
                    setDateFrom("")
                    setDateTo("")
                    setSearchQuery("")
                    setOnlyPending(false)
                    setPage(1)
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
              {!loading && (
                <p className="mb-4 text-sm text-muted-foreground">
                  Mostrando {filteredOrders.length} de {orders.length} orden(es) en esta página.
                </p>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Cargando…
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mb-2 opacity-50" />
                  <p>No hay órdenes de reparación con los filtros aplicados en esta página.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setNewOrderOpen(true)}>
                    Crear primera orden
                  </Button>
                </div>
              ) : (
                <>
                  <Table className="table-fixed">
                    <colgroup>
                      <col className="w-[9%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[12%]" />
                      <col className="w-[9%]" />
                      <col className="w-[10%]" />
                      <col className="w-[10%]" />
                      <col className="w-[9%]" />
                      <col className="w-[15%]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-normal">Número</TableHead>
                        <TableHead className="whitespace-normal">Cliente</TableHead>
                        <TableHead className="whitespace-normal">Equipo</TableHead>
                        <TableHead className="whitespace-normal">Estado</TableHead>
                        <TableHead className="whitespace-normal">Recepción</TableHead>
                        <TableHead className="whitespace-normal leading-tight">Retiro estimado</TableHead>
                        <TableHead className="whitespace-normal text-right">Total</TableHead>
                        <TableHead className="whitespace-normal text-right">Saldo</TableHead>
                        <TableHead className="whitespace-normal text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => {
                        const balance =
                          parseFloat(order.total_amount || "0") - parseFloat(order.amount_paid || "0")
                        const clientPhone = order.client?.phone ?? clientPhoneById[order.client_id]
                        const clientLabel =
                          order.client?.name ?? clientNameById[order.client_id] ?? undefined
                        const waUrl = clientPhone
                          ? buildRepairReadyWhatsAppUrl(clientPhone, order, clientLabel)
                          : null
                        const hasPhoneRaw = Boolean(clientPhone?.trim())
                        const retiroVencido = isRetiroEstimadoVencido(order)
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="truncate font-medium" title={order.repair_number}>
                              {order.repair_number}
                            </TableCell>
                            <TableCell
                              className="truncate"
                              title={order.client?.name ?? clientNameById[order.client_id] ?? undefined}
                            >
                              {order.client?.name ?? clientNameById[order.client_id] ?? `Cliente #${order.client_id}`}
                            </TableCell>
                            <TableCell className="truncate" title={order.equipment_description || undefined}>
                              {getEquipmentListSummary(order.equipment_description || "")}
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              <Badge
                                variant={getStatusVariant(order.status)}
                                className={`${getStatusClassName(order.status)} h-auto max-w-full whitespace-normal text-center leading-tight`}
                              >
                                {REPAIR_ORDER_STATUS_LABELS[order.status] ?? order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="overflow-hidden whitespace-nowrap">{formatDate(order.reception_date)}</TableCell>
                            <TableCell
                              className={
                                retiroVencido
                                  ? "overflow-hidden whitespace-nowrap font-medium text-amber-700 dark:text-amber-500"
                                  : "overflow-hidden whitespace-nowrap"
                              }
                              title={
                                retiroVencido
                                  ? "Fecha estimada de retiro superada"
                                  : undefined
                              }
                            >
                              {formatDate(order.delivery_date_estimated)}
                            </TableCell>
                            <TableCell className="overflow-hidden whitespace-nowrap text-right tabular-nums" title={formatMoney(order.total_amount)}>
                              {formatMoney(order.total_amount)}
                            </TableCell>
                            <TableCell className="overflow-hidden whitespace-nowrap text-right tabular-nums" title={formatMoney(balance)}>
                              {formatMoney(balance)}
                            </TableCell>
                            <TableCell className="overflow-hidden px-0.5">
                              <div className="flex items-center justify-end gap-0">
                                {waUrl ? (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#25D366] hover:text-[#128C7E]" asChild>
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Avisar por WhatsApp que el pedido está listo"
                                      aria-label="Avisar por WhatsApp que el pedido está listo"
                                    >
                                      <WhatsAppGlyph className="h-5 w-5" />
                                    </a>
                                  </Button>
                                ) : hasPhoneRaw ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-amber-600/80"
                                    title="Teléfono no válido para WhatsApp"
                                    aria-label="Teléfono no válido para WhatsApp"
                                    onClick={() =>
                                      toast.error(
                                        "El teléfono registrado no es válido para abrir WhatsApp."
                                      )
                                    }
                                  >
                                    <WhatsAppGlyph className="h-5 w-5 opacity-70" />
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    title="Sin teléfono del cliente — cargalo en la ficha del cliente"
                                    aria-label="WhatsApp no disponible: falta teléfono"
                                    onClick={() =>
                                      toast.error("No hay teléfono del cliente para enviar WhatsApp.")
                                    }
                                  >
                                    <WhatsAppGlyph className="h-5 w-5 opacity-40" />
                                  </Button>
                                )}
                                {order.status !== "entregado" && order.status !== "cancelado" && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <Link
                                      href={`/reparaciones/${order.id}?edit=1`}
                                      title="Editar orden"
                                      aria-label="Editar orden"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <Link href={`/reparaciones/${order.id}`} title="Ver orden" aria-label="Ver orden">
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        isLoading={loading}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <NewRepairOrderModal
          isOpen={newOrderOpen}
          onClose={() => setNewOrderOpen(false)}
          onSuccess={handleNewOrderSuccess}
        />
      </ERPLayout>
    </Protected>
  )
}
