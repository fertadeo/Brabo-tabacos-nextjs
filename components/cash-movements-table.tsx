"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CashMovement } from "@/lib/api"

interface CashMovementsTableProps {
  movements: CashMovement[]
  loading?: boolean
}

export function CashMovementsTable({ movements, loading = false }: CashMovementsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">No hay movimientos disponibles</p>
          <p className="text-sm">
            {loading 
              ? 'Cargando movimientos...' 
              : 'No se encontraron movimientos para el período seleccionado o el servicio no está disponible'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Concepto</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Método</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((movement) => (
          <TableRow key={movement.id}>
            <TableCell className="font-medium">{movement.id}</TableCell>
            <TableCell>
              <Badge 
                variant={movement.type === "Ingreso" ? "default" : "secondary"}
                className={movement.type === "Ingreso" ? "bg-turquoise-100 text-turquoise-800 dark:bg-turquoise-900 dark:text-turquoise-200" : ""}
              >
                {movement.type}
              </Badge>
            </TableCell>
            <TableCell className="max-w-xs truncate">{movement.concept}</TableCell>
            <TableCell>
              <span className={movement.amount > 0 ? "text-turquoise-600 font-semibold" : "text-red-600 font-semibold"}>
                {movement.amount > 0 ? '+' : ''}{formatCurrency(movement.amount)}
              </span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(movement.date)}
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {movement.method || 'N/A'}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
