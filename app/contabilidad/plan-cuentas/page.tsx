"use client"

import { useState, useMemo } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ListOrdered } from "lucide-react"
import {
  PLAN_CUENTAS_DATA,
  RAMAS,
  type CuentaPlan,
  type Rama,
} from "@/lib/plan-cuentas"

export default function PlanCuentasPage() {
  const [ramaFilter, setRamaFilter] = useState<Rama | "Todas">("Todas")

  const cuentasFiltradas = useMemo(() => {
    if (ramaFilter === "Todas") return PLAN_CUENTAS_DATA
    return PLAN_CUENTAS_DATA.filter((c) => c.rama === ramaFilter)
  }, [ramaFilter])

  return (
    <Protected requiredRoles={["finanzas", "admin", "gerencia"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <ListOrdered className="h-7 w-7" />
                Plan de cuentas
              </h1>
              <p className="text-muted-foreground mt-1">
                Estructura jerárquica de cuentas contables. Compatible con ARCA (ex AFIP).
              </p>
            </div>
            <Select
              value={ramaFilter}
              onValueChange={(v) => setRamaFilter(v as Rama | "Todas")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por rama" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas las ramas</SelectItem>
                {RAMAS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cuentas</CardTitle>
              <CardDescription>
                Código, nombre y rama. Las cuentas movibles permiten registrar asientos; las agrupadoras solo organizan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Código</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="w-[180px]">Rama</TableHead>
                    <TableHead className="w-[120px] text-center">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentasFiltradas.map((cuenta) => (
                    <PlanCuentasRow key={cuenta.codigo} cuenta={cuenta} />
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">
                Total: {cuentasFiltradas.length} cuentas
                {ramaFilter !== "Todas" && ` en ${ramaFilter}`}
              </p>
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}

function PlanCuentasRow({ cuenta }: { cuenta: CuentaPlan }) {
  const paddingLeft = (cuenta.nivel - 1) * 16
  return (
    <TableRow className={!cuenta.movible ? "bg-muted/30" : undefined}>
      <TableCell className="font-mono text-muted-foreground">
        {cuenta.codigo}
      </TableCell>
      <TableCell>
        <span
          className="font-medium"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {cuenta.nombre}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{cuenta.rama}</TableCell>
      <TableCell className="text-center">
        {cuenta.movible ? (
          <Badge variant="secondary" className="text-xs">
            Movible
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Agrupadora
          </Badge>
        )}
      </TableCell>
    </TableRow>
  )
}
