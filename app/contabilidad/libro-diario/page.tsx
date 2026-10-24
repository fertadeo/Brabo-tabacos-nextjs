"use client"

import { useState } from "react"
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
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react"
import {
  getAsientosLibroDiario,
  getTotalDebe,
  getTotalHaber,
  type Asiento,
} from "@/lib/asientos"
import { getCuentaByCodigo } from "@/lib/plan-cuentas"

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

export default function LibroDiarioPage() {
  const asientos = getAsientosLibroDiario()
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  return (
    <Protected requiredRoles={["finanzas", "admin", "gerencia"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-7 w-7" />
              Libro diario
            </h1>
            <p className="text-muted-foreground mt-1">
              Registro cronológico de todas las operaciones contables.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Movimientos</CardTitle>
              <CardDescription>
                Asientos ordenados por fecha. Expandir fila para ver detalle por cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-[100px]">Fecha</TableHead>
                    <TableHead className="w-[80px]">Nº</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right w-[120px]">Total Debe</TableHead>
                    <TableHead className="text-right w-[120px]">Total Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asientos.map((asiento) => (
                    <AsientoRow
                      key={asiento.id}
                      asiento={asiento}
                      expandido={expandidoId === asiento.id}
                      onToggle={() =>
                        setExpandidoId((id) =>
                          id === asiento.id ? null : asiento.id
                        )
                      }
                    />
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">
                Total: {asientos.length} asientos. Datos de ejemplo; con backend se filtrará por ejercicio/período.
              </p>
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}

function AsientoRow({
  asiento,
  expandido,
  onToggle,
}: {
  asiento: Asiento
  expandido: boolean
  onToggle: () => void
}) {
  const totalDebe = getTotalDebe(asiento)
  const totalHaber = getTotalHaber(asiento)

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell className="py-1">
          {expandido ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-medium">{formatDate(asiento.fecha)}</TableCell>
        <TableCell className="font-mono text-muted-foreground">
          {asiento.numero}
        </TableCell>
        <TableCell>{asiento.concepto}</TableCell>
        <TableCell className="text-right font-mono">
          {formatMoney(totalDebe)}
        </TableCell>
        <TableCell className="text-right font-mono">
          {formatMoney(totalHaber)}
        </TableCell>
      </TableRow>
      {expandido && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={6} className="p-0">
            <div className="px-4 pb-4 pt-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right w-[120px]">Debe</TableHead>
                    <TableHead className="text-right w-[120px]">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asiento.lineas.map((lin, idx) => {
                    const cuenta = getCuentaByCodigo(lin.cuentaCodigo)
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-muted-foreground">
                          {lin.cuentaCodigo}
                        </TableCell>
                        <TableCell>
                          {cuenta?.nombre ?? lin.cuentaCodigo}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {lin.debe > 0 ? formatMoney(lin.debe) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {lin.haber > 0 ? formatMoney(lin.haber) : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
