"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { RepartoMap } from "@/components/reparto-map"
import { getOrders, type Order } from "@/lib/api"
import {
  buildGoogleMapsDirectionsUrl,
  buildRouteStops,
  formatMoneyAR,
  orderContactPhone,
  orderDeliveryAddress,
  orderHasUsableAddress,
  orderTotalNumber,
  tomorrowISODate,
} from "@/lib/delivery-route"
import { generateRouteSheetPdf } from "@/lib/generate-route-sheet-pdf"
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  Loader2,
  MapPinned,
  RefreshCw,
  Truck,
} from "lucide-react"
import { toast } from "sonner"

const STATUS_OPTIONS = [
  { value: "all", label: "Todos (salvo cancelados)" },
  { value: "listo_despacho", label: "Listo despacho" },
  { value: "pendiente_preparacion", label: "Para preparar" },
  { value: "en_proceso", label: "En proceso" },
  { value: "aprobado", label: "Aprobado" },
  { value: "pagado", label: "Pagado" },
] as const

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pendiente_preparacion: "Para preparar",
    listo_despacho: "Listo despacho",
    en_proceso: "En proceso",
    aprobado: "Aprobado",
    pagado: "Pagado",
    completado: "Completado",
    cancelado: "Cancelado",
  }
  return map[status] || status
}

export default function RepartoPage() {
  const [deliveryDate, setDeliveryDate] = useState(() => tomorrowISODate())
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [driverName, setDriverName] = useState("")
  const [vehicleInfo, setVehicleInfo] = useState("")
  const [routeNotes, setRouteNotes] = useState("")
  const [pdfLoading, setPdfLoading] = useState(false)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders({
        page: 1,
        limit: 100,
        delivery_date: deliveryDate,
        ...(statusFilter !== "all"
          ? {
              status: statusFilter as
                | "pendiente_preparacion"
                | "listo_despacho"
                | "pagado"
                | "aprobado"
                | "en_proceso"
                | "completado"
                | "cancelado",
            }
          : {}),
      })
      let list = res.data?.orders || []
      if (statusFilter === "all") {
        list = list.filter((o) => o.status !== "cancelado" && o.status !== "cancelled")
      }
      list = [...list].sort((a, b) => {
        const ca = (a.client_name || "").localeCompare(b.client_name || "", "es")
        if (ca !== 0) return ca
        return (a.order_number || "").localeCompare(b.order_number || "", "es")
      })
      setOrders(list)
      setSelectedIds(list.map((o) => o.id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudieron cargar pedidos"
      toast.error(msg)
      setOrders([])
      setSelectedIds([])
    } finally {
      setLoading(false)
    }
  }, [deliveryDate, statusFilter])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const selectedOrders = useMemo(() => {
    const byId = new Map(orders.map((o) => [o.id, o]))
    return selectedIds.map((id) => byId.get(id)).filter(Boolean) as Order[]
  }, [orders, selectedIds])

  const routeStops = useMemo(() => buildRouteStops(selectedOrders), [selectedOrders])

  const mapsUrl = useMemo(
    () => buildGoogleMapsDirectionsUrl(routeStops),
    [routeStops]
  )

  const totals = useMemo(() => {
    const withAddr = selectedOrders.filter(orderHasUsableAddress).length
    const amount = selectedOrders.reduce((s, o) => s + orderTotalNumber(o), 0)
    return { count: selectedOrders.length, withAddr, amount }
  }, [selectedOrders])

  function toggleId(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function selectAll(checked: boolean) {
    setSelectedIds(checked ? orders.map((o) => o.id) : [])
  }

  function moveStop(index: number, dir: -1 | 1) {
    setSelectedIds((prev) => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  const handleOptimizedOrder = useCallback((orderedIds: number[]) => {
    setSelectedIds((prev) => {
      const set = new Set(orderedIds)
      const rest = prev.filter((id) => !set.has(id))
      return [...orderedIds, ...rest]
    })
    toast.message("Orden de paradas actualizado según Google Maps")
  }, [])

  async function downloadSheet() {
    if (selectedOrders.length === 0) {
      toast.error("Seleccioná al menos un pedido")
      return
    }
    setPdfLoading(true)
    try {
      await generateRouteSheetPdf({
        deliveryDate,
        driverName,
        vehicleInfo,
        notes: routeNotes,
        stops: selectedOrders.map((order, i) => ({ order, sequence: i + 1 })),
      })
      toast.success("Hoja de ruta descargada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar PDF")
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <Protected requiredRoles={["admin", "gerencia", "ventas", "logistica"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Truck className="h-7 w-7 text-primary" />
                Reparto
              </h1>
              <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
                Armá la hoja de ruta del día con los pedidos a entregar por logística propia.
                Por defecto mira la fecha de entrega de mañana.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadOrders()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Actualizar</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!mapsUrl}
                onClick={() => mapsUrl && window.open(mapsUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir en Google Maps
              </Button>
              <Button type="button" onClick={() => void downloadSheet()} disabled={pdfLoading || totals.count === 0}>
                {pdfLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Descargar hoja de ruta
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros del día</CardTitle>
              <CardDescription>
                Se listan pedidos con <code className="text-xs">fecha de entrega</code> igual a la
                elegida.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="rep-date">Fecha de reparto</Label>
                <Input
                  id="rep-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="driver">Repartidor</Label>
                <Input
                  id="driver"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nombre (va en el PDF)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vehicle">Vehículo</Label>
                <Input
                  id="vehicle"
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                  placeholder="Patente / modelo"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPinned className="h-4 w-4" />
                      Pedidos del día
                    </CardTitle>
                    <CardDescription>
                      {loading
                        ? "Cargando…"
                        : `${orders.length} encontrados · ${totals.count} en ruta · ${totals.withAddr} con domicilio`}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    ${formatMoneyAR(totals.amount)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {orders.length > 0 ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id="sel-all"
                      checked={selectedIds.length === orders.length && orders.length > 0}
                      onCheckedChange={(v) => selectAll(v === true)}
                    />
                    <Label htmlFor="sel-all" className="font-normal cursor-pointer">
                      Seleccionar todos
                    </Label>
                  </div>
                ) : null}

                <div className="rounded-lg border overflow-x-auto max-h-[420px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead className="w-14">Orden</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente / domicilio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                            Cargando pedidos…
                          </TableCell>
                        </TableRow>
                      ) : selectedOrders.length === 0 && orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            No hay pedidos con entrega en esa fecha. Asigná{" "}
                            <strong>fecha de entrega</strong> al crear o editar el pedido.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedIds.map((id, index) => {
                          const order = orders.find((o) => o.id === id)
                          if (!order) return null
                          const addr = orderDeliveryAddress(order)
                          const checked = true
                          return (
                            <TableRow key={id}>
                              <TableCell>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleId(id)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {index + 1}
                                  </span>
                                  <div className="flex">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => moveStop(index, -1)}
                                      disabled={index === 0}
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => moveStop(index, 1)}
                                      disabled={index === selectedIds.length - 1}
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {order.order_number || `#${order.id}`}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-sm">
                                  {order.client_name || order.delivery_contact || "—"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {addr || "Sin domicilio de entrega"}
                                  {orderContactPhone(order)
                                    ? ` · ${orderContactPhone(order)}`
                                    : ""}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{statusLabel(order.status)}</Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">
                                ${formatMoneyAR(orderTotalNumber(order))}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {orders.some((o) => !selectedIds.includes(o.id)) ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Fuera de la ruta</p>
                    <ul className="text-sm space-y-1">
                      {orders
                        .filter((o) => !selectedIds.includes(o.id))
                        .map((o) => (
                          <li key={o.id} className="flex items-center justify-between gap-2">
                            <span>
                              {o.order_number || `#${o.id}`} — {o.client_name || "Sin cliente"}
                            </span>
                            <Button type="button" size="sm" variant="ghost" onClick={() => toggleId(o.id)}>
                              Agregar
                            </Button>
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor="route-notes">Notas de la hoja</Label>
                  <Textarea
                    id="route-notes"
                    rows={2}
                    value={routeNotes}
                    onChange={(e) => setRouteNotes(e.target.value)}
                    placeholder="Horarios, cobros, devoluciones…"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mapa de ruta</CardTitle>
                <CardDescription>
                  Optimiza el orden de paradas con Directions cuando hay API key.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RepartoMap
                  stops={routeStops}
                  className="relative rounded-lg border overflow-hidden h-[360px]"
                  onOptimizedOrder={handleOptimizedOrder}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </ERPLayout>
    </Protected>
  )
}
