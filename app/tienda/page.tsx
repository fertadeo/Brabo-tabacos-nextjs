import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Store, TrendingUp, ShoppingBag, Globe, Eye, Settings, BarChart3 } from "lucide-react"

const tiendaStats = [
  {
    canal: "Tienda Online",
    ventas: 145230,
    pedidos: 234,
    conversion: 3.2,
    estado: "Activo",
  },
  {
    canal: "MercadoLibre",
    ventas: 89450,
    pedidos: 156,
    conversion: 2.8,
    estado: "Activo",
  },
  {
    canal: "Tienda Física",
    ventas: 67800,
    pedidos: 89,
    conversion: 8.5,
    estado: "Activo",
  },
  {
    canal: "WhatsApp Business",
    ventas: 34560,
    pedidos: 67,
    conversion: 12.3,
    estado: "Activo",
  },
]

export default function TiendaPage() {
  return (
    <Protected requiredRoles={['gerencia', 'ventas', 'admin']}>
      <ERPLayout activeItem="tienda">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Tienda</h1>
            <p className="text-muted-foreground">Administra canales de venta y comercio electrónico</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">Sin datos disponibles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Online</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversión Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">0%</div>
              <p className="text-xs text-muted-foreground">Todos los canales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Canales Activos</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Plataformas conectadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Sales Channels */}
        <div className="grid gap-4">
          {tiendaStats.map((canal, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{canal.canal}</CardTitle>
                    <CardDescription>Canal de venta {canal.estado.toLowerCase()}</CardDescription>
                  </div>
                  <Badge variant={canal.estado === "Activo" ? "default" : "secondary"}>{canal.estado}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-turquoise-600">${canal.ventas.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Ventas del mes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{canal.pedidos}</div>
                    <div className="text-xs text-muted-foreground">Pedidos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-turquoise-500">{canal.conversion}%</div>
                    <div className="text-xs text-muted-foreground">Conversión</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      ${Math.round(canal.ventas / canal.pedidos).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Ticket promedio</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Rendimiento vs objetivo</span>
                    <span>{Math.min(100, Math.round((canal.ventas / 150000) * 100))}%</span>
                  </div>
                  <Progress value={Math.min(100, Math.round((canal.ventas / 150000) * 100))} className="h-2" />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalles
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Gestiona tus canales de venta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Store className="h-6 w-6" />
                <span>Nuevo Producto</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <ShoppingBag className="h-6 w-6" />
                <span>Gestionar Inventario</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Globe className="h-6 w-6" />
                <span>Conectar Canal</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <BarChart3 className="h-6 w-6" />
                <span>Ver Reportes</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
