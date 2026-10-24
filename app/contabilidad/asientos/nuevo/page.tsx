"use client"

import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PenLine } from "lucide-react"

export default function NuevoAsientoPage() {
  return (
    <Protected requiredRoles={["finanzas", "admin", "gerencia"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <PenLine className="h-7 w-7" />
              Nuevo asiento manual
            </h1>
            <p className="text-muted-foreground mt-1">
              Formulario: fecha, concepto, circuito, ítems (cuenta, debe, haber), totales y validación de asiento cuadrado.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Asiento</CardTitle>
              <CardDescription>
                Aquí irá el formulario tipo XUBIO: datos generales (fecha, concepto, circuito, moneda extranjera)
                y tabla de ítems con cuenta, debe, haber, centro de costo, descripción. Totales en vivo y botón Reversar Debe/Haber.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Contenido en desarrollo. Requiere plan de cuentas y ejercicios contables en backend.
              </p>
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
