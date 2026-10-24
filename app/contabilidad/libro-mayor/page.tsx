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
import { BookOpen } from "lucide-react"
import { ASIENTOS_MOCK, getMovimientosMayor } from "@/lib/asientos"
import { getCuentasMovibles } from "@/lib/plan-cuentas"

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

export default function LibroMayorPage() {
  const cuentasMovibles = getCuentasMovibles()
  const [cuentaCodigo, setCuentaCodigo] = useState<string>("")

  const movimientos = useMemo(() => {
    if (!cuentaCodigo) return []
    return getMovimientosMayor(ASIENTOS_MOCK, cuentaCodigo)
  }, [cuentaCodigo])

  const cuentaSeleccionada = cuentasMovibles.find((c) => c.codigo === cuentaCodigo)
  const saldoFinal = movimientos.length > 0 ? movimientos[movimientos.length - 1].saldo : 0

  return (
    <Protected requiredRoles={["finanzas", "admin", "gerencia"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-7 w-7" />
              Libro mayor
            </h1>
            <p className="text-muted-foreground mt-1">
              Movimientos por cuenta contable. Seleccione una cuenta para ver débitos, créditos y saldo.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cuenta</CardTitle>
              <CardDescription>
                Elija la cuenta del plan de cuentas para visualizar su mayor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={cuentaCodigo} onValueChange={setCuentaCodigo}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Seleccionar cuenta..." />
                </SelectTrigger>
                <SelectContent>
                  {cuentasMovibles.map((c) => (
                    <SelectItem key={c.codigo} value={c.codigo}>
                      <span className="font-mono">{c.codigo}</span>
                      <span className="ml-2 text-muted-foreground">—</span>
                      <span className="ml-2">{c.nombre}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {cuentaCodigo && (
                <>
                  {cuentaSeleccionada && (
                    <p className="text-sm text-muted-foreground">
                      Cuenta: <strong>{cuentaSeleccionada.nombre}</strong>{" "}
                      <span className="font-mono">({cuentaSeleccionada.codigo})</span>
                      {" · "}
                      Rama: {cuentaSeleccionada.rama}
                    </p>
                  )}

                  {movimientos.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No hay movimientos para esta cuenta en el período.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Fecha</TableHead>
                          <TableHead className="w-[80px]">Nº Asiento</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead className="text-right w-[120px]">Débito</TableHead>
                          <TableHead className="text-right w-[120px]">Crédito</TableHead>
                          <TableHead className="text-right w-[120px]">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimientos.map((mov, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {formatDate(mov.fecha)}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {mov.asientoNumero}
                            </TableCell>
                            <TableCell className="max-w-[280px] truncate">
                              {mov.concepto}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {mov.debe > 0 ? formatMoney(mov.debe) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {mov.haber > 0 ? formatMoney(mov.haber) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatMoney(mov.saldo)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {movimientos.length > 0 && (
                    <div className="flex justify-end border-t pt-4">
                      <p className="text-sm font-medium">
                        Saldo final: {formatMoney(saldoFinal)}
                      </p>
                    </div>
                  )}
                </>
              )}

              {!cuentaCodigo && (
                <p className="text-sm text-muted-foreground py-4">
                  Seleccione una cuenta para ver el libro mayor.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
