"use client"

import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays } from "lucide-react"

export default function EjerciciosPage() {
  return (
    <Protected requiredRoles={["finanzas", "admin", "gerencia"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="h-7 w-7" />
              Ejercicios contables
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestión de períodos fiscales: apertura, cierre y estados.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ejercicios</CardTitle>
              <CardDescription>
                Listado de ejercicios (año fiscal). Apertura y cierre de períodos. Restricción de edición por ejercicio cerrado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Contenido en desarrollo. Requiere backend de ejercicios contables.
              </p>
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
