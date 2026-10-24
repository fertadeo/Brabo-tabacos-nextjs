"use client"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { PricingCategoryRow } from "@/lib/product-pricing"

interface PricingCategoryListProps {
  numericCategories: PricingCategoryRow[]
  uncategorizedRow?: PricingCategoryRow
  selectedIds: Set<number>
  includeUncategorized: boolean
  allNumericSelected: boolean
  onToggleAll: (checked: boolean) => void
  onToggleCategory: (id: number, checked: boolean) => void
  onToggleUncategorized: (checked: boolean) => void
}

export function PricingCategoryList({
  numericCategories,
  uncategorizedRow,
  selectedIds,
  includeUncategorized,
  allNumericSelected,
  onToggleAll,
  onToggleCategory,
  onToggleUncategorized,
}: PricingCategoryListProps) {
  return (
    <>
      {/* Móvil: tarjetas táctiles */}
      <div className="md:hidden space-y-2">
        <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 cursor-pointer active:bg-muted/50">
          <Checkbox
            checked={allNumericSelected}
            onCheckedChange={(v) => onToggleAll(v === true)}
            aria-label="Seleccionar todas las categorías"
          />
          <span className="text-sm font-medium">Seleccionar todas</span>
        </label>
        {numericCategories.map((row) => {
          const id = row.category_id as number
          const checked = selectedIds.has(id)
          return (
            <label
              key={id}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer active:bg-muted/50",
                checked && "border-turquoise-500/40 bg-turquoise-500/5"
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => onToggleCategory(id, v === true)}
                aria-label={`Seleccionar ${row.category_name}`}
              />
              <span className="min-w-0 flex-1 text-sm font-medium truncate">{row.category_name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {row.product_count} prod.
              </span>
            </label>
          )
        })}
        {uncategorizedRow && uncategorizedRow.product_count > 0 && (
          <label
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer active:bg-muted/50",
              includeUncategorized && "border-turquoise-500/40 bg-turquoise-500/5"
            )}
          >
            <Checkbox
              checked={includeUncategorized}
              onCheckedChange={(v) => onToggleUncategorized(v === true)}
              aria-label="Incluir sin categoría"
            />
            <span className="min-w-0 flex-1 text-sm font-medium">{uncategorizedRow.category_name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {uncategorizedRow.product_count} prod.
            </span>
          </label>
        )}
      </div>

      {/* Escritorio: tabla */}
      <div className="hidden md:block rounded-md border max-h-64 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allNumericSelected}
                  onCheckedChange={(v) => onToggleAll(v === true)}
                  aria-label="Seleccionar todas las categorías"
                />
              </TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Productos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {numericCategories.map((row) => {
              const id = row.category_id as number
              return (
                <TableRow key={id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(id)}
                      onCheckedChange={(v) => onToggleCategory(id, v === true)}
                      aria-label={`Seleccionar ${row.category_name}`}
                    />
                  </TableCell>
                  <TableCell>{row.category_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.product_count}</TableCell>
                </TableRow>
              )
            })}
            {uncategorizedRow && uncategorizedRow.product_count > 0 && (
              <TableRow>
                <TableCell>
                  <Checkbox
                    checked={includeUncategorized}
                    onCheckedChange={(v) => onToggleUncategorized(v === true)}
                    aria-label="Incluir sin categoría"
                  />
                </TableCell>
                <TableCell>{uncategorizedRow.category_name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {uncategorizedRow.product_count}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
