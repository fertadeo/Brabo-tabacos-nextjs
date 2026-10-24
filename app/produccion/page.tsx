import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Factory, Clock, CheckCircle, AlertTriangle, Play, Pause, Settings } from "lucide-react"

const produccionData = [
  {
    id: "PROD001",
    producto: "Camiseta Básica Blanca",
    pedido: "PED002",
    cantidad: 50,
    progreso: 75,
    estado: "En Proceso",
    fechaInicio: "2024-01-20",
    fechaEstimada: "2024-01-24",
    operario: "Carlos Mendez",
  },
  {
    id: "PROD002",
    producto: "Pantalón Jeans Azul",
    pedido: "PED004",
    cantidad: 25,
    progreso: 100,
    estado: "Completado",
    fechaInicio: "2024-01-18",
    fechaEstimada: "2024-01-22",
    operario: "Ana García",
  },
  {
    id: "PROD003",
    producto: "Chaqueta de Cuero",
    pedido: "PED001",
    cantidad: 10,
    progreso: 30,
    estado: "Atrasado",
    fechaInicio: "2024-01-19",
    fechaEstimada: "2024-01-23",
    operario: "Luis Rodríguez",
  },
]

export default function ProduccionPage() {
  return (
    <Protected requiredRoles={['gerencia', 'logistica', 'admin']}>
      <ERPLayout activeItem="produccion">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Control de Producción</h1>
            <p className="text-muted-foreground">Monitorea y gestiona los procesos de producción</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
            <Button>
              <Play className="h-4 w-4 mr-2" />
              Nueva Orden
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <p className="text-xs text-muted-foreground">Órdenes activas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados Hoy</CardTitle>
              <CheckCircle className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">0</div>
              <p className="text-xs text-muted-foreground">Sin datos disponibles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">0</div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">Promedio semanal</p>
            </CardContent>
          </Card>
        </div>

        {/* Production Orders */}
        <div className="grid gap-4">
          {produccionData.map((orden) => (
            <Card key={orden.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{orden.producto}</CardTitle>
                    <CardDescription>
                      Orden {orden.id} • Pedido {orden.pedido} • {orden.cantidad} unidades
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      orden.estado === "Completado"
                        ? "default"
                        : orden.estado === "Atrasado"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {orden.estado}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progreso</span>
                      <span>{orden.progreso}%</span>
                    </div>
                    <Progress value={orden.progreso} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Operario</div>
                      <div className="font-medium">{orden.operario}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Inicio</div>
                      <div className="font-medium">{orden.fechaInicio}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Estimada</div>
                      <div className="font-medium">{orden.fechaEstimada}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cantidad</div>
                      <div className="font-medium">{orden.cantidad} unidades</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </Button>
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      </ERPLayout>
    </Protected>
  )
}
