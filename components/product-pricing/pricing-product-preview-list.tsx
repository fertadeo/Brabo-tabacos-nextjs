"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatArs, type PriceSampleRow } from "@/lib/product-pricing"

interface PricingProductPreviewListProps {
  products: PriceSampleRow[]
  includedProductIds: Set<number>
  manuallyPricedIds?: Set<number>
  allIncluded: boolean
  someIncluded: boolean
  onToggleAll: (checked: boolean) => void
  onToggleProduct: (id: number, checked: boolean) => void
  onEditProduct?: (row: PriceSampleRow) => void
  /** Solo muestra precios (p. ej. pestaña dólar) */
  readOnly?: boolean
}

export function PricingProductPreviewList({
  products,
  includedProductIds,
  manuallyPricedIds = new Set(),
  allIncluded,
  someIncluded,
  onToggleAll,
  onToggleProduct,
  onEditProduct,
  readOnly = false,
}: PricingProductPreviewListProps) {
  const includedCount = products.filter((p) => includedProductIds.has(p.id)).length

  return (
    <>
      {!readOnly && (
        <div className="flex items-center justify-between gap-2 md:hidden py-1">
          <label className="flex min-h-10 items-center gap-2 text-sm font-medium cursor-pointer">
            <Checkbox
              checked={allIncluded ? true : someIncluded ? "indeterminate" : false}
              onCheckedChange={(v) => onToggleAll(v === true)}
              aria-label="Seleccionar todos los productos"
            />
            Todos los productos
          </label>
          <span className="text-xs tabular-nums text-muted-foreground shrink-0">
            {includedCount}/{products.length}
          </span>
        </div>
      )}

      {/* Móvil: tarjetas */}
      <div className={cn("md:hidden space-y-2", readOnly && "mt-0")}>
        {products.map((row) => {
          const included = readOnly || includedProductIds.has(row.id)
          const manualSaved = manuallyPricedIds.has(row.id)
          return (
            <div
              key={row.id}
              className={cn(
                "rounded-lg border p-3 space-y-2.5",
                !readOnly && !included && "opacity-50 bg-muted/20"
              )}
            >
              <div className="flex items-start gap-3">
                {!readOnly && (
                  <Checkbox
                    className="mt-0.5"
                    checked={included}
                    onCheckedChange={(v) => onToggleProduct(row.id, v === true)}
                    aria-label={`Incluir ${row.name}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug line-clamp-2">{row.name}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">{row.code}</p>
                </div>
                {!readOnly && onEditProduct && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label={`Editar precio de ${row.name}`}
                    onClick={() => onEditProduct(row)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div
                className={cn(
                  "grid grid-cols-2 gap-3 text-sm",
                  !readOnly && "pl-7"
                )}
              >
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Actual</p>
                  <p className="font-medium tabular-nums">{formatArs(row.current_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Nuevo</p>
                  <p
                    className={cn(
                      "font-semibold tabular-nums",
                      included && "text-turquoise-600 dark:text-turquoise-400"
                    )}
                  >
                    {included || readOnly ? formatArs(row.new_price) : "—"}
                  </p>
                </div>
              </div>
              {manualSaved && !readOnly && (
                <p className="text-xs text-turquoise-600 dark:text-turquoise-400 pl-7">
                  Precio guardado manualmente
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden md:block rounded-md border max-h-80 overflow-y-auto overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {!readOnly && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allIncluded ? true : someIncluded ? "indeterminate" : false}
                    onCheckedChange={(v) => onToggleAll(v === true)}
                    aria-label="Seleccionar todos los productos"
                  />
                </TableHead>
              )}
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Nuevo</TableHead>
              {!readOnly && onEditProduct && (
                <TableHead className="w-12 text-center">Acción</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((row) => {
              const included = readOnly || includedProductIds.has(row.id)
              const manualSaved = manuallyPricedIds.has(row.id)
              return (
                <TableRow
                  key={row.id}
                  className={!readOnly && !included ? "opacity-50 bg-muted/20" : undefined}
                >
                  {!readOnly && (
                    <TableCell>
                      <Checkbox
                        checked={included}
                        onCheckedChange={(v) => onToggleProduct(row.id, v === true)}
                        aria-label={`Incluir ${row.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatArs(row.current_price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {included || readOnly ? (
                      <span
                        className={
                          manualSaved ? "text-turquoise-600 dark:text-turquoise-400" : undefined
                        }
                      >
                        {formatArs(row.new_price)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {!readOnly && onEditProduct && (
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Editar precio de ${row.name}`}
                        onClick={() => onEditProduct(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
