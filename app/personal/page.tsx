"use client"

import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserCheck, Search, Plus, Mail, Phone, Calendar, Filter, Download, User } from "lucide-react"

const personalData = [
  {
    id: "EMP001",
    nombre: "Carlos Mendez",
    puesto: "Operario de Producción",
    departamento: "Producción",
    email: "carlos.mendez@empresa.com",
    telefono: "+54 11 1234-5678",
    fechaIngreso: "2023-03-15",
    estado: "Activo",
    salario: 85000,
  },
  {
    id: "EMP002",
    nombre: "Ana García",
    puesto: "Supervisora de Calidad",
    departamento: "Producción",
    email: "ana.garcia@empresa.com",
    telefono: "+54 11 2345-6789",
    fechaIngreso: "2022-08-20",
    estado: "Activo",
    salario: 120000,
  },
  {
    id: "EMP003",
    nombre: "Luis Rodríguez",
    puesto: "Vendedor",
    departamento: "Ventas",
    email: "luis.rodriguez@empresa.com",
    telefono: "+54 11 3456-7890",
    fechaIngreso: "2023-01-10",
    estado: "Activo",
    salario: 95000,
  },
  {
    id: "EMP004",
    nombre: "María Fernández",
    puesto: "Contadora",
    departamento: "Administración",
    email: "maria.fernandez@empresa.com",
    telefono: "+54 11 4567-8901",
    fechaIngreso: "2021-11-05",
    estado: "Vacaciones",
    salario: 140000,
  },
]

export default function PersonalPage() {
  return (
    <Protected requiredRoles={['admin', 'gerencia']}>
      <ERPLayout activeItem="personal">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Personal</h1>
            <p className="text-muted-foreground">CRM interno para administrar empleados y recursos humanos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Empleado
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Sin datos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <User className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">0</div>
              <p className="text-xs text-muted-foreground">Sin datos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Vacaciones</CardTitle>
              <Calendar className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">0</div>
              <p className="text-xs text-muted-foreground">Temporalmente ausentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nómina Mensual</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">Costo total</p>
            </CardContent>
          </Card>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Directorio de Empleados</CardTitle>
            <CardDescription>Lista completa del personal de la empresa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar empleados..." className="pl-8" />
                </div>
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Salario</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personalData.map((empleado) => (
                  <TableRow key={empleado.id}>
                    <TableCell className="font-medium">{empleado.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{empleado.nombre}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {empleado.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{empleado.puesto}</TableCell>
                    <TableCell>{empleado.departamento}</TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {empleado.telefono}
                      </div>
                    </TableCell>
                    <TableCell>{empleado.fechaIngreso}</TableCell>
                    <TableCell>
                      <Badge variant={empleado.estado === "Activo" ? "default" : "secondary"}>{empleado.estado}</Badge>
                    </TableCell>
                    <TableCell>${empleado.salario.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Ver Perfil
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
    </Protected>
  )
}
