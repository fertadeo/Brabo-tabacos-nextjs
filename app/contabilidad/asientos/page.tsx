"use client"

import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PenLine, Plus } from "lucide-react"

export default function AsientosPage() {
  return (
    <Protected requiredRoles={["finanzas", "admin", "gerencia"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <PenLine className="h-7 w-7" />
                Asientos manuales
              </h1>
              <p className="text-muted-foreground mt-1">
                Listado y búsqueda de asientos contables.
              </p>
            </div>
            <Button asChild>
              <Link href="/contabilidad/asientos/nuevo" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuevo asiento
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Asientos</CardTitle>
              <CardDescription>
                Tabla de asientos con fecha, número, concepto, circuito y totales. Filtros por período y origen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Contenido en desarrollo. Se mostrará el listado de asientos con paginación.
              </p>
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
