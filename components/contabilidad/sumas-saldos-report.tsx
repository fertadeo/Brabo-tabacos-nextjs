"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, HelpCircle, Search } from "lucide-react"
import Link from "next/link"
import { ASIENTOS_MOCK, getSumasYSaldos, type FilaSumasSaldos } from "@/lib/asientos"
import { getCuentasMovibles } from "@/lib/plan-cuentas"

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const CIRCUITOS_SUMAS_SALDOS = [
  { value: "todos", label: "Todos" },
  { value: "default", label: "Default" },
  { value: "ventas", label: "Ventas" },
  { value: "compras", label: "Compras" },
]

export function SumasYSaldosReport() {
  const hoy = new Date()
  const [desde, setDesde] = useState("2025-10-01")
  const [hasta, setHasta] = useState(hoy.toISOString().slice(0, 10))
  const [circuito, setCircuito] = useState("todos")
  const [busqueda, setBusqueda] = useState("")

  const cuentasMovibles = getCuentasMovibles()
  const filasCompletas = useMemo(
    () =>
      getSumasYSaldos(
        ASIENTOS_MOCK,
        { desde, hasta, circuito: circuito === "todos" ? undefined : circuito },
        cuentasMovibles.map((c) => ({ codigo: c.codigo, nombre: c.nombre }))
      ),
    [desde, hasta, circuito, cuentasMovibles]
  )

  const filas = useMemo(() => {
    if (!busqueda.trim()) return filasCompletas
    const q = busqueda.toLowerCase().trim()
    return filasCompletas.filter(
      (f) =>
        f.codigo.toLowerCase().includes(q) ||
        f.cuentaNombre.toLowerCase().includes(q)
    )
  }, [filasCompletas, busqueda])

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Sumas y Saldos</CardTitle>
          <Link
            href="#"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            Ver ayuda
          </Link>
        </div>
        <CardDescription>
          Balance de comprobación por período y circuito contable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Filtros</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Desde:</span>
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Hasta:</span>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Circuito contable:</span>
              <Select value={circuito} onValueChange={setCircuito}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CIRCUITOS_SUMAS_SALDOS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" size="sm" className="w-fit">
            Acciones
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right w-[120px]">Saldo Anterior</TableHead>
                <TableHead className="text-right w-[110px]">Débitos</TableHead>
                <TableHead className="text-right w-[110px]">Créditos</TableHead>
                <TableHead className="text-right w-[120px]">Saldo Final</TableHead>
                <TableHead className="text-right w-[120px]">Débitos Ajustados</TableHead>
                <TableHead className="text-right w-[120px]">Créditos Ajustados</TableHead>
                <TableHead className="text-right w-[140px]">Saldo Final Ajustado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => (
                <SumasSaldosRow key={fila.codigo} fila={fila} />
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground">
          {filas.length} registro{filas.length !== 1 ? "s" : ""} encontrado
          {filas.length !== filasCompletas.length ? ` (filtrado de ${filasCompletas.length})` : ""}.
        </p>
      </CardContent>
    </Card>
  )
}

function SumasSaldosRow({ fila }: { fila: FilaSumasSaldos }) {
  const fmt = (n: number) => formatMoney(n)
  return (
    <TableRow>
      <TableCell className="font-mono text-muted-foreground">{fila.codigo}</TableCell>
      <TableCell className="font-medium">{fila.cuentaNombre}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">{fmt(fila.saldoAnterior)}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">{fmt(fila.debitos)}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">{fmt(fila.creditos)}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">{fmt(fila.saldoFinal)}</TableCell>
      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
        {fmt(fila.debitosAjustados)}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
        {fmt(fila.creditosAjustados)}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">{fmt(fila.saldoFinalAjustado)}</TableCell>
    </TableRow>
  )
}
