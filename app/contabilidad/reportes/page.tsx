"use client"

import { useState } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3 } from "lucide-react"
import Link from "next/link"
import { SumasYSaldosReport } from "@/components/contabilidad/sumas-saldos-report"

export default function ReportesContablesPage() {
  const [reporteActivo, setReporteActivo] = useState("sumas-saldos")

  return (
    <Protected requiredRoles={["finanzas", "admin", "gerencia"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-7 w-7" />
              Reportes contables
            </h1>
            <p className="text-muted-foreground mt-1">
              Sumas y saldos, estado de resultados, estado de situación patrimonial.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Vista dedicada de sumas y saldos:{" "}
              <Link href="/contabilidad/sumas-saldos" className="text-primary hover:underline">
                Sumas y saldos
              </Link>
              .
            </p>
          </div>

          <Tabs value={reporteActivo} onValueChange={setReporteActivo}>
            <TabsList>
              <TabsTrigger value="sumas-saldos">Sumas y Saldos</TabsTrigger>
              <TabsTrigger value="otros">Estado de resultados / Balance</TabsTrigger>
            </TabsList>
            <TabsContent value="sumas-saldos" className="mt-4">
              <SumasYSaldosReport />
            </TabsContent>
            <TabsContent value="otros" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Otros reportes</CardTitle>
                  <CardDescription>
                    Estado de resultados y Estado de situación patrimonial en desarrollo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Próximamente: filtros por período y exportación.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ERPLayout>
    </Protected>
  )
}
