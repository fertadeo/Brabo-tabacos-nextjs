"use client"

import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { SumasYSaldosReport } from "@/components/contabilidad/sumas-saldos-report"
import { Table2 } from "lucide-react"
import Link from "next/link"

export default function SumasYSaldosPage() {
  return (
    <Protected requiredRoles={["finanzas", "admin", "gerencia"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Table2 className="h-7 w-7" />
              Sumas y saldos
            </h1>
            <p className="text-muted-foreground mt-1">
              Balance de comprobación: sumas de débitos y créditos y saldos por cuenta.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              También disponible dentro de{" "}
              <Link href="/contabilidad/reportes" className="text-primary hover:underline">
                Reportes contables
              </Link>
              .
            </p>
          </div>

          <SumasYSaldosReport />
        </div>
      </ERPLayout>
    </Protected>
  )
}
