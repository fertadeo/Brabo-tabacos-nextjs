"use client"

import { useCallback, useEffect, useState } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react"
import {
  getSystemHealthOverview,
  type SystemEvent,
  type SystemEventStats,
  type SystemEventType,
  type SystemStatus,
} from "@/lib/system-health-api"

const EVENT_TYPE_LABELS: Record<SystemEventType, string> = {
  activity: "Actividad",
  error: "Error",
  alert: "Alerta",
}

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  info: "secondary",
  warning: "outline",
  error: "destructive",
  critical: "destructive",
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export default function SaludSistemaPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [stats, setStats] = useState<SystemEventStats | null>(null)
  const [events, setEvents] = useState<SystemEvent[]>([])
  const [modules, setModules] = useState<string[]>([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [error, setError] = useState<string | null>(null)

  const [eventType, setEventType] = useState<string>("all")
  const [module, setModule] = useState<string>("all")
  const [search, setSearch] = useState("")

  const loadData = useCallback(async (page = 1) => {
    try {
      setError(null)
      const overview = await getSystemHealthOverview({
        page,
        limit: 30,
        event_type: eventType !== "all" ? (eventType as SystemEventType) : undefined,
        module: module !== "all" ? module : undefined,
        search: search.trim() || undefined,
      })
      setStatus(overview.status)
      setStats(overview.stats)
      setModules(overview.modules)
      setEvents(overview.events)
      setPagination({
        page: overview.pagination.page,
        totalPages: overview.pagination.totalPages,
        total: overview.pagination.total,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    }
  }, [eventType, module, search])

  useEffect(() => {
    setLoading(true)
    loadData(1).finally(() => setLoading(false))
  }, [loadData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData(pagination.page)
    setRefreshing(false)
  }

  const handleSearch = () => {
    setLoading(true)
    loadData(1).finally(() => setLoading(false))
  }

  return (
    <Protected requiredRoles={["superadmin"]}>
      <ERPLayout activeItem="salud-sistema">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Salud del sistema</h1>
              <p className="text-muted-foreground">
                Monitoreo de actividad, errores y alertas del ERP (solo desarrolladores)
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualizar
            </Button>
          </div>

          {error && (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-2 pt-6 text-destructive">
                <XCircle className="h-5 w-5" />
                {error}
              </CardContent>
            </Card>
          )}

          {/* Estado del sistema */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">API</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold capitalize">{status?.api ?? "—"}</span>
                  </div>
                )}
                {status && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uptime: {formatUptime(status.uptime_seconds)} · Node {status.node_version}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Base de datos</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    {status?.database === "ok" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className="text-2xl font-bold capitalize">{status?.database ?? "—"}</span>
                  </div>
                )}
                {status && (
                  <p className="mt-1 text-xs text-muted-foreground">Entorno: {status.environment}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Últimas 24h</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="font-bold text-lg">{stats?.last24h.activity ?? 0}</span>
                      <p className="text-muted-foreground">Actividad</p>
                    </div>
                    <div>
                      <span className="font-bold text-lg text-destructive">{stats?.last24h.error ?? 0}</span>
                      <p className="text-muted-foreground">Errores</p>
                    </div>
                    <div>
                      <span className="font-bold text-lg text-amber-600">{stats?.last24h.alert ?? 0}</span>
                      <p className="text-muted-foreground">Alertas</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top módulos */}
          {stats && stats.topModules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Módulos más activos (7 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.topModules.map((m) => (
                    <Badge key={m.module} variant="secondary">
                      {m.module}: {m.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eventos del sistema</CardTitle>
              <CardDescription>
                Movimientos importantes realizados por usuarios ({pagination.total} registros)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="activity">Actividad</SelectItem>
                    <SelectItem value="error">Errores</SelectItem>
                    <SelectItem value="alert">Alertas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={module} onValueChange={setModule}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los módulos</SelectItem>
                    {modules.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Buscar mensaje, usuario o ruta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>Buscar</Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Severidad</TableHead>
                          <TableHead>Módulo</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Mensaje</TableHead>
                          <TableHead>HTTP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No hay eventos registrados
                            </TableCell>
                          </TableRow>
                        ) : (
                          events.map((event) => (
                            <TableRow key={event.id}>
                              <TableCell className="whitespace-nowrap text-xs">
                                {formatDate(event.created_at)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{EVENT_TYPE_LABELS[event.event_type]}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={SEVERITY_VARIANT[event.severity] ?? "secondary"}>
                                  {event.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{event.module}</TableCell>
                              <TableCell className="text-xs">
                                {event.username ? (
                                  <span>
                                    {event.username}
                                    {event.user_role && (
                                      <span className="text-muted-foreground"> ({event.user_role})</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-md truncate text-sm" title={event.message}>
                                {event.event_type !== "activity" && (
                                  <AlertTriangle className="inline h-3 w-3 mr-1 text-amber-500" />
                                )}
                                {event.message}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {event.status_code ? (
                                  <span className={event.status_code >= 400 ? "text-destructive" : ""}>
                                    {event.status_code}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Página {pagination.page} de {pagination.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page <= 1}
                          onClick={() => loadData(pagination.page - 1)}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page >= pagination.totalPages}
                          onClick={() => loadData(pagination.page + 1)}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
